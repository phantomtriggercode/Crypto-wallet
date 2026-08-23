"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { formatUsd } from "@/lib/format";
import { apiFetch } from "@/lib/apiClient";

type Stats = {
  totalUsers: number;
  verifiedUsers: number;
  pendingKyc: number;
  depositsToday: number;
  withdrawalsToday: number;
  pendingDeposits: number;
  pendingWithdrawals: number;
  openDisputes: number;
  swapsToday: number;
  totalDemoBalanceUsd: string;
  escrowVolume: string;
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    apiFetch<Stats>("/api/admin/stats").then(setStats);
  }, []);

  const tiles = stats
    ? [
        { label: "Total Users", value: stats.totalUsers },
        { label: "Verified Users", value: stats.verifiedUsers },
        { label: "Pending KYC", value: stats.pendingKyc, href: "/admin/kyc" },
        { label: "Total Demo Balance", value: formatUsd(stats.totalDemoBalanceUsd) },
        { label: "Deposits Today", value: stats.depositsToday },
        { label: "Withdrawals Today", value: stats.withdrawalsToday },
        { label: "Pending Deposits", value: stats.pendingDeposits, href: "/admin/deposits" },
        { label: "Pending Withdrawals", value: stats.pendingWithdrawals, href: "/admin/withdrawals" },
        { label: "Swaps Today", value: stats.swapsToday },
        { label: "Escrow Volume", value: formatUsd(stats.escrowVolume) },
        { label: "Open Disputes", value: stats.openDisputes, href: "/admin/escrow/disputes" },
      ]
    : [];

  const quickActions = [
    { href: "/admin/ledger", label: "Manual Balance Management" },
    { href: "/admin/deposits", label: "Review Deposits" },
    { href: "/admin/withdrawals", label: "Review Withdrawals" },
    { href: "/admin/kyc", label: "Review KYC" },
    { href: "/admin/escrow", label: "Review Escrow" },
    { href: "/admin/market/prices", label: "Edit Prices" },
    { href: "/admin/cms/homepage", label: "Edit Website" },
    { href: "/admin/announcements", label: "Send Announcement" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Dashboard</h1>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {tiles.map((t) => {
          const content = (
            <Card className="transition hover:border-primary/40">
              <p className="text-xs text-muted">{t.label}</p>
              <p className="mt-1 text-2xl font-semibold">{t.value}</p>
            </Card>
          );
          return t.href ? (
            <Link key={t.label} href={t.href}>
              {content}
            </Link>
          ) : (
            <div key={t.label}>{content}</div>
          );
        })}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted">Quick actions</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {quickActions.map((a) => (
            <Link key={a.href} href={a.href}>
              <Card className="text-center text-sm transition hover:border-primary/40 hover:text-primary">{a.label}</Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
