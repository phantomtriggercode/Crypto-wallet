import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { apiOk, apiError, handleApiError } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!user) return apiError("Not authenticated.", 401);

    const url = new URL(req.url);
    const take = Math.min(Number(url.searchParams.get("take") ?? 30), 100);
    const cursor = url.searchParams.get("cursor") ?? undefined;
    const type = url.searchParams.get("type") ?? undefined;

    const entries = await db.ledgerEntry.findMany({
      where: { userId: user.id, ...(type ? { type: type as never } : {}) },
      orderBy: { createdAt: "desc" },
      take,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: { asset: true },
    });

    return apiOk({ entries, nextCursor: entries.length === take ? entries[entries.length - 1]?.id : null });
  } catch (err) {
    return handleApiError(err);
  }
}
