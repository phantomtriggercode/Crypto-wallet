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
    if (deal.buyerId !== user.id) return apiError("Only the buyer can confirm receipt.", 403);
    if (deal.status !== "SELLER_COMPLETED") return apiError("This deal cannot be confirmed in its current state.", 400);

    await db.$transaction([
      db.escrowDeal.update({ where: { id: deal.id }, data: { status: "AWAITING_ADMIN_RELEASE" } }),
      db.escrowEvent.create({ data: { escrowDealId: deal.id, type: "AWAITING_ADMIN_RELEASE", actorUserId: user.id } }),
    ]);

    await notifyUser({
      userId: deal.sellerId,
      type: "ESCROW",
      title: "Buyer confirmed receipt",
      message: `The buyer confirmed receipt for "${deal.title}". An administrator will now review and release funds.`,
    });

    return apiOk({});
  } catch (err) {
    return handleApiError(err);
  }
}
