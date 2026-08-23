import { NextRequest } from "next/server";
import { requireUser } from "@/lib/session";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { computeSwapQuote } from "@/lib/exchange";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!user) return apiError("Not authenticated.", 401);

    const url = new URL(req.url);
    const fromAssetId = url.searchParams.get("fromAssetId");
    const toAssetId = url.searchParams.get("toAssetId");
    const fromAmount = Number(url.searchParams.get("fromAmount") ?? "0");

    if (!fromAssetId || !toAssetId || !(fromAmount > 0)) {
      return apiOk({ quote: null });
    }

    const quote = await computeSwapQuote(fromAssetId, toAssetId, fromAmount);
    if (!quote) return apiError("Invalid asset pair.", 400);

    return apiOk({
      quote: {
        rate: quote.rate,
        feePercent: quote.feePercent,
        fee: quote.fee,
        toAmount: quote.toAmount,
        requireManualApproval: quote.requireManualApproval,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
