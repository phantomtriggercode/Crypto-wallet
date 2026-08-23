import { unlink } from "node:fs/promises";
import path from "node:path";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { apiOk, apiError, handleApiError } from "@/lib/api";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(["CONTENT_ADMIN"]);
    if (!admin) return apiError("Forbidden.", 403);

    const { id } = await params;
    const media = await db.media.findUnique({ where: { id } });
    if (!media) return apiError("Not found.", 404);

    await db.media.delete({ where: { id } });
    const filePath = path.join(process.cwd(), "public", media.url);
    await unlink(filePath).catch(() => undefined);

    return apiOk({});
  } catch (err) {
    return handleApiError(err);
  }
}
