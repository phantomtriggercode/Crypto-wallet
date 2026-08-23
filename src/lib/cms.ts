import "server-only";
import { db } from "@/lib/db";

export type HomepageContent = {
  heroTitle: string;
  heroSubtitle: string;
  heroPrimaryCta: string;
  heroSecondaryCta: string;
  features: { title: string; description: string }[];
  stats: { label: string; value: string }[];
  faqs: { question: string; answer: string }[];
  showEscrowSection: boolean;
  showMarketSection: boolean;
  showNewsSection: boolean;
};

export const DEFAULT_HOMEPAGE: HomepageContent = {
  heroTitle: "Your digital assets, fully in your control.",
  heroSubtitle:
    "An educational, white-label crypto wallet platform. Manage simulated balances, practice deposits and withdrawals, and explore secure escrow — all without touching a real blockchain.",
  heroPrimaryCta: "Create free account",
  heroSecondaryCta: "Explore market",
  features: [
    { title: "Manual, transparent ledger", description: "Every balance change is a permanent, auditable ledger entry." },
    { title: "Secure by design", description: "2FA, session management, and admin-reviewed transactions." },
    { title: "Built-in escrow", description: "Lock funds safely between two parties until a deal is complete." },
    { title: "Fully configurable", description: "Admins control assets, fees, rates, and every page of content." },
  ],
  stats: [
    { label: "Supported assets", value: "9+" },
    { label: "Manual review", value: "100%" },
    { label: "Uptime", value: "Educational" },
  ],
  faqs: [
    { question: "Is this a real crypto wallet?", answer: "No — this is an educational simulation. No blockchain transactions are broadcast and no real funds are held." },
    { question: "How are deposits processed?", answer: "Deposits are manually reviewed and approved by an administrator, then credited to your internal ledger balance." },
  ],
  showEscrowSection: true,
  showMarketSection: true,
  showNewsSection: true,
};

export async function getHomepageContent(): Promise<HomepageContent> {
  const section = await db.cmsSection.findUnique({ where: { page_key: { page: "homepage", key: "content" } } });
  if (!section) return DEFAULT_HOMEPAGE;
  return { ...DEFAULT_HOMEPAGE, ...(section.dataJson as object) };
}

export async function saveHomepageContent(data: HomepageContent) {
  await db.cmsSection.upsert({
    where: { page_key: { page: "homepage", key: "content" } },
    update: { dataJson: data },
    create: { page: "homepage", key: "content", dataJson: data },
  });
}
