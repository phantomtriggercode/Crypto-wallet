import "server-only";
import { db } from "@/lib/db";
import { getRequestMeta } from "@/lib/session";

export async function writeAuditLog(params: {
  adminId?: string | null;
  actorType?: "ADMIN" | "SYSTEM";
  action: string;
  targetType: string;
  targetId?: string | null;
  previousState?: unknown;
  newState?: unknown;
  reason?: string | null;
}) {
  const { ip, userAgent } = await getRequestMeta().catch(() => ({ ip: null, userAgent: null }));
  await db.auditLog.create({
    data: {
      adminId: params.adminId ?? null,
      actorType: params.actorType ?? "ADMIN",
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId ?? null,
      previousState: params.previousState === undefined ? undefined : (params.previousState as object),
      newState: params.newState === undefined ? undefined : (params.newState as object),
      reason: params.reason ?? null,
      ip,
      userAgent,
    },
  });
}

export async function logSecurityEvent(params: {
  userId: string;
  type: string;
  metadata?: unknown;
}) {
  const { ip, userAgent } = await getRequestMeta().catch(() => ({ ip: null, userAgent: null }));
  await db.securityEvent.create({
    data: {
      userId: params.userId,
      type: params.type,
      ip,
      userAgent,
      metadata: params.metadata === undefined ? undefined : (params.metadata as object),
    },
  });
}
