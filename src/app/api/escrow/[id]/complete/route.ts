import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { notifyUser } from "@/lib/notify";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    if (!user) return apiError("Not authenticated.", 401);

    const { id } = await params;
    const deal = await db.escrowDeal.findUnique({ where: { id } });
    if (!deal) return apiError("Escrow deal not found.", 404);
    if (deal.sellerId !== user.id) return apiError("Only the seller can mark this deal complete.", 403);
    if (deal.status !== "FUNDED") return apiError("This deal cannot be marked complete in its current state.", 400);

    await db.$transaction([
      db.escrowDeal.update({ where: { id: deal.id }, data: { status: "SELLER_COMPLETED" } }),
      db.escrowEvent.create({ data: { escrowDealId: deal.id, type: "SELLER_COMPLETED", actorUserId: user.id } }),
    ]);

    await notifyUser({
      userId: deal.buyerId,
      type: "ESCROW",
      title: "Seller marked deal complete",
      message: `The seller has completed their side of "${deal.title}". Please confirm receipt to release funds.`,
    });

    return apiOk({});
  } catch (err) {
    return handleApiError(err);
  }
}
