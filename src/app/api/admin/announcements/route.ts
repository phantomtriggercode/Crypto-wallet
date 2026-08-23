import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { apiOk, apiError, handleApiError } from "@/lib/api";

const schema = z.object({ title: z.string().trim().min(3).max(150), message: z.string().trim().min(3).max(1000) });

export async function GET() {
  try {
    const admin = await requireAdmin(["CONTENT_ADMIN"]);
    if (!admin) return apiError("Forbidden.", 403);
    const announcements = await db.announcement.findMany({ orderBy: { createdAt: "desc" } });
    return apiOk({ announcements });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(["CONTENT_ADMIN"]);
    if (!admin) return apiError("Forbidden.", 403);
    const body = schema.parse(await req.json());
    const announcement = await db.announcement.create({ data: body });
    return apiOk({ announcement }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
