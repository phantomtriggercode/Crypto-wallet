import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { notifyUser } from "@/lib/notify";

const schema = z.object({ reason: z.string().trim().min(10).max(2000) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    if (!user) return apiError("Not authenticated.", 401);

    const { id } = await params;
    const deal = await db.escrowDeal.findUnique({ where: { id } });
    if (!deal) return apiError("Escrow deal not found.", 404);
    if (deal.buyerId !== user.id && deal.sellerId !== user.id) return apiError("Not part of this deal.", 403);
    if (!["FUNDED", "SELLER_COMPLETED", "AWAITING_ADMIN_RELEASE"].includes(deal.status)) {
      return apiError("A dispute cannot be opened in this deal's current state.", 400);
    }

    const { reason } = schema.parse(await req.json());

    const dispute = await db.$transaction(async (tx) => {
      const d = await tx.escrowDispute.create({
        data: { escrowDealId: deal.id, openedByUserId: user.id, reason, messages: { create: { senderUserId: user.id, message: reason } } },
      });
      await tx.escrowDeal.update({ where: { id: deal.id }, data: { status: "DISPUTED" } });
      await tx.escrowEvent.create({ data: { escrowDealId: deal.id, type: "DISPUTED", actorUserId: user.id, note: reason } });
      return d;
    });

    const otherPartyId = deal.buyerId === user.id ? deal.sellerId : deal.buyerId;
    await notifyUser({
      userId: otherPartyId,
      type: "ESCROW",
      title: "Escrow dispute opened",
      message: `A dispute was opened for "${deal.title}". Our team will review the case.`,
      emailTemplateKey: "escrow_dispute",
      emailVars: { title: deal.title },
    });

    return apiOk({ dispute }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
