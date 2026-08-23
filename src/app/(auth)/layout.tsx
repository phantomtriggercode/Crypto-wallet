import Link from "next/link";
import { getSettings } from "@/lib/settings";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white font-bold">
          {settings.siteName.slice(0, 1)}
        </span>
        <span className="text-lg font-semibold tracking-tight">{settings.siteName}</span>
      </Link>
      <div className="w-full max-w-md">{children}</div>
      <p className="mt-8 max-w-md text-center text-xs text-muted">
        Educational demonstration platform. No real funds, blockchain transactions, or private keys are involved.
      </p>
    </div>
  );
}
