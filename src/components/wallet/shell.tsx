"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clsx } from "clsx";
import {
  Home,
  Wallet,
  ArrowDownToLine,
  ArrowUpFromLine,
  Repeat,
  LineChart,
  ShieldCheck,
  Newspaper,
  Bell,
  Lock,
  BadgeCheck,
  LifeBuoy,
  Settings,
  LogOut,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/apiClient";
import { GlobalSearch } from "@/components/search/global-search";

const NAV_ITEMS = [
  { href: "/wallet", label: "Home", icon: Home },
  { href: "/wallet/holdings", label: "Wallet", icon: Wallet },
  { href: "/wallet/transactions", label: "Transactions", icon: LineChart },
  { href: "/wallet/deposit", label: "Deposit", icon: ArrowDownToLine },
  { href: "/wallet/withdraw", label: "Withdraw", icon: ArrowUpFromLine },
  { href: "/wallet/swap", label: "Swap", icon: Repeat },
  { href: "/market", label: "Market", icon: LineChart },
  { href: "/wallet/escrow", label: "Escrow", icon: ShieldCheck },
  { href: "/news", label: "News", icon: Newspaper },
  { href: "/wallet/notifications", label: "Notifications", icon: Bell },
  { href: "/wallet/security", label: "Security", icon: Lock },
  { href: "/wallet/kyc", label: "Verification", icon: BadgeCheck },
  { href: "/wallet/support", label: "Support", icon: LifeBuoy },
  { href: "/wallet/settings", label: "Settings", icon: Settings },
];

const MOBILE_NAV = [
  { href: "/wallet", label: "Home", icon: Home },
  { href: "/wallet/holdings", label: "Wallet", icon: Wallet },
  { href: "/wallet/swap", label: "Swap", icon: Repeat },
  { href: "/wallet/escrow", label: "Escrow", icon: ShieldCheck },
  { href: "/wallet/settings", label: "Profile", icon: Settings },
];

export function WalletShell({
  children,
  user,
  settings,
}: {
  children: React.ReactNode;
  user: { fullName: string; email: string; kycStatus: string; isAdmin: boolean };
  settings: { siteName: string; demoModeEnabled: boolean };
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await apiFetch("/api/auth/logout", { method: "POST" });
    toast.success("Logged out.");
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface lg:flex">
        <div className="flex items-center gap-2 px-5 py-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">
            {settings.siteName.slice(0, 1)}
          </span>
          <span className="font-semibold">{settings.siteName}</span>
        </div>
        <div className="px-3 pb-2">
          <GlobalSearch scope="user" />
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                  active ? "bg-primary/10 text-primary" : "text-muted hover:bg-surface-2 hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
          {user.isAdmin && (
            <Link
              href="/admin"
              className="mt-2 flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2.5 text-sm text-primary transition hover:bg-primary/10"
            >
              <ShieldAlert className="h-4 w-4" />
              Admin dashboard
            </Link>
          )}
        </nav>
        <div className="border-t border-border p-3">
          <div className="mb-2 rounded-xl bg-surface-2 px-3 py-2.5">
            <p className="truncate text-sm font-medium">{user.fullName}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted transition hover:bg-surface-2 hover:text-danger"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        {settings.demoModeEnabled && (
          <div className="border-b border-border bg-primary/10 px-4 py-2 text-center text-xs text-primary">
            Educational / Sandbox Environment — no real funds, no blockchain transactions.
          </div>
        )}
        <main className="flex-1 px-4 py-6 pb-24 lg:px-8 lg:pb-8">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-border bg-surface lg:hidden">
        {MOBILE_NAV.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px]",
                active ? "text-primary" : "text-muted"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
