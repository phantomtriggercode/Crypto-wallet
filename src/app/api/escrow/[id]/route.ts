import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { apiOk, apiError, handleApiError } from "@/lib/api";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    if (!user) return apiError("Not authenticated.", 401);

    const { id } = await params;
    const deal = await db.escrowDeal.findUnique({
      where: { id },
      include: {
        asset: true,
        buyer: { select: { id: true, fullName: true, email: true } },
        seller: { select: { id: true, fullName: true, email: true } },
        events: { orderBy: { createdAt: "asc" } },
        disputes: { include: { messages: { orderBy: { createdAt: "asc" } } } },
      },
    });

    if (!deal || (deal.buyerId !== user.id && deal.sellerId !== user.id && !user.isAdmin)) {
      return apiError("Escrow deal not found.", 404);
    }

    return apiOk({ deal });
  } catch (err) {
    return handleApiError(err);
  }
}
