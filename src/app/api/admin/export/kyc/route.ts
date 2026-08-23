import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { apiError, handleApiError } from "@/lib/api";
import { toCsv, csvResponse } from "@/lib/csv";
import { writeAuditLog } from "@/lib/audit";

export async function GET() {
  try {
    const admin = await requireAdmin(["KYC_ADMIN"]);
    if (!admin) return apiError("Forbidden.", 403);

    const applications = await db.kycApplication.findMany({
      orderBy: { createdAt: "desc" },
      include: { user: { select: { email: true } } },
    });

    // Deliberately excludes document storage keys/content — only status metadata is exported.
    const rows = applications.map((a) => ({
      id: a.id,
      userEmail: a.user.email,
      legalName: a.legalName,
      country: a.country,
      status: a.status,
      reviewReason: a.reviewReason,
      reviewedByAdminId: a.reviewedByAdminId,
      createdAt: a.createdAt,
      reviewedAt: a.reviewedAt,
    }));

    const csv = toCsv(rows, [
      "id",
      "userEmail",
      "legalName",
      "country",
      "status",
      "reviewReason",
      "reviewedByAdminId",
      "createdAt",
      "reviewedAt",
    ]);

    await writeAuditLog({ adminId: admin.id, action: "DATA_EXPORTED", targetType: "KycApplication", reason: "CSV export: KYC status" });

    return csvResponse(`kyc-export-${Date.now()}.csv`, csv);
  } catch (err) {
    return handleApiError(err);
  }
}
