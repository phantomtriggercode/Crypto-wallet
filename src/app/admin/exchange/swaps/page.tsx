"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiClientError } from "@/lib/apiClient";
import { formatAmount, timeAgo } from "@/lib/format";

type Swap = {
  id: string;
  fromAmount: string;
  toAmount: string;
  createdAt: string;
  fromAsset: { symbol: string; decimals: number };
  toAsset: { symbol: string; decimals: number };
  user: { fullName: string; email: string };
};

export default function AdminSwapsPage() {
  const [swaps, setSwaps] = useState<Swap[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  function load() {
    apiFetch<{ swaps: Swap[] }>("/api/admin/swaps?status=PENDING").then((res) => setSwaps(res.swaps));
  }

  useEffect(load, []);

  async function act(id: string, action: string) {
    setBusy(id);
    try {
      await apiFetch(`/api/admin/swaps/${id}/action`, { method: "POST", body: JSON.stringify({ action }) });
      toast.success("Updated.");
      load();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Action failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-xl font-semibold">Pending Swap Approvals</h1>
      <Card className="divide-y divide-border p-0">
        {swaps.length === 0 && <p className="p-6 text-center text-sm text-muted">No swaps pending approval.</p>}
        {swaps.map((s) => (
          <div key={s.id} className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="text-sm font-medium">{s.user.fullName}</p>
              <p className="text-xs text-muted">
                {formatAmount(s.fromAmount, s.fromAsset.decimals)} {s.fromAsset.symbol} → {formatAmount(s.toAmount, s.toAsset.decimals)} {s.toAsset.symbol} ·{" "}
                {timeAgo(s.createdAt)}
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" loading={busy === s.id} onClick={() => act(s.id, "APPROVE")}>
                Approve
              </Button>
              <Button size="sm" variant="danger" loading={busy === s.id} onClick={() => act(s.id, "REJECT")}>
                Reject
              </Button>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
