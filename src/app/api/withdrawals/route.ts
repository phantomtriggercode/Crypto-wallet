import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { generateRef } from "@/lib/ref";
import { getSettings } from "@/lib/settings";
import { decryptSecret } from "@/lib/crypto";
import { verifyTotp } from "@/lib/twofactor";
import { notifyUser } from "@/lib/notify";
import { Prisma } from "@prisma/client";

const schema = z.object({
  assetId: z.string().min(1),
  networkId: z.string().min(1),
  destinationAddress: z.string().trim().min(4).max(200),
  amount: z.coerce.number().positive(),
  twoFactorCode: z.string().min(6).max(10),
});

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!user) return apiError("Not authenticated.", 401);
    if (user.withdrawalsLocked) return apiError("Withdrawals are currently locked on your account.", 403);
    if (user.requireKyc && user.kycStatus !== "APPROVED") {
      return apiError("Please complete KYC verification before withdrawing.", 403);
    }

    const settings = await getSettings();
    if (settings.maintenance.website || settings.maintenance.withdrawals) {
      return apiError("Withdrawals are temporarily unavailable for maintenance.", 503);
    }

    if (!user.twoFactorEnabled || !user.twoFactorSecret) {
      return apiError("Enable two-factor authentication before making withdrawals.", 403, { code: "2FA_REQUIRED" });
    }

    const body = schema.parse(await req.json());
    const validCode = verifyTotp(body.twoFactorCode, decryptSecret(user.twoFactorSecret));
    if (!validCode) return apiError("Invalid two-factor authentication code.", 401);

    const asset = await db.asset.findUnique({ where: { id: body.assetId } });
    if (!asset || !asset.enabled || !asset.withdrawalEnabled) {
      return apiError("This asset is not available for withdrawal.", 400);
    }
    const network = await db.network.findUnique({ where: { id: body.networkId } });
    if (!network || network.assetId !== asset.id || !network.enabled) {
      return apiError("This network is not available for the selected asset.", 400);
    }

    if (body.amount < Number(asset.minWithdrawal)) {
      return apiError(`Minimum withdrawal for ${asset.symbol} is ${asset.minWithdrawal}.`, 400);
    }

    const usdValue = body.amount * Number(asset.demoPrice);
    if (usdValue < settings.minWithdrawalUsd) return apiError(`Minimum withdrawal amount is ${settings.minWithdrawalUsd} ${settings.currency}.`, 400);
    if (usdValue > settings.maxWithdrawalUsd) return apiError(`Maximum withdrawal amount is ${settings.maxWithdrawalUsd} ${settings.currency}.`, 400);

    const since = new Date();
    since.setHours(0, 0, 0, 0);
    const todaysWithdrawals = await db.withdrawal.findMany({
      where: { userId: user.id, createdAt: { gte: since }, status: { in: ["PENDING_APPROVAL", "APPROVED", "COMPLETED"] } },
      include: { asset: true },
    });
    const todaysUsd = todaysWithdrawals.reduce((sum, w) => sum + Number(w.amount) * Number(w.asset.demoPrice), 0);
    if (todaysUsd + usdValue > settings.dailyWithdrawalLimitUsd) {
      return apiError("This withdrawal would exceed your daily withdrawal limit.", 400);
    }

    const balance = await db.balance.findUnique({ where: { userId_assetId: { userId: user.id, assetId: asset.id } } });
    const platformFee = new Prisma.Decimal(asset.withdrawalFeeFixed).add(
      new Prisma.Decimal(body.amount).mul(asset.withdrawalFeePercent).div(100)
    );
    const networkFee = new Prisma.Decimal(0);
    const totalDeducted = new Prisma.Decimal(body.amount).add(platformFee).add(networkFee);

    if (!balance || balance.available.lessThan(totalDeducted)) {
      return apiError("Insufficient available balance for this withdrawal.", 400);
    }

    const withdrawal = await db.withdrawal.create({
      data: {
        withdrawalRef: generateRef("WD"),
        userId: user.id,
        assetId: asset.id,
        networkId: network.id,
        destinationAddress: body.destinationAddress,
        amount: body.amount,
        networkFee,
        platformFee,
        totalDeducted,
      },
    });

    await notifyUser({
      userId: user.id,
      type: "WITHDRAWAL",
      title: "Withdrawal submitted",
      message: `Your withdrawal request for ${body.amount} ${asset.symbol} is pending admin approval.`,
      emailTemplateKey: "withdrawal_submitted",
      emailVars: { amount: body.amount, asset: asset.symbol },
    });

    return apiOk({ withdrawal }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!user) return apiError("Not authenticated.", 401);

    const url = new URL(req.url);
    const take = Math.min(Number(url.searchParams.get("take") ?? 20), 100);

    const withdrawals = await db.withdrawal.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take,
      include: { asset: true, network: true },
    });

    return apiOk({ withdrawals });
  } catch (err) {
    return handleApiError(err);
  }
}
