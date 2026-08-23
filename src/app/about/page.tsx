import { getSettings } from "@/lib/settings";
import { getStaticPage } from "@/lib/cms";
import { SiteNavbar } from "@/components/site/navbar";
import { SiteFooter } from "@/components/site/footer";
import { StaticPageBody } from "@/components/site/static-page";

// Reads live, admin-editable content — never prerender statically.
export const dynamic = "force-dynamic";

export default async function AboutPage() {
  const [settings, content] = await Promise.all([getSettings(), getStaticPage("about")]);
  return (
    <div className="min-h-screen bg-background">
      <SiteNavbar siteName={settings.siteName} logoUrl={settings.logoUrl} navLinks={settings.navLinks} />
      <StaticPageBody content={content} />
      <SiteFooter siteName={settings.siteName} tagline={settings.footerTagline} navLinks={settings.navLinks} />
    </div>
  );
}
