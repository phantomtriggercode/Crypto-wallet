"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { formatAmount, formatDate } from "@/lib/format";
import { apiFetch } from "@/lib/apiClient";

type LedgerEntry = {
  id: string;
  type: string;
  direction: "CREDIT" | "DEBIT";
  amount: string;
  balanceAfter: string;
  reason: string | null;
  createdAt: string;
  referenceType: string;
  asset: { symbol: string; decimals: number };
};

const TYPES = [
  "DEPOSIT",
  "WITHDRAWAL",
  "SWAP_CREDIT",
  "SWAP_DEBIT",
  "ESCROW_LOCK",
  "ESCROW_RELEASE",
  "ESCROW_REFUND",
  "FEE",
  "MANUAL_CREDIT",
  "MANUAL_DEBIT",
  "REVERSAL",
];

export default function TransactionsPage() {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [type, setType] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const qs = type ? `?type=${type}` : "";
      try {
        const res = await apiFetch<{ entries: LedgerEntry[] }>(`/api/transactions${qs}`);
        setEntries(res.entries);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [type]);

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Transaction history</h1>
        <Select value={type} onChange={(e) => setType(e.target.value)} className="w-auto">
          <option value="">All types</option>
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t.replaceAll("_", " ")}
            </option>
          ))}
        </Select>
      </div>

      <Card className="divide-y divide-border p-0">
        {loading && <p className="p-6 text-center text-sm text-muted">Loading…</p>}
        {!loading && entries.length === 0 && <p className="p-6 text-center text-sm text-muted">No transactions yet.</p>}
        {entries.map((e) => (
          <div key={e.id} className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="text-sm font-medium">{e.type.replaceAll("_", " ")}</p>
              <p className="text-xs text-muted">{e.reason ?? e.referenceType}</p>
              <p className="text-xs text-muted">{formatDate(e.createdAt)}</p>
            </div>
            <div className="text-right">
              <p className={`text-sm font-medium ${e.direction === "CREDIT" ? "text-success" : "text-danger"}`}>
                {e.direction === "CREDIT" ? "+" : "-"}
                {formatAmount(e.amount, e.asset.decimals)} {e.asset.symbol}
              </p>
              <p className="text-xs text-muted">Balance: {formatAmount(e.balanceAfter, e.asset.decimals)}</p>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
