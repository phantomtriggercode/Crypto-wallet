import "server-only";
import { Prisma, LedgerEntryType, LedgerDirection } from "@prisma/client";
import { db } from "@/lib/db";

export class InsufficientBalanceError extends Error {
  constructor(message = "Insufficient balance") {
    super(message);
    this.name = "InsufficientBalanceError";
  }
}

type TxClient = Prisma.TransactionClient;

export type PostLedgerInput = {
  userId: string;
  assetId: string;
  type: LedgerEntryType;
  direction: LedgerDirection;
  amount: Prisma.Decimal | number | string;
  referenceType: string;
  referenceId?: string | null;
  reason?: string | null;
  internalNote?: string | null;
  createdByAdminId?: string | null;
};

/**
 * Appends a ledger entry and updates the cached available balance atomically.
 * This is the ONLY function that should mutate Balance.available — every
 * financial movement in the app must flow through here so the ledger stays
 * the source of truth. Must be called inside a db.$transaction callback.
 */
export async function postLedgerEntry(tx: TxClient, input: PostLedgerInput) {
  await tx.balance.upsert({
    where: { userId_assetId: { userId: input.userId, assetId: input.assetId } },
    update: {},
    create: { userId: input.userId, assetId: input.assetId, available: 0, locked: 0 },
  });

  const rows = await tx.$queryRaw<{ available: Prisma.Decimal }[]>`
    SELECT available FROM Balance WHERE userId = ${input.userId} AND assetId = ${input.assetId} FOR UPDATE
  `;
  const current = new Prisma.Decimal(rows[0]?.available ?? 0);
  const amount = new Prisma.Decimal(input.amount);
  if (amount.isNegative() || amount.isZero()) {
    throw new Error("Ledger entry amount must be positive");
  }
  const delta = input.direction === "CREDIT" ? amount : amount.negated();
  const newAvailable = current.add(delta);

  if (newAvailable.isNegative()) {
    throw new InsufficientBalanceError();
  }

  await tx.balance.update({
    where: { userId_assetId: { userId: input.userId, assetId: input.assetId } },
    data: { available: newAvailable },
  });

  return tx.ledgerEntry.create({
    data: {
      userId: input.userId,
      assetId: input.assetId,
      type: input.type,
      direction: input.direction,
      amount,
      balanceAfter: newAvailable,
      referenceType: input.referenceType,
      referenceId: input.referenceId ?? null,
      reason: input.reason ?? null,
      internalNote: input.internalNote ?? null,
      createdByAdminId: input.createdByAdminId ?? null,
    },
  });
}

export async function lockEscrowFunds(
  tx: TxClient,
  params: { buyerId: string; assetId: string; amount: Prisma.Decimal | number | string; escrowDealId: string }
) {
  const entry = await postLedgerEntry(tx, {
    userId: params.buyerId,
    assetId: params.assetId,
    type: "ESCROW_LOCK",
    direction: "DEBIT",
    amount: params.amount,
    referenceType: "Escrow",
    referenceId: params.escrowDealId,
    reason: "Escrow deal funded",
  });
  await tx.balance.update({
    where: { userId_assetId: { userId: params.buyerId, assetId: params.assetId } },
    data: { locked: { increment: params.amount } },
  });
  return entry;
}

export async function releaseEscrowFunds(
  tx: TxClient,
  params: {
    buyerId: string;
    sellerId: string;
    assetId: string;
    amount: Prisma.Decimal | number | string;
    escrowDealId: string;
  }
) {
  await tx.balance.update({
    where: { userId_assetId: { userId: params.buyerId, assetId: params.assetId } },
    data: { locked: { decrement: params.amount } },
  });
  return postLedgerEntry(tx, {
    userId: params.sellerId,
    assetId: params.assetId,
    type: "ESCROW_RELEASE",
    direction: "CREDIT",
    amount: params.amount,
    referenceType: "Escrow",
    referenceId: params.escrowDealId,
    reason: "Escrow released to seller",
  });
}

export async function refundEscrowFunds(
  tx: TxClient,
  params: { buyerId: string; assetId: string; amount: Prisma.Decimal | number | string; escrowDealId: string }
) {
  await tx.balance.update({
    where: { userId_assetId: { userId: params.buyerId, assetId: params.assetId } },
    data: { locked: { decrement: params.amount } },
  });
  return postLedgerEntry(tx, {
    userId: params.buyerId,
    assetId: params.assetId,
    type: "ESCROW_REFUND",
    direction: "CREDIT",
    amount: params.amount,
    referenceType: "Escrow",
    referenceId: params.escrowDealId,
    reason: "Escrow refunded to buyer",
  });
}

/** Recomputes a user's available balance strictly from ledger history (for admin reconciliation tools). */
export async function reconcileBalance(userId: string, assetId: string) {
  const entries = await db.ledgerEntry.findMany({ where: { userId, assetId } });
  let total = new Prisma.Decimal(0);
  for (const e of entries) {
    total = e.direction === "CREDIT" ? total.add(e.amount) : total.sub(e.amount);
  }
  return total;
}

export async function getWalletSummary(userId: string) {
  const [assets, balances] = await Promise.all([
    db.asset.findMany({ where: { enabled: true }, orderBy: { displayOrder: "asc" }, include: { networks: true } }),
    db.balance.findMany({ where: { userId } }),
  ]);

  const balanceMap = new Map(balances.map((b) => [b.assetId, b]));

  const holdings = assets.map((asset) => {
    const balance = balanceMap.get(asset.id);
    const available = balance?.available ?? new Prisma.Decimal(0);
    const locked = balance?.locked ?? new Prisma.Decimal(0);
    const valueUsd = available.add(locked).mul(asset.demoPrice);
    return { asset, available, locked, valueUsd };
  });

  const totalValueUsd = holdings.reduce((sum, h) => sum.add(h.valueUsd), new Prisma.Decimal(0));

  return { holdings, totalValueUsd };
}
