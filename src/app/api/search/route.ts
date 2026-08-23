import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { getHomepageContent } from "@/lib/cms";
import { apiOk, apiError, handleApiError } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!user) return apiError("Not authenticated.", 401);

    const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
    if (q.length < 2) return apiOk({ coins: [], transactions: [], escrow: [], help: [] });

    const [coins, transactions, escrow, homepage] = await Promise.all([
      db.asset.findMany({
        where: { enabled: true, OR: [{ symbol: { contains: q } }, { name: { contains: q } }] },
        take: 5,
      }),
      db.ledgerEntry.findMany({
        where: { userId: user.id, reason: { contains: q } },
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { asset: true },
      }),
      db.escrowDeal.findMany({
        where: {
          OR: [{ buyerId: user.id }, { sellerId: user.id }],
          AND: { OR: [{ title: { contains: q } }, { escrowRef: { contains: q } }] },
        },
        take: 5,
        orderBy: { createdAt: "desc" },
      }),
      getHomepageContent(),
    ]);

    const needle = q.toLowerCase();
    const help = homepage.faqs.filter((f) => f.question.toLowerCase().includes(needle) || f.answer.toLowerCase().includes(needle)).slice(0, 5);

    return apiOk({ coins, transactions, escrow, help });
  } catch (err) {
    return handleApiError(err);
  }
}
