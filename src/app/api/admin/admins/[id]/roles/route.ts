import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { writeAuditLog } from "@/lib/audit";

const ADMIN_ROLES = ["SUPER_ADMIN", "FINANCE_ADMIN", "KYC_ADMIN", "SUPPORT_ADMIN", "CONTENT_ADMIN", "SECURITY_ADMIN"] as const;
const schema = z.object({ roles: z.array(z.enum(ADMIN_ROLES)) });

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(["SUPER_ADMIN"]);
    if (!admin) return apiError("Forbidden.", 403);

    const { id } = await params;
    const target = await db.user.findUnique({ where: { id }, include: { adminRoles: true } });
    if (!target || !target.isAdmin) return apiError("Admin not found.", 404);

    const { roles } = schema.parse(await req.json());
    if (roles.length === 0 && id === admin.id) {
      return apiError("You cannot remove all of your own roles.", 400);
    }

    await db.$transaction([
      db.userAdminRole.deleteMany({ where: { userId: id } }),
      db.userAdminRole.createMany({ data: roles.map((role) => ({ userId: id, role })) }),
    ]);

    await writeAuditLog({
      adminId: admin.id,
      action: "ADMIN_ROLES_UPDATED",
      targetType: "User",
      targetId: id,
      previousState: { roles: target.adminRoles.map((r) => r.role) },
      newState: { roles },
    });

    return apiOk({});
  } catch (err) {
    return handleApiError(err);
  }
}
