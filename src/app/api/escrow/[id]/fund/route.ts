import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { lockEscrowFunds } from "@/lib/ledger";
import { notifyUser } from "@/lib/notify";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    if (!user) return apiError("Not authenticated.", 401);

    const { id } = await params;
    const deal = await db.escrowDeal.findUnique({ where: { id }, include: { asset: true } });
    if (!deal) return apiError("Escrow deal not found.", 404);
    if (deal.buyerId !== user.id) return apiError("Only the buyer can fund this deal.", 403);
    if (deal.status !== "CREATED") return apiError("This deal cannot be funded in its current state.", 400);

    await db.$transaction(async (tx) => {
      await lockEscrowFunds(tx, { buyerId: deal.buyerId, assetId: deal.assetId, amount: deal.amount, escrowDealId: deal.id });
      await tx.escrowDeal.update({ where: { id: deal.id }, data: { status: "FUNDED" } });
      await tx.escrowEvent.create({ data: { escrowDealId: deal.id, type: "FUNDED", actorUserId: user.id } });
    });

    await notifyUser({
      userId: deal.sellerId,
      type: "ESCROW",
      title: "Escrow funded",
      message: `The buyer has funded escrow deal "${deal.title}". Funds are locked and cannot be withdrawn until release.`,
      emailTemplateKey: "escrow_funded",
      emailVars: { title: deal.title },
    });
    await notifyUser({
      userId: deal.buyerId,
      type: "ESCROW",
      title: "Funds locked in escrow",
      message: `Your funds for "${deal.title}" are currently locked in escrow.`,
    });

    return apiOk({});
  } catch (err) {
    return handleApiError(err);
  }
}
