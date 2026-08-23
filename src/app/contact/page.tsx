import { getSettings } from "@/lib/settings";
import { SiteNavbar } from "@/components/site/navbar";
import { SiteFooter } from "@/components/site/footer";
import { Card } from "@/components/ui/card";

export default async function ContactPage() {
  const settings = await getSettings();
  return (
    <div className="min-h-screen bg-background">
      <SiteNavbar siteName={settings.siteName} logoUrl={settings.logoUrl} />
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-10">
        <h1 className="text-2xl font-semibold">Contact</h1>
        <Card>
          <p className="text-sm text-muted">
            For support with your account, please log in and open a ticket from the Support Center. For general
            inquiries, reach us at:
          </p>
          <p className="mt-3 text-sm font-medium">{settings.supportEmail}</p>
        </Card>
      </div>
      <SiteFooter siteName={settings.siteName} />
    </div>
  );
}
