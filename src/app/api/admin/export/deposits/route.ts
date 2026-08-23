import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { apiError, handleApiError } from "@/lib/api";
import { toCsv, csvResponse } from "@/lib/csv";
import { writeAuditLog } from "@/lib/audit";

export async function GET() {
  try {
    const admin = await requireAdmin(["FINANCE_ADMIN"]);
    if (!admin) return apiError("Forbidden.", 403);

    const deposits = await db.deposit.findMany({
      orderBy: { createdAt: "desc" },
      include: { asset: true, network: true, user: { select: { email: true } } },
    });

    const rows = deposits.map((d) => ({
      id: d.id,
      depositRef: d.depositRef,
      userEmail: d.user.email,
      asset: d.asset.symbol,
      network: d.network.name,
      amount: d.amount.toString(),
      receivingAddress: d.receivingAddress,
      txHash: d.txHash,
      status: d.status,
      createdAt: d.createdAt,
      reviewedAt: d.reviewedAt,
    }));

    const csv = toCsv(rows, [
      "id",
      "depositRef",
      "userEmail",
      "asset",
      "network",
      "amount",
      "receivingAddress",
      "txHash",
      "status",
      "createdAt",
      "reviewedAt",
    ]);

    await writeAuditLog({ adminId: admin.id, action: "DATA_EXPORTED", targetType: "Deposit", reason: "CSV export: deposits" });

    return csvResponse(`deposits-export-${Date.now()}.csv`, csv);
  } catch (err) {
    return handleApiError(err);
  }
}
