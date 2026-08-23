"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select } from "@/components/ui/input";
import { apiFetch, ApiClientError } from "@/lib/apiClient";

type Template = { id: string; key: string; subject: string; bodyHtml: string };

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch<{ templates: Template[] }>("/api/admin/email-templates").then((res) => {
      setTemplates(res.templates);
      if (res.templates[0]) select(res.templates[0]);
    });
  }, []);

  function select(t: Template) {
    setSelectedId(t.id);
    setSubject(t.subject);
    setBodyHtml(t.bodyHtml);
  }

  async function save() {
    setSaving(true);
    try {
      await apiFetch(`/api/admin/email-templates/${selectedId}`, { method: "PATCH", body: JSON.stringify({ subject, bodyHtml }) });
      toast.success("Template saved.");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold">Email Templates</h1>
      <Select
        value={selectedId}
        onChange={(e) => {
          const t = templates.find((x) => x.id === e.target.value);
          if (t) select(t);
        }}
      >
        {templates.map((t) => (
          <option key={t.id} value={t.id}>
            {t.key}
          </option>
        ))}
      </Select>
      <Card className="space-y-3">
        <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
        <Textarea rows={12} className="font-mono text-xs" value={bodyHtml} onChange={(e) => setBodyHtml(e.target.value)} />
        <p className="text-xs text-muted">
          Variables: {"{{user_name}} {{amount}} {{asset}} {{transaction_id}} {{date}} {{status}}"}
        </p>
        <Button loading={saving} onClick={save}>
          Save template
        </Button>
      </Card>
    </div>
  );
}
