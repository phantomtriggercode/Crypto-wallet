"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, Textarea } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/badge";
import { apiFetch, ApiClientError } from "@/lib/apiClient";
import { formatAmount, timeAgo } from "@/lib/format";

type Withdrawal = {
  id: string;
  withdrawalRef: string;
  amount: string;
  totalDeducted: string;
  destinationAddress: string;
  status: string;
  createdAt: string;
  asset: { symbol: string; decimals: number };
  network: { name: string };
  user: { fullName: string; email: string; kycStatus: string; twoFactorEnabled: boolean };
};

const STATUSES = ["PENDING_APPROVAL", "ON_HOLD", "MORE_INFO_REQUIRED", "APPROVED", "REJECTED"];

export default function AdminWithdrawalsPage() {
  const [status, setStatus] = useState("PENDING_APPROVAL");
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    apiFetch<{ withdrawals: Withdrawal[] }>(`/api/admin/withdrawals?status=${status}`).then((res) => setWithdrawals(res.withdrawals));
  }

  useEffect(load, [status]);

  async function act(id: string, action: string) {
    setBusy(true);
    try {
      await apiFetch(`/api/admin/withdrawals/${id}/action`, { method: "POST", body: JSON.stringify({ action, adminNote: note }) });
      toast.success("Updated.");
      setExpanded(null);
      setNote("");
      load();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Withdrawals</h1>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-auto">
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replaceAll("_", " ")}
            </option>
          ))}
        </Select>
      </div>

      <Card className="divide-y divide-border p-0">
        {withdrawals.length === 0 && <p className="p-6 text-center text-sm text-muted">No withdrawals in this status.</p>}
        {withdrawals.map((w) => (
          <div key={w.id} className="px-5 py-4">
            <button className="flex w-full items-center justify-between text-left" onClick={() => setExpanded(expanded === w.id ? null : w.id)}>
              <div>
                <p className="text-sm font-medium">
                  {w.user.fullName} <span className="text-xs text-muted">({w.user.email})</span>
                </p>
                <p className="text-xs text-muted">
                  {w.withdrawalRef} · {timeAgo(w.createdAt)} · KYC {w.user.kycStatus} · 2FA {w.user.twoFactorEnabled ? "on" : "off"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">
                  {formatAmount(w.amount, w.asset.decimals)} {w.asset.symbol}
                </p>
                <StatusBadge status={w.status} />
              </div>
            </button>

            {expanded === w.id && (
              <div className="mt-3 space-y-2 border-t border-border pt-3 text-sm">
                <p>
                  Network: {w.network.name} · Total deducted: {formatAmount(w.totalDeducted, w.asset.decimals)} {w.asset.symbol}
                </p>
                <p className="break-all font-mono text-xs text-muted">Destination: {w.destinationAddress}</p>
                <Textarea rows={2} placeholder="Internal admin note…" value={note} onChange={(e) => setNote(e.target.value)} />
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" loading={busy} onClick={() => act(w.id, "APPROVE")}>
                    Approve
                  </Button>
                  <Button size="sm" variant="danger" loading={busy} onClick={() => act(w.id, "REJECT")}>
                    Reject
                  </Button>
                  <Button size="sm" variant="secondary" loading={busy} onClick={() => act(w.id, "ON_HOLD")}>
                    Put On Hold
                  </Button>
                  <Button size="sm" variant="ghost" loading={busy} onClick={() => act(w.id, "MORE_INFO_REQUIRED")}>
                    Request More Info
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </Card>
    </div>
  );
}
