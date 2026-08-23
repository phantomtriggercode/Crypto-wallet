import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { apiOk, apiError, handleApiError } from "@/lib/api";

const schema = z.object({ message: z.string().trim().min(1).max(4000) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    if (!user) return apiError("Not authenticated.", 401);

    const { id } = await params;
    const ticket = await db.supportTicket.findUnique({ where: { id } });
    if (!ticket) return apiError("Ticket not found.", 404);

    const isSupportAdmin = user.isAdmin && user.adminRoles.some((r) => ["SUPER_ADMIN", "SUPPORT_ADMIN"].includes(r.role));
    if (ticket.userId !== user.id && !isSupportAdmin) return apiError("Ticket not found.", 404);

    const { message } = schema.parse(await req.json());
    await db.$transaction([
      db.supportMessage.create({
        data: { ticketId: id, senderUserId: isSupportAdmin ? null : user.id, senderAdminId: isSupportAdmin ? user.id : null, message },
      }),
      db.supportTicket.update({
        where: { id },
        data: { status: isSupportAdmin ? "PENDING" : "OPEN", updatedAt: new Date() },
      }),
    ]);

    return apiOk({}, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
