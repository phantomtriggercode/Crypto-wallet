import { NextRequest } from "next/server";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { savePrivateFile, validateUpload } from "@/lib/storage";
import { notifyUser } from "@/lib/notify";

export async function GET() {
  try {
    const user = await requireUser();
    if (!user) return apiError("Not authenticated.", 401);

    const application = await db.kycApplication.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: { documents: { select: { id: true, type: true, originalName: true, uploadedAt: true } } },
    });

    return apiOk({ application, status: user.kycStatus });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!user) return apiError("Not authenticated.", 401);

    if (user.kycStatus === "APPROVED" || user.kycStatus === "UNDER_REVIEW") {
      return apiError("Your KYC application is already submitted or approved.", 400);
    }

    const form = await req.formData();
    const legalName = String(form.get("legalName") ?? "").trim();
    const dateOfBirth = String(form.get("dateOfBirth") ?? "");
    const country = String(form.get("country") ?? "").trim();
    const address = String(form.get("address") ?? "").trim();

    if (!legalName || !dateOfBirth || !country || !address) {
      return apiError("Please complete all required fields.", 422);
    }

    const dob = new Date(dateOfBirth);
    if (Number.isNaN(dob.getTime())) return apiError("Invalid date of birth.", 422);

    const governmentId = form.get("governmentId") as File | null;
    const selfie = form.get("selfie") as File | null;
    const proofOfAddress = form.get("proofOfAddress") as File | null;

    if (!governmentId || !selfie) {
      return apiError("Government ID and selfie are required.", 422);
    }
    [governmentId, selfie, proofOfAddress].forEach((f) => f && validateUpload(f));

    const application = await db.kycApplication.create({
      data: {
        userId: user.id,
        legalName,
        dateOfBirth: dob,
        country,
        address,
        status: "UNDER_REVIEW",
      },
    });

    const files: [File, string][] = [
      [governmentId, "GOVERNMENT_ID"],
      [selfie, "SELFIE"],
      ...(proofOfAddress ? ([[proofOfAddress, "PROOF_OF_ADDRESS"]] as [File, string][]) : []),
    ];

    for (const [file, type] of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const storageKey = await savePrivateFile(`kyc/${user.id}`, file.name, buffer);
      await db.kycDocument.create({
        data: {
          kycApplicationId: application.id,
          type,
          storageKey,
          originalName: file.name,
          mimeType: file.type,
          size: file.size,
        },
      });
    }

    await db.user.update({ where: { id: user.id }, data: { kycStatus: "UNDER_REVIEW" } });

    await notifyUser({
      userId: user.id,
      type: "KYC",
      title: "KYC submitted",
      message: "Your identity verification has been submitted and is under review.",
      emailTemplateKey: "kyc_submitted",
    });

    return apiOk({ application }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
