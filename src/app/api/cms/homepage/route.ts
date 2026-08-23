import { getHomepageContent } from "@/lib/cms";
import { apiOk, handleApiError } from "@/lib/api";

export async function GET() {
  try {
    const content = await getHomepageContent();
    return apiOk({ content });
  } catch (err) {
    return handleApiError(err);
  }
}
