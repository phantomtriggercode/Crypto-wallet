import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { releaseEscrowFunds } from "@/lib/ledger";
import { writeAuditLog } from "@/lib/audit";
import { notifyUser } from "@/lib/notify";

const schema = z.object({ note: z.string().trim().max(1000).optional().or(z.literal("")) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(["FINANCE_ADMIN"]);
    if (!admin) return apiError("Forbidden.", 403);

    const { id } = await params;
    const deal = await db.escrowDeal.findUnique({ where: { id }, include: { asset: true } });
    if (!deal) return apiError("Escrow deal not found.", 404);
    if (!["AWAITING_ADMIN_RELEASE", "DISPUTED"].includes(deal.status)) {
      return apiError("This deal is not awaiting release.", 400);
    }

    const { note } = schema.parse(await req.json().catch(() => ({})));

    await db.$transaction(async (tx) => {
      await releaseEscrowFunds(tx, { buyerId: deal.buyerId, sellerId: deal.sellerId, assetId: deal.assetId, amount: deal.amount, escrowDealId: deal.id });
      await tx.escrowDeal.update({ where: { id: deal.id }, data: { status: "RELEASED" } });
      await tx.escrowEvent.create({ data: { escrowDealId: deal.id, type: "RELEASED", actorAdminId: admin.id, note: note || null } });
      if (deal.status === "DISPUTED") {
        await tx.escrowDispute.updateMany({
          where: { escrowDealId: deal.id, status: "OPEN" },
          data: { status: "RESOLVED", resolution: "RELEASE_TO_SELLER", resolutionNote: note || null, resolvedByAdminId: admin.id, resolvedAt: new Date() },
        });
      }
    });

    await writeAuditLog({
      adminId: admin.id,
      action: "ESCROW_RELEASED",
      targetType: "EscrowDeal",
      targetId: id,
      previousState: { status: deal.status },
      newState: { status: "RELEASED" },
      reason: note,
    });

    await notifyUser({
      userId: deal.sellerId,
      type: "ESCROW",
      title: "Escrow released",
      message: `Funds for "${deal.title}" have been released to your balance.`,
      emailTemplateKey: "escrow_released",
      emailVars: { title: deal.title },
    });
    await notifyUser({
      userId: deal.buyerId,
      type: "ESCROW",
      title: "Escrow released",
      message: `Escrow funds for "${deal.title}" have been released to the seller.`,
    });

    return apiOk({});
  } catch (err) {
    return handleApiError(err);
  }
}
