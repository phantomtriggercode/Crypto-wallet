import { readPrivateFile } from "@/lib/storage";

const CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

// Public asset server for admin-uploaded media (logos, favicons, asset icons). Unlike
// /api/kyc/documents/[id], these files are meant to be publicly visible — no auth required —
// but are still served dynamically (not via /public) so runtime uploads work without a rebuild.
export async function GET(_req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const { key } = await params;
  if (!key.length || key[0] !== "media") {
    return new Response("Not found", { status: 404 });
  }

  const storageKey = key.join("/");
  const ext = storageKey.slice(storageKey.lastIndexOf(".")).toLowerCase();
  const contentType = CONTENT_TYPES[ext];
  if (!contentType) return new Response("Not found", { status: 404 });

  const buffer = await readPrivateFile(storageKey).catch(() => null);
  if (!buffer) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
