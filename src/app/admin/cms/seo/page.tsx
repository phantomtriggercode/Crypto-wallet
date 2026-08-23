"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { apiFetch, ApiClientError } from "@/lib/apiClient";

type Settings = {
  seoMetaTitle: string;
  seoMetaDescription: string;
  seoOgImageUrl: string | null;
  seoRobotsIndexing: boolean;
  customHeadCode: string;
  customBodyEndCode: string;
};

export default function AdminSeoPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch<{ settings: Settings }>("/api/admin/settings").then((res) => setSettings(res.settings));
  }, []);

  async function save() {
    if (!settings) return;
    setSaving(true);
    try {
      await apiFetch("/api/admin/settings", { method: "PATCH", body: JSON.stringify(settings) });
      toast.success("SEO settings updated.");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  if (!settings) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">SEO & Custom Code</h1>
        <Button loading={saving} onClick={save}>
          Save changes
        </Button>
      </div>

      <Card className="space-y-3">
        <h2 className="text-sm font-semibold">Default site metadata</h2>
        <p className="text-xs text-muted">
          Used as a fallback for any page that doesn&apos;t set its own meta title/description (the homepage and static
          pages can override these individually from their own CMS editors).
        </p>
        <div>
          <Label>Default meta title</Label>
          <Input
            maxLength={70}
            value={settings.seoMetaTitle}
            onChange={(e) => setSettings({ ...settings, seoMetaTitle: e.target.value })}
          />
        </div>
        <div>
          <Label>Default meta description</Label>
          <Textarea
            rows={2}
            maxLength={160}
            value={settings.seoMetaDescription}
            onChange={(e) => setSettings({ ...settings, seoMetaDescription: e.target.value })}
          />
        </div>
        <div>
          <Label>Social share image URL (Open Graph)</Label>
          <Input
            placeholder="https://…"
            value={settings.seoOgImageUrl ?? ""}
            onChange={(e) => setSettings({ ...settings, seoOgImageUrl: e.target.value || null })}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.seoRobotsIndexing}
            onChange={(e) => setSettings({ ...settings, seoRobotsIndexing: e.target.checked })}
          />
          Allow search engines to index this site
        </label>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-sm font-semibold">Custom code</h2>
        <p className="text-xs text-muted">
          Injected on every public page — useful for analytics snippets, search-console verification tags, or other
          third-party embeds. This is raw HTML/JavaScript that runs in every visitor&apos;s browser, so only paste code
          you trust.
        </p>
        <div>
          <Label>Head code (meta tags, verification tags, analytics)</Label>
          <Textarea
            rows={5}
            className="font-mono text-xs"
            value={settings.customHeadCode}
            onChange={(e) => setSettings({ ...settings, customHeadCode: e.target.value })}
          />
        </div>
        <div>
          <Label>Body-end code (chat widgets, pixel scripts)</Label>
          <Textarea
            rows={5}
            className="font-mono text-xs"
            value={settings.customBodyEndCode}
            onChange={(e) => setSettings({ ...settings, customBodyEndCode: e.target.value })}
          />
        </div>
      </Card>
    </div>
  );
}
