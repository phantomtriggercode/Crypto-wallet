import type { Metadata } from "next";
import type { StaticPageContent } from "@/lib/cms";

export function staticPageMetadata(content: StaticPageContent): Metadata {
  if (!content.metaTitle && !content.metaDescription) return {};
  return {
    title: content.metaTitle || undefined,
    description: content.metaDescription || undefined,
  };
}
