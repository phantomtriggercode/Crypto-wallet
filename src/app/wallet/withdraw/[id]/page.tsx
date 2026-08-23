import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock } from "lucide-react";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { formatAmount, formatDate } from "@/lib/format";

export default async function WithdrawalStatusPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return null;
  const { id } = await params;

  const withdrawal = await db.withdrawal.findUnique({ where: { id }, include: { asset: true, network: true } });
  if (!withdrawal || withdrawal.userId !== user.id) notFound();

  return (
    <div className="mx-auto max-w-lg space-y-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <Clock className="h-14 w-14 text-warning" />
        <h1 className="text-2xl font-semibold">Withdrawal Submitted</h1>
        <p className="text-sm text-muted">
          Status: Pending Admin Approval. No blockchain transaction occurs — an administrator will manually review this
          request.
        </p>
      </div>

      <Card className="text-left">
        <dl className="space-y-3 text-sm">
          <Row label="Withdrawal ID" value={withdrawal.withdrawalRef} />
          <Row label="Asset" value={withdrawal.asset.symbol} />
          <Row label="Network" value={withdrawal.network.name} />
          <Row label="Amount" value={`${formatAmount(withdrawal.amount.toString(), withdrawal.asset.decimals)} ${withdrawal.asset.symbol}`} />
          <Row label="Destination" value={withdrawal.destinationAddress} mono />
          <Row label="Total deducted" value={`${formatAmount(withdrawal.totalDeducted.toString(), withdrawal.asset.decimals)} ${withdrawal.asset.symbol}`} />
          {withdrawal.internalTxReference && <Row label="Internal Tx Reference" value={withdrawal.internalTxReference} mono />}
          <Row label="Submitted" value={formatDate(withdrawal.createdAt)} />
          <div className="flex items-center justify-between">
            <dt className="text-muted">Status</dt>
            <dd>
              <StatusBadge status={withdrawal.status} />
            </dd>
          </div>
        </dl>
      </Card>

      <Link href="/wallet">
        <Button className="w-full">Back to Wallet</Button>
      </Link>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className={`text-right ${mono ? "break-all font-mono text-xs" : ""}`}>{value}</dd>
    </div>
  );
}
