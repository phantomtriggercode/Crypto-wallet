"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiClientError } from "@/lib/apiClient";

export default function LoginPage() {
  return (
    <Suspense fallback={<Card>Loading…</Card>}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<"credentials" | "2fa">("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch<{ requires2FA: boolean; isAdmin?: boolean }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      if (res.requires2FA) {
        setStep("2fa");
      } else {
        toast.success("Welcome back.");
        router.push(res.isAdmin ? "/admin" : searchParams.get("next") || "/wallet");
        router.refresh();
      }
    } catch (err) {
      if (err instanceof ApiClientError) setError(err.message);
      else setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function handle2FA(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await apiFetch<{ isAdmin?: boolean }>("/api/auth/2fa/verify", {
        method: "POST",
        body: JSON.stringify({ code }),
      });
      toast.success("Welcome back.");
      router.push(res.isAdmin ? "/admin" : searchParams.get("next") || "/wallet");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError) setError(err.message);
      else setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <h1 className="mb-1 text-xl font-semibold">Log in</h1>
      <p className="mb-6 text-sm text-muted">
        {step === "credentials" ? "Access your wallet dashboard." : "Enter your 6-digit authenticator code."}
      </p>

      {step === "credentials" ? (
        <form onSubmit={handleCredentials} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="w-full" loading={loading}>
            Log in
          </Button>
        </form>
      ) : (
        <form onSubmit={handle2FA} className="space-y-4">
          <div>
            <Label htmlFor="code">Authentication code</Label>
            <Input
              id="code"
              inputMode="numeric"
              autoFocus
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
            />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="w-full" loading={loading}>
            Verify
          </Button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-muted">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-primary hover:underline">
          Create one
        </Link>
      </p>
    </Card>
  );
}
