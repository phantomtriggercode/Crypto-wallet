import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { apiOk, apiError, handleApiError } from "@/lib/api";

export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin) return apiError("Forbidden.", 403);

    const url = new URL(req.url);
    const q = url.searchParams.get("q")?.trim();
    const take = Math.min(Number(url.searchParams.get("take") ?? 50), 200);

    const users = await db.user.findMany({
      where: q
        ? { OR: [{ email: { contains: q } }, { fullName: { contains: q } }] }
        : {},
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        fullName: true,
        email: true,
        kycStatus: true,
        status: true,
        createdAt: true,
        lastLoginAt: true,
        isAdmin: true,
      },
    });

    return apiOk({ users });
  } catch (err) {
    return handleApiError(err);
  }
}
