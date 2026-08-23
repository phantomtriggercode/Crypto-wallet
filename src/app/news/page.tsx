import { getSettings } from "@/lib/settings";
import { db } from "@/lib/db";
import { SiteNavbar } from "@/components/site/navbar";
import { SiteFooter } from "@/components/site/footer";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/format";

export default async function NewsPage() {
  const [settings, articles] = await Promise.all([
    getSettings(),
    db.newsArticle.findMany({ orderBy: [{ featured: "desc" }, { publishedAt: "desc" }], take: 30 }),
  ]);

  return (
    <div className="min-h-screen bg-background">
      <SiteNavbar siteName={settings.siteName} logoUrl={settings.logoUrl} />
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10">
        <h1 className="text-2xl font-semibold">Crypto News</h1>
        {articles.length === 0 && <p className="text-sm text-muted">No news articles yet.</p>}
        {articles.map((a) => (
          <Card key={a.id}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-muted">
                  {a.publisher ?? "Newsroom"} · {formatDate(a.publishedAt)}
                </p>
                <p className="mt-1 font-medium">{a.headline}</p>
                {a.summary && <p className="mt-1 text-sm text-muted">{a.summary}</p>}
                {a.sourceUrl && (
                  <a href={a.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs text-primary hover:underline">
                    Read article →
                  </a>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
      <SiteFooter siteName={settings.siteName} />
    </div>
  );
}
