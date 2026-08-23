import { NextRequest } from "next/server";
import QRCode from "qrcode";

export async function GET(req: NextRequest) {
  const data = new URL(req.url).searchParams.get("data");
  if (!data) return new Response("Missing data", { status: 400 });

  const buffer = await QRCode.toBuffer(data, { width: 240, margin: 1, color: { dark: "#0b0b0f", light: "#ffffff" } });
  return new Response(new Uint8Array(buffer), {
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=3600" },
  });
}
