import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { apiError, handleApiError } from "@/lib/api";
import { toCsv, csvResponse } from "@/lib/csv";
import { writeAuditLog } from "@/lib/audit";

export async function GET() {
  try {
    const admin = await requireAdmin(["SECURITY_ADMIN"]);
    if (!admin) return apiError("Forbidden.", 403);

    const logs = await db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10000,
      include: { admin: { select: { email: true } } },
    });

    const rows = logs.map((l) => ({
      id: l.id,
      adminEmail: l.admin?.email ?? "system",
      action: l.action,
      targetType: l.targetType,
      targetId: l.targetId,
      reason: l.reason,
      ip: l.ip,
      createdAt: l.createdAt,
    }));

    const csv = toCsv(rows, ["id", "adminEmail", "action", "targetType", "targetId", "reason", "ip", "createdAt"]);

    await writeAuditLog({ adminId: admin.id, action: "DATA_EXPORTED", targetType: "AuditLog", reason: "CSV export: audit logs" });

    return csvResponse(`audit-logs-export-${Date.now()}.csv`, csv);
  } catch (err) {
    return handleApiError(err);
  }
}
