import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { apiError, handleApiError } from "@/lib/api";
import { toCsv, csvResponse } from "@/lib/csv";
import { writeAuditLog } from "@/lib/audit";

export async function GET() {
  try {
    const admin = await requireAdmin(["FINANCE_ADMIN"]);
    if (!admin) return apiError("Forbidden.", 403);

    const entries = await db.ledgerEntry.findMany({
      orderBy: { createdAt: "desc" },
      take: 10000,
      include: { asset: true, user: { select: { email: true } } },
    });

    const rows = entries.map((e) => ({
      id: e.id,
      userEmail: e.user.email,
      asset: e.asset.symbol,
      type: e.type,
      direction: e.direction,
      amount: e.amount.toString(),
      balanceAfter: e.balanceAfter.toString(),
      referenceType: e.referenceType,
      referenceId: e.referenceId,
      reason: e.reason,
      createdByAdminId: e.createdByAdminId,
      createdAt: e.createdAt,
    }));

    const csv = toCsv(rows, [
      "id",
      "userEmail",
      "asset",
      "type",
      "direction",
      "amount",
      "balanceAfter",
      "referenceType",
      "referenceId",
      "reason",
      "createdByAdminId",
      "createdAt",
    ]);

    await writeAuditLog({ adminId: admin.id, action: "DATA_EXPORTED", targetType: "LedgerEntry", reason: "CSV export: ledger" });

    return csvResponse(`ledger-export-${Date.now()}.csv`, csv);
  } catch (err) {
    return handleApiError(err);
  }
}
