import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { getSettings } from "@/lib/settings";
import { CustomCode } from "@/components/site/custom-code";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings().catch(() => null);
  const siteName = settings?.siteName ?? "Your Wallet";
  const title = settings?.seoMetaTitle || siteName;
  const description = settings?.seoMetaDescription || settings?.siteTagline || "Educational cryptocurrency wallet platform.";
  return {
    title: { default: title, template: `%s · ${siteName}` },
    description,
    robots: settings?.seoRobotsIndexing === false ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      title,
      description,
      siteName,
      images: settings?.seoOgImageUrl ? [{ url: settings.seoOgImageUrl }] : undefined,
    },
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const settings = await getSettings().catch(() => null);

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
        <Toaster theme="dark" position="top-right" richColors />
        {settings && <CustomCode head={settings.customHeadCode} bodyEnd={settings.customBodyEndCode} />}
      </body>
    </html>
  );
}
