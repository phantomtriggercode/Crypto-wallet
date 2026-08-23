"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowUp, ArrowDown, Trash2, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { apiFetch, ApiClientError } from "@/lib/apiClient";

type NavLink = { label: string; href: string };
type Settings = { navLinks: NavLink[]; footerTagline: string };

export default function AdminNavigationPage() {
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
      toast.success("Navigation & footer updated.");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  if (!settings) return null;

  function move(i: number, dir: -1 | 1) {
    if (!settings) return;
    const links = [...settings.navLinks];
    const target = i + dir;
    if (target < 0 || target >= links.length) return;
    [links[i], links[target]] = [links[target], links[i]];
    setSettings({ ...settings, navLinks: links });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Navigation & Footer</h1>
        <Button loading={saving} onClick={save}>
          Save changes
        </Button>
      </div>

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Primary navigation</h2>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setSettings({ ...settings, navLinks: [...settings.navLinks, { label: "", href: "" }] })}
          >
            <Plus className="h-3.5 w-3.5" /> Add link
          </Button>
        </div>
        <p className="text-xs text-muted">
          These links appear in the top navigation bar and the footer&apos;s Product column, on every public page.
        </p>
        {settings.navLinks.map((link, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              placeholder="Label"
              value={link.label}
              className="flex-1"
              onChange={(e) => {
                const links = [...settings.navLinks];
                links[i] = { ...link, label: e.target.value };
                setSettings({ ...settings, navLinks: links });
              }}
            />
            <Input
              placeholder="/path or https://…"
              value={link.href}
              className="flex-1"
              onChange={(e) => {
                const links = [...settings.navLinks];
                links[i] = { ...link, href: e.target.value };
                setSettings({ ...settings, navLinks: links });
              }}
            />
            <Button size="sm" variant="ghost" disabled={i === 0} onClick={() => move(i, -1)}>
              <ArrowUp className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="ghost" disabled={i === settings.navLinks.length - 1} onClick={() => move(i, 1)}>
              <ArrowDown className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSettings({ ...settings, navLinks: settings.navLinks.filter((_, idx) => idx !== i) })}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
        {settings.navLinks.length === 0 && <p className="text-xs text-muted">No navigation links yet.</p>}
      </Card>

      <Card className="space-y-2">
        <h2 className="text-sm font-semibold">Footer tagline</h2>
        <Label>Shown under the site name in the footer</Label>
        <Textarea rows={2} value={settings.footerTagline} onChange={(e) => setSettings({ ...settings, footerTagline: e.target.value })} />
      </Card>
    </div>
  );
}
