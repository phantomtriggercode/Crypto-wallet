import { db } from "@/lib/db";
import { apiOk, handleApiError } from "@/lib/api";

export async function GET() {
  try {
    const pairs = await db.exchangePair.findMany({
      where: { enabled: true },
      include: { baseAsset: { select: { symbol: true } }, quoteAsset: { select: { symbol: true } } },
    });
    return apiOk({
      pairs: pairs.map((p) => ({
        baseSymbol: p.baseAsset.symbol,
        quoteSymbol: p.quoteAsset.symbol,
        buyRate: p.buyRate.toString(),
        sellRate: p.sellRate.toString(),
        platformFeePercent: p.platformFeePercent.toString(),
      })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
