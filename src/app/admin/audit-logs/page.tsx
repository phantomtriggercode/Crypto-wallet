"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { apiFetch } from "@/lib/apiClient";
import { formatDate } from "@/lib/format";

type Log = {
  id: string;
  action: string;
  targetType: string;
  targetId: string | null;
  reason: string | null;
  ip: string | null;
  createdAt: string;
  admin: { fullName: string; email: string } | null;
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);

  useEffect(() => {
    apiFetch<{ logs: Log[] }>("/api/admin/audit-logs").then((res) => setLogs(res.logs));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Audit Logs</h1>
      <Card className="divide-y divide-border p-0">
        {logs.map((l) => (
          <div key={l.id} className="px-5 py-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium">{l.action.replaceAll("_", " ")}</span>
              <span className="text-xs text-muted">{formatDate(l.createdAt)}</span>
            </div>
            <p className="text-xs text-muted">
              {l.admin?.fullName ?? "System"} · {l.targetType} {l.targetId} · IP {l.ip ?? "—"}
            </p>
            {l.reason && <p className="text-xs text-muted">Reason: {l.reason}</p>}
          </div>
        ))}
      </Card>
    </div>
  );
}
