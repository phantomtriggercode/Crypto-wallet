import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";
import { notifyUser } from "@/lib/notify";

const schema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED"]).optional(),
  depositsLocked: z.boolean().optional(),
  withdrawalsLocked: z.boolean().optional(),
  swapsLocked: z.boolean().optional(),
  escrowLocked: z.boolean().optional(),
  requireKyc: z.boolean().optional(),
  require2FA: z.boolean().optional(),
  internalNote: z.string().trim().max(4000).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(["FINANCE_ADMIN", "SECURITY_ADMIN"]);
    if (!admin) return apiError("Forbidden.", 403);

    const { id } = await params;
    const target = await db.user.findUnique({ where: { id } });
    if (!target) return apiError("User not found.", 404);
    if (target.isAdmin) return apiError("Use the Admin Roles page to manage administrator accounts.", 400);

    const changes = schema.parse(await req.json());
    const updated = await db.user.update({ where: { id }, data: changes });

    await writeAuditLog({
      adminId: admin.id,
      action: "USER_CONTROLS_UPDATED",
      targetType: "User",
      targetId: id,
      previousState: Object.fromEntries(Object.keys(changes).map((k) => [k, (target as Record<string, unknown>)[k]])),
      newState: changes,
    });

    if (changes.status === "SUSPENDED") {
      await db.session.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
      await notifyUser({ userId: id, type: "SECURITY", title: "Account suspended", message: "Your account has been suspended. Contact support for assistance." });
    } else if (changes.status === "ACTIVE" && target.status === "SUSPENDED") {
      await notifyUser({ userId: id, type: "SECURITY", title: "Account reinstated", message: "Your account has been reactivated." });
    }

    return apiOk({ user: updated });
  } catch (err) {
    return handleApiError(err);
  }
}
