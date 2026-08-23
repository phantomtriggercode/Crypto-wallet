import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { postLedgerEntry } from "@/lib/ledger";
import { generateRef } from "@/lib/ref";
import { getSettings } from "@/lib/settings";
import { notifyUser } from "@/lib/notify";
import { computeSwapQuote } from "@/lib/exchange";

const schema = z.object({
  fromAssetId: z.string().min(1),
  toAssetId: z.string().min(1),
  fromAmount: z.coerce.number().positive(),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!user) return apiError("Not authenticated.", 401);
    if (user.swapsLocked) return apiError("Swaps are currently locked on your account.", 403);

    const settings = await getSettings();
    if (settings.maintenance.website || settings.maintenance.swaps) {
      return apiError("Swaps are temporarily unavailable for maintenance.", 503);
    }

    const body = schema.parse(await req.json());
    if (body.fromAssetId === body.toAssetId) return apiError("Choose two different assets.", 400);

    const quote = await computeSwapQuote(body.fromAssetId, body.toAssetId, body.fromAmount);
    if (!quote) return apiError("Invalid asset pair.", 400);
    const { fromAsset, toAsset, pair, rate, fee, toAmount, requireManualApproval } = quote;

    if (!fromAsset.enabled || !fromAsset.swapEnabled || !toAsset.enabled || !toAsset.swapEnabled) {
      return apiError("Swap is not available for one of the selected assets.", 400);
    }
    if (pair && !pair.enabled) return apiError("This trading pair is currently disabled.", 400);
    if (pair && Number(pair.minAmount) > 0 && body.fromAmount < Number(pair.minAmount)) {
      return apiError(`Minimum swap amount is ${pair.minAmount} ${fromAsset.symbol}.`, 400);
    }
    if (pair && Number(pair.maxAmount) > 0 && body.fromAmount > Number(pair.maxAmount)) {
      return apiError(`Maximum swap amount is ${pair.maxAmount} ${fromAsset.symbol}.`, 400);
    }

    const isManual = requireManualApproval || settings.swapApprovalMode === "MANUAL";

    const swap = await db.$transaction(async (tx) => {
      if (!isManual) {
        await postLedgerEntry(tx, {
          userId: user.id,
          assetId: fromAsset.id,
          type: "SWAP_DEBIT",
          direction: "DEBIT",
          amount: body.fromAmount,
          referenceType: "Swap",
          reason: `Swap ${fromAsset.symbol} → ${toAsset.symbol}`,
        });
        await postLedgerEntry(tx, {
          userId: user.id,
          assetId: toAsset.id,
          type: "SWAP_CREDIT",
          direction: "CREDIT",
          amount: toAmount,
          referenceType: "Swap",
          reason: `Swap ${fromAsset.symbol} → ${toAsset.symbol}`,
        });
      }

      return tx.swap.create({
        data: {
          swapRef: generateRef("SWP"),
          userId: user.id,
          fromAssetId: fromAsset.id,
          toAssetId: toAsset.id,
          fromAmount: body.fromAmount,
          toAmount,
          rate,
          platformFee: fee,
          status: isManual ? "PENDING" : "COMPLETED",
        },
      });
    });

    await notifyUser({
      userId: user.id,
      type: "SWAP",
      title: isManual ? "Swap submitted for review" : "Swap completed",
      message: isManual
        ? `Your swap of ${body.fromAmount} ${fromAsset.symbol} to ${toAsset.symbol} is pending admin approval.`
        : `Swapped ${body.fromAmount} ${fromAsset.symbol} for ${toAmount.toFixed(8)} ${toAsset.symbol}.`,
      emailTemplateKey: isManual ? undefined : "swap_completed",
      emailVars: { amount: body.fromAmount, asset: fromAsset.symbol },
    });

    return apiOk({ swap }, 201);
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

    const swaps = await db.swap.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take,
      include: { fromAsset: true, toAsset: true },
    });

    return apiOk({ swaps });
  } catch (err) {
    return handleApiError(err);
  }
}
