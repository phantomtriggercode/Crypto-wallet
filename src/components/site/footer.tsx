import Link from "next/link";

export function SiteFooter({ siteName }: { siteName: string }) {
  return (
    <footer className="border-t border-border bg-surface/50">
      <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-muted">
        <div className="grid gap-8 sm:grid-cols-4">
          <div>
            <p className="mb-2 font-semibold text-foreground">{siteName}</p>
            <p className="text-xs">Educational cryptocurrency wallet platform. No real funds or blockchain transactions.</p>
          </div>
          <div>
            <p className="mb-2 font-medium text-foreground">Product</p>
            <ul className="space-y-1">
              <li><Link href="/market" className="hover:text-foreground">Market</Link></li>
              <li><Link href="/#escrow" className="hover:text-foreground">Escrow</Link></li>
              <li><Link href="/news" className="hover:text-foreground">News</Link></li>
            </ul>
          </div>
          <div>
            <p className="mb-2 font-medium text-foreground">Company</p>
            <ul className="space-y-1">
              <li><Link href="/about" className="hover:text-foreground">About</Link></li>
              <li><Link href="/contact" className="hover:text-foreground">Contact</Link></li>
              <li><Link href="/faq" className="hover:text-foreground">FAQ</Link></li>
            </ul>
          </div>
          <div>
            <p className="mb-2 font-medium text-foreground">Legal</p>
            <ul className="space-y-1">
              <li><Link href="/terms" className="hover:text-foreground">Terms</Link></li>
              <li><Link href="/privacy" className="hover:text-foreground">Privacy</Link></li>
              <li><Link href="/risk-disclosure" className="hover:text-foreground">Risk Disclosure</Link></li>
            </ul>
          </div>
        </div>
        <p className="mt-8 border-t border-border pt-6 text-xs">
          Educational demonstration — transactions are manually processed and are not broadcast to a blockchain. © {new Date().getFullYear()} {siteName}.
        </p>
      </div>
    </footer>
  );
}
