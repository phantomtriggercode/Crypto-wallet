import { getSettings } from "@/lib/settings";
import { SiteNavbar } from "@/components/site/navbar";
import { SiteFooter } from "@/components/site/footer";
import { Card } from "@/components/ui/card";

export default async function PrivacyPage() {
  const settings = await getSettings();
  return (
    <div className="min-h-screen bg-background">
      <SiteNavbar siteName={settings.siteName} logoUrl={settings.logoUrl} />
      <div className="mx-auto max-w-2xl space-y-4 px-4 py-10">
        <h1 className="text-2xl font-semibold">Privacy Policy</h1>
        <Card className="space-y-3 text-sm text-muted">
          <p>
            We collect the information you provide during registration (name, email, phone, country) and, if you
            complete identity verification, the documents you submit for KYC review.
          </p>
          <p>
            KYC documents are stored in private storage and are only accessible to authorized KYC administrators.
            They are never exposed through public URLs.
          </p>
          <p>
            Security-sensitive data — password hashes, two-factor secrets, and wallet recovery phrase hashes — are
            stored using one-way hashing or encryption and are never accessible to administrators in plaintext.
          </p>
          <p>Operators deploying this software are responsible for adapting this policy to their own data-handling practices and applicable law.</p>
        </Card>
      </div>
      <SiteFooter siteName={settings.siteName} />
    </div>
  );
}
