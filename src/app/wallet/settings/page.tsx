import Link from "next/link";
import { requireUser } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { Lock, BadgeCheck, LifeBuoy, ShieldCheck } from "lucide-react";

export default async function SettingsPage() {
  const user = await requireUser();
  if (!user) return null;

  const links = [
    { href: "/wallet/security", label: "Security Center", desc: "2FA, sessions, password", icon: Lock },
    { href: "/wallet/kyc", label: "Identity Verification", desc: "KYC status and documents", icon: BadgeCheck },
    { href: "/wallet/escrow", label: "Escrow", desc: "Your escrow deals", icon: ShieldCheck },
    { href: "/wallet/support", label: "Support", desc: "Get help from our team", icon: LifeBuoy },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold">Settings</h1>
      <Card>
        <p className="text-sm text-muted">Full name</p>
        <p className="mb-3 text-sm font-medium">{user.fullName}</p>
        <p className="text-sm text-muted">Email</p>
        <p className="mb-3 text-sm font-medium">{user.email}</p>
        <p className="text-sm text-muted">Country</p>
        <p className="text-sm font-medium">{user.country ?? "—"}</p>
      </Card>
      <div className="grid gap-3 sm:grid-cols-2">
        {links.map((l) => (
          <Link key={l.href} href={l.href}>
            <Card className="flex items-center gap-3 transition hover:border-primary/40">
              <l.icon className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">{l.label}</p>
                <p className="text-xs text-muted">{l.desc}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
