import "server-only";
import { db } from "@/lib/db";
import { cache } from "react";

export type AppSettings = {
  siteName: string;
  siteTagline: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  supportEmail: string;
  timezone: string;
  currency: string;
  demoModeEnabled: boolean;
  priceMode: "MANUAL" | "LIVE";
  depositTimerMinutes: number;
  withdrawalTimerMinutes: number;
  require2FAForWithdrawals: boolean;
  require2FAGlobal: boolean;
  requireKycForWallet: boolean;
  swapApprovalMode: "AUTOMATIC" | "MANUAL";
  minWithdrawalUsd: number;
  maxWithdrawalUsd: number;
  dailyWithdrawalLimitUsd: number;
  maxDepositUsd: number;
  maintenance: {
    website: boolean;
    deposits: boolean;
    withdrawals: boolean;
    swaps: boolean;
    escrow: boolean;
    kyc: boolean;
  };
};

export const DEFAULT_SETTINGS: AppSettings = {
  siteName: "Your Wallet",
  siteTagline: "A secure place to manage your digital assets — educational demo.",
  logoUrl: null,
  faviconUrl: null,
  primaryColor: "#E11D2E",
  secondaryColor: "#0B0B0F",
  supportEmail: "support@example.com",
  timezone: "UTC",
  currency: "USD",
  demoModeEnabled: true,
  priceMode: "MANUAL",
  depositTimerMinutes: 30,
  withdrawalTimerMinutes: 30,
  require2FAForWithdrawals: true,
  require2FAGlobal: false,
  requireKycForWallet: true,
  swapApprovalMode: "AUTOMATIC",
  minWithdrawalUsd: 10,
  maxWithdrawalUsd: 50000,
  dailyWithdrawalLimitUsd: 100000,
  maxDepositUsd: 250000,
  maintenance: {
    website: false,
    deposits: false,
    withdrawals: false,
    swaps: false,
    escrow: false,
    kyc: false,
  },
};

export const getSettings = cache(async (): Promise<AppSettings> => {
  const rows = await db.systemSetting.findMany();
  const stored: Record<string, unknown> = {};
  for (const row of rows) stored[row.key] = row.value;
  return { ...DEFAULT_SETTINGS, ...stored } as AppSettings;
});

export async function updateSettings(partial: Partial<AppSettings>) {
  const entries = Object.entries(partial);
  await db.$transaction(
    entries.map(([key, value]) =>
      db.systemSetting.upsert({
        where: { key },
        update: { value: value as object },
        create: { key, value: value as object },
      })
    )
  );
}
