import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { notifyUser } from "@/lib/notify";

const schema = z.object({
  action: z.enum(["APPROVE", "REJECT", "MORE_INFO_REQUIRED"]),
  reviewReason: z.string().trim().max(2000).optional().or(z.literal("")),
});

const STATUS_MAP = { APPROVE: "APPROVED", REJECT: "REJECTED", MORE_INFO_REQUIRED: "MORE_INFO_REQUIRED" } as const;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(["KYC_ADMIN"]);
    if (!admin) return apiError("Forbidden.", 403);

    const { id } = await params;
    const application = await db.kycApplication.findUnique({ where: { id } });
    if (!application) return apiError("KYC application not found.", 404);

    const { action, reviewReason } = schema.parse(await req.json());
    if ((action === "REJECT" || action === "MORE_INFO_REQUIRED") && !reviewReason) {
      return apiError("A review reason is required for this action.", 422);
    }

    const newStatus = STATUS_MAP[action];

    await db.$transaction([
      db.kycApplication.update({
        where: { id },
        data: { status: newStatus, reviewReason: reviewReason || null, reviewedByAdminId: admin.id, reviewedAt: new Date() },
      }),
      db.user.update({ where: { id: application.userId }, data: { kycStatus: newStatus } }),
    ]);

    await writeAuditLog({
      adminId: admin.id,
      action: `KYC_${action}`,
      targetType: "KycApplication",
      targetId: id,
      previousState: { status: application.status },
      newState: { status: newStatus },
      reason: reviewReason,
    });

    await notifyUser({
      userId: application.userId,
      type: "KYC",
      title:
        action === "APPROVE" ? "KYC approved" : action === "REJECT" ? "KYC rejected" : "More information required",
      message: reviewReason || (action === "APPROVE" ? "Your identity has been verified." : "Please check your KYC status."),
      emailTemplateKey: action === "APPROVE" ? "kyc_approved" : action === "REJECT" ? "kyc_rejected" : undefined,
    });

    return apiOk({});
  } catch (err) {
    return handleApiError(err);
  }
}
