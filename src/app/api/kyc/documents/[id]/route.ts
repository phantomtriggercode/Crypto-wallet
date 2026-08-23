import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { readPrivateFile } from "@/lib/storage";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  if (!user) return new Response("Not authenticated", { status: 401 });

  const { id } = await params;
  const document = await db.kycDocument.findUnique({
    where: { id },
    include: { kycApplication: true },
  });
  if (!document) return new Response("Not found", { status: 404 });

  const isOwner = document.kycApplication.userId === user.id;
  const isKycAdmin = user.isAdmin && user.adminRoles.some((r) => ["SUPER_ADMIN", "KYC_ADMIN"].includes(r.role));
  if (!isOwner && !isKycAdmin) return new Response("Forbidden", { status: 403 });

  const buffer = await readPrivateFile(document.storageKey).catch(() => null);
  if (!buffer) return new Response("File not found", { status: 404 });

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": document.mimeType ?? "application/octet-stream",
      "Content-Disposition": `inline; filename="${document.originalName ?? "document"}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
