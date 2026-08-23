"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { apiFetch, ApiClientError } from "@/lib/apiClient";

type HomepageContent = {
  heroTitle: string;
  heroSubtitle: string;
  heroPrimaryCta: string;
  heroSecondaryCta: string;
  features: { title: string; description: string }[];
  stats: { label: string; value: string }[];
  faqs: { question: string; answer: string }[];
  showEscrowSection: boolean;
  showMarketSection: boolean;
  showNewsSection: boolean;
};

export default function CmsHomepagePage() {
  const [content, setContent] = useState<HomepageContent | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch<{ content: HomepageContent }>("/api/cms/homepage").then((res) => setContent(res.content));
  }, []);

  async function save() {
    if (!content) return;
    setSaving(true);
    try {
      await apiFetch("/api/admin/cms/homepage", { method: "PATCH", body: JSON.stringify(content) });
      toast.success("Homepage updated.");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  if (!content) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Homepage</h1>
        <Button loading={saving} onClick={save}>
          Save changes
        </Button>
      </div>

      <Card className="space-y-3">
        <h2 className="text-sm font-semibold">Hero section</h2>
        <div>
          <Label>Title</Label>
          <Textarea rows={2} value={content.heroTitle} onChange={(e) => setContent({ ...content, heroTitle: e.target.value })} />
        </div>
        <div>
          <Label>Subtitle</Label>
          <Textarea rows={2} value={content.heroSubtitle} onChange={(e) => setContent({ ...content, heroSubtitle: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Primary button text</Label>
            <Input value={content.heroPrimaryCta} onChange={(e) => setContent({ ...content, heroPrimaryCta: e.target.value })} />
          </div>
          <div>
            <Label>Secondary button text</Label>
            <Input value={content.heroSecondaryCta} onChange={(e) => setContent({ ...content, heroSecondaryCta: e.target.value })} />
          </div>
        </div>
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Features</h2>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setContent({ ...content, features: [...content.features, { title: "", description: "" }] })}
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
        </div>
        {content.features.map((f, i) => (
          <div key={i} className="flex gap-2">
            <div className="flex-1 space-y-1">
              <Input
                placeholder="Title"
                value={f.title}
                onChange={(e) => {
                  const features = [...content.features];
                  features[i] = { ...f, title: e.target.value };
                  setContent({ ...content, features });
                }}
              />
              <Input
                placeholder="Description"
                value={f.description}
                onChange={(e) => {
                  const features = [...content.features];
                  features[i] = { ...f, description: e.target.value };
                  setContent({ ...content, features });
                }}
              />
            </div>
            <Button size="sm" variant="ghost" onClick={() => setContent({ ...content, features: content.features.filter((_, idx) => idx !== i) })}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">FAQ</h2>
          <Button size="sm" variant="secondary" onClick={() => setContent({ ...content, faqs: [...content.faqs, { question: "", answer: "" }] })}>
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
        </div>
        {content.faqs.map((f, i) => (
          <div key={i} className="flex gap-2">
            <div className="flex-1 space-y-1">
              <Input
                placeholder="Question"
                value={f.question}
                onChange={(e) => {
                  const faqs = [...content.faqs];
                  faqs[i] = { ...f, question: e.target.value };
                  setContent({ ...content, faqs });
                }}
              />
              <Textarea
                rows={2}
                placeholder="Answer"
                value={f.answer}
                onChange={(e) => {
                  const faqs = [...content.faqs];
                  faqs[i] = { ...f, answer: e.target.value };
                  setContent({ ...content, faqs });
                }}
              />
            </div>
            <Button size="sm" variant="ghost" onClick={() => setContent({ ...content, faqs: content.faqs.filter((_, idx) => idx !== i) })}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </Card>

      <Card className="space-y-2">
        <h2 className="text-sm font-semibold">Sections</h2>
        {(["showEscrowSection", "showMarketSection", "showNewsSection"] as const).map((key) => (
          <label key={key} className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={content[key]} onChange={(e) => setContent({ ...content, [key]: e.target.checked })} />
            {key.replace("show", "").replace("Section", "")}
          </label>
        ))}
      </Card>
    </div>
  );
}
