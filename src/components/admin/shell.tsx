"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clsx } from "clsx";
import { toast } from "sonner";
import {
  LayoutDashboard,
  Users,
  Wallet,
  Repeat,
  ShieldCheck,
  LineChart,
  Globe,
  Mail,
  LifeBuoy,
  ShieldAlert,
  Settings,
  LogOut,
  ArrowLeftCircle,
} from "lucide-react";
import { apiFetch } from "@/lib/apiClient";

const SECTIONS: { title: string; icon: React.ComponentType<{ className?: string }>; items: { href: string; label: string }[] }[] = [
  { title: "Dashboard", icon: LayoutDashboard, items: [{ href: "/admin", label: "Overview" }] },
  {
    title: "Users",
    icon: Users,
    items: [
      { href: "/admin/users", label: "All Users" },
      { href: "/admin/kyc", label: "KYC" },
      { href: "/admin/admins", label: "Admin Roles" },
    ],
  },
  {
    title: "Wallet",
    icon: Wallet,
    items: [
      { href: "/admin/assets", label: "Assets" },
      { href: "/admin/networks", label: "Networks" },
      { href: "/admin/deposits", label: "Deposits" },
      { href: "/admin/withdrawals", label: "Withdrawals" },
      { href: "/admin/ledger", label: "Manual Adjustments" },
    ],
  },
  {
    title: "Exchange",
    icon: Repeat,
    items: [
      { href: "/admin/exchange/pairs", label: "Trading Pairs" },
      { href: "/admin/exchange/swaps", label: "Swaps" },
    ],
  },
  {
    title: "Escrow",
    icon: ShieldCheck,
    items: [
      { href: "/admin/escrow", label: "Deals" },
      { href: "/admin/escrow/disputes", label: "Disputes" },
    ],
  },
  {
    title: "Market",
    icon: LineChart,
    items: [
      { href: "/admin/market/prices", label: "Prices" },
      { href: "/admin/market/news", label: "News" },
    ],
  },
  {
    title: "Website",
    icon: Globe,
    items: [
      { href: "/admin/cms/homepage", label: "Homepage" },
      { href: "/admin/cms/pages", label: "Pages" },
      { href: "/admin/cms/widgets", label: "Widgets" },
      { href: "/admin/cms/branding", label: "Branding" },
    ],
  },
  {
    title: "Communication",
    icon: Mail,
    items: [
      { href: "/admin/smtp", label: "SMTP" },
      { href: "/admin/email-templates", label: "Email Templates" },
      { href: "/admin/announcements", label: "Announcements" },
    ],
  },
  { title: "Support", icon: LifeBuoy, items: [{ href: "/admin/support", label: "Tickets" }] },
  {
    title: "Security",
    icon: ShieldAlert,
    items: [{ href: "/admin/audit-logs", label: "Audit Logs" }],
  },
  { title: "Settings", icon: Settings, items: [{ href: "/admin/settings", label: "General" }] },
];

export function AdminShell({
  children,
  user,
  settings,
}: {
  children: React.ReactNode;
  user: { fullName: string; email: string; roles: string[] };
  settings: { siteName: string };
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
      <aside className="hidden w-72 shrink-0 flex-col border-r border-border bg-surface lg:flex">
        <div className="flex items-center gap-2 px-5 py-5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">
            {settings.siteName.slice(0, 1)}
          </span>
          <span className="font-semibold">{settings.siteName} Admin</span>
        </div>
        <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-2">
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">{section.title}</p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={clsx(
                        "block rounded-lg px-3 py-2 text-sm transition",
                        active ? "bg-primary/10 text-primary" : "text-muted hover:bg-surface-2 hover:text-foreground"
                      )}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
          <Link
            href="/wallet"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted hover:bg-surface-2 hover:text-foreground"
          >
            <ArrowLeftCircle className="h-4 w-4" />
            Back to wallet
          </Link>
        </nav>
        <div className="border-t border-border p-3">
          <div className="mb-2 rounded-xl bg-surface-2 px-3 py-2.5">
            <p className="truncate text-sm font-medium">{user.fullName}</p>
            <p className="truncate text-xs text-muted">{user.roles.join(", ") || "Admin"}</p>
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
      <main className="flex-1 overflow-x-hidden px-4 py-6 lg:px-8">{children}</main>
    </div>
  );
}
