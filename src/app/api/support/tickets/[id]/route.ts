import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { apiOk, apiError, handleApiError } from "@/lib/api";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    if (!user) return apiError("Not authenticated.", 401);

    const { id } = await params;
    const ticket = await db.supportTicket.findUnique({
      where: { id },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    if (!ticket || (ticket.userId !== user.id && !user.isAdmin)) return apiError("Ticket not found.", 404);

    return apiOk({ ticket });
  } catch (err) {
    return handleApiError(err);
  }
}
