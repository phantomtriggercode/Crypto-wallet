import Link from "next/link";
import { ArrowRight, ShieldCheck, Lock, ScrollText } from "lucide-react";
import { getSettings } from "@/lib/settings";
import { getHomepageContent, HOMEPAGE_SECTION_KEYS, HomepageSectionKey } from "@/lib/cms";
import { db } from "@/lib/db";
import { SiteNavbar } from "@/components/site/navbar";
import { SiteFooter } from "@/components/site/footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AssetIcon } from "@/components/ui/asset-icon";
import { formatUsd } from "@/lib/format";
import { WidgetGrid } from "@/components/widgets/widget-grid";

// Reads live, admin-editable content (settings, CMS, prices, widgets) — never prerender statically.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [settings, content, assets, news] = await Promise.all([
    getSettings(),
    getHomepageContent(),
    db.asset.findMany({ where: { enabled: true }, orderBy: { displayOrder: "asc" }, take: 6 }),
    db.newsArticle.findMany({ where: { featured: true }, orderBy: { publishedAt: "desc" }, take: 3 }),
  ]);

  const orderedKeys: HomepageSectionKey[] = [
    ...content.sectionOrder,
    ...HOMEPAGE_SECTION_KEYS.filter((k) => !content.sectionOrder.includes(k)),
  ];

  const sections: Partial<Record<HomepageSectionKey, React.ReactNode>> = {
    features: content.showFeaturesSection && content.features.length > 0 && (
      <section key="features" className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {content.features.map((f) => (
            <Card key={f.title}>
              <p className="text-sm font-semibold">{f.title}</p>
              <p className="mt-1 text-sm text-muted">{f.description}</p>
            </Card>
          ))}
        </div>
      </section>
    ),

    widgets: <WidgetGrid key="widgets" placement="homepage" />,

    market: content.showMarketSection && (
      <section key="market" className="border-t border-border bg-surface/40 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Market overview</h2>
            <Link href="/market" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {assets.map((a) => (
              <Link key={a.id} href={`/market/${a.symbol.toLowerCase()}`}>
                <Card className="flex items-center justify-between transition hover:border-primary/40">
                  <div className="flex items-center gap-3">
                    <AssetIcon symbol={a.symbol} iconUrl={a.iconUrl} size={32} />
                    <div>
                      <p className="text-sm font-medium">{a.symbol}</p>
                      <p className="text-xs text-muted">{a.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatUsd(a.demoPrice.toString())}</p>
                    <p className={`text-xs ${Number(a.priceChange24h) >= 0 ? "text-success" : "text-danger"}`}>
                      {Number(a.priceChange24h) >= 0 ? "+" : ""}
                      {Number(a.priceChange24h).toFixed(2)}%
                    </p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>
    ),

    escrow: content.showEscrowSection && (
      <section key="escrow" id="escrow" className="border-t border-border py-16">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <ShieldCheck className="mx-auto mb-4 h-10 w-10 text-primary" />
          <h2 className="text-2xl font-semibold">Secure Your Crypto Transactions With Escrow</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-muted">
            Lock funds safely between a buyer and seller. Funds stay held in an internal escrow ledger until both
            parties confirm — with an administrator reviewing every release. Fully simulated, fully transparent.
          </p>
          <Link href="/register">
            <Button className="mt-6">Start an escrow deal</Button>
          </Link>
        </div>
      </section>
    ),

    security: content.showSecuritySection && (
      <section key="security" className="border-t border-border py-16">
        <div className="mx-auto max-w-4xl px-4">
          <div className="mb-8 flex items-center gap-3">
            <Lock className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-semibold">Security you can see</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <p className="text-sm font-medium">2FA everywhere it matters</p>
              <p className="mt-1 text-xs text-muted">Required for withdrawals and sensitive account changes.</p>
            </Card>
            <Card>
              <p className="text-sm font-medium">Full audit trail</p>
              <p className="mt-1 text-xs text-muted">Every admin action is logged and immutable.</p>
            </Card>
            <Card>
              <p className="text-sm font-medium">Manual review</p>
              <p className="mt-1 text-xs text-muted">Deposits and withdrawals are checked by a human, every time.</p>
            </Card>
          </div>
          <Link href="/security" className="mt-4 inline-block text-sm text-primary hover:underline">
            Learn more about security →
          </Link>
        </div>
      </section>
    ),

    news: content.showNewsSection && news.length > 0 && (
      <section key="news" className="border-t border-border bg-surface/40 py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Crypto news</h2>
            <Link href="/news" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {news.map((n) => (
              <Card key={n.id}>
                <p className="text-xs text-muted">{n.publisher}</p>
                <p className="mt-1 text-sm font-medium">{n.headline}</p>
                {n.summary && <p className="mt-1 text-xs text-muted line-clamp-3">{n.summary}</p>}
              </Card>
            ))}
          </div>
        </div>
      </section>
    ),

    faq: content.showFaqSection && content.faqs.length > 0 && (
      <section key="faq" className="border-t border-border py-16">
        <div className="mx-auto max-w-3xl px-4">
          <div className="mb-8 flex items-center gap-3">
            <ScrollText className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-semibold">Frequently asked questions</h2>
          </div>
          <div className="space-y-4">
            {content.faqs.map((f) => (
              <Card key={f.question}>
                <p className="text-sm font-medium">{f.question}</p>
                <p className="mt-1 text-sm text-muted">{f.answer}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>
    ),
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteNavbar siteName={settings.siteName} logoUrl={settings.logoUrl} navLinks={settings.navLinks} />

      <section className="relative overflow-hidden border-b border-border">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_-10%,rgba(225,29,46,0.18),transparent_55%)]" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 text-center">
          {settings.demoModeEnabled && (
            <span className="mb-4 inline-block rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">
              Educational / Sandbox Environment
            </span>
          )}
          <h1 className="mx-auto max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">{content.heroTitle}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-muted">{content.heroSubtitle}</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/register">
              <Button size="lg">
                {content.heroPrimaryCta} <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/market">
              <Button size="lg" variant="secondary">
                {content.heroSecondaryCta}
              </Button>
            </Link>
          </div>
          <div className="mx-auto mt-12 grid max-w-2xl grid-cols-3 gap-4">
            {content.stats.map((s) => (
              <div key={s.label}>
                <p className="text-2xl font-semibold">{s.value}</p>
                <p className="text-xs text-muted">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {orderedKeys.map((key) => sections[key] || null)}

      <SiteFooter siteName={settings.siteName} tagline={settings.footerTagline} navLinks={settings.navLinks} />
    </div>
  );
}
