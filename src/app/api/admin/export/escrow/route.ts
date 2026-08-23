import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { apiError, handleApiError } from "@/lib/api";
import { toCsv, csvResponse } from "@/lib/csv";
import { writeAuditLog } from "@/lib/audit";

export async function GET() {
  try {
    const admin = await requireAdmin(["FINANCE_ADMIN"]);
    if (!admin) return apiError("Forbidden.", 403);

    const deals = await db.escrowDeal.findMany({
      orderBy: { createdAt: "desc" },
      include: { asset: true, buyer: { select: { email: true } }, seller: { select: { email: true } } },
    });

    const rows = deals.map((d) => ({
      id: d.id,
      escrowRef: d.escrowRef,
      title: d.title,
      buyerEmail: d.buyer.email,
      sellerEmail: d.seller.email,
      asset: d.asset.symbol,
      amount: d.amount.toString(),
      status: d.status,
      createdAt: d.createdAt,
      expiresAt: d.expiresAt,
    }));

    const csv = toCsv(rows, ["id", "escrowRef", "title", "buyerEmail", "sellerEmail", "asset", "amount", "status", "createdAt", "expiresAt"]);

    await writeAuditLog({ adminId: admin.id, action: "DATA_EXPORTED", targetType: "EscrowDeal", reason: "CSV export: escrow" });

    return csvResponse(`escrow-export-${Date.now()}.csv`, csv);
  } catch (err) {
    return handleApiError(err);
  }
}
