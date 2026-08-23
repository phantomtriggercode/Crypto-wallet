"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { apiFetch, ApiClientError } from "@/lib/apiClient";

type Asset = { id: string; symbol: string };
type Pair = {
  id: string;
  buyRate: string;
  sellRate: string;
  platformFeePercent: string;
  minAmount: string;
  maxAmount: string;
  enabled: boolean;
  requireManualApproval: boolean;
  baseAsset: Asset;
  quoteAsset: Asset;
};

export default function ExchangePairsPage() {
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [form, setForm] = useState({ baseAssetId: "", quoteAssetId: "", buyRate: "", sellRate: "", platformFeePercent: "1" });

  function load() {
    apiFetch<{ pairs: Pair[] }>("/api/admin/exchange/pairs").then((res) => setPairs(res.pairs));
  }

  useEffect(() => {
    load();
    apiFetch<{ assets: Asset[] }>("/api/assets").then((res) => {
      setAssets(res.assets);
      if (res.assets[0]) setForm((f) => ({ ...f, baseAssetId: res.assets[0].id, quoteAssetId: res.assets[1]?.id ?? res.assets[0].id }));
    });
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    try {
      await apiFetch("/api/admin/exchange/pairs", { method: "POST", body: JSON.stringify(form) });
      toast.success("Trading pair created.");
      load();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to create pair.");
    }
  }

  async function update(id: string, changes: Partial<Pair>) {
    try {
      await apiFetch(`/api/admin/exchange/pairs/${id}`, { method: "PATCH", body: JSON.stringify(changes) });
      load();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to update pair.");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-xl font-semibold">Trading Pairs</h1>

      <Card>
        <form onSubmit={create} className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Select value={form.baseAssetId} onChange={(e) => setForm({ ...form, baseAssetId: e.target.value })}>
            {assets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.symbol}
              </option>
            ))}
          </Select>
          <Select value={form.quoteAssetId} onChange={(e) => setForm({ ...form, quoteAssetId: e.target.value })}>
            {assets.map((a) => (
              <option key={a.id} value={a.id}>
                {a.symbol}
              </option>
            ))}
          </Select>
          <Input placeholder="Buy rate" type="number" value={form.buyRate} onChange={(e) => setForm({ ...form, buyRate: e.target.value })} />
          <Input placeholder="Sell rate" type="number" value={form.sellRate} onChange={(e) => setForm({ ...form, sellRate: e.target.value })} />
          <Button type="submit" size="sm">
            Create pair
          </Button>
        </form>
      </Card>

      <Card className="divide-y divide-border p-0">
        {pairs.map((p) => (
          <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
            <span className="font-medium">
              {p.baseAsset.symbol}/{p.quoteAsset.symbol}
            </span>
            <span className="text-xs text-muted">
              Buy {p.buyRate} · Sell {p.sellRate} · Fee {p.platformFeePercent}%
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => update(p.id, { enabled: !p.enabled })}
                className={`rounded-full border px-2.5 py-1 text-[11px] ${p.enabled ? "border-success/40 bg-success/10 text-success" : "border-border text-muted"}`}
              >
                {p.enabled ? "Enabled" : "Disabled"}
              </button>
              <button
                onClick={() => update(p.id, { requireManualApproval: !p.requireManualApproval })}
                className={`rounded-full border px-2.5 py-1 text-[11px] ${p.requireManualApproval ? "border-warning/40 bg-warning/10 text-warning" : "border-border text-muted"}`}
              >
                {p.requireManualApproval ? "Manual approval" : "Automatic"}
              </button>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
