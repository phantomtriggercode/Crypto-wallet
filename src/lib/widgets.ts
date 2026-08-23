import "server-only";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export const WIDGET_TYPES = [
  "ASSET_PRICE",
  "MARKET_OVERVIEW",
  "TRENDING",
  "TOP_GAINERS",
  "TOP_LOSERS",
  "FEAR_GREED",
  "MARKET_DOMINANCE",
  "GAS_PRICES",
  "CONVERSION_CALCULATOR",
  "PRICE_CHART",
  "NEWS",
  "PORTFOLIO_CHART",
  "EXCHANGE_CALCULATOR",
] as const;

export type WidgetType = (typeof WIDGET_TYPES)[number];

export const WIDGET_TYPE_INFO: Record<WidgetType, { label: string; description: string; requiresAuth?: boolean; defaultConfig: Record<string, unknown> }> = {
  ASSET_PRICE: { label: "Asset Price", description: "Price and 24h change for one asset (e.g. BTC, ETH).", defaultConfig: { symbol: "BTC" } },
  MARKET_OVERVIEW: { label: "Market Overview", description: "A grid of top assets by display order.", defaultConfig: { count: 6 } },
  TRENDING: { label: "Trending Coins", description: "Assets with the largest 24h move in either direction.", defaultConfig: { count: 5 } },
  TOP_GAINERS: { label: "Top Gainers", description: "Assets with the largest positive 24h change.", defaultConfig: { count: 5 } },
  TOP_LOSERS: { label: "Top Losers", description: "Assets with the largest negative 24h change.", defaultConfig: { count: 5 } },
  FEAR_GREED: { label: "Fear & Greed Index", description: "Admin-set sentiment gauge (0-100).", defaultConfig: { value: 50 } },
  MARKET_DOMINANCE: { label: "Market Dominance", description: "Market-cap share breakdown across assets.", defaultConfig: { count: 5 } },
  GAS_PRICES: { label: "Gas Prices", description: "Admin-set simulated network fees.", defaultConfig: { networks: [{ name: "Ethereum", gwei: 25 }, { name: "BSC", gwei: 3 }] } },
  CONVERSION_CALCULATOR: { label: "Conversion Calculator", description: "Interactive asset-to-asset price calculator (mid-market rate).", defaultConfig: {} },
  EXCHANGE_CALCULATOR: { label: "Exchange Calculator", description: "Interactive calculator using configured trading-pair rates.", defaultConfig: {} },
  PRICE_CHART: { label: "Price Chart", description: "Historical price chart for one asset.", defaultConfig: { symbol: "BTC" } },
  NEWS: { label: "Crypto News", description: "Latest news headlines.", defaultConfig: { count: 3 } },
  PORTFOLIO_CHART: { label: "Portfolio Chart", description: "The signed-in user's holdings breakdown.", requiresAuth: true, defaultConfig: {} },
};

type Ctx = { userId?: string | null };

export async function getWidgetData(widget: { type: string; config: unknown }, ctx: Ctx = {}) {
  const config = (widget.config ?? {}) as Record<string, unknown>;

  switch (widget.type as WidgetType) {
    case "ASSET_PRICE": {
      const symbol = String(config.symbol ?? "BTC").toUpperCase();
      const asset = await db.asset.findUnique({ where: { symbol } });
      return { asset };
    }

    case "MARKET_OVERVIEW": {
      const count = Number(config.count ?? 6);
      const assets = await db.asset.findMany({ where: { enabled: true }, orderBy: { displayOrder: "asc" }, take: count });
      return { assets };
    }

    case "TRENDING": {
      const count = Number(config.count ?? 5);
      const assets = await db.asset.findMany({ where: { enabled: true } });
      const sorted = assets.sort((a, b) => Math.abs(Number(b.priceChange24h)) - Math.abs(Number(a.priceChange24h))).slice(0, count);
      return { assets: sorted };
    }

    case "TOP_GAINERS": {
      const count = Number(config.count ?? 5);
      const assets = await db.asset.findMany({ where: { enabled: true }, orderBy: { priceChange24h: "desc" }, take: count });
      return { assets };
    }

    case "TOP_LOSERS": {
      const count = Number(config.count ?? 5);
      const assets = await db.asset.findMany({ where: { enabled: true }, orderBy: { priceChange24h: "asc" }, take: count });
      return { assets };
    }

    case "FEAR_GREED": {
      const value = Math.max(0, Math.min(100, Number(config.value ?? 50)));
      let label = "Neutral";
      if (value < 25) label = "Extreme Fear";
      else if (value < 45) label = "Fear";
      else if (value < 55) label = "Neutral";
      else if (value < 75) label = "Greed";
      else label = "Extreme Greed";
      return { value, label };
    }

    case "MARKET_DOMINANCE": {
      const count = Number(config.count ?? 5);
      const assets = await db.asset.findMany({ where: { enabled: true }, orderBy: { marketCap: "desc" } });
      const total = assets.reduce((sum, a) => sum.add(a.marketCap), new Prisma.Decimal(0));
      const top = assets.slice(0, count).map((a) => ({
        symbol: a.symbol,
        name: a.name,
        marketCap: a.marketCap.toString(),
        share: total.greaterThan(0) ? Number(a.marketCap.div(total).mul(100)) : 0,
      }));
      const topTotal = assets.slice(0, count).reduce((sum, a) => sum.add(a.marketCap), new Prisma.Decimal(0));
      const othersShare = total.greaterThan(0) ? Number(total.sub(topTotal).div(total).mul(100)) : 0;
      return { breakdown: top, othersShare, totalMarketCap: total.toString() };
    }

    case "GAS_PRICES": {
      const networks = Array.isArray(config.networks) ? config.networks : [];
      return { networks };
    }

    case "CONVERSION_CALCULATOR":
    case "EXCHANGE_CALCULATOR": {
      const assets = await db.asset.findMany({ where: { enabled: true, swapEnabled: true }, orderBy: { displayOrder: "asc" } });
      return { assets };
    }

    case "PRICE_CHART": {
      const symbol = String(config.symbol ?? "BTC").toUpperCase();
      const asset = await db.asset.findUnique({ where: { symbol } });
      if (!asset) return { asset: null, history: [] };
      const history = await db.priceHistory.findMany({ where: { assetId: asset.id }, orderBy: { timestamp: "asc" }, take: 100 });
      return { asset, history: history.map((h) => ({ time: h.timestamp.toISOString(), price: Number(h.price) })) };
    }

    case "NEWS": {
      const count = Number(config.count ?? 3);
      const articles = await db.newsArticle.findMany({ orderBy: [{ featured: "desc" }, { publishedAt: "desc" }], take: count });
      return { articles };
    }

    case "PORTFOLIO_CHART": {
      if (!ctx.userId) return { holdings: [] };
      const balances = await db.balance.findMany({ where: { userId: ctx.userId }, include: { asset: true } });
      const holdings = balances
        .filter((b) => b.available.add(b.locked).greaterThan(0))
        .map((b) => ({
          symbol: b.asset.symbol,
          valueUsd: b.available.add(b.locked).mul(b.asset.demoPrice).toString(),
        }));
      return { holdings };
    }

    default:
      return {};
  }
}
