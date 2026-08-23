"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { apiFetch, ApiClientError } from "@/lib/apiClient";

const ALL_ROLES = ["SUPER_ADMIN", "FINANCE_ADMIN", "KYC_ADMIN", "SUPPORT_ADMIN", "CONTENT_ADMIN", "SECURITY_ADMIN"];

type Admin = { id: string; fullName: string; email: string; adminRoles: { role: string }[] };

export default function AdminRolesPage() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", password: "", roles: [] as string[] });
  const [submitting, setSubmitting] = useState(false);

  function load() {
    apiFetch<{ admins: Admin[] }>("/api/admin/admins").then((res) => setAdmins(res.admins));
  }

  useEffect(load, []);

  async function updateRoles(id: string, roles: string[]) {
    try {
      await apiFetch(`/api/admin/admins/${id}/roles`, { method: "PATCH", body: JSON.stringify({ roles }) });
      toast.success("Roles updated.");
      load();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to update roles.");
    }
  }

  async function createAdmin(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiFetch("/api/admin/admins", { method: "POST", body: JSON.stringify(form) });
      toast.success("Administrator created.");
      setShowForm(false);
      setForm({ fullName: "", email: "", password: "", roles: [] });
      load();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to create admin.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Admin Roles</h1>
        <Button size="sm" onClick={() => setShowForm((s) => !s)}>
          New administrator
        </Button>
      </div>

      {showForm && (
        <Card>
          <form onSubmit={createAdmin} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="fullName">Full name</Label>
                <Input id="fullName" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>
            <div>
              <Label htmlFor="password">Temporary password</Label>
              <Input id="password" type="password" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
            <div>
              <Label>Roles</Label>
              <RoleCheckboxes roles={form.roles} onChange={(roles) => setForm({ ...form, roles })} />
            </div>
            <Button type="submit" size="sm" loading={submitting}>
              Create administrator
            </Button>
          </form>
        </Card>
      )}

      <Card className="divide-y divide-border p-0">
        {admins.map((a) => (
          <div key={a.id} className="px-5 py-4">
            <p className="text-sm font-medium">{a.fullName}</p>
            <p className="mb-2 text-xs text-muted">{a.email}</p>
            <RoleCheckboxes roles={a.adminRoles.map((r) => r.role)} onChange={(roles) => updateRoles(a.id, roles)} />
          </div>
        ))}
      </Card>
    </div>
  );
}

function RoleCheckboxes({ roles, onChange }: { roles: string[]; onChange: (roles: string[]) => void }) {
  function toggle(role: string) {
    onChange(roles.includes(role) ? roles.filter((r) => r !== role) : [...roles, role]);
  }
  return (
    <div className="flex flex-wrap gap-2">
      {ALL_ROLES.map((role) => (
        <button
          key={role}
          type="button"
          onClick={() => toggle(role)}
          className={`rounded-full border px-3 py-1 text-xs transition ${
            roles.includes(role) ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted"
          }`}
        >
          {role.replaceAll("_", " ")}
        </button>
      ))}
    </div>
  );
}
