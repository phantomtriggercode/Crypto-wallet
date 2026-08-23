"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { apiFetch, ApiClientError } from "@/lib/apiClient";
import { formatDate } from "@/lib/format";

type Announcement = { id: string; title: string; message: string; active: boolean; createdAt: string };

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function load() {
    apiFetch<{ announcements: Announcement[] }>("/api/admin/announcements").then((res) => setAnnouncements(res.announcements));
  }

  useEffect(load, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiFetch("/api/admin/announcements", { method: "POST", body: JSON.stringify({ title, message }) });
      toast.success("Announcement sent.");
      setTitle("");
      setMessage("");
      load();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to send.");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggle(id: string, active: boolean) {
    await apiFetch(`/api/admin/announcements/${id}`, { method: "PATCH", body: JSON.stringify({ active: !active }) });
    load();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold">Announcements</h1>
      <Card>
        <form onSubmit={create} className="space-y-2">
          <Input placeholder="Title" required value={title} onChange={(e) => setTitle(e.target.value)} />
          <Textarea placeholder="Message" rows={2} required value={message} onChange={(e) => setMessage(e.target.value)} />
          <Button type="submit" size="sm" loading={submitting}>
            Send announcement
          </Button>
        </form>
      </Card>
      <Card className="divide-y divide-border p-0">
        {announcements.map((a) => (
          <div key={a.id} className="flex items-center justify-between px-5 py-3 text-sm">
            <div>
              <p className="font-medium">{a.title}</p>
              <p className="text-xs text-muted">{formatDate(a.createdAt)}</p>
            </div>
            <Button size="sm" variant={a.active ? "primary" : "secondary"} onClick={() => toggle(a.id, a.active)}>
              {a.active ? "Active" : "Inactive"}
            </Button>
          </div>
        ))}
      </Card>
    </div>
  );
}
