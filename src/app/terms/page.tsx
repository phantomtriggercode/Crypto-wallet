import { getSettings } from "@/lib/settings";
import { SiteNavbar } from "@/components/site/navbar";
import { SiteFooter } from "@/components/site/footer";
import { Card } from "@/components/ui/card";

export default async function TermsPage() {
  const settings = await getSettings();
  return (
    <div className="min-h-screen bg-background">
      <SiteNavbar siteName={settings.siteName} logoUrl={settings.logoUrl} />
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-10">
        <h1 className="text-2xl font-semibold">Terms of Use</h1>
        <Card className="space-y-3 text-sm text-muted">
          <p>
            {settings.siteName} is an educational and demonstration platform. By creating an account you acknowledge
            that this platform does not hold, transmit, or custody real cryptocurrency, and no balance shown reflects
            real-world value.
          </p>
          <p>
            All deposits, withdrawals, swaps, and escrow deals are simulated through an internal ledger and are
            manually reviewed by platform administrators. No blockchain transactions are broadcast at any point.
          </p>
          <p>
            You agree not to use this platform to represent, advertise, or imply that simulated balances or
            transactions are real financial instruments.
          </p>
          <p>Operators deploying this software are responsible for adapting these terms to their own use case and jurisdiction.</p>
        </Card>
      </div>
      <SiteFooter siteName={settings.siteName} />
    </div>
  );
}
