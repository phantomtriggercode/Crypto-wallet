import { getSettings } from "@/lib/settings";
import { SiteNavbar } from "@/components/site/navbar";
import { SiteFooter } from "@/components/site/footer";
import { Card } from "@/components/ui/card";

export default async function RiskDisclosurePage() {
  const settings = await getSettings();
  return (
    <div className="min-h-screen bg-background">
      <SiteNavbar siteName={settings.siteName} logoUrl={settings.logoUrl} />
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-10">
        <h1 className="text-2xl font-semibold">Risk Disclosure</h1>
        <Card className="space-y-3 text-sm text-muted">
          <p>
            This platform is a simulation. Balances, prices, and transactions displayed here do not represent real
            cryptocurrency and cannot be exchanged for real-world value.
          </p>
          <p>
            We never claim that a simulated transaction has been broadcast to, or confirmed by, any blockchain
            network, and no security claims made anywhere on this platform should be read as a guarantee that the
            system cannot be compromised.
          </p>
          <p>
            If real blockchain functionality is ever integrated into a deployment of this software, that
            integration carries its own independent risks that are not covered by this document.
          </p>
        </Card>
      </div>
      <SiteFooter siteName={settings.siteName} />
    </div>
  );
}
