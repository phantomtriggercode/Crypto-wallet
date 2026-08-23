import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { formatAmount, formatDate } from "@/lib/format";

export default async function DepositThankYouPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return null;
  const { id } = await params;

  const deposit = await db.deposit.findUnique({ where: { id }, include: { asset: true, network: true } });
  if (!deposit || deposit.userId !== user.id) notFound();

  return (
    <div className="mx-auto max-w-lg space-y-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <CheckCircle2 className="h-14 w-14 text-success" />
        <h1 className="text-2xl font-semibold">Thank You</h1>
        <p className="text-sm text-muted">
          Your deposit request has been received successfully. Our team will review and manually confirm your deposit.
          You will receive an alert immediately after your deposit has been confirmed.
        </p>
      </div>

      <Card className="text-left">
        <dl className="space-y-3 text-sm">
          <Row label="Deposit ID" value={deposit.depositRef} />
          <Row label="Asset" value={deposit.asset.symbol} />
          <Row label="Network" value={deposit.network.name} />
          <Row label="Amount" value={`${formatAmount(deposit.amount.toString(), deposit.asset.decimals)} ${deposit.asset.symbol}`} />
          <Row label="Receiving address" value={deposit.receivingAddress} mono />
          <Row label="Submitted" value={formatDate(deposit.createdAt)} />
          <div className="flex items-center justify-between">
            <dt className="text-muted">Status</dt>
            <dd>
              <StatusBadge status={deposit.status} />
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
