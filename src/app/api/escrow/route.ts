import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { generateRef } from "@/lib/ref";
import { getSettings } from "@/lib/settings";
import { notifyUser } from "@/lib/notify";

const schema = z.object({
  title: z.string().trim().min(3).max(120),
  counterpartyEmail: z.email().trim().toLowerCase(),
  role: z.enum(["BUYER", "SELLER"]),
  assetId: z.string().min(1),
  amount: z.coerce.number().positive(),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  terms: z.string().trim().max(2000).optional().or(z.literal("")),
  expiresInDays: z.coerce.number().int().min(1).max(90).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!user) return apiError("Not authenticated.", 401);
    if (user.escrowLocked) return apiError("Escrow is currently locked on your account.", 403);

    const settings = await getSettings();
    if (settings.maintenance.website || settings.maintenance.escrow) {
      return apiError("Escrow is temporarily unavailable for maintenance.", 503);
    }

    const body = schema.parse(await req.json());

    const counterparty = await db.user.findUnique({ where: { email: body.counterpartyEmail } });
    if (!counterparty) return apiError("No account found for that counterparty email.", 404);
    if (counterparty.id === user.id) return apiError("You cannot open an escrow deal with yourself.", 400);

    const asset = await db.asset.findUnique({ where: { id: body.assetId } });
    if (!asset || !asset.enabled || !asset.escrowEnabled) return apiError("This asset is not available for escrow.", 400);

    const buyerId = body.role === "BUYER" ? user.id : counterparty.id;
    const sellerId = body.role === "SELLER" ? user.id : counterparty.id;

    const deal = await db.escrowDeal.create({
      data: {
        escrowRef: generateRef("ESC"),
        title: body.title,
        buyerId,
        sellerId,
        assetId: asset.id,
        amount: body.amount,
        description: body.description || null,
        terms: body.terms || null,
        expiresAt: body.expiresInDays ? new Date(Date.now() + body.expiresInDays * 86400000) : null,
        events: { create: { type: "CREATED", actorUserId: user.id } },
      },
    });

    const otherPartyId = body.role === "BUYER" ? sellerId : buyerId;
    await notifyUser({
      userId: otherPartyId,
      type: "ESCROW",
      title: "New escrow deal",
      message: `${user.fullName} opened an escrow deal "${body.title}" with you.`,
      emailTemplateKey: "escrow_created",
      emailVars: { title: body.title },
    });

    return apiOk({ deal }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function GET() {
  try {
    const user = await requireUser();
    if (!user) return apiError("Not authenticated.", 401);

    const deals = await db.escrowDeal.findMany({
      where: { OR: [{ buyerId: user.id }, { sellerId: user.id }] },
      orderBy: { createdAt: "desc" },
      include: { asset: true, buyer: { select: { fullName: true, email: true } }, seller: { select: { fullName: true, email: true } } },
    });

    return apiOk({ deals });
  } catch (err) {
    return handleApiError(err);
  }
}
