"use client";

import { useEffect, useMemo, useState } from "react";
import { Input, Select } from "@/components/ui/input";
import { apiFetch } from "@/lib/apiClient";

type AssetLite = { symbol: string; name: string; demoPrice: string };
type Pair = { baseSymbol: string; quoteSymbol: string; buyRate: string; sellRate: string; platformFeePercent: string };

export function ConversionCalculator({ assets, mode }: { assets: AssetLite[]; mode: "mid" | "pair" }) {
  const [fromSymbol, setFromSymbol] = useState(assets[0]?.symbol ?? "");
  const [toSymbol, setToSymbol] = useState(assets[1]?.symbol ?? assets[0]?.symbol ?? "");
  const [amount, setAmount] = useState("1");
  const [pairs, setPairs] = useState<Pair[]>([]);

  useEffect(() => {
    if (mode === "pair") {
      apiFetch<{ pairs: Pair[] }>("/api/exchange-pairs").then((res) => setPairs(res.pairs));
    }
  }, [mode]);

  const result = useMemo(() => {
    const from = assets.find((a) => a.symbol === fromSymbol);
    const to = assets.find((a) => a.symbol === toSymbol);
    const amt = Number(amount) || 0;
    if (!from || !to) return null;

    if (mode === "pair") {
      const pair = pairs.find((p) => p.baseSymbol === fromSymbol && p.quoteSymbol === toSymbol);
      if (pair) {
        const gross = amt * Number(pair.sellRate);
        const fee = gross * (Number(pair.platformFeePercent) / 100);
        return { output: gross - fee, feePercent: Number(pair.platformFeePercent), usedPair: true };
      }
    }

    const midRate = Number(from.demoPrice) / Number(to.demoPrice);
    return { output: amt * midRate, feePercent: 0, usedPair: false };
  }, [assets, pairs, fromSymbol, toSymbol, amount, mode]);

  if (assets.length < 2) return <p className="text-sm text-muted">Not enough assets configured yet.</p>;

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input type="number" step="any" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} className="flex-1" />
        <Select value={fromSymbol} onChange={(e) => setFromSymbol(e.target.value)} className="w-24">
          {assets.map((a) => (
            <option key={a.symbol} value={a.symbol}>
              {a.symbol}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex gap-2">
        <Input readOnly value={result ? result.output.toFixed(8) : ""} className="flex-1" />
        <Select value={toSymbol} onChange={(e) => setToSymbol(e.target.value)} className="w-24">
          {assets.map((a) => (
            <option key={a.symbol} value={a.symbol}>
              {a.symbol}
            </option>
          ))}
        </Select>
      </div>
      <p className="text-xs text-muted">
        {result?.usedPair ? `Configured rate, ${result.feePercent}% platform fee` : "Estimated mid-market rate — no fees applied"}
      </p>
    </div>
  );
}
