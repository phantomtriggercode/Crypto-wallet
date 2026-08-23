import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { WalletShell } from "@/components/wallet/shell";

export default async function WalletLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (!user) redirect("/login");

  const settings = await getSettings();

  return (
    <WalletShell
      settings={{ siteName: settings.siteName, demoModeEnabled: settings.demoModeEnabled }}
      user={{ fullName: user.fullName, email: user.email, kycStatus: user.kycStatus, isAdmin: user.isAdmin }}
    >
      {children}
    </WalletShell>
  );
}
