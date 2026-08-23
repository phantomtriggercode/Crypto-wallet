"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, Textarea } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/badge";
import { apiFetch, ApiClientError } from "@/lib/apiClient";
import { formatDate } from "@/lib/format";

type Application = {
  id: string;
  legalName: string;
  country: string;
  dateOfBirth: string;
  address: string;
  status: string;
  createdAt: string;
  user: { fullName: string; email: string };
  documents: { id: string; type: string; originalName: string | null }[];
};

const STATUSES = ["PENDING", "UNDER_REVIEW", "APPROVED", "REJECTED", "MORE_INFO_REQUIRED"];

export default function AdminKycPage() {
  const [status, setStatus] = useState("UNDER_REVIEW");
  const [applications, setApplications] = useState<Application[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    apiFetch<{ applications: Application[] }>(`/api/admin/kyc?status=${status}`).then((res) => setApplications(res.applications));
  }

  useEffect(load, [status]);

  async function act(id: string, action: string) {
    setBusy(true);
    try {
      await apiFetch(`/api/admin/kyc/${id}/action`, { method: "POST", body: JSON.stringify({ action, reviewReason: reason }) });
      toast.success("Updated.");
      setExpanded(null);
      setReason("");
      load();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">KYC Review</h1>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-auto">
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replaceAll("_", " ")}
            </option>
          ))}
        </Select>
      </div>

      <Card className="divide-y divide-border p-0">
        {applications.length === 0 && <p className="p-6 text-center text-sm text-muted">No applications in this status.</p>}
        {applications.map((a) => (
          <div key={a.id} className="px-5 py-4">
            <button className="flex w-full items-center justify-between text-left" onClick={() => setExpanded(expanded === a.id ? null : a.id)}>
              <div>
                <p className="text-sm font-medium">{a.user.fullName}</p>
                <p className="text-xs text-muted">
                  {a.user.email} · Submitted {formatDate(a.createdAt)}
                </p>
              </div>
              <StatusBadge status={a.status} />
            </button>

            {expanded === a.id && (
              <div className="mt-3 space-y-2 border-t border-border pt-3 text-sm">
                <p>Legal name: {a.legalName}</p>
                <p>Date of birth: {new Date(a.dateOfBirth).toLocaleDateString()}</p>
                <p>Country: {a.country}</p>
                <p>Address: {a.address}</p>
                <div className="flex flex-wrap gap-2">
                  {a.documents.map((d) => (
                    <a
                      key={d.id}
                      href={`/api/kyc/documents/${d.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-surface-2"
                    >
                      View {d.type.replaceAll("_", " ").toLowerCase()}
                    </a>
                  ))}
                </div>
                <Textarea rows={2} placeholder="Review reason (required for reject/more info)…" value={reason} onChange={(e) => setReason(e.target.value)} />
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" loading={busy} onClick={() => act(a.id, "APPROVE")}>
                    Approve
                  </Button>
                  <Button size="sm" variant="danger" loading={busy} onClick={() => act(a.id, "REJECT")}>
                    Reject
                  </Button>
                  <Button size="sm" variant="secondary" loading={busy} onClick={() => act(a.id, "MORE_INFO_REQUIRED")}>
                    Request More Info
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </Card>
    </div>
  );
}
