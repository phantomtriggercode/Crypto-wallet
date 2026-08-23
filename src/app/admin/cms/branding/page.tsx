"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { apiFetch, ApiClientError } from "@/lib/apiClient";

type Settings = { logoUrl: string | null; faviconUrl: string | null; primaryColor: string; secondaryColor: string };
type Media = { id: string; url: string; filename: string; folder: string };

export default function BrandingPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [media, setMedia] = useState<Media[]>([]);
  const [saving, setSaving] = useState(false);

  function load() {
    apiFetch<{ settings: Settings }>("/api/admin/settings").then((res) => setSettings(res.settings));
    apiFetch<{ media: Media[] }>("/api/admin/media").then((res) => setMedia(res.media));
  }

  useEffect(load, []);

  async function upload(e: React.ChangeEvent<HTMLInputElement>, field: "logoUrl" | "faviconUrl") {
    const file = e.target.files?.[0];
    if (!file || !settings) return;
    const form = new FormData();
    form.set("file", file);
    form.set("folder", "branding");
    const res = await fetch("/api/admin/media", { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Upload failed");
      return;
    }
    setSettings({ ...settings, [field]: data.media.url });
    load();
  }

  async function save() {
    if (!settings) return;
    setSaving(true);
    try {
      await apiFetch("/api/admin/settings", { method: "PATCH", body: JSON.stringify(settings) });
      toast.success("Branding updated.");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  if (!settings) return null;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Branding</h1>
        <Button loading={saving} onClick={save}>
          Save changes
        </Button>
      </div>

      <Card className="space-y-3">
        <div>
          <Label>Logo</Label>
          {settings.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={settings.logoUrl} alt="Logo" className="mb-2 h-12 rounded bg-white p-1" />
          )}
          <input type="file" accept="image/*" onChange={(e) => upload(e, "logoUrl")} />
        </div>
        <div>
          <Label>Favicon</Label>
          {settings.faviconUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={settings.faviconUrl} alt="Favicon" className="mb-2 h-8 w-8 rounded bg-white p-1" />
          )}
          <input type="file" accept="image/*" onChange={(e) => upload(e, "faviconUrl")} />
        </div>
      </Card>

      <Card className="space-y-3">
        <div>
          <Label htmlFor="primaryColor">Primary color</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              id="primaryColor"
              value={settings.primaryColor}
              onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
              className="h-10 w-14 rounded border border-border bg-transparent"
            />
            <Input value={settings.primaryColor} onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })} />
          </div>
        </div>
        <div>
          <Label htmlFor="secondaryColor">Secondary color</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              id="secondaryColor"
              value={settings.secondaryColor}
              onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })}
              className="h-10 w-14 rounded border border-border bg-transparent"
            />
            <Input value={settings.secondaryColor} onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })} />
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="mb-2 text-sm font-semibold">Media library</h2>
        <div className="grid grid-cols-4 gap-2">
          {media.map((m) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={m.id} src={m.url} alt={m.filename} className="h-16 w-full rounded bg-surface-2 object-contain p-1" />
          ))}
        </div>
      </Card>
    </div>
  );
}
