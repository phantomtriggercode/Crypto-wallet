import { getSettings } from "@/lib/settings";
import { getHomepageContent } from "@/lib/cms";
import { SiteNavbar } from "@/components/site/navbar";
import { SiteFooter } from "@/components/site/footer";
import { Card } from "@/components/ui/card";

export default async function FaqPage() {
  const [settings, content] = await Promise.all([getSettings(), getHomepageContent()]);
  return (
    <div className="min-h-screen bg-background">
      <SiteNavbar siteName={settings.siteName} logoUrl={settings.logoUrl} />
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-10">
        <h1 className="text-2xl font-semibold">Frequently Asked Questions</h1>
        {content.faqs.map((f) => (
          <Card key={f.question}>
            <p className="text-sm font-medium">{f.question}</p>
            <p className="mt-1 text-sm text-muted">{f.answer}</p>
          </Card>
        ))}
      </div>
      <SiteFooter siteName={settings.siteName} />
    </div>
  );
}
