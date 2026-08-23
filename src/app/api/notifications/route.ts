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

    const [notifications, unreadCount] = await Promise.all([
      db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take }),
      db.notification.count({ where: { userId: user.id, isRead: false } }),
    ]);

    return apiOk({ notifications, unreadCount });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!user) return apiError("Not authenticated.", 401);
    const body = await req.json().catch(() => ({}));

    if (body.markAllRead) {
      await db.notification.updateMany({ where: { userId: user.id, isRead: false }, data: { isRead: true } });
      return apiOk({});
    }

    return apiError("No action specified.", 400);
  } catch (err) {
    return handleApiError(err);
  }
}
