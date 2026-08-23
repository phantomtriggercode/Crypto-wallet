"use client";

import { useEffect, useState, use as usePromise } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/badge";
import { apiFetch, ApiClientError } from "@/lib/apiClient";
import { formatAmount, formatDate } from "@/lib/format";

type Deposit = {
  id: string;
  depositRef: string;
  amount: string;
  status: string;
  txHash: string | null;
  senderAddress: string | null;
  notes: string | null;
  receivingAddress: string;
  adminNote: string | null;
  createdAt: string;
  asset: { symbol: string; decimals: number };
  network: { name: string };
  user: { id: string; fullName: string; email: string; kycStatus: string };
};
type HistoryItem = { id: string; depositRef?: string; withdrawalRef?: string; amount: string; status: string; createdAt: string };

export default function AdminDepositDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params);
  const [deposit, setDeposit] = useState<Deposit | null>(null);
  const [previousDeposits, setPreviousDeposits] = useState<HistoryItem[]>([]);
  const [previousWithdrawals, setPreviousWithdrawals] = useState<HistoryItem[]>([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    apiFetch<{ deposit: Deposit; previousDeposits: HistoryItem[]; previousWithdrawals: HistoryItem[] }>(`/api/admin/deposits/${id}`).then((res) => {
      setDeposit(res.deposit);
      setPreviousDeposits(res.previousDeposits);
      setPreviousWithdrawals(res.previousWithdrawals);
      setNote(res.deposit.adminNote ?? "");
    });
  }

  useEffect(load, [id]);

  async function act(action: string) {
    setBusy(true);
    try {
      await apiFetch(`/api/admin/deposits/${id}/action`, { method: "POST", body: JSON.stringify({ action, adminNote: note }) });
      toast.success("Updated.");
      load();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  if (!deposit) return null;
  const isFinal = deposit.status === "CREDITED" || deposit.status === "REJECTED";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Deposit {deposit.depositRef}</h1>
        <StatusBadge status={deposit.status} />
      </div>

      <Card>
        <dl className="space-y-2 text-sm">
          <Row label="User" value={`${deposit.user.fullName} (${deposit.user.email})`} />
          <Row label="KYC status" value={deposit.user.kycStatus} />
          <Row label="Asset" value={deposit.asset.symbol} />
          <Row label="Network" value={deposit.network.name} />
          <Row label="Amount" value={`${formatAmount(deposit.amount, deposit.asset.decimals)} ${deposit.asset.symbol}`} />
          <Row label="Receiving address" value={deposit.receivingAddress} mono />
          {deposit.txHash && <Row label="Transaction hash" value={deposit.txHash} mono />}
          {deposit.senderAddress && <Row label="Sender address" value={deposit.senderAddress} mono />}
          {deposit.notes && <Row label="User notes" value={deposit.notes} />}
          <Row label="Submitted" value={formatDate(deposit.createdAt)} />
        </dl>

        <div className="mt-4 border-t border-border pt-4">
          <Textarea rows={2} placeholder="Internal admin note…" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="mt-3 flex flex-wrap gap-2">
            {!isFinal && (
              <>
                <Button size="sm" loading={busy} onClick={() => act("APPROVE")}>
                  Approve Deposit
                </Button>
                <Button size="sm" variant="danger" loading={busy} onClick={() => act("REJECT")}>
                  Reject Deposit
                </Button>
                <Button size="sm" variant="secondary" loading={busy} onClick={() => act("UNDER_REVIEW")}>
                  Put Under Review
                </Button>
              </>
            )}
            <Button size="sm" variant="ghost" loading={busy} onClick={() => act("NOTE")}>
              Save Note
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <h2 className="mb-2 text-sm font-semibold">Previous deposits</h2>
          {previousDeposits.map((d) => (
            <div key={d.id} className="flex justify-between py-1 text-xs">
              <span>{d.amount}</span>
              <StatusBadge status={d.status} />
            </div>
          ))}
        </Card>
        <Card>
          <h2 className="mb-2 text-sm font-semibold">Previous withdrawals</h2>
          {previousWithdrawals.map((w) => (
            <div key={w.id} className="flex justify-between py-1 text-xs">
              <span>{w.amount}</span>
              <StatusBadge status={w.status} />
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className={`text-right ${mono ? "break-all font-mono text-xs" : ""}`}>{value}</dd>
    </div>
  );
}
