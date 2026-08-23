"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { apiFetch, ApiClientError } from "@/lib/apiClient";
import { formatAmount, formatDate } from "@/lib/format";

type UserRow = { id: string; fullName: string; email: string };
type Asset = { id: string; symbol: string; decimals: number };
type Balance = { assetId: string; available: string };
type Entry = {
  id: string;
  type: string;
  direction: "CREDIT" | "DEBIT";
  amount: string;
  reason: string | null;
  createdAt: string;
  asset: { symbol: string; decimals: number };
  user: { fullName: string; email: string };
};

export default function ManualLedgerPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserRow[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetId, setAssetId] = useState("");
  const [balances, setBalances] = useState<Balance[]>([]);
  const [action, setAction] = useState<"CREDIT" | "DEBIT">("CREDIT");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);

  useEffect(() => {
    apiFetch<{ assets: Asset[] }>("/api/assets").then((res) => {
      setAssets(res.assets);
      if (res.assets[0]) setAssetId(res.assets[0].id);
    });
    loadEntries();
  }, []);

  function loadEntries() {
    apiFetch<{ entries: Entry[] }>("/api/admin/ledger").then((res) => setEntries(res.entries));
  }

  async function search() {
    if (!query.trim()) return;
    const res = await apiFetch<{ users: UserRow[] }>(`/api/admin/users?q=${encodeURIComponent(query)}`);
    setResults(res.users);
  }

  async function selectUser(u: UserRow) {
    setSelectedUser(u);
    setResults([]);
    const res = await apiFetch<{ balances: Balance[] }>(`/api/admin/users/${u.id}`);
    setBalances(res.balances as unknown as Balance[]);
  }

  const currentBalance = balances.find((b) => b.assetId === assetId)?.available ?? "0";
  const asset = assets.find((a) => a.id === assetId);
  const newBalance =
    action === "CREDIT" ? Number(currentBalance) + Number(amount || 0) : Number(currentBalance) - Number(amount || 0);

  async function confirmAdjustment() {
    if (!selectedUser) return;
    setSubmitting(true);
    try {
      await apiFetch("/api/admin/ledger", {
        method: "POST",
        body: JSON.stringify({ userId: selectedUser.id, assetId, action, amount, reason, internalNote }),
      });
      toast.success("Ledger adjustment recorded.");
      setConfirming(false);
      setAmount("");
      setReason("");
      setInternalNote("");
      const res = await apiFetch<{ balances: Balance[] }>(`/api/admin/users/${selectedUser.id}`);
      setBalances(res.balances as unknown as Balance[]);
      loadEntries();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to record adjustment.");
    } finally {
      setSubmitting(false);
    }
  }

  async function reverse(entryId: string) {
    const reasonText = prompt("Reason for reversal:");
    if (!reasonText) return;
    try {
      await apiFetch(`/api/admin/ledger/${entryId}/reverse`, { method: "POST", body: JSON.stringify({ reason: reasonText }) });
      toast.success("Entry reversed.");
      loadEntries();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to reverse entry.");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-xl font-semibold">Manual Balance Management</h1>

      <Card>
        <Label htmlFor="search">Find user</Label>
        <div className="flex gap-2">
          <Input id="search" placeholder="Search by name or email" value={query} onChange={(e) => setQuery(e.target.value)} />
          <Button type="button" onClick={search}>
            Search
          </Button>
        </div>
        {results.length > 0 && (
          <div className="mt-2 divide-y divide-border rounded-lg border border-border">
            {results.map((u) => (
              <button key={u.id} onClick={() => selectUser(u)} className="block w-full px-3 py-2 text-left text-sm hover:bg-surface-2">
                {u.fullName} — {u.email}
              </button>
            ))}
          </div>
        )}

        {selectedUser && (
          <div className="mt-5 space-y-4 border-t border-border pt-4">
            <p className="text-sm">
              User: <span className="font-medium">{selectedUser.fullName}</span> ({selectedUser.email})
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="asset">Asset</Label>
                <Select id="asset" value={assetId} onChange={(e) => setAssetId(e.target.value)}>
                  {assets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.symbol}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="action">Action</Label>
                <Select id="action" value={action} onChange={(e) => setAction(e.target.value as "CREDIT" | "DEBIT")}>
                  <option value="CREDIT">Credit</option>
                  <option value="DEBIT">Debit</option>
                </Select>
              </div>
            </div>
            <p className="text-xs text-muted">
              Current balance: {formatAmount(currentBalance, asset?.decimals ?? 8)} {asset?.symbol}
            </p>
            <div>
              <Label htmlFor="amount">Amount</Label>
              <Input id="amount" type="number" step="any" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="reason">Reason</Label>
              <Input id="reason" required value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="internalNote">Admin note (internal)</Label>
              <Textarea id="internalNote" rows={2} value={internalNote} onChange={(e) => setInternalNote(e.target.value)} />
            </div>
            <Button disabled={!amount || !reason} onClick={() => setConfirming(true)}>
              Confirm Adjustment
            </Button>
          </div>
        )}
      </Card>

      {confirming && (
        <Card className="border-warning/40 bg-warning/5">
          <p className="mb-3 text-sm font-semibold text-warning">
            WARNING — You are about to modify the internal demo ledger.
          </p>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">User</dt>
              <dd>{selectedUser?.fullName}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Asset</dt>
              <dd>{asset?.symbol}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Current</dt>
              <dd>{formatAmount(currentBalance, asset?.decimals ?? 8)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Adjustment</dt>
              <dd className={action === "CREDIT" ? "text-success" : "text-danger"}>
                {action === "CREDIT" ? "+" : "-"}
                {amount}
              </dd>
            </div>
            <div className="flex justify-between font-medium">
              <dt>Result</dt>
              <dd>{formatAmount(String(newBalance), asset?.decimals ?? 8)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Reason</dt>
              <dd>{reason}</dd>
            </div>
          </dl>
          <div className="mt-4 flex gap-2">
            <Button variant="secondary" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button variant="danger" loading={submitting} onClick={confirmAdjustment}>
              Confirm
            </Button>
          </div>
        </Card>
      )}

      <Card className="p-0">
        <div className="border-b border-border p-4">
          <h2 className="text-sm font-semibold">Recent manual adjustments</h2>
        </div>
        <div className="divide-y divide-border">
          {entries.map((e) => (
            <div key={e.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <div>
                <p className="font-medium">
                  {e.user.fullName} · {e.type.replaceAll("_", " ")}
                </p>
                <p className="text-xs text-muted">
                  {e.reason} · {formatDate(e.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={e.direction === "CREDIT" ? "text-success" : "text-danger"}>
                  {e.direction === "CREDIT" ? "+" : "-"}
                  {formatAmount(e.amount, e.asset.decimals)} {e.asset.symbol}
                </span>
                {e.type !== "REVERSAL" && (
                  <Button size="sm" variant="ghost" onClick={() => reverse(e.id)}>
                    Reverse
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
