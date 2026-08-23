"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/apiClient";
import { formatAmount, timeAgo } from "@/lib/format";

type Deposit = {
  id: string;
  depositRef: string;
  amount: string;
  status: string;
  createdAt: string;
  asset: { symbol: string; decimals: number };
  user: { fullName: string; email: string; kycStatus: string };
};

const STATUSES = ["PENDING_REVIEW", "UNDER_REVIEW", "APPROVED", "REJECTED", "CREDITED"];

export default function AdminDepositsPage() {
  const [status, setStatus] = useState("PENDING_REVIEW");
  const [deposits, setDeposits] = useState<Deposit[]>([]);

  useEffect(() => {
    apiFetch<{ deposits: Deposit[] }>(`/api/admin/deposits?status=${status}`).then((res) => setDeposits(res.deposits));
  }, [status]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Deposits</h1>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-auto">
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replaceAll("_", " ")}
            </option>
          ))}
        </Select>
      </div>

      <Card className="divide-y divide-border p-0">
        {deposits.length === 0 && <p className="p-6 text-center text-sm text-muted">No deposits in this status.</p>}
        {deposits.map((d) => (
          <Link key={d.id} href={`/admin/deposits/${d.id}`} className="flex items-center justify-between px-5 py-4 hover:bg-surface-2/60">
            <div>
              <p className="text-sm font-medium">
                {d.user.fullName} <span className="text-xs text-muted">({d.user.email})</span>
              </p>
              <p className="text-xs text-muted">
                {d.depositRef} · {timeAgo(d.createdAt)}
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
