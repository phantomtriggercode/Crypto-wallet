"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { apiFetch, ApiClientError } from "@/lib/apiClient";
import { formatAmount, formatDate } from "@/lib/format";

type Dispute = {
  id: string;
  reason: string;
  createdAt: string;
  messages: { id: string; message: string; senderAdminId: string | null; createdAt: string }[];
  escrowDeal: {
    id: string;
    title: string;
    amount: string;
    asset: { symbol: string; decimals: number };
    buyer: { fullName: string; email: string };
    seller: { fullName: string; email: string };
  };
};

export default function AdminEscrowDisputesPage() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<Record<string, string>>({});

  function load() {
    apiFetch<{ disputes: Dispute[] }>("/api/admin/escrow/disputes?status=OPEN").then((res) => setDisputes(res.disputes));
  }

  useEffect(load, []);

  async function resolve(dealId: string, kind: "release" | "refund") {
    setBusy(dealId);
    try {
      await apiFetch(`/api/admin/escrow/${dealId}/${kind}`, { method: "POST", body: JSON.stringify({}) });
      toast.success("Dispute resolved.");
      load();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Action failed.");
    } finally {
      setBusy(null);
    }
  }

  async function reply(disputeId: string) {
    const text = replyText[disputeId];
    if (!text) return;
    try {
      await apiFetch(`/api/escrow/disputes/${disputeId}/messages`, { method: "POST", body: JSON.stringify({ message: text }) });
      setReplyText((r) => ({ ...r, [disputeId]: "" }));
      load();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to send.");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-xl font-semibold">Escrow Disputes</h1>
      {disputes.length === 0 && <p className="text-sm text-muted">No open disputes.</p>}
      {disputes.map((d) => (
        <Card key={d.id}>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{d.escrowDeal.title}</p>
              <p className="text-xs text-muted">
                Buyer: {d.escrowDeal.buyer.email} · Seller: {d.escrowDeal.seller.email} ·{" "}
                {formatAmount(d.escrowDeal.amount, d.escrowDeal.asset.decimals)} {d.escrowDeal.asset.symbol}
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" loading={busy === d.escrowDeal.id} onClick={() => resolve(d.escrowDeal.id, "release")}>
                Release to Seller
              </Button>
              <Button size="sm" variant="danger" loading={busy === d.escrowDeal.id} onClick={() => resolve(d.escrowDeal.id, "refund")}>
                Refund Buyer
              </Button>
            </div>
          </div>
          <div className="mb-2 max-h-48 space-y-2 overflow-y-auto rounded-lg bg-surface-2/40 p-3">
            {d.messages.map((m) => (
              <div key={m.id} className="text-xs">
                <span className="font-medium">{m.senderAdminId ? "Admin" : "Party"}:</span> {m.message}
                <span className="ml-2 text-muted">{formatDate(m.createdAt)}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Textarea
              rows={1}
              placeholder="Reply / request more information…"
              value={replyText[d.id] ?? ""}
              onChange={(e) => setReplyText((r) => ({ ...r, [d.id]: e.target.value }))}
            />
            <Button size="sm" variant="secondary" onClick={() => reply(d.id)}>
              Send
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
