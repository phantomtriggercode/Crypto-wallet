import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/session";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { getStaticPage, saveStaticPage, STATIC_PAGE_SLUGS, StaticPageSlug } from "@/lib/cms";
import { writeAuditLog } from "@/lib/audit";

const schema = z.object({
  title: z.string().trim().min(1).max(150),
  intro: z.string().trim().max(5000),
  sections: z.array(z.object({ heading: z.string().trim().max(150), body: z.string().trim().max(5000) })).max(30),
});

function isValidSlug(slug: string): slug is StaticPageSlug {
  return (STATIC_PAGE_SLUGS as readonly string[]).includes(slug);
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const admin = await requireAdmin(["CONTENT_ADMIN"]);
    if (!admin) return apiError("Forbidden.", 403);

    const { slug } = await params;
    if (!isValidSlug(slug)) return apiError("Unknown page.", 404);

    const content = await getStaticPage(slug);
    return apiOk({ content });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const admin = await requireAdmin(["CONTENT_ADMIN"]);
    if (!admin) return apiError("Forbidden.", 403);

    const { slug } = await params;
    if (!isValidSlug(slug)) return apiError("Unknown page.", 404);

    const data = schema.parse(await req.json());
    await saveStaticPage(slug, data);

    await writeAuditLog({ adminId: admin.id, action: "CMS_PAGE_UPDATED", targetType: "CmsPage", targetId: slug });

    return apiOk({});
  } catch (err) {
    return handleApiError(err);
  }
}
