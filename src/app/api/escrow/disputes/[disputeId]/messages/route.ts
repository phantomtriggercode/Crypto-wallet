import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { apiOk, apiError, handleApiError } from "@/lib/api";

const schema = z.object({ message: z.string().trim().min(1).max(2000), attachmentUrl: z.string().url().optional() });

export async function POST(req: NextRequest, { params }: { params: Promise<{ disputeId: string }> }) {
  try {
    const user = await requireUser();
    if (!user) return apiError("Not authenticated.", 401);

    const { disputeId } = await params;
    const dispute = await db.escrowDispute.findUnique({ where: { id: disputeId }, include: { escrowDeal: true } });
    if (!dispute) return apiError("Dispute not found.", 404);

    const isParty = [dispute.escrowDeal.buyerId, dispute.escrowDeal.sellerId].includes(user.id);
    if (!isParty && !user.isAdmin) return apiError("Not authorized for this dispute.", 403);

    const { message, attachmentUrl } = schema.parse(await req.json());
    const record = await db.escrowDisputeMessage.create({
      data: {
        disputeId,
        senderUserId: user.isAdmin ? null : user.id,
        senderAdminId: user.isAdmin ? user.id : null,
        message,
        attachmentUrl,
      },
    });

    return apiOk({ message: record }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
