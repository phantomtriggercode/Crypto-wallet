import Link from "next/link";
import { Button } from "@/components/ui/button";

export function SiteNavbar({ siteName, logoUrl }: { siteName: string; logoUrl: string | null }) {
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
          <Link href="/market" className="hover:text-foreground">
            Market
          </Link>
          <Link href="/#escrow" className="hover:text-foreground">
            Escrow
          </Link>
          <Link href="/news" className="hover:text-foreground">
            News
          </Link>
          <Link href="/faq" className="hover:text-foreground">
            FAQ
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Log in
            </Button>
          </Link>
          <Link href="/register">
            <Button size="sm">Get started</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
