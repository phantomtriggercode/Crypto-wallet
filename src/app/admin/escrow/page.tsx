"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/badge";
import { apiFetch, ApiClientError } from "@/lib/apiClient";
import { formatAmount, timeAgo } from "@/lib/format";

type Deal = {
  id: string;
  escrowRef: string;
  title: string;
  amount: string;
  status: string;
  createdAt: string;
  asset: { symbol: string; decimals: number };
  buyer: { fullName: string; email: string };
  seller: { fullName: string; email: string };
  disputes: { id: string }[];
};

const STATUSES = ["", "FUNDED", "SELLER_COMPLETED", "AWAITING_ADMIN_RELEASE", "DISPUTED", "RELEASED", "REFUNDED"];

export default function AdminEscrowPage() {
  const [status, setStatus] = useState("AWAITING_ADMIN_RELEASE");
  const [deals, setDeals] = useState<Deal[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  function load() {
    apiFetch<{ deals: Deal[] }>(`/api/admin/escrow${status ? `?status=${status}` : ""}`).then((res) => setDeals(res.deals));
  }

  useEffect(load, [status]);

  async function act(id: string, kind: "release" | "refund") {
    setBusy(id);
    try {
      await apiFetch(`/api/admin/escrow/${id}/${kind}`, { method: "POST", body: JSON.stringify({}) });
      toast.success(kind === "release" ? "Released to seller." : "Refunded to buyer.");
      load();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Action failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Escrow Deals</h1>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-auto">
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s ? s.replaceAll("_", " ") : "All"}
            </option>
          ))}
        </Select>
      </div>

      <Card className="divide-y divide-border p-0">
        {deals.length === 0 && <p className="p-6 text-center text-sm text-muted">No deals in this status.</p>}
        {deals.map((d) => (
          <div key={d.id} className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="text-sm font-medium">{d.title}</p>
              <p className="text-xs text-muted">
                {d.escrowRef} · Buyer: {d.buyer.email} · Seller: {d.seller.email} · {timeAgo(d.createdAt)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium">
                  {formatAmount(d.amount, d.asset.decimals)} {d.asset.symbol}
                </p>
                <StatusBadge status={d.status} />
              </div>
              {["AWAITING_ADMIN_RELEASE", "DISPUTED"].includes(d.status) && (
                <div className="flex gap-1">
                  <Button size="sm" loading={busy === d.id} onClick={() => act(d.id, "release")}>
                    Release
                  </Button>
                  <Button size="sm" variant="danger" loading={busy === d.id} onClick={() => act(d.id, "refund")}>
                    Refund
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
