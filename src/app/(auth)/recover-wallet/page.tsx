"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiClientError } from "@/lib/apiClient";

export default function RecoverWalletPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [words, setWords] = useState<string[]>(Array(12).fill(""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setWord(i: number, value: string) {
    setWords((w) => w.map((x, idx) => (idx === i ? value : x)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch<{ resetToken: string }>("/api/auth/recovery/verify", {
        method: "POST",
        body: JSON.stringify({ email, phrase: words }),
      });
      router.push(`/reset-password?token=${res.resetToken}`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Recovery failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <h1 className="mb-1 text-xl font-semibold">Recover your wallet</h1>
      <p className="mb-6 text-sm text-muted">Enter your account email and your 12-word recovery phrase in order.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <Label>Recovery phrase</Label>
          <div className="grid grid-cols-3 gap-2">
            {words.map((w, i) => (
              <Input
                key={i}
                required
                value={w}
                onChange={(e) => setWord(i, e.target.value)}
                placeholder={`${i + 1}`}
                className="text-center text-xs"
              />
            ))}
          </div>
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" className="w-full" loading={loading}>
          Recover wallet
        </Button>
      </form>
      <Link href="/login" className="mt-6 inline-block text-sm text-primary hover:underline">
        Back to login
      </Link>
    </Card>
  );
}
