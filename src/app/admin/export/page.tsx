"use client";

import { Download } from "lucide-react";
import { Card } from "@/components/ui/card";

const EXPORTS = [
  { href: "/api/admin/export/users", label: "Users", description: "Profile, status, KYC status — no passwords or secrets." },
  { href: "/api/admin/export/deposits", label: "Deposits", description: "All deposit requests and their review status." },
  { href: "/api/admin/export/withdrawals", label: "Withdrawals", description: "All withdrawal requests, fees, and review status." },
  { href: "/api/admin/export/ledger", label: "Ledger / Transactions", description: "Every ledger entry across all users (most recent 10,000)." },
  { href: "/api/admin/export/kyc", label: "KYC", description: "Application status metadata — documents are not included." },
  { href: "/api/admin/export/escrow", label: "Escrow deals", description: "All escrow deals and their current status." },
  { href: "/api/admin/export/audit-logs", label: "Audit logs", description: "Admin action history (most recent 10,000)." },
];

export default function DataExportPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold">Data Export</h1>
      <p className="text-sm text-muted">
        Export platform data as CSV. Each export is itself recorded in the audit log. You&apos;ll only see downloads
        you&apos;re authorized for — an export you don&apos;t have the role for will fail with a 403.
      </p>
      <Card className="divide-y divide-border p-0">
        {EXPORTS.map((e) => (
          <a key={e.href} href={e.href} className="flex items-center justify-between px-5 py-4 hover:bg-surface-2/60">
            <div>
              <p className="text-sm font-medium">{e.label}</p>
              <p className="text-xs text-muted">{e.description}</p>
            </div>
            <Download className="h-4 w-4 text-primary" />
          </a>
        ))}
      </Card>
    </div>
  );
}
