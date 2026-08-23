"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/apiClient";
import { formatDate } from "@/lib/format";

type UserRow = {
  id: string;
  fullName: string;
  email: string;
  kycStatus: string;
  status: string;
  createdAt: string;
  lastLoginAt: string | null;
};

export default function AdminUsersPage() {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<UserRow[]>([]);

  function load(q?: string) {
    apiFetch<{ users: UserRow[] }>(`/api/admin/users${q ? `?q=${encodeURIComponent(q)}` : ""}`).then((res) => setUsers(res.users));
  }

  useEffect(() => load(), []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Users</h1>
        <Input
          placeholder="Search by name or email"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load(query)}
          className="w-64"
        />
      </div>

      <Card className="divide-y divide-border p-0">
        {users.map((u) => (
          <Link key={u.id} href={`/admin/users/${u.id}`} className="flex items-center justify-between px-5 py-4 hover:bg-surface-2/60">
            <div>
              <p className="text-sm font-medium">{u.fullName}</p>
              <p className="text-xs text-muted">{u.email}</p>
            </div>
            <div className="flex items-center gap-4 text-right">
              <StatusBadge status={u.kycStatus} />
              <StatusBadge status={u.status} />
              <p className="w-28 text-xs text-muted">Joined {formatDate(u.createdAt)}</p>
            </div>
          </Link>
        ))}
      </Card>
    </div>
  );
}
