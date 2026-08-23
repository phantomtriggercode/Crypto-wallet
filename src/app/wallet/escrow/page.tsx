"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ShieldCheck, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
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
};
type Asset = { id: string; symbol: string; escrowEnabled: boolean };

export default function EscrowPage() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    counterpartyEmail: "",
    role: "BUYER",
    assetId: "",
    amount: "",
    description: "",
    terms: "",
  });
  const [submitting, setSubmitting] = useState(false);

  function load() {
    apiFetch<{ deals: Deal[] }>("/api/escrow").then((res) => setDeals(res.deals));
  }

  useEffect(() => {
    load();
    apiFetch<{ assets: Asset[] }>("/api/assets").then((res) => {
      const escrowable = res.assets.filter((a) => a.escrowEnabled);
      setAssets(escrowable);
      if (escrowable[0]) setForm((f) => ({ ...f, assetId: escrowable[0].id }));
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiFetch("/api/escrow", { method: "POST", body: JSON.stringify(form) });
      toast.success("Escrow deal created.");
      setShowForm(false);
      setForm({ title: "", counterpartyEmail: "", role: "BUYER", assetId: assets[0]?.id ?? "", amount: "", description: "", terms: "" });
      load();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to create escrow deal.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Escrow</h1>
          <p className="text-sm text-muted">Secure your crypto transactions with escrow.</p>
        </div>
        <Button size="sm" onClick={() => setShowForm((s) => !s)}>
          <Plus className="h-4 w-4" /> New deal
        </Button>
      </div>

      {showForm && (
        <Card>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <Label htmlFor="title">Deal title</Label>
              <Input id="title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="counterpartyEmail">Counterparty email</Label>
                <Input
                  id="counterpartyEmail"
                  type="email"
                  required
                  value={form.counterpartyEmail}
                  onChange={(e) => setForm({ ...form, counterpartyEmail: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="role">Your role</Label>
                <Select id="role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="BUYER">I am the buyer</option>
                  <option value="SELLER">I am the seller</option>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="assetId">Asset</Label>
                <Select id="assetId" value={form.assetId} onChange={(e) => setForm({ ...form, assetId: e.target.value })}>
                  {assets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.symbol}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="terms">Terms</Label>
              <Textarea id="terms" rows={2} value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })} />
            </div>
            <Button type="submit" loading={submitting}>
              Create escrow deal
            </Button>
          </form>
        </Card>
      )}

      <Card className="divide-y divide-border p-0">
        {deals.length === 0 && (
          <div className="flex flex-col items-center gap-2 p-10 text-center text-muted">
            <ShieldCheck className="h-8 w-8" />
            <p className="text-sm">No escrow deals yet.</p>
          </div>
        )}
        {deals.map((d) => (
          <Link key={d.id} href={`/wallet/escrow/${d.id}`} className="flex items-center justify-between px-5 py-4 hover:bg-surface-2/60">
            <div>
              <p className="text-sm font-medium">{d.title}</p>
              <p className="text-xs text-muted">
                {d.escrowRef} · {timeAgo(d.createdAt)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">
                {formatAmount(d.amount, d.asset.decimals)} {d.asset.symbol}
              </p>
              <StatusBadge status={d.status} />
            </div>
          </Link>
        ))}
      </Card>
    </div>
  );
}
