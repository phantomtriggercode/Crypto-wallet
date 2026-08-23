import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { hashPassword } from "@/lib/crypto";
import { writeAuditLog } from "@/lib/audit";

const ADMIN_ROLES = ["SUPER_ADMIN", "FINANCE_ADMIN", "KYC_ADMIN", "SUPPORT_ADMIN", "CONTENT_ADMIN", "SECURITY_ADMIN"] as const;

const schema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.email().trim().toLowerCase(),
  password: z.string().min(8),
  roles: z.array(z.enum(ADMIN_ROLES)).min(1),
});

export async function GET() {
  try {
    const admin = await requireAdmin(["SUPER_ADMIN"]);
    if (!admin) return apiError("Forbidden.", 403);

    const admins = await db.user.findMany({
      where: { isAdmin: true },
      select: { id: true, fullName: true, email: true, createdAt: true, adminRoles: true },
      orderBy: { createdAt: "asc" },
    });

    return apiOk({ admins });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(["SUPER_ADMIN"]);
    if (!admin) return apiError("Forbidden.", 403);

    const body = schema.parse(await req.json());
    const existing = await db.user.findUnique({ where: { email: body.email } });
    if (existing) return apiError("A user with this email already exists.", 400);

    const passwordHash = await hashPassword(body.password);
    const newAdmin = await db.user.create({
      data: {
        fullName: body.fullName,
        email: body.email,
        passwordHash,
        isAdmin: true,
        emailVerifiedAt: new Date(),
        kycStatus: "APPROVED",
        adminRoles: { create: body.roles.map((role) => ({ role })) },
      },
    });

    await writeAuditLog({
      adminId: admin.id,
      action: "ADMIN_CREATED",
      targetType: "User",
      targetId: newAdmin.id,
      newState: { email: body.email, roles: body.roles },
    });

    return apiOk({ adminId: newAdmin.id }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
