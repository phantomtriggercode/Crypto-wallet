import { requireUser } from "@/lib/session";
import { getWalletSummary } from "@/lib/ledger";
import { apiOk, apiError, handleApiError } from "@/lib/api";

export async function GET() {
  try {
    const user = await requireUser();
    if (!user) return apiError("Not authenticated.", 401);

    const { holdings, totalValueUsd } = await getWalletSummary(user.id);
    return apiOk({
      totalValueUsd: totalValueUsd.toString(),
      holdings: holdings.map((h) => ({
        asset: {
          id: h.asset.id,
          symbol: h.asset.symbol,
          name: h.asset.name,
          iconUrl: h.asset.iconUrl,
          decimals: h.asset.decimals,
          demoPrice: h.asset.demoPrice.toString(),
          priceChange24h: h.asset.priceChange24h.toString(),
          depositEnabled: h.asset.depositEnabled,
          withdrawalEnabled: h.asset.withdrawalEnabled,
          swapEnabled: h.asset.swapEnabled,
        },
        available: h.available.toString(),
        locked: h.locked.toString(),
        valueUsd: h.valueUsd.toString(),
      })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
