"use client";

import { useEffect, useState, use as usePromise } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/badge";
import { apiFetch, ApiClientError } from "@/lib/apiClient";
import { formatDate } from "@/lib/format";

type Ticket = {
  id: string;
  subject: string;
  status: string;
  messages: { id: string; message: string; senderAdminId: string | null; createdAt: string }[];
};

export default function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  function load() {
    apiFetch<{ ticket: Ticket }>(`/api/support/tickets/${id}`).then((res) => setTicket(res.ticket));
  }

  useEffect(load, [id]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    try {
      await apiFetch(`/api/support/tickets/${id}/messages`, { method: "POST", body: JSON.stringify({ message: text }) });
      setText("");
      load();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to send message.");
    } finally {
      setSending(false);
    }
  }

  if (!ticket) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{ticket.subject}</h1>
        <StatusBadge status={ticket.status} />
      </div>
      <Card>
        <div className="mb-3 max-h-96 space-y-2 overflow-y-auto">
          {ticket.messages.map((m) => (
            <div key={m.id} className={`rounded-lg px-3 py-2 text-sm ${m.senderAdminId ? "bg-primary/10" : "bg-surface-2/60"}`}>
              <p>{m.message}</p>
              <p className="mt-1 text-[10px] text-muted">
                {m.senderAdminId ? "Support team" : "You"} · {formatDate(m.createdAt)}
              </p>
            </div>
          ))}
        </div>
        <form onSubmit={send} className="flex gap-2">
          <Textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder="Reply…" />
          <Button type="submit" size="sm" loading={sending}>
            Send
          </Button>
        </form>
      </Card>
    </div>
  );
}
