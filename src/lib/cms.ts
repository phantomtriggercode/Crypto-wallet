import "server-only";
import { db } from "@/lib/db";

export const HOMEPAGE_SECTION_KEYS = ["features", "widgets", "market", "escrow", "security", "news", "faq"] as const;
export type HomepageSectionKey = (typeof HOMEPAGE_SECTION_KEYS)[number];

export type HomepageContent = {
  heroTitle: string;
  heroSubtitle: string;
  heroPrimaryCta: string;
  heroSecondaryCta: string;
  features: { title: string; description: string }[];
  stats: { label: string; value: string }[];
  faqs: { question: string; answer: string }[];
  showFeaturesSection: boolean;
  showEscrowSection: boolean;
  showMarketSection: boolean;
  showNewsSection: boolean;
  showSecuritySection: boolean;
  showFaqSection: boolean;
  /** Order in which enabled sections render below the hero. Any key missing from this list is appended at the end. */
  sectionOrder: HomepageSectionKey[];
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
  showFeaturesSection: true,
  showEscrowSection: true,
  showMarketSection: true,
  showNewsSection: true,
  showSecuritySection: true,
  showFaqSection: true,
  sectionOrder: ["features", "widgets", "market", "escrow", "security", "news", "faq"],
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

// ---------------------------------------------------------------------------
// Static informational pages (About, Contact, Security, Terms, Privacy, Risk)
// ---------------------------------------------------------------------------

export type StaticPageContent = {
  title: string;
  intro: string;
  sections: { heading: string; body: string }[];
};

export const STATIC_PAGE_SLUGS = ["about", "contact", "security", "terms", "privacy", "risk-disclosure"] as const;
export type StaticPageSlug = (typeof STATIC_PAGE_SLUGS)[number];

export const DEFAULT_STATIC_PAGES: Record<StaticPageSlug, StaticPageContent> = {
  about: {
    title: "About Us",
    intro:
      "This platform is an educational, white-label cryptocurrency wallet built for learning, demos, and internal testing of wallet-style user experiences — deposits, withdrawals, swaps, escrow, and KYC — without connecting to any real blockchain network.\n\nEvery balance lives in an internal, manually-controlled ledger. Administrators review and approve financial actions by hand, and every adjustment is permanently recorded in an audit log.",
    sections: [],
  },
  contact: {
    title: "Contact",
    intro: "For support with your account, please log in and open a ticket from the Support Center. For general inquiries, reach us using the email address below.",
    sections: [],
  },
  security: {
    title: "Security",
    intro: "Security is built into every layer of this platform, even though it operates on a simulated ledger rather than a real blockchain.",
    sections: [
      { heading: "Two-factor authentication", body: "TOTP-based 2FA with hashed backup codes is required for withdrawals and other sensitive account changes." },
      { heading: "Full audit trail", body: "Every administrator action — balance adjustments, approvals, configuration changes — is permanently logged with who, what, when, and why." },
      { heading: "Manual review", body: "Deposits, withdrawals, and escrow releases are all reviewed by a human administrator before funds move." },
      { heading: "Private document storage", body: "KYC documents are stored outside of public web access and are only ever served to their owner or an authorized KYC administrator." },
    ],
  },
  terms: {
    title: "Terms of Use",
    intro:
      "This platform is an educational and demonstration environment. By creating an account you acknowledge that it does not hold, transmit, or custody real cryptocurrency, and no balance shown reflects real-world value.\n\nAll deposits, withdrawals, swaps, and escrow deals are simulated through an internal ledger and are manually reviewed by platform administrators. No blockchain transactions are broadcast at any point.\n\nYou agree not to use this platform to represent, advertise, or imply that simulated balances or transactions are real financial instruments.\n\nOperators deploying this software are responsible for adapting these terms to their own use case and jurisdiction.",
    sections: [],
  },
  privacy: {
    title: "Privacy Policy",
    intro:
      "We collect the information you provide during registration (name, email, phone, country) and, if you complete identity verification, the documents you submit for KYC review.\n\nKYC documents are stored in private storage and are only accessible to authorized KYC administrators. They are never exposed through public URLs.\n\nSecurity-sensitive data — password hashes, two-factor secrets, and wallet recovery phrase hashes — are stored using one-way hashing or encryption and are never accessible to administrators in plaintext.\n\nOperators deploying this software are responsible for adapting this policy to their own data-handling practices and applicable law.",
    sections: [],
  },
  "risk-disclosure": {
    title: "Risk Disclosure",
    intro:
      "This platform is a simulation. Balances, prices, and transactions displayed here do not represent real cryptocurrency and cannot be exchanged for real-world value.\n\nWe never claim that a simulated transaction has been broadcast to, or confirmed by, any blockchain network, and no security claims made anywhere on this platform should be read as a guarantee that the system cannot be compromised.\n\nIf real blockchain functionality is ever integrated into a deployment of this software, that integration carries its own independent risks that are not covered by this document.",
    sections: [],
  },
};

export async function getStaticPage(slug: StaticPageSlug): Promise<StaticPageContent> {
  const page = await db.cmsPage.findUnique({ where: { slug } });
  if (!page) return DEFAULT_STATIC_PAGES[slug];
  return { ...DEFAULT_STATIC_PAGES[slug], ...(page.contentJson as object) };
}

export async function saveStaticPage(slug: StaticPageSlug, data: StaticPageContent) {
  await db.cmsPage.upsert({
    where: { slug },
    update: { title: data.title, contentJson: data },
    create: { slug, title: data.title, contentJson: data },
  });
}

export async function listStaticPages() {
  const pages = await db.cmsPage.findMany({ where: { slug: { in: [...STATIC_PAGE_SLUGS] } } });
  const byslug = new Map(pages.map((p) => [p.slug, p]));
  return STATIC_PAGE_SLUGS.map((slug) => {
    const existing = byslug.get(slug);
    return {
      slug,
      title: existing?.title ?? DEFAULT_STATIC_PAGES[slug].title,
      enabled: existing?.enabled ?? true,
      updatedAt: existing?.updatedAt ?? null,
    };
  });
}
