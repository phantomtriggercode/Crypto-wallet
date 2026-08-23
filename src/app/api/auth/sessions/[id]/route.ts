import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { logSecurityEvent } from "@/lib/audit";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    if (!user) return apiError("Not authenticated.", 401);

    const { id } = await params;
    const session = await db.session.findUnique({ where: { id } });
    if (!session || session.userId !== user.id) {
      return apiError("Session not found.", 404);
    }

    await db.session.update({ where: { id }, data: { revokedAt: new Date() } });
    await logSecurityEvent({ userId: user.id, type: "SESSION_REVOKED", metadata: { sessionId: id } });

    return apiOk({});
  } catch (err) {
    return handleApiError(err);
  }
}
