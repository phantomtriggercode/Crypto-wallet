"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { apiFetch, ApiClientError } from "@/lib/apiClient";

type SectionKey = "features" | "widgets" | "market" | "escrow" | "security" | "news" | "faq";

type HomepageContent = {
  heroTitle: string;
  heroSubtitle: string;
  heroPrimaryCta: string;
  heroSecondaryCta: string;
  features: { title: string; description: string }[];
  stats: { label: string; value: string }[];
  faqs: { question: string; answer: string }[];
  showFeaturesSection: boolean;
  showEscrowSection: boolean;
  showMarketSection: boolean;
  showNewsSection: boolean;
  showSecuritySection: boolean;
  showFaqSection: boolean;
  sectionOrder: SectionKey[];
};

const SECTION_LABELS: Record<SectionKey, string> = {
  features: "Features",
  widgets: "Widgets",
  market: "Market overview",
  escrow: "Escrow",
  security: "Security",
  news: "Crypto news",
  faq: "FAQ",
};

const SECTION_TOGGLE_KEY: Partial<Record<SectionKey, keyof HomepageContent>> = {
  features: "showFeaturesSection",
  market: "showMarketSection",
  escrow: "showEscrowSection",
  security: "showSecuritySection",
  news: "showNewsSection",
  faq: "showFaqSection",
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
        <h2 className="mb-1 text-sm font-semibold">Sections</h2>
        <p className="mb-2 text-xs text-muted">Order the sections that appear below the hero, and toggle each on or off.</p>
        {content.sectionOrder.map((key, i) => {
          const toggleKey = SECTION_TOGGLE_KEY[key];
          const enabled = toggleKey ? Boolean(content[toggleKey]) : true;
          return (
            <div key={key} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <span className="text-sm">{SECTION_LABELS[key]}</span>
              <div className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={i === 0}
                  onClick={() => {
                    const order = [...content.sectionOrder];
                    [order[i - 1], order[i]] = [order[i], order[i - 1]];
                    setContent({ ...content, sectionOrder: order });
                  }}
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={i === content.sectionOrder.length - 1}
                  onClick={() => {
                    const order = [...content.sectionOrder];
                    [order[i + 1], order[i]] = [order[i], order[i + 1]];
                    setContent({ ...content, sectionOrder: order });
                  }}
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
                {toggleKey && (
                  <Button
                    size="sm"
                    variant={enabled ? "primary" : "secondary"}
                    onClick={() => setContent({ ...content, [toggleKey]: !enabled })}
                  >
                    {enabled ? "Enabled" : "Disabled"}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
