"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch, ApiClientError } from "@/lib/apiClient";

type Asset = { id: string; symbol: string; name: string; demoPrice: string; priceChange24h: string };

export default function AdminMarketPricesPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [edits, setEdits] = useState<Record<string, { demoPrice: string; priceChange24h: string }>>({});

  function load() {
    apiFetch<{ assets: Asset[] }>("/api/admin/assets").then((res) => {
      setAssets(res.assets);
      setEdits(Object.fromEntries(res.assets.map((a) => [a.id, { demoPrice: a.demoPrice, priceChange24h: a.priceChange24h }])));
    });
  }

  useEffect(load, []);

  async function save(id: string) {
    try {
      await apiFetch(`/api/admin/assets/${id}`, { method: "PATCH", body: JSON.stringify(edits[id]) });
      toast.success("Price updated.");
      load();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to update price.");
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold">Manual Prices</h1>
      <p className="text-sm text-muted">Set demo prices when Price Mode is Simulated (configure in General Settings).</p>
      <Card className="divide-y divide-border p-0">
        {assets.map((a) => (
          <div key={a.id} className="flex items-center gap-3 px-5 py-3">
            <span className="w-16 text-sm font-medium">{a.symbol}</span>
            <Input
              type="number"
              className="flex-1"
              value={edits[a.id]?.demoPrice ?? ""}
              onChange={(e) => setEdits((s) => ({ ...s, [a.id]: { ...s[a.id], demoPrice: e.target.value } }))}
            />
            <Input
              type="number"
              className="w-28"
              placeholder="24h %"
              value={edits[a.id]?.priceChange24h ?? ""}
              onChange={(e) => setEdits((s) => ({ ...s, [a.id]: { ...s[a.id], priceChange24h: e.target.value } }))}
            />
            <Button size="sm" onClick={() => save(a.id)}>
              Save
            </Button>
          </div>
        ))}
      </Card>
    </div>
  );
}
