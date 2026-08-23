"use client";

import { useCallback, useEffect, useState, use as usePromise } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/badge";
import { apiFetch, ApiClientError } from "@/lib/apiClient";
import { formatAmount, formatDate } from "@/lib/format";

type Deal = {
  id: string;
  escrowRef: string;
  title: string;
  description: string | null;
  terms: string | null;
  amount: string;
  status: string;
  createdAt: string;
  buyerId: string;
  sellerId: string;
  asset: { symbol: string; decimals: number };
  buyer: { id: string; fullName: string; email: string };
  seller: { id: string; fullName: string; email: string };
  events: { id: string; type: string; note: string | null; createdAt: string }[];
  disputes: { id: string; status: string; reason: string; messages: { id: string; message: string; senderUserId: string | null; senderAdminId: string | null; createdAt: string }[] }[];
};
type Me = { id: string };

export default function EscrowDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params);
  const [deal, setDeal] = useState<Deal | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [busy, setBusy] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [showDisputeForm, setShowDisputeForm] = useState(false);

  const load = useCallback(() => {
    apiFetch<{ deal: Deal }>(`/api/escrow/${id}`).then((res) => setDeal(res.deal));
  }, [id]);

  useEffect(() => {
    load();
    apiFetch<{ user: Me }>("/api/auth/me").then((res) => setMe(res.user));
  }, [id, load]);

  async function runAction(path: string, body?: unknown) {
    setBusy(true);
    try {
      await apiFetch(`/api/escrow/${id}${path}`, { method: "POST", body: body ? JSON.stringify(body) : undefined });
      toast.success("Done.");
      load();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  if (!deal || !me) return null;

  const isBuyer = deal.buyerId === me.id;
  const isSeller = deal.sellerId === me.id;
  const openDispute = deal.disputes.find((d) => d.status === "OPEN");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{deal.title}</h1>
          <p className="text-xs text-muted">{deal.escrowRef}</p>
        </div>
        <StatusBadge status={deal.status} />
      </div>

      <Card>
        <dl className="space-y-2 text-sm">
          <Row label="Amount" value={`${formatAmount(deal.amount, deal.asset.decimals)} ${deal.asset.symbol}`} />
          <Row label="Buyer" value={`${deal.buyer.fullName} (${deal.buyer.email})`} />
          <Row label="Seller" value={`${deal.seller.fullName} (${deal.seller.email})`} />
          {deal.description && <Row label="Description" value={deal.description} />}
          {deal.terms && <Row label="Terms" value={deal.terms} />}
          <Row label="Created" value={formatDate(deal.createdAt)} />
        </dl>

        <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
          {isBuyer && deal.status === "CREATED" && (
            <Button size="sm" loading={busy} onClick={() => runAction("/fund")}>
              Fund escrow
            </Button>
          )}
          {isSeller && deal.status === "FUNDED" && (
            <Button size="sm" loading={busy} onClick={() => runAction("/complete")}>
              Mark deal complete
            </Button>
          )}
          {isBuyer && deal.status === "SELLER_COMPLETED" && (
            <Button size="sm" loading={busy} onClick={() => runAction("/confirm")}>
              Confirm receipt
            </Button>
          )}
          {(isBuyer || isSeller) && ["FUNDED", "SELLER_COMPLETED", "AWAITING_ADMIN_RELEASE"].includes(deal.status) && (
            <Button size="sm" variant="danger" onClick={() => setShowDisputeForm((s) => !s)}>
              Open dispute
            </Button>
          )}
        </div>

        {deal.status === "FUNDED" && (
          <p className="mt-3 rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">
            Funds are currently locked in escrow.
          </p>
        )}
        {deal.status === "AWAITING_ADMIN_RELEASE" && (
          <p className="mt-3 rounded-lg bg-primary/10 px-3 py-2 text-xs text-primary">
            Awaiting admin review before funds are released to the seller.
          </p>
        )}

        {showDisputeForm && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              runAction("/dispute", { reason: disputeReason });
              setShowDisputeForm(false);
              setDisputeReason("");
            }}
            className="mt-4 space-y-2 border-t border-border pt-4"
          >
            <Textarea
              required
              minLength={10}
              rows={3}
              placeholder="Explain the issue…"
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
            />
            <Button type="submit" size="sm" variant="danger">
              Submit dispute
            </Button>
          </form>
        )}
      </Card>

      {openDispute && <DisputeThread disputeId={openDispute.id} messages={openDispute.messages} onSent={load} />}

      <Card>
        <h2 className="mb-3 text-sm font-semibold">Timeline</h2>
        <div className="space-y-2 text-sm">
          {deal.events.map((e) => (
            <div key={e.id} className="flex justify-between text-xs">
              <span className="text-muted">{e.type.replaceAll("_", " ")}</span>
              <span className="text-muted">{formatDate(e.createdAt)}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}

function DisputeThread({
  disputeId,
  messages,
  onSent,
}: {
  disputeId: string;
  messages: { id: string; message: string; senderAdminId: string | null; createdAt: string }[];
  onSent: () => void;
}) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      await apiFetch(`/api/escrow/disputes/${disputeId}/messages`, { method: "POST", body: JSON.stringify({ message: text }) });
      setText("");
      onSent();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to send message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Card>
      <h2 className="mb-3 text-sm font-semibold text-danger">Dispute in progress</h2>
      <div className="mb-3 max-h-64 space-y-2 overflow-y-auto">
        {messages.map((m) => (
          <div key={m.id} className={`rounded-lg px-3 py-2 text-sm ${m.senderAdminId ? "bg-primary/10" : "bg-surface-2/60"}`}>
            <p>{m.message}</p>
            <p className="mt-1 text-[10px] text-muted">
              {m.senderAdminId ? "Admin" : "You / counterparty"} · {formatDate(m.createdAt)}
            </p>
          </div>
        ))}
      </div>
      <form onSubmit={send} className="flex gap-2">
        <Textarea rows={1} value={text} onChange={(e) => setText(e.target.value)} placeholder="Add evidence or a message…" />
        <Button type="submit" size="sm" loading={sending}>
          Send
        </Button>
      </form>
    </Card>
  );
}
