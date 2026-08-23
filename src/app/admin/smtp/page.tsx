"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { apiFetch, ApiClientError } from "@/lib/apiClient";

type Config = { host: string; port: number; encryption: string; username: string; fromName: string; fromEmail: string; configured: boolean } | null;

export default function AdminSmtpPage() {
  const [form, setForm] = useState({ host: "", port: "587", encryption: "TLS", username: "", password: "", fromName: "", fromEmail: "" });
  const [configured, setConfigured] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    apiFetch<{ config: Config }>("/api/admin/smtp").then((res) => {
      if (res.config) {
        setForm({ ...res.config, port: String(res.config.port), password: "" });
        setConfigured(res.config.configured);
      }
    });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch("/api/admin/smtp", { method: "PATCH", body: JSON.stringify(form) });
      toast.success("SMTP settings saved.");
      setConfigured(true);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function sendTest() {
    setTesting(true);
    try {
      await apiFetch("/api/admin/smtp/test", { method: "POST", body: JSON.stringify({ to: testEmail }) });
      toast.success("Test email sent.");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to send test email.");
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-xl font-semibold">SMTP Configuration</h1>
      <Card>
        <form onSubmit={save} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="host">SMTP host</Label>
              <Input id="host" required value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="port">Port</Label>
              <Input id="port" type="number" required value={form.port} onChange={(e) => setForm({ ...form, port: e.target.value })} />
            </div>
          </div>
          <div>
            <Label htmlFor="encryption">Encryption</Label>
            <Select id="encryption" value={form.encryption} onChange={(e) => setForm({ ...form, encryption: e.target.value })}>
              <option value="NONE">None</option>
              <option value="TLS">TLS</option>
              <option value="SSL">SSL</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="username">Username</Label>
            <Input id="username" required value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="password">Password {configured && "(leave blank to keep current)"}</Label>
            <Input id="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="fromName">From name</Label>
              <Input id="fromName" required value={form.fromName} onChange={(e) => setForm({ ...form, fromName: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="fromEmail">From email</Label>
              <Input id="fromEmail" type="email" required value={form.fromEmail} onChange={(e) => setForm({ ...form, fromEmail: e.target.value })} />
            </div>
          </div>
          <Button type="submit" loading={saving}>
            Save SMTP settings
          </Button>
        </form>
      </Card>

      <Card>
        <Label htmlFor="testEmail">Send test email</Label>
        <div className="flex gap-2">
          <Input id="testEmail" type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} />
          <Button type="button" variant="secondary" loading={testing} onClick={sendTest}>
            Send Test Email
          </Button>
        </div>
      </Card>
    </div>
  );
}
