"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { apiFetch } from "@/lib/apiClient";
import { formatUsd, formatDate } from "@/lib/format";
import { PriceChart } from "@/components/market/price-chart";
import { ConversionCalculator } from "@/components/widgets/conversion-calculator";

type AssetLite = { id?: string; symbol: string; name: string; demoPrice: string; priceChange24h: string };

type WidgetPayload = {
  id: string;
  type: string;
  title: string | null;
  data: Record<string, unknown>;
};

export function WidgetGrid({ placement, bare = false }: { placement: "homepage" | "dashboard"; bare?: boolean }) {
  const [widgets, setWidgets] = useState<WidgetPayload[] | null>(null);

  useEffect(() => {
    apiFetch<{ widgets: WidgetPayload[] }>(`/api/widgets?placement=${placement}`)
      .then((res) => setWidgets(res.widgets))
      .catch(() => setWidgets([]));
  }, [placement]);

  if (!widgets || widgets.length === 0) return null;

  const grid = (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {widgets.map((w) => (
        <WidgetCard key={w.id} widget={w} />
      ))}
    </div>
  );

  if (bare) return grid;

  return <section className="mx-auto max-w-6xl px-4 pb-16">{grid}</section>;
}

function WidgetCard({ widget }: { widget: WidgetPayload }) {
  return (
    <Card className={widget.type === "PRICE_CHART" || widget.type === "PORTFOLIO_CHART" ? "sm:col-span-2" : ""}>
      {widget.title && <p className="mb-3 text-sm font-semibold">{widget.title}</p>}
      <WidgetBody widget={widget} />
    </Card>
  );
}

function ChangeBadge({ value }: { value: string | number }) {
  const n = Number(value);
  return <span className={n >= 0 ? "text-success" : "text-danger"}>{n >= 0 ? "+" : ""}{n.toFixed(2)}%</span>;
}

function AssetRow({ asset }: { asset: AssetLite }) {
  return (
    <Link href={`/market/${asset.symbol.toLowerCase()}`} className="flex items-center justify-between py-1.5 text-sm hover:text-primary">
      <span>{asset.symbol}</span>
      <span className="flex items-center gap-2">
        {formatUsd(asset.demoPrice)}
        <ChangeBadge value={asset.priceChange24h} />
      </span>
    </Link>
  );
}

function WidgetBody({ widget }: { widget: WidgetPayload }) {
  const { type, data } = widget;

  switch (type) {
    case "ASSET_PRICE": {
      const asset = data.asset as AssetLite | null;
      if (!asset) return <Empty />;
      return (
        <div>
          <p className="text-2xl font-semibold">{formatUsd(asset.demoPrice)}</p>
          <p className="text-xs text-muted">
            {asset.symbol} · <ChangeBadge value={asset.priceChange24h} /> (24h)
          </p>
        </div>
      );
    }

    case "MARKET_OVERVIEW":
    case "TRENDING":
    case "TOP_GAINERS":
    case "TOP_LOSERS": {
      const assets = (data.assets as AssetLite[]) ?? [];
      if (assets.length === 0) return <Empty />;
      return <div className="divide-y divide-border">{assets.map((a) => <AssetRow key={a.symbol} asset={a} />)}</div>;
    }

    case "FEAR_GREED": {
      const value = Number(data.value ?? 50);
      const label = String(data.label ?? "Neutral");
      return (
        <div>
          <div className="h-2 w-full rounded-full bg-surface-2">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-danger via-warning to-success"
              style={{ width: `${value}%` }}
            />
          </div>
          <p className="mt-2 text-sm">
            <span className="text-lg font-semibold">{value}</span> — {label}
          </p>
        </div>
      );
    }

    case "MARKET_DOMINANCE": {
      const breakdown = (data.breakdown as { symbol: string; share: number }[]) ?? [];
      const othersShare = Number(data.othersShare ?? 0);
      if (breakdown.length === 0) return <Empty />;
      return (
        <div className="space-y-2">
          {breakdown.map((b) => (
            <div key={b.symbol}>
              <div className="flex justify-between text-xs">
                <span>{b.symbol}</span>
                <span>{b.share.toFixed(1)}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-surface-2">
                <div className="h-1.5 rounded-full bg-primary" style={{ width: `${b.share}%` }} />
              </div>
            </div>
          ))}
          {othersShare > 0 && <p className="text-xs text-muted">Others: {othersShare.toFixed(1)}%</p>}
        </div>
      );
    }

    case "GAS_PRICES": {
      const networks = (data.networks as { name: string; gwei: number }[]) ?? [];
      if (networks.length === 0) return <Empty />;
      return (
        <div className="grid grid-cols-2 gap-2">
          {networks.map((n) => (
            <div key={n.name} className="rounded-lg border border-border px-3 py-2 text-sm">
              <p className="text-xs text-muted">{n.name}</p>
              <p className="font-medium">{n.gwei} gwei</p>
            </div>
          ))}
        </div>
      );
    }

    case "CONVERSION_CALCULATOR":
      return <ConversionCalculator assets={(data.assets as AssetLite[]) ?? []} mode="mid" />;

    case "EXCHANGE_CALCULATOR":
      return <ConversionCalculator assets={(data.assets as AssetLite[]) ?? []} mode="pair" />;

    case "PRICE_CHART": {
      const asset = data.asset as AssetLite | null;
      const history = (data.history as { time: string; price: number }[]) ?? [];
      if (!asset) return <Empty />;
      return (
        <div>
          <p className="mb-2 text-sm text-muted">
            {asset.symbol} — {formatUsd(asset.demoPrice)} <ChangeBadge value={asset.priceChange24h} />
          </p>
          <PriceChart data={history} />
        </div>
      );
    }

    case "NEWS": {
      const articles = (data.articles as { id: string; headline: string; publisher: string | null; publishedAt: string }[]) ?? [];
      if (articles.length === 0) return <Empty />;
      return (
        <div className="space-y-3">
          {articles.map((a) => (
            <div key={a.id}>
              <p className="text-sm font-medium">{a.headline}</p>
              <p className="text-xs text-muted">
                {a.publisher ?? "Newsroom"} · {formatDate(a.publishedAt)}
              </p>
            </div>
          ))}
        </div>
      );
    }

    case "PORTFOLIO_CHART": {
      const holdings = (data.holdings as { symbol: string; valueUsd: string }[]) ?? [];
      if (holdings.length === 0) return <Empty label="No holdings yet." />;
      const total = holdings.reduce((sum, h) => sum + Number(h.valueUsd), 0);
      return (
        <div className="space-y-2">
          {holdings.map((h) => {
            const pct = total > 0 ? (Number(h.valueUsd) / total) * 100 : 0;
            return (
              <div key={h.symbol}>
                <div className="flex justify-between text-xs">
                  <span>{h.symbol}</span>
                  <span>{formatUsd(h.valueUsd)} ({pct.toFixed(1)}%)</span>
                </div>
                <div className="h-1.5 rounded-full bg-surface-2">
                  <div className="h-1.5 rounded-full bg-primary" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    default:
      return <Empty />;
  }
}

function Empty({ label = "No data available." }: { label?: string }) {
  return <p className="text-sm text-muted">{label}</p>;
}
