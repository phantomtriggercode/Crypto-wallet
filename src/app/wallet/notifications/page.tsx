"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/apiClient";
import { timeAgo } from "@/lib/format";

type Notification = { id: string; type: string; title: string; message: string; isRead: boolean; createdAt: string };

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    apiFetch<{ notifications: Notification[] }>("/api/notifications")
      .then((res) => setNotifications(res.notifications))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function markRead(id: string) {
    await apiFetch(`/api/notifications/${id}`, { method: "PATCH" });
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  }

  async function markAllRead() {
    await apiFetch("/api/notifications", { method: "POST", body: JSON.stringify({ markAllRead: true }) });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Notifications</h1>
        <Button variant="ghost" size="sm" onClick={markAllRead}>
          Mark all as read
        </Button>
      </div>
      <Card className="divide-y divide-border p-0">
        {loading && <p className="p-6 text-center text-sm text-muted">Loading…</p>}
        {!loading && notifications.length === 0 && (
          <div className="flex flex-col items-center gap-2 p-10 text-center text-muted">
            <Bell className="h-8 w-8" />
            <p className="text-sm">No notifications yet.</p>
          </div>
        )}
        {notifications.map((n) => (
          <button
            key={n.id}
            onClick={() => !n.isRead && markRead(n.id)}
            className={`flex w-full flex-col items-start gap-1 px-5 py-4 text-left transition hover:bg-surface-2/60 ${
              !n.isRead ? "bg-primary/5" : ""
            }`}
          >
            <div className="flex w-full items-center justify-between">
              <p className="text-sm font-medium">{n.title}</p>
              {!n.isRead && <span className="h-2 w-2 rounded-full bg-primary" />}
            </div>
            <p className="text-sm text-muted">{n.message}</p>
            <p className="text-xs text-muted">{timeAgo(n.createdAt)}</p>
          </button>
        ))}
      </Card>
    </div>
  );
}
