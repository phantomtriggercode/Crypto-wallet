"use client";

import { useEffect, useState, use as usePromise } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { apiFetch, ApiClientError } from "@/lib/apiClient";
import { formatAmount, formatDate } from "@/lib/format";

type Detail = {
  user: {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
    country: string | null;
    status: string;
    kycStatus: string;
    createdAt: string;
    lastLoginAt: string | null;
    depositsLocked: boolean;
    withdrawalsLocked: boolean;
    swapsLocked: boolean;
    escrowLocked: boolean;
    requireKyc: boolean;
    require2FA: boolean;
    twoFactorEnabled: boolean;
    internalNote: string | null;
  };
  balances: { asset: { symbol: string; decimals: number }; available: string; locked: string }[];
  transactions: { id: string; type: string; direction: string; amount: string; createdAt: string; asset: { symbol: string } }[];
  deposits: { id: string; depositRef: string; amount: string; status: string; asset: { symbol: string } }[];
  withdrawals: { id: string; withdrawalRef: string; amount: string; status: string; asset: { symbol: string } }[];
  swaps: { id: string; fromAmount: string; toAmount: string; status: string; fromAsset: { symbol: string }; toAsset: { symbol: string } }[];
  escrowDeals: { id: string; title: string; amount: string; status: string }[];
  kyc: { status: string; legalName: string } | null;
  sessions: { id: string; ip: string | null; lastSeenAt: string }[];
  auditLogs: { id: string; action: string; reason: string | null; createdAt: string; adminId: string | null }[];
};

export default function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    apiFetch<Detail>(`/api/admin/users/${id}`).then((res) => {
      setDetail(res);
      setNote(res.user.internalNote ?? "");
    });
  }

  useEffect(load, [id]);

  async function toggle(field: string, value: boolean) {
    setBusy(true);
    try {
      await apiFetch(`/api/admin/users/${id}/controls`, { method: "PATCH", body: JSON.stringify({ [field]: value }) });
      load();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to update.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleSuspend(suspended: boolean) {
    setBusy(true);
    try {
      await apiFetch(`/api/admin/users/${id}/controls`, {
        method: "PATCH",
        body: JSON.stringify({ status: suspended ? "SUSPENDED" : "ACTIVE" }),
      });
      load();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to update.");
    } finally {
      setBusy(false);
    }
  }

  async function saveNote() {
    await apiFetch(`/api/admin/users/${id}/controls`, { method: "PATCH", body: JSON.stringify({ internalNote: note }) });
    toast.success("Note saved.");
  }

  if (!detail) return null;
  const { user } = detail;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">{user.fullName}</h1>
          <p className="text-sm text-muted">{user.email}</p>
        </div>
        <div className="flex gap-2">
          <StatusBadge status={user.kycStatus} />
          <StatusBadge status={user.status} />
        </div>
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-semibold">Account controls</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <ToggleButton label="Suspended" value={user.status === "SUSPENDED"} disabled={busy} onChange={toggleSuspend} />
          <ToggleButton label="Deposits locked" value={user.depositsLocked} disabled={busy} onChange={(v) => toggle("depositsLocked", v)} />
          <ToggleButton label="Withdrawals locked" value={user.withdrawalsLocked} disabled={busy} onChange={(v) => toggle("withdrawalsLocked", v)} />
          <ToggleButton label="Swaps locked" value={user.swapsLocked} disabled={busy} onChange={(v) => toggle("swapsLocked", v)} />
          <ToggleButton label="Escrow locked" value={user.escrowLocked} disabled={busy} onChange={(v) => toggle("escrowLocked", v)} />
          <ToggleButton label="Require KYC" value={user.requireKyc} disabled={busy} onChange={(v) => toggle("requireKyc", v)} />
          <ToggleButton label="Require 2FA" value={user.require2FA} disabled={busy} onChange={(v) => toggle("require2FA", v)} />
        </div>
        <div className="mt-4 flex gap-2">
          <input
            className="w-full rounded-xl border border-border bg-surface-2 px-3.5 py-2.5 text-sm"
            placeholder="Internal note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <Button size="sm" onClick={saveNote}>
            Save
          </Button>
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold">Balances</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {detail.balances.map((b, i) => (
            <div key={i} className="rounded-lg border border-border px-3 py-2 text-sm">
              <p className="text-xs text-muted">{b.asset.symbol}</p>
              <p>{formatAmount(b.available, b.asset.decimals)}</p>
              {Number(b.locked) > 0 && <p className="text-xs text-warning">{formatAmount(b.locked, b.asset.decimals)} locked</p>}
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <h2 className="mb-2 text-sm font-semibold">Recent transactions</h2>
          {detail.transactions.map((t) => (
            <div key={t.id} className="flex justify-between py-1 text-xs">
              <span>{t.type.replaceAll("_", " ")}</span>
              <span className={t.direction === "CREDIT" ? "text-success" : "text-danger"}>
                {t.direction === "CREDIT" ? "+" : "-"}
                {t.amount} {t.asset.symbol}
              </span>
            </div>
          ))}
        </Card>
        <Card>
          <h2 className="mb-2 text-sm font-semibold">Sessions</h2>
          {detail.sessions.map((s) => (
            <div key={s.id} className="flex justify-between py-1 text-xs">
              <span>{s.ip}</span>
              <span className="text-muted">{formatDate(s.lastSeenAt)}</span>
            </div>
          ))}
        </Card>
        <Card>
          <h2 className="mb-2 text-sm font-semibold">Deposits</h2>
          {detail.deposits.map((d) => (
            <div key={d.id} className="flex justify-between py-1 text-xs">
              <span>{d.depositRef}</span>
              <StatusBadge status={d.status} />
            </div>
          ))}
        </Card>
        <Card>
          <h2 className="mb-2 text-sm font-semibold">Withdrawals</h2>
          {detail.withdrawals.map((w) => (
            <div key={w.id} className="flex justify-between py-1 text-xs">
              <span>{w.withdrawalRef}</span>
              <StatusBadge status={w.status} />
            </div>
          ))}
        </Card>
        <Card>
          <h2 className="mb-2 text-sm font-semibold">Escrow deals</h2>
          {detail.escrowDeals.map((e) => (
            <div key={e.id} className="flex justify-between py-1 text-xs">
              <span>{e.title}</span>
              <StatusBadge status={e.status} />
            </div>
          ))}
        </Card>
        <Card>
          <h2 className="mb-2 text-sm font-semibold">Audit history</h2>
          {detail.auditLogs.map((a) => (
            <div key={a.id} className="flex justify-between py-1 text-xs">
              <span>{a.action.replaceAll("_", " ")}</span>
              <span className="text-muted">{formatDate(a.createdAt)}</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

function ToggleButton({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: boolean;
  disabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      disabled={disabled}
      onClick={() => onChange(!value)}
      className={`rounded-lg border px-3 py-2 text-left text-xs transition ${
        value ? "border-danger/40 bg-danger/10 text-danger" : "border-border bg-surface-2/40 text-muted"
      }`}
    >
      {label}: {value ? "Yes" : "No"}
    </button>
  );
}
