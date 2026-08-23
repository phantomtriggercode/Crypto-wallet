import Link from "next/link";
import { notFound } from "next/navigation";
import { getSettings } from "@/lib/settings";
import { db } from "@/lib/db";
import { SiteNavbar } from "@/components/site/navbar";
import { SiteFooter } from "@/components/site/footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PriceChart } from "@/components/market/price-chart";
import { formatUsd } from "@/lib/format";

// Reads live, admin-editable content — never prerender statically.
export const dynamic = "force-dynamic";

export default async function CoinPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  const [settings, asset] = await Promise.all([
    getSettings(),
    db.asset.findUnique({ where: { symbol: symbol.toUpperCase() }, include: { networks: true } }),
  ]);

  if (!asset) notFound();

  const history = await db.priceHistory.findMany({
    where: { assetId: asset.id },
    orderBy: { timestamp: "asc" },
    take: 100,
  });

  const chartData = history.map((h) => ({ time: h.timestamp.toISOString(), price: Number(h.price) }));

  return (
    <div className="min-h-screen bg-background">
      <SiteNavbar siteName={settings.siteName} logoUrl={settings.logoUrl} navLinks={settings.navLinks} />
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">
              {asset.name} <span className="text-muted">({asset.symbol})</span>
            </h1>
            <p className="mt-1 text-3xl font-semibold">{formatUsd(asset.demoPrice.toString())}</p>
            <p className={`text-sm ${Number(asset.priceChange24h) >= 0 ? "text-success" : "text-danger"}`}>
              {Number(asset.priceChange24h) >= 0 ? "+" : ""}
              {Number(asset.priceChange24h).toFixed(2)}% (24h)
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/wallet/deposit">
              <Button size="sm">Deposit</Button>
            </Link>
            <Link href="/wallet/swap">
              <Button size="sm" variant="secondary">
                Swap
              </Button>
            </Link>
          </div>
        </div>

        <Card>
          <PriceChart data={chartData} />
        </Card>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Market cap" value={formatUsd(asset.marketCap.toString())} />
          <Stat label="24h volume" value={formatUsd(asset.volume24h.toString())} />
          <Stat label="Decimals" value={String(asset.decimals)} />
          <Stat label="Networks" value={String(asset.networks.length)} />
        </div>

        {asset.description && (
          <Card>
            <h2 className="mb-2 text-sm font-semibold">About {asset.name}</h2>
            <p className="text-sm text-muted">{asset.description}</p>
          </Card>
        )}

        <Card>
          <h2 className="mb-3 text-sm font-semibold">Networks</h2>
          <div className="space-y-2">
            {asset.networks.map((n) => (
              <div key={n.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                <span>{n.name}</span>
                <span className="text-xs text-muted">Min deposit: {n.minDeposit.toString()}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <SiteFooter siteName={settings.siteName} tagline={settings.footerTagline} navLinks={settings.navLinks} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <p className="text-xs text-muted">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </Card>
  );
}
