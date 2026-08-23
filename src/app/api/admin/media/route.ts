import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { savePrivateFile } from "@/lib/storage";

const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/x-icon"]);
const MAX_SIZE = 5 * 1024 * 1024;

export async function GET() {
  try {
    const admin = await requireAdmin(["CONTENT_ADMIN"]);
    if (!admin) return apiError("Forbidden.", 403);

    const media = await db.media.findMany({ orderBy: { createdAt: "desc" } });
    return apiOk({ media });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(["CONTENT_ADMIN"]);
    if (!admin) return apiError("Forbidden.", 403);

    const form = await req.formData();
    const file = form.get("file") as File | null;
    const folder = String(form.get("folder") ?? "general").replace(/[^a-z0-9_-]/gi, "");
    if (!file) return apiError("No file provided.", 422);
    if (!ALLOWED_MIME.has(file.type)) return apiError("Unsupported file type.", 422);
    if (file.size > MAX_SIZE) return apiError("File too large (max 5MB).", 422);

    const buffer = Buffer.from(await file.arrayBuffer());
    // Stored outside /public and served through a route handler (src/app/api/media/[...key])
    // rather than as a static /public asset — Next.js resolves /public assets from a
    // build-time manifest, so a file written here at runtime would 404 until the next build.
    const storageKey = await savePrivateFile(`media/${folder}`, file.name, buffer);

    const media = await db.media.create({
      data: {
        filename: file.name,
        url: `/api/media/${storageKey}`,
        mimeType: file.type,
        size: file.size,
        folder,
        uploadedByAdminId: admin.id,
      },
    });

    return apiOk({ media }, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
