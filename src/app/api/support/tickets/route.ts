import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { apiOk, apiError, handleApiError } from "@/lib/api";

const schema = z.object({ subject: z.string().trim().min(3).max(150), message: z.string().trim().min(5).max(4000) });

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (!user) return apiError("Not authenticated.", 401);

    const { subject, message } = schema.parse(await req.json());
    const ticket = await db.supportTicket.create({
      data: { userId: user.id, subject, messages: { create: { senderUserId: user.id, message } } },
    });

    return apiOk({ ticket }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function GET() {
  try {
    const user = await requireUser();
    if (!user) return apiError("Not authenticated.", 401);

    const tickets = await db.supportTicket.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      include: { messages: { orderBy: { createdAt: "asc" }, take: 1 } },
    });

    return apiOk({ tickets });
  } catch (err) {
    return handleApiError(err);
  }
}
