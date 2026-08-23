import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { generateRef } from "@/lib/ref";
import { getSettings } from "@/lib/settings";
import { notifyUser } from "@/lib/notify";

const schema = z.object({
  assetId: z.string().min(1),
  networkId: z.string().min(1),
  amount: z.coerce.number().positive(),
  txHash: z.string().trim().max(200).optional().or(z.literal("")),
  senderAddress: z.string().trim().max(200).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!user) return apiError("Not authenticated.", 401);
    if (user.depositsLocked) return apiError("Deposits are currently locked on your account.", 403);

    const settings = await getSettings();
    if (settings.maintenance.website || settings.maintenance.deposits) {
      return apiError("Deposits are temporarily unavailable for maintenance.", 503);
    }

    const body = schema.parse(await req.json());
    const asset = await db.asset.findUnique({ where: { id: body.assetId } });
    if (!asset || !asset.enabled || !asset.depositEnabled) return apiError("This asset is not available for deposit.", 400);

    const network = await db.network.findUnique({ where: { id: body.networkId } });
    if (!network || network.assetId !== asset.id || !network.enabled) {
      return apiError("This network is not available for the selected asset.", 400);
    }

    const minDeposit = Math.max(Number(asset.minDeposit), Number(network.minDeposit));
    if (body.amount < minDeposit) {
      return apiError(`Minimum deposit for ${asset.symbol} on ${network.name} is ${minDeposit}.`, 400);
    }

    const deposit = await db.deposit.create({
      data: {
        depositRef: generateRef("DEP"),
        userId: user.id,
        assetId: asset.id,
        networkId: network.id,
        amount: body.amount,
        receivingAddress: network.depositAddress,
        txHash: body.txHash || null,
        senderAddress: body.senderAddress || null,
        notes: body.notes || null,
      },
    });

    await notifyUser({
      userId: user.id,
      type: "DEPOSIT",
      title: "Deposit request received",
      message: `Your deposit request for ${body.amount} ${asset.symbol} has been received and is pending review.`,
    });

    return apiOk({ deposit }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!user) return apiError("Not authenticated.", 401);

    const url = new URL(req.url);
    const take = Math.min(Number(url.searchParams.get("take") ?? 20), 100);
    const cursor = url.searchParams.get("cursor") ?? undefined;

    const deposits = await db.deposit.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: { asset: true, network: true },
    });

    return apiOk({ deposits, nextCursor: deposits.length === take ? deposits[deposits.length - 1]?.id : null });
  } catch (err) {
    return handleApiError(err);
  }
}
