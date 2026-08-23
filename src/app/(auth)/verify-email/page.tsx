"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { apiFetch, ApiClientError } from "@/lib/apiClient";

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<Card>Loading…</Card>}>
      <VerifyEmailInner />
    </Suspense>
  );
}

function VerifyEmailInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">(token ? "loading" : "error");
  const [message, setMessage] = useState(token ? "" : "Missing verification token.");

  useEffect(() => {
    if (!token) return;
    apiFetch<{ message: string }>("/api/auth/verify-email", { method: "POST", body: JSON.stringify({ token }) })
      .then((res) => {
        setStatus("success");
        setMessage(res.message);
      })
      .catch((err) => {
        setStatus("error");
        setMessage(err instanceof ApiClientError ? err.message : "Verification failed.");
      });
  }, [token]);

  return (
    <Card>
      <h1 className="mb-2 text-xl font-semibold">Email verification</h1>
      {status === "loading" && <p className="text-sm text-muted">Verifying your email…</p>}
      {status === "success" && <p className="text-sm text-success">{message}</p>}
      {status === "error" && <p className="text-sm text-danger">{message}</p>}
      <Link href="/login" className="mt-6 inline-block text-sm text-primary hover:underline">
        Back to login
      </Link>
    </Card>
  );
}
