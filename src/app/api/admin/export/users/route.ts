import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { apiError, handleApiError } from "@/lib/api";
import { toCsv, csvResponse } from "@/lib/csv";
import { writeAuditLog } from "@/lib/audit";

export async function GET() {
  try {
    const admin = await requireAdmin(["FINANCE_ADMIN", "SECURITY_ADMIN"]);
    if (!admin) return apiError("Forbidden.", 403);

    const users = await db.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        country: true,
        status: true,
        kycStatus: true,
        isAdmin: true,
        twoFactorEnabled: true,
        emailVerifiedAt: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });

    // Never include secrets (password hashes, 2FA secrets, recovery phrase hashes) in exports.
    const csv = toCsv(users, [
      "id",
      "fullName",
      "email",
      "phone",
      "country",
      "status",
      "kycStatus",
      "isAdmin",
      "twoFactorEnabled",
      "emailVerifiedAt",
      "createdAt",
      "lastLoginAt",
    ]);

    await writeAuditLog({ adminId: admin.id, action: "DATA_EXPORTED", targetType: "User", reason: "CSV export: users" });

    return csvResponse(`users-export-${Date.now()}.csv`, csv);
  } catch (err) {
    return handleApiError(err);
  }
}
