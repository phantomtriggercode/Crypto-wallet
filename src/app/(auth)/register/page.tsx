"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiClientError } from "@/lib/apiClient";

export default function RegisterPage() {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    country: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiFetch("/api/auth/register", { method: "POST", body: JSON.stringify(form) });
      setDone(true);
    } catch (err) {
      if (err instanceof ApiClientError) setError(err.message);
      else setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <Card>
        <h1 className="mb-2 text-xl font-semibold">Check your inbox</h1>
        <p className="text-sm text-muted">
          We&apos;ve sent a verification link to <span className="text-foreground">{form.email}</span>. Click it to
          activate your account, then log in.
        </p>
        <Link href="/login" className="mt-6 inline-block text-sm text-primary hover:underline">
          Back to login
        </Link>
      </Card>
    );
  }

  return (
    <Card>
      <h1 className="mb-1 text-xl font-semibold">Create your account</h1>
      <p className="mb-6 text-sm text-muted">Educational wallet — no real funds are ever involved.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="fullName">Full name</Label>
          <Input id="fullName" required value={form.fullName} onChange={(e) => set("fullName", e.target.value)} />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required value={form.email} onChange={(e) => set("email", e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="phone">Phone number</Label>
            <Input id="phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </div>
          <div>
            <Label htmlFor="country">Country</Label>
            <Input id="country" required value={form.country} onChange={(e) => set("country", e.target.value)} />
          </div>
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            required
            value={form.password}
            onChange={(e) => set("password", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input
            id="confirmPassword"
            type="password"
            required
            value={form.confirmPassword}
            onChange={(e) => set("confirmPassword", e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" className="w-full" loading={loading}>
          Create account
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-primary hover:underline">
          Log in
        </Link>
      </p>
    </Card>
  );
}
