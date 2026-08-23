"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/apiClient";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await apiFetch("/api/auth/password-reset/request", { method: "POST", body: JSON.stringify({ email }) });
    } finally {
      setDone(true);
      setLoading(false);
    }
  }

  return (
    <Card>
      <h1 className="mb-1 text-xl font-semibold">Reset your password</h1>
      <p className="mb-6 text-sm text-muted">We&apos;ll email you a link to reset your password.</p>
      {done ? (
        <p className="text-sm text-success">If an account exists for this email, a reset link has been sent.</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" loading={loading}>
            Send reset link
          </Button>
        </form>
      )}
      <Link href="/login" className="mt-6 inline-block text-sm text-primary hover:underline">
        Back to login
      </Link>
    </Card>
  );
}
