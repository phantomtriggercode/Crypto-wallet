import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";

const db = new PrismaClient();

const ASSETS = [
  { symbol: "BTC", name: "Bitcoin", decimals: 8, demoPrice: 65000, priceChange24h: 2.4, marketCap: 1280000000000, volume24h: 32000000000 },
  { symbol: "ETH", name: "Ethereum", decimals: 8, demoPrice: 3200, priceChange24h: -0.8, marketCap: 384000000000, volume24h: 15000000000 },
  { symbol: "USDT", name: "Tether", decimals: 6, demoPrice: 1, priceChange24h: 0.01, marketCap: 112000000000, volume24h: 48000000000 },
  { symbol: "USDC", name: "USD Coin", decimals: 6, demoPrice: 1, priceChange24h: 0.0, marketCap: 33000000000, volume24h: 5000000000 },
  { symbol: "BNB", name: "BNB", decimals: 8, demoPrice: 590, priceChange24h: 1.1, marketCap: 88000000000, volume24h: 1800000000 },
  { symbol: "SOL", name: "Solana", decimals: 8, demoPrice: 145, priceChange24h: 4.2, marketCap: 68000000000, volume24h: 2900000000 },
  { symbol: "XRP", name: "XRP", decimals: 6, demoPrice: 0.52, priceChange24h: -1.5, marketCap: 29000000000, volume24h: 1200000000 },
  { symbol: "LTC", name: "Litecoin", decimals: 8, demoPrice: 68, priceChange24h: 0.6, marketCap: 5100000000, volume24h: 420000000 },
  { symbol: "DOGE", name: "Dogecoin", decimals: 8, demoPrice: 0.12, priceChange24h: 3.1, marketCap: 17000000000, volume24h: 900000000 },
] as const;

const NETWORKS: Record<string, { name: string; symbol: string; address: string }[]> = {
  BTC: [{ name: "Bitcoin", symbol: "BTC", address: "bc1qdemo0000000000000000000000000wallet" }],
  ETH: [{ name: "ERC20", symbol: "ERC20", address: "0xDeMo0000000000000000000000000000000001" }],
  USDT: [
    { name: "TRC20", symbol: "TRC20", address: "TDemo00000000000000000000000000001" },
    { name: "ERC20", symbol: "ERC20", address: "0xDeMo0000000000000000000000000000000002" },
    { name: "BEP20", symbol: "BEP20", address: "0xDeMo0000000000000000000000000000000003" },
  ],
  USDC: [
    { name: "ERC20", symbol: "ERC20", address: "0xDeMo0000000000000000000000000000000004" },
    { name: "Polygon", symbol: "Polygon", address: "0xDeMo0000000000000000000000000000000005" },
  ],
  BNB: [{ name: "BEP20", symbol: "BEP20", address: "0xDeMo0000000000000000000000000000000006" }],
  SOL: [{ name: "Solana", symbol: "SOL", address: "DemoSoLDeMoWaLLeT00000000000000000000001" }],
  XRP: [{ name: "XRP Ledger", symbol: "XRP", address: "rDemo0000000000000000000000001" }],
  LTC: [{ name: "Litecoin", symbol: "LTC", address: "ltc1qdemo0000000000000000000000000wallet" }],
  DOGE: [{ name: "Dogecoin", symbol: "DOGE", address: "DDemo00000000000000000000000000001" }],
};

const EMAIL_TEMPLATES: { key: string; subject: string; bodyHtml: string }[] = [
  { key: "welcome_verify_email", subject: "Verify your email — {{user_name}}", bodyHtml: "<p>Hi {{user_name}},</p><p>Welcome! Please verify your email by visiting: {{verify_url}}</p>" },
  { key: "password_reset", subject: "Reset your password", bodyHtml: "<p>Hi {{user_name}},</p><p>Reset your password here: {{reset_url}}</p>" },
  { key: "login_alert", subject: "New login to your account", bodyHtml: "<p>Hi {{user_name}},</p><p>A new login was detected from IP {{ip}}. If this wasn't you, secure your account immediately.</p>" },
  { key: "security_alert", subject: "Security alert on your account", bodyHtml: "<p>Hi {{user_name}},</p><p>{{event}}.</p>" },
  { key: "deposit_approved", subject: "Deposit confirmed", bodyHtml: "<p>Hi {{user_name}},</p><p>Your deposit of {{amount}} {{asset}} has been confirmed and credited.</p>" },
  { key: "deposit_rejected", subject: "Deposit rejected", bodyHtml: "<p>Hi {{user_name}},</p><p>Your deposit of {{amount}} {{asset}} was rejected. Please contact support.</p>" },
  { key: "withdrawal_submitted", subject: "Withdrawal submitted", bodyHtml: "<p>Hi {{user_name}},</p><p>Your withdrawal of {{amount}} {{asset}} is pending admin approval.</p>" },
  { key: "withdrawal_approved", subject: "Withdrawal approved", bodyHtml: "<p>Hi {{user_name}},</p><p>Your withdrawal of {{amount}} {{asset}} has been approved. Internal reference: {{reference}}.</p>" },
  { key: "withdrawal_rejected", subject: "Withdrawal rejected", bodyHtml: "<p>Hi {{user_name}},</p><p>Your withdrawal of {{amount}} {{asset}} was rejected.</p>" },
  { key: "swap_completed", subject: "Swap completed", bodyHtml: "<p>Hi {{user_name}},</p><p>Your swap of {{amount}} {{asset}} has completed.</p>" },
  { key: "kyc_submitted", subject: "KYC submitted", bodyHtml: "<p>Hi {{user_name}},</p><p>Your identity verification has been submitted and is under review.</p>" },
  { key: "kyc_approved", subject: "KYC approved", bodyHtml: "<p>Hi {{user_name}},</p><p>Your identity has been verified. All wallet features are now unlocked.</p>" },
  { key: "kyc_rejected", subject: "KYC rejected", bodyHtml: "<p>Hi {{user_name}},</p><p>Your identity verification was rejected. Please review and resubmit.</p>" },
  { key: "escrow_created", subject: "New escrow deal: {{title}}", bodyHtml: "<p>Hi {{user_name}},</p><p>A new escrow deal \"{{title}}\" was opened with you.</p>" },
  { key: "escrow_funded", subject: "Escrow funded: {{title}}", bodyHtml: "<p>Hi {{user_name}},</p><p>Escrow deal \"{{title}}\" has been funded.</p>" },
  { key: "escrow_released", subject: "Escrow released: {{title}}", bodyHtml: "<p>Hi {{user_name}},</p><p>Funds for \"{{title}}\" have been released.</p>" },
  { key: "escrow_dispute", subject: "Escrow dispute opened: {{title}}", bodyHtml: "<p>Hi {{user_name}},</p><p>A dispute was opened for \"{{title}}\". Our team will review.</p>" },
];

async function main() {
  console.log("Seeding assets and networks...");
  const assetIds: Record<string, string> = {};
  for (const [order, a] of ASSETS.entries()) {
    const asset = await db.asset.upsert({
      where: { symbol: a.symbol },
      update: {},
      create: {
        symbol: a.symbol,
        name: a.name,
        decimals: a.decimals,
        demoPrice: a.demoPrice,
        priceChange24h: a.priceChange24h,
        marketCap: a.marketCap,
        volume24h: a.volume24h,
        displayOrder: order,
        minDeposit: a.symbol === "BTC" ? 0.0005 : a.symbol === "ETH" ? 0.01 : 10,
        minWithdrawal: a.symbol === "BTC" ? 0.001 : a.symbol === "ETH" ? 0.02 : 20,
        withdrawalFeeFixed: a.symbol === "BTC" ? 0.0001 : a.symbol === "ETH" ? 0.002 : 1,
        withdrawalFeePercent: 0,
        swapFeePercent: 1,
      },
    });
    assetIds[a.symbol] = asset.id;

    for (const [i, n] of (NETWORKS[a.symbol] ?? []).entries()) {
      const existing = await db.network.findFirst({ where: { assetId: asset.id, name: n.name } });
      if (!existing) {
        await db.network.create({
          data: {
            assetId: asset.id,
            name: n.name,
            symbol: n.symbol,
            depositAddress: n.address,
            minDeposit: a.symbol === "BTC" ? 0.0005 : a.symbol === "ETH" ? 0.01 : 10,
            confirmationTimerMinutes: 30,
            isDefault: i === 0,
          },
        });
      }
    }

    // Seed 30 days of gently varying demo price history for charts.
    const historyCount = await db.priceHistory.count({ where: { assetId: asset.id } });
    if (historyCount === 0) {
      const points = [];
      let price = a.demoPrice * 0.92;
      const now = Date.now();
      for (let i = 30; i >= 0; i--) {
        price = price * (1 + (Math.random() - 0.48) * 0.03);
        points.push({ assetId: asset.id, price, timestamp: new Date(now - i * 24 * 60 * 60 * 1000) });
      }
      await db.priceHistory.createMany({ data: points });
    }
  }

  console.log("Seeding exchange pairs...");
  await db.exchangePair.upsert({
    where: { baseAssetId_quoteAssetId: { baseAssetId: assetIds.BTC, quoteAssetId: assetIds.USDT } },
    update: {},
    create: { baseAssetId: assetIds.BTC, quoteAssetId: assetIds.USDT, buyRate: ASSETS[0].demoPrice, sellRate: ASSETS[0].demoPrice, platformFeePercent: 1 },
  });
  await db.exchangePair.upsert({
    where: { baseAssetId_quoteAssetId: { baseAssetId: assetIds.ETH, quoteAssetId: assetIds.USDT } },
    update: {},
    create: { baseAssetId: assetIds.ETH, quoteAssetId: assetIds.USDT, buyRate: ASSETS[1].demoPrice, sellRate: ASSETS[1].demoPrice, platformFeePercent: 1 },
  });

  console.log("Seeding email templates...");
  for (const t of EMAIL_TEMPLATES) {
    await db.emailTemplate.upsert({ where: { key: t.key }, update: {}, create: t });
  }

  console.log("Seeding super admin...");
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminExists = adminEmail ? await db.user.findUnique({ where: { email: adminEmail } }) : null;
  if (adminEmail && !adminExists) {
    const adminPassword = process.env.ADMIN_PASSWORD || crypto.randomBytes(12).toString("base64url");
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await db.user.create({
      data: {
        fullName: process.env.ADMIN_NAME || "Super Admin",
        email: adminEmail,
        passwordHash,
        isAdmin: true,
        emailVerifiedAt: new Date(),
        kycStatus: "APPROVED",
        adminRoles: { create: { role: "SUPER_ADMIN" } },
      },
    });
    console.log(`\nAdmin account created: ${adminEmail}`);
    if (!process.env.ADMIN_PASSWORD) {
      console.log(`Generated admin password (save this now): ${adminPassword}\n`);
    }
  } else if (!adminEmail) {
    console.log("No ADMIN_EMAIL set — skipping admin creation. Set ADMIN_EMAIL and ADMIN_PASSWORD in .env and re-run to create one.");
  } else {
    console.log(`Admin ${adminEmail} already exists — skipping.`);
  }

  if (process.env.SEED_DEMO_DATA !== "false") {
    console.log("Seeding demo users and sample activity...");
    await seedDemoData(assetIds);
  }

  console.log("Seed complete.");
}

async function seedDemoData(assetIds: Record<string, string>) {
  const demoUsers = [
    { fullName: "John Doe", email: "john.doe@example.com", country: "United States" },
    { fullName: "Jane Smith", email: "jane.smith@example.com", country: "United Kingdom" },
  ];

  const userIds: string[] = [];
  for (const u of demoUsers) {
    let user = await db.user.findUnique({ where: { email: u.email } });
    if (!user) {
      const passwordHash = await bcrypt.hash("DemoPass123!", 12);
      user = await db.user.create({
        data: {
          fullName: u.fullName,
          email: u.email,
          passwordHash,
          country: u.country,
          emailVerifiedAt: new Date(),
          kycStatus: "APPROVED",
        },
      });

      await db.balance.createMany({
        data: [
          { userId: user.id, assetId: assetIds.BTC, available: 0.05 },
          { userId: user.id, assetId: assetIds.ETH, available: 1.2 },
          { userId: user.id, assetId: assetIds.USDT, available: 5000 },
        ],
      });
      await db.ledgerEntry.createMany({
        data: [
          { userId: user.id, assetId: assetIds.BTC, type: "MANUAL_CREDIT", direction: "CREDIT", amount: 0.05, balanceAfter: 0.05, referenceType: "Manual", reason: "Demo seed funding" },
          { userId: user.id, assetId: assetIds.ETH, type: "MANUAL_CREDIT", direction: "CREDIT", amount: 1.2, balanceAfter: 1.2, referenceType: "Manual", reason: "Demo seed funding" },
          { userId: user.id, assetId: assetIds.USDT, type: "MANUAL_CREDIT", direction: "CREDIT", amount: 5000, balanceAfter: 5000, referenceType: "Manual", reason: "Demo seed funding" },
        ],
      });

      await db.notification.create({
        data: { userId: user.id, type: "SECURITY", title: "Welcome", message: "Welcome to the demo wallet platform." },
      });
    }
    userIds.push(user.id);
  }

  const newsCount = await db.newsArticle.count();
  if (newsCount === 0) {
    await db.newsArticle.createMany({
      data: [
        { headline: "Bitcoin holds steady above key support", publisher: "Demo Newsroom", summary: "Market observers note consolidation as trading volume normalizes.", category: "Markets", featured: true },
        { headline: "Ethereum network activity trends upward", publisher: "Demo Newsroom", summary: "On-chain metrics show increased usage across decentralized applications.", category: "Markets", featured: true },
        { headline: "Stablecoin adoption continues to grow", publisher: "Demo Newsroom", summary: "Analysts point to stablecoins as a bridge between traditional and digital finance.", category: "Markets", featured: false },
      ],
    });
  }

  const announcementCount = await db.announcement.count();
  if (announcementCount === 0) {
    await db.announcement.create({
      data: { title: "Welcome to the platform", message: "This is an educational demo environment. Explore deposits, withdrawals, swaps, and escrow safely.", active: true },
    });
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
