import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { apiError, handleApiError } from "@/lib/api";
import { toCsv, csvResponse } from "@/lib/csv";
import { writeAuditLog } from "@/lib/audit";

export async function GET() {
  try {
    const admin = await requireAdmin(["FINANCE_ADMIN"]);
    if (!admin) return apiError("Forbidden.", 403);

    const withdrawals = await db.withdrawal.findMany({
      orderBy: { createdAt: "desc" },
      include: { asset: true, network: true, user: { select: { email: true } } },
    });

    const rows = withdrawals.map((w) => ({
      id: w.id,
      withdrawalRef: w.withdrawalRef,
      userEmail: w.user.email,
      asset: w.asset.symbol,
      network: w.network.name,
      amount: w.amount.toString(),
      networkFee: w.networkFee.toString(),
      platformFee: w.platformFee.toString(),
      totalDeducted: w.totalDeducted.toString(),
      destinationAddress: w.destinationAddress,
      internalTxReference: w.internalTxReference,
      status: w.status,
      createdAt: w.createdAt,
      reviewedAt: w.reviewedAt,
    }));

    const csv = toCsv(rows, [
      "id",
      "withdrawalRef",
      "userEmail",
      "asset",
      "network",
      "amount",
      "networkFee",
      "platformFee",
      "totalDeducted",
      "destinationAddress",
      "internalTxReference",
      "status",
      "createdAt",
      "reviewedAt",
    ]);

    await writeAuditLog({ adminId: admin.id, action: "DATA_EXPORTED", targetType: "Withdrawal", reason: "CSV export: withdrawals" });

    return csvResponse(`withdrawals-export-${Date.now()}.csv`, csv);
  } catch (err) {
    return handleApiError(err);
  }
}
