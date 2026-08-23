"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, Textarea } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/badge";
import { apiFetch, ApiClientError } from "@/lib/apiClient";
import { formatDate } from "@/lib/format";

type Ticket = {
  id: string;
  subject: string;
  status: string;
  priority: string;
  updatedAt: string;
  user: { fullName: string; email: string };
  messages: { id: string; message: string; senderAdminId: string | null; createdAt: string }[];
};

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [reply, setReply] = useState("");

  function load() {
    apiFetch<{ tickets: Ticket[] }>("/api/admin/support/tickets").then((res) => setTickets(res.tickets));
  }

  useEffect(load, []);

  async function open(id: string) {
    if (expanded === id) {
      setExpanded(null);
      return;
    }
    const res = await apiFetch<{ ticket: Ticket }>(`/api/admin/support/tickets/${id}`);
    setTickets((prev) => prev.map((t) => (t.id === id ? res.ticket : t)));
    setExpanded(id);
  }

  async function send(id: string) {
    if (!reply) return;
    try {
      await apiFetch(`/api/support/tickets/${id}/messages`, { method: "POST", body: JSON.stringify({ message: reply }) });
      setReply("");
      const res = await apiFetch<{ ticket: Ticket }>(`/api/admin/support/tickets/${id}`);
      setTickets((prev) => prev.map((t) => (t.id === id ? res.ticket : t)));
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to reply.");
    }
  }

  async function setStatus(id: string, status: string) {
    await apiFetch(`/api/admin/support/tickets/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
    load();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-xl font-semibold">Support Tickets</h1>
      <Card className="divide-y divide-border p-0">
        {tickets.map((t) => (
          <div key={t.id} className="px-5 py-4">
            <button className="flex w-full items-center justify-between text-left" onClick={() => open(t.id)}>
              <div>
                <p className="text-sm font-medium">{t.subject}</p>
                <p className="text-xs text-muted">
                  {t.user.fullName} ({t.user.email}) · {formatDate(t.updatedAt)}
                </p>
              </div>
              <StatusBadge status={t.status} />
            </button>
            {expanded === t.id && (
              <div className="mt-3 space-y-2 border-t border-border pt-3">
                <div className="max-h-56 space-y-2 overflow-y-auto rounded-lg bg-surface-2/40 p-3">
                  {t.messages.map((m) => (
                    <div key={m.id} className="text-xs">
                      <span className="font-medium">{m.senderAdminId ? "Support" : "User"}:</span> {m.message}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Textarea rows={1} placeholder="Reply…" value={reply} onChange={(e) => setReply(e.target.value)} />
                  <Button size="sm" onClick={() => send(t.id)}>
                    Send
                  </Button>
                </div>
                <Select value={t.status} onChange={(e) => setStatus(t.id, e.target.value)} className="w-auto">
                  <option value="OPEN">Open</option>
                  <option value="PENDING">Pending</option>
                  <option value="CLOSED">Closed</option>
                </Select>
              </div>
            )}
          </div>
        ))}
      </Card>
    </div>
  );
}
