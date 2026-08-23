"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type NavLink = { label: string; href: string };

export function SiteNavbar({
  siteName,
  logoUrl,
  navLinks,
}: {
  siteName: string;
  logoUrl: string | null;
  navLinks: NavLink[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={siteName} className="h-8" />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">
              {siteName.slice(0, 1)}
            </span>
          )}
          <span className="font-semibold">{siteName}</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-muted md:flex">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Log in
            </Button>
          </Link>
          <Link href="/register">
            <Button size="sm">Get started</Button>
          </Link>
        </div>

        <button
          className="rounded-lg p-2 text-muted hover:bg-surface-2 md:hidden"
          onClick={() => setOpen((s) => !s)}
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-3 text-sm text-muted">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-foreground" onClick={() => setOpen(false)}>
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 flex gap-2">
            <Link href="/login" className="flex-1">
              <Button variant="ghost" size="sm" className="w-full">
                Log in
              </Button>
            </Link>
            <Link href="/register" className="flex-1">
              <Button size="sm" className="w-full">
                Get started
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
