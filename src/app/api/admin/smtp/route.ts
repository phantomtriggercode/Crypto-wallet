import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { encryptSecret } from "@/lib/crypto";
import { writeAuditLog } from "@/lib/audit";

const schema = z.object({
  host: z.string().trim().min(1),
  port: z.coerce.number().int().min(1).max(65535),
  encryption: z.enum(["NONE", "SSL", "TLS"]),
  username: z.string().trim().min(1),
  password: z.string().min(1).optional(),
  fromName: z.string().trim().min(1),
  fromEmail: z.email(),
});

export async function GET() {
  try {
    const admin = await requireAdmin(["SUPER_ADMIN", "SECURITY_ADMIN"]);
    if (!admin) return apiError("Forbidden.", 403);

    const config = await db.smtpSetting.findUnique({ where: { id: 1 } });
    return apiOk({
      config: config
        ? { host: config.host, port: config.port, encryption: config.encryption, username: config.username, fromName: config.fromName, fromEmail: config.fromEmail, configured: Boolean(config.passwordEncrypted) }
        : null,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = await requireAdmin(["SUPER_ADMIN", "SECURITY_ADMIN"]);
    if (!admin) return apiError("Forbidden.", 403);

    const body = schema.parse(await req.json());
    const existing = await db.smtpSetting.findUnique({ where: { id: 1 } });

    await db.smtpSetting.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        host: body.host,
        port: body.port,
        encryption: body.encryption,
        username: body.username,
        passwordEncrypted: body.password ? encryptSecret(body.password) : null,
        fromName: body.fromName,
        fromEmail: body.fromEmail,
      },
      update: {
        host: body.host,
        port: body.port,
        encryption: body.encryption,
        username: body.username,
        ...(body.password ? { passwordEncrypted: encryptSecret(body.password) } : {}),
        fromName: body.fromName,
        fromEmail: body.fromEmail,
      },
    });

    await writeAuditLog({
      adminId: admin.id,
      action: "SMTP_UPDATED",
      targetType: "SmtpSetting",
      previousState: existing ? { host: existing.host, port: existing.port } : undefined,
      newState: { host: body.host, port: body.port },
    });

    return apiOk({});
  } catch (err) {
    return handleApiError(err);
  }
}
