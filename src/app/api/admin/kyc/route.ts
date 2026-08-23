import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { apiOk, apiError, handleApiError } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin(["KYC_ADMIN"]);
    if (!admin) return apiError("Forbidden.", 403);

    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const take = Math.min(Number(url.searchParams.get("take") ?? 50), 200);

    const applications = await db.kycApplication.findMany({
      where: status ? { status: status as never } : {},
      orderBy: { createdAt: "desc" },
      take,
      include: {
        user: { select: { id: true, fullName: true, email: true } },
        documents: { select: { id: true, type: true, originalName: true, uploadedAt: true } },
      },
    });

    return apiOk({ applications });
  } catch (err) {
    return handleApiError(err);
  }
}
