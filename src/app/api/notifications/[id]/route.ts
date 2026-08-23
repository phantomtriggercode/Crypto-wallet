import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { apiOk, apiError, handleApiError } from "@/lib/api";

export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    if (!user) return apiError("Not authenticated.", 401);

    const { id } = await params;
    const notification = await db.notification.findUnique({ where: { id } });
    if (!notification || notification.userId !== user.id) return apiError("Notification not found.", 404);

    await db.notification.update({ where: { id }, data: { isRead: true } });
    return apiOk({});
  } catch (err) {
    return handleApiError(err);
  }
}
