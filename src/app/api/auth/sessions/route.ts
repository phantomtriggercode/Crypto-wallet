import { requireUser, getCurrentSession } from "@/lib/session";
import { db } from "@/lib/db";
import { apiOk, apiError, handleApiError } from "@/lib/api";

export async function GET() {
  try {
    const user = await requireUser();
    if (!user) return apiError("Not authenticated.", 401);

    const current = await getCurrentSession();
    const sessions = await db.session.findMany({
      where: { userId: user.id, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { lastSeenAt: "desc" },
    });

    return apiOk({
      sessions: sessions.map((s) => ({
        id: s.id,
        ip: s.ip,
        userAgent: s.userAgent,
        createdAt: s.createdAt,
        lastSeenAt: s.lastSeenAt,
        isCurrent: s.id === current?.id,
      })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
