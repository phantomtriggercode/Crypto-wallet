"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { apiFetch, ApiClientError } from "@/lib/apiClient";

type Article = { id: string; headline: string; publisher: string | null; summary: string | null; featured: boolean };

export default function AdminNewsPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [form, setForm] = useState({ headline: "", publisher: "", summary: "", imageUrl: "", sourceUrl: "" });
  const [submitting, setSubmitting] = useState(false);

  function load() {
    apiFetch<{ articles: Article[] }>("/api/admin/news").then((res) => setArticles(res.articles));
  }

  useEffect(load, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiFetch("/api/admin/news", { method: "POST", body: JSON.stringify(form) });
      toast.success("Article published.");
      setForm({ headline: "", publisher: "", summary: "", imageUrl: "", sourceUrl: "" });
      load();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to publish.");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleFeatured(id: string, featured: boolean) {
    await apiFetch(`/api/admin/news/${id}`, { method: "PATCH", body: JSON.stringify({ featured: !featured }) });
    load();
  }

  async function remove(id: string) {
    await apiFetch(`/api/admin/news/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold">Crypto News</h1>
      <Card>
        <form onSubmit={create} className="space-y-2">
          <Input placeholder="Headline" required value={form.headline} onChange={(e) => setForm({ ...form, headline: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Publisher" value={form.publisher} onChange={(e) => setForm({ ...form, publisher: e.target.value })} />
            <Input placeholder="Image URL" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
          </div>
          <Input placeholder="Source URL" value={form.sourceUrl} onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })} />
          <Textarea placeholder="Short description" rows={2} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
          <Button type="submit" size="sm" loading={submitting}>
            Publish article
          </Button>
        </form>
      </Card>
      <Card className="divide-y divide-border p-0">
        {articles.map((a) => (
          <div key={a.id} className="flex items-center justify-between px-5 py-3 text-sm">
            <div>
              <p className="font-medium">{a.headline}</p>
              <p className="text-xs text-muted">{a.publisher}</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant={a.featured ? "primary" : "secondary"} onClick={() => toggleFeatured(a.id, a.featured)}>
                {a.featured ? "Featured" : "Feature"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => remove(a.id)}>
                Delete
              </Button>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
