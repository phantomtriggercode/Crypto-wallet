import "server-only";
import { db } from "@/lib/db";

export async function computeSwapQuote(fromAssetId: string, toAssetId: string, fromAmount: number) {
  const [fromAsset, toAsset, pair] = await Promise.all([
    db.asset.findUnique({ where: { id: fromAssetId } }),
    db.asset.findUnique({ where: { id: toAssetId } }),
    db.exchangePair.findFirst({
      where: {
        OR: [
          { baseAssetId: fromAssetId, quoteAssetId: toAssetId },
          { baseAssetId: toAssetId, quoteAssetId: fromAssetId },
        ],
      },
    }),
  ]);

  if (!fromAsset || !toAsset) return null;

  const midRate = Number(fromAsset.demoPrice) / Number(toAsset.demoPrice);
  const feePercent = pair
    ? Number(pair.platformFeePercent)
    : (Number(fromAsset.swapFeePercent) + Number(toAsset.swapFeePercent)) / 2;
  const requireManualApproval = pair?.requireManualApproval ?? false;
  const grossToAmount = fromAmount * midRate;
  const fee = grossToAmount * (feePercent / 100);
  const toAmount = grossToAmount - fee;

  return { fromAsset, toAsset, pair, rate: midRate, feePercent, fee, toAmount, requireManualApproval };
}
