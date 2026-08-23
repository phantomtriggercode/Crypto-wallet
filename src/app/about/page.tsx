import { getSettings } from "@/lib/settings";
import { SiteNavbar } from "@/components/site/navbar";
import { SiteFooter } from "@/components/site/footer";
import { Card } from "@/components/ui/card";

export default async function AboutPage() {
  const settings = await getSettings();
  return (
    <div className="min-h-screen bg-background">
      <SiteNavbar siteName={settings.siteName} logoUrl={settings.logoUrl} />
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-10">
        <h1 className="text-2xl font-semibold">About {settings.siteName}</h1>
        <Card>
          <p className="text-sm text-muted">
            {settings.siteName} is an educational, white-label cryptocurrency wallet platform. It is designed for
            learning, demos, and internal testing of wallet-style user experiences — deposits, withdrawals, swaps,
            escrow, and KYC — without connecting to any real blockchain network.
          </p>
          <p className="mt-3 text-sm text-muted">
            Every balance on this platform lives in an internal, manually-controlled ledger. Administrators review
            and approve financial actions by hand, and every adjustment is permanently recorded in an audit log.
          </p>
        </Card>
      </div>
      <SiteFooter siteName={settings.siteName} />
    </div>
  );
}
