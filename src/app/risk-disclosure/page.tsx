import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { getStaticPage } from "@/lib/cms";
import { SiteNavbar } from "@/components/site/navbar";
import { SiteFooter } from "@/components/site/footer";
import { StaticPageBody } from "@/components/site/static-page";
import { staticPageMetadata } from "@/lib/staticPageMetadata";

// Reads live, admin-editable content — never prerender statically.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return staticPageMetadata(await getStaticPage("risk-disclosure"));
}

export default async function RiskDisclosurePage() {
  const [settings, content] = await Promise.all([getSettings(), getStaticPage("risk-disclosure")]);
  return (
    <div className="min-h-screen bg-background">
      <SiteNavbar siteName={settings.siteName} logoUrl={settings.logoUrl} navLinks={settings.navLinks} />
      <StaticPageBody content={content} />
      <SiteFooter siteName={settings.siteName} tagline={settings.footerTagline} navLinks={settings.navLinks} />
    </div>
  );
}
