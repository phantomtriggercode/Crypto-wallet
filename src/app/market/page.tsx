import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { db } from "@/lib/db";
import { SiteNavbar } from "@/components/site/navbar";
import { SiteFooter } from "@/components/site/footer";
import { Card } from "@/components/ui/card";
import { formatUsd } from "@/lib/format";

export default async function MarketPage() {
  const [settings, assets] = await Promise.all([
    getSettings(),
    db.asset.findMany({ where: { enabled: true }, orderBy: { displayOrder: "asc" } }),
  ]);

  return (
    <div className="min-h-screen bg-background">
      <SiteNavbar siteName={settings.siteName} logoUrl={settings.logoUrl} />
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="mb-6 text-2xl font-semibold">Market</h1>
        <Card className="divide-y divide-border p-0">
          <div className="grid grid-cols-4 gap-2 px-5 py-3 text-xs text-muted">
            <span>Asset</span>
            <span className="text-right">Price</span>
            <span className="text-right">24h</span>
            <span className="text-right">Market cap</span>
          </div>
          {assets.map((a) => (
            <Link key={a.id} href={`/market/${a.symbol.toLowerCase()}`} className="grid grid-cols-4 items-center gap-2 px-5 py-4 hover:bg-surface-2/60">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 text-xs font-semibold">
                  {a.symbol.slice(0, 3)}
                </span>
                <div>
                  <p className="text-sm font-medium">{a.symbol}</p>
                  <p className="text-xs text-muted">{a.name}</p>
                </div>
              </div>
              <p className="text-right text-sm">{formatUsd(a.demoPrice.toString())}</p>
              <p className={`text-right text-sm ${Number(a.priceChange24h) >= 0 ? "text-success" : "text-danger"}`}>
                {Number(a.priceChange24h) >= 0 ? "+" : ""}
                {Number(a.priceChange24h).toFixed(2)}%
              </p>
              <p className="text-right text-sm text-muted">{formatUsd(a.marketCap.toString())}</p>
            </Link>
          ))}
        </Card>
      </div>
      <SiteFooter siteName={settings.siteName} />
    </div>
  );
}
