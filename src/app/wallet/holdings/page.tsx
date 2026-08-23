import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getWalletSummary } from "@/lib/ledger";
import { Card } from "@/components/ui/card";
import { AssetIcon } from "@/components/ui/asset-icon";
import { formatUsd, formatAmount } from "@/lib/format";

export default async function HoldingsPage() {
  const user = await requireUser();
  if (!user) return null;
  const { holdings } = await getWalletSummary(user.id);

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <h1 className="text-xl font-semibold">Your wallet</h1>
      <Card className="divide-y divide-border p-0">
        {holdings.map((h) => (
          <Link
            key={h.asset.id}
            href={`/market/${h.asset.symbol.toLowerCase()}`}
            className="flex items-center justify-between px-5 py-4 transition hover:bg-surface-2/60"
          >
            <div className="flex items-center gap-3">
              <AssetIcon symbol={h.asset.symbol} iconUrl={h.asset.iconUrl} size={40} />
              <div>
                <p className="text-sm font-medium">{h.asset.name}</p>
                <p className="text-xs text-muted">{h.asset.symbol}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">{formatAmount(h.available.toString(), h.asset.decimals)} {h.asset.symbol}</p>
              <p className="text-xs text-muted">{formatUsd(h.valueUsd.toString())}</p>
              {h.locked.greaterThan(0) && (
                <p className="text-[11px] text-warning">{formatAmount(h.locked.toString())} locked in escrow</p>
              )}
            </div>
          </Link>
        ))}
      </Card>
    </div>
  );
}
