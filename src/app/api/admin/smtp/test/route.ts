import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/session";
import { apiOk, apiError, handleApiError } from "@/lib/api";
import { sendTestEmail } from "@/lib/mailer";

const schema = z.object({ to: z.email() });

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(["SUPER_ADMIN", "SECURITY_ADMIN"]);
    if (!admin) return apiError("Forbidden.", 403);

    const { to } = schema.parse(await req.json());
    await sendTestEmail(to);

    return apiOk({});
  } catch (err) {
    if (err instanceof Error && err.message === "SMTP is not configured yet") {
      return apiError(err.message, 400);
    }
    return handleApiError(err);
  }
}
