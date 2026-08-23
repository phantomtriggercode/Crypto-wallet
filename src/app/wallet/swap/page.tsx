"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDownUp } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { apiFetch, ApiClientError } from "@/lib/apiClient";
import { formatAmount } from "@/lib/format";

type Asset = { id: string; symbol: string; name: string; decimals: number; swapEnabled: boolean };
type Holding = { asset: { id: string }; available: string };
type Quote = { rate: number; feePercent: number; fee: number; toAmount: number; requireManualApproval: boolean } | null;

export default function SwapPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [fromAssetId, setFromAssetId] = useState("");
  const [toAssetId, setToAssetId] = useState("");
  const [fromAmount, setFromAmount] = useState("");
  const [quote, setQuote] = useState<Quote>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiFetch<{ assets: Asset[] }>("/api/assets").then((res) => {
      const swappable = res.assets.filter((a) => a.swapEnabled);
      setAssets(swappable);
      if (swappable[0]) setFromAssetId(swappable[0].id);
      if (swappable[1]) setToAssetId(swappable[1].id);
    });
    apiFetch<{ holdings: Holding[] }>("/api/wallet/summary").then((res) => setHoldings(res.holdings));
  }, []);

  const hasValidQuoteInput = Boolean(fromAssetId && toAssetId && fromAmount && Number(fromAmount) > 0);

  useEffect(() => {
    if (!hasValidQuoteInput) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      apiFetch<{ quote: Quote }>(
        `/api/swaps/quote?fromAssetId=${fromAssetId}&toAssetId=${toAssetId}&fromAmount=${fromAmount}`,
        { signal: controller.signal }
      )
        .then((res) => setQuote(res.quote))
        .catch(() => setQuote(null));
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [hasValidQuoteInput, fromAssetId, toAssetId, fromAmount]);

  const displayQuote = hasValidQuoteInput ? quote : null;
  const fromAsset = assets.find((a) => a.id === fromAssetId);
  const toAsset = assets.find((a) => a.id === toAssetId);
  const available = holdings.find((h) => h.asset.id === fromAssetId)?.available ?? "0";

  const canSwap = useMemo(
    () => fromAssetId && toAssetId && fromAssetId !== toAssetId && Number(fromAmount) > 0,
    [fromAssetId, toAssetId, fromAmount]
  );

  function swapDirection() {
    setFromAssetId(toAssetId);
    setToAssetId(fromAssetId);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiFetch("/api/swaps", {
        method: "POST",
        body: JSON.stringify({ fromAssetId, toAssetId, fromAmount }),
      });
      toast.success(quote?.requireManualApproval ? "Swap submitted for admin approval." : "Swap completed.");
      setFromAmount("");
      apiFetch<{ holdings: Holding[] }>("/api/wallet/summary").then((res) => setHoldings(res.holdings));
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Swap failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-xl font-semibold">Swap</h1>
      <Card>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="rounded-xl border border-border bg-surface-2/50 p-4">
            <div className="mb-2 flex items-center justify-between text-xs text-muted">
              <span>From</span>
              <span>
                Available: {formatAmount(available, fromAsset?.decimals ?? 8)} {fromAsset?.symbol}
              </span>
            </div>
            <div className="flex gap-2">
              <Input
                type="number"
                step="any"
                min="0"
                required
                placeholder="0.00"
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
                className="flex-1"
              />
              <Select value={fromAssetId} onChange={(e) => setFromAssetId(e.target.value)} className="w-32">
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.symbol}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              type="button"
              onClick={swapDirection}
              className="rounded-full border border-border bg-surface p-2 hover:bg-surface-2"
            >
              <ArrowDownUp className="h-4 w-4" />
            </button>
          </div>

          <div className="rounded-xl border border-border bg-surface-2/50 p-4">
            <div className="mb-2 text-xs text-muted">To (estimated)</div>
            <div className="flex gap-2">
              <Input readOnly value={displayQuote ? displayQuote.toAmount.toFixed(8) : ""} placeholder="0.00" className="flex-1" />
              <Select value={toAssetId} onChange={(e) => setToAssetId(e.target.value)} className="w-32">
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.symbol}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {displayQuote && (
            <div className="space-y-1 rounded-xl border border-border bg-surface-2/50 px-4 py-3 text-sm">
              <div className="flex justify-between text-muted">
                <span>Exchange rate</span>
                <span>
                  1 {fromAsset?.symbol} = {displayQuote.rate.toFixed(6)} {toAsset?.symbol}
                </span>
              </div>
              <div className="flex justify-between text-muted">
                <span>Platform fee</span>
                <span>{displayQuote.feePercent}%</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Estimated amount</span>
                <span>
                  {displayQuote.toAmount.toFixed(8)} {toAsset?.symbol}
                </span>
              </div>
              {displayQuote.requireManualApproval && (
                <p className="pt-1 text-xs text-warning">This pair requires manual admin approval before crediting.</p>
              )}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={!canSwap} loading={submitting}>
            Confirm Swap
          </Button>
        </form>
      </Card>
    </div>
  );
}
