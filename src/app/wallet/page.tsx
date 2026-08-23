import Link from "next/link";
import { ArrowDownToLine, ArrowUpFromLine, Repeat, ShieldCheck } from "lucide-react";
import { requireUser } from "@/lib/session";
import { getWalletSummary } from "@/lib/ledger";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { formatUsd, formatAmount, timeAgo } from "@/lib/format";
import { KycBanner } from "@/components/wallet/kyc-banner";

export default async function WalletDashboardPage() {
  const user = await requireUser();
  if (!user) return null;

  const [{ holdings, totalValueUsd }, recentEntries] = await Promise.all([
    getWalletSummary(user.id),
    db.ledgerEntry.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { asset: true },
    }),
  ]);

  const nonZero = holdings.filter((h) => h.available.add(h.locked).greaterThan(0));
  const topHoldings = (nonZero.length ? nonZero : holdings).slice(0, 6);

  const quickActions = [
    { href: "/wallet/deposit", label: "Deposit", icon: ArrowDownToLine },
    { href: "/wallet/withdraw", label: "Withdraw", icon: ArrowUpFromLine },
    { href: "/wallet/swap", label: "Swap", icon: Repeat },
    { href: "/wallet/escrow", label: "Escrow", icon: ShieldCheck },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {user.kycStatus !== "APPROVED" && <KycBanner status={user.kycStatus} />}

      <Card className="card-glass bg-gradient-to-br from-primary/15 via-surface to-surface">
        <p className="text-sm text-muted">Total portfolio value</p>
        <p className="mt-1 text-4xl font-semibold tracking-tight">{formatUsd(totalValueUsd.toString())}</p>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="flex flex-col items-center gap-2 rounded-xl border border-border bg-surface-2/60 px-3 py-4 text-sm transition hover:border-primary/40 hover:bg-surface-2"
            >
              <action.icon className="h-5 w-5 text-primary" />
              {action.label}
            </Link>
          ))}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold">Assets</h2>
            <Link href="/wallet/holdings" className="text-xs text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-1">
            {topHoldings.map((h) => (
              <div key={h.asset.id} className="flex items-center justify-between rounded-xl px-2 py-3 hover:bg-surface-2/60">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-xs font-semibold">
                    {h.asset.symbol.slice(0, 3)}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{h.asset.name}</p>
                    <p className="text-xs text-muted">
                      {formatAmount(h.available.toString(), h.asset.decimals)} {h.asset.symbol}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{formatUsd(h.valueUsd.toString())}</p>
                  <p className={`text-xs ${Number(h.asset.priceChange24h) >= 0 ? "text-success" : "text-danger"}`}>
                    {Number(h.asset.priceChange24h) >= 0 ? "+" : ""}
                    {Number(h.asset.priceChange24h).toFixed(2)}%
                  </p>
                </div>
              </div>
            ))}
            {topHoldings.length === 0 && <p className="py-8 text-center text-sm text-muted">No assets yet.</p>}
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold">Recent activity</h2>
            <Link href="/wallet/transactions" className="text-xs text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {recentEntries.map((e) => (
              <div key={e.id} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">{e.type.replaceAll("_", " ")}</p>
                  <p className="text-xs text-muted">{timeAgo(e.createdAt)}</p>
                </div>
                <p className={e.direction === "CREDIT" ? "text-success" : "text-danger"}>
                  {e.direction === "CREDIT" ? "+" : "-"}
                  {formatAmount(e.amount.toString(), e.asset.decimals)} {e.asset.symbol}
                </p>
              </div>
            ))}
            {recentEntries.length === 0 && <p className="py-8 text-center text-sm text-muted">No activity yet.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
