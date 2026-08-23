"use client";

import { use as usePromise, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { DragHandle } from "@/components/admin/drag-handle";
import { useDragReorder } from "@/lib/hooks/useDragReorder";
import { apiFetch, ApiClientError } from "@/lib/apiClient";

type StaticPageContent = {
  title: string;
  intro: string;
  sections: { heading: string; body: string }[];
  metaTitle: string;
  metaDescription: string;
};

export default function AdminCmsPageEditor({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = usePromise(params);
  const [content, setContent] = useState<StaticPageContent | null>(null);
  const [saving, setSaving] = useState(false);
  const { dragHandleProps, dropTargetProps } = useDragReorder(content?.sections ?? [], (sections) =>
    setContent((c) => (c ? { ...c, sections } : c))
  );

  useEffect(() => {
    apiFetch<{ content: StaticPageContent }>(`/api/admin/cms/pages/${slug}`).then((res) => setContent(res.content));
  }, [slug]);

  async function save() {
    if (!content) return;
    setSaving(true);
    try {
      await apiFetch(`/api/admin/cms/pages/${slug}`, { method: "PATCH", body: JSON.stringify(content) });
      toast.success("Page updated.");
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
        <h1 className="text-xl font-semibold">Edit page: /{slug}</h1>
        <Button loading={saving} onClick={save}>
          Save changes
        </Button>
      </div>

      <Card className="space-y-3">
        <div>
          <Label>Title</Label>
          <Input value={content.title} onChange={(e) => setContent({ ...content, title: e.target.value })} />
        </div>
        <div>
          <Label>Intro text</Label>
          <RichTextEditor
            value={content.intro}
            onChange={(html) => setContent({ ...content, intro: html })}
            placeholder="Write the intro for this page…"
          />
        </div>
      </Card>

      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Sections</h2>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setContent({ ...content, sections: [...content.sections, { heading: "", body: "" }] })}
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
        </div>
        {content.sections.map((s, i) => (
          <div
            key={i}
            className="flex gap-2 border-t border-border pt-3 first:border-0 first:pt-0"
            {...dropTargetProps(i)}
          >
            <span {...dragHandleProps(i)} className="pt-1">
              <DragHandle />
            </span>
            <div className="flex-1 space-y-1">
              <Input
                placeholder="Heading"
                value={s.heading}
                onChange={(e) => {
                  const sections = [...content.sections];
                  sections[i] = { ...s, heading: e.target.value };
                  setContent({ ...content, sections });
                }}
              />
              <RichTextEditor
                value={s.body}
                onChange={(html) => {
                  const sections = [...content.sections];
                  sections[i] = { ...s, body: html };
                  setContent({ ...content, sections });
                }}
                placeholder="Section body…"
              />
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setContent({ ...content, sections: content.sections.filter((_, idx) => idx !== i) })}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
        {content.sections.length === 0 && <p className="text-xs text-muted">No sections yet — this page will just show the intro text.</p>}
      </Card>

      <Card className="space-y-3">
        <h2 className="text-sm font-semibold">SEO</h2>
        <div>
          <Label>Meta title (leave blank to use page title)</Label>
          <Input
            maxLength={70}
            value={content.metaTitle}
            onChange={(e) => setContent({ ...content, metaTitle: e.target.value })}
          />
        </div>
        <div>
          <Label>Meta description (leave blank to use intro text)</Label>
          <Textarea
            rows={2}
            maxLength={160}
            value={content.metaDescription}
            onChange={(e) => setContent({ ...content, metaDescription: e.target.value })}
          />
        </div>
      </Card>
    </div>
  );
}
