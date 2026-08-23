import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { apiOk, apiError, handleApiError } from "@/lib/api";

const schema = z.object({
  status: z.enum(["OPEN", "PENDING", "CLOSED"]).optional(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
  assignedAdminId: z.string().nullable().optional(),
});

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(["SUPPORT_ADMIN"]);
    if (!admin) return apiError("Forbidden.", 403);

    const { id } = await params;
    const ticket = await db.supportTicket.findUnique({
      where: { id },
      include: { messages: { orderBy: { createdAt: "asc" } }, user: { select: { fullName: true, email: true } } },
    });
    if (!ticket) return apiError("Ticket not found.", 404);

    return apiOk({ ticket });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(["SUPPORT_ADMIN"]);
    if (!admin) return apiError("Forbidden.", 403);

    const { id } = await params;
    const changes = schema.parse(await req.json());
    const ticket = await db.supportTicket.update({ where: { id }, data: changes });

    return apiOk({ ticket });
  } catch (err) {
    return handleApiError(err);
  }
}
