"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { LifeBuoy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/badge";
import { apiFetch, ApiClientError } from "@/lib/apiClient";
import { timeAgo } from "@/lib/format";

type Ticket = { id: string; subject: string; status: string; updatedAt: string };

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function load() {
    apiFetch<{ tickets: Ticket[] }>("/api/support/tickets").then((res) => setTickets(res.tickets));
  }

  useEffect(load, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiFetch("/api/support/tickets", { method: "POST", body: JSON.stringify({ subject, message }) });
      toast.success("Support ticket created.");
      setSubject("");
      setMessage("");
      load();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to create ticket.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold">Support</h1>

      <Card>
        <h2 className="mb-3 text-sm font-semibold">New ticket</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="subject">Subject</Label>
            <Input id="subject" required value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="message">Message</Label>
            <Textarea id="message" rows={3} required value={message} onChange={(e) => setMessage(e.target.value)} />
          </div>
          <Button type="submit" size="sm" loading={submitting}>
            Submit ticket
          </Button>
        </form>
      </Card>

      <Card className="divide-y divide-border p-0">
        {tickets.length === 0 && (
          <div className="flex flex-col items-center gap-2 p-10 text-center text-muted">
            <LifeBuoy className="h-8 w-8" />
            <p className="text-sm">No support tickets yet.</p>
          </div>
        )}
        {tickets.map((t) => (
          <Link key={t.id} href={`/wallet/support/${t.id}`} className="flex items-center justify-between px-5 py-4 hover:bg-surface-2/60">
            <div>
              <p className="text-sm font-medium">{t.subject}</p>
              <p className="text-xs text-muted">{timeAgo(t.updatedAt)}</p>
            </div>
            <StatusBadge status={t.status} />
          </Link>
        ))}
      </Card>
    </div>
  );
}
