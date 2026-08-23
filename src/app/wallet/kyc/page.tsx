"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/apiClient";

type Application = { status: string; reviewReason: string | null } | null;

export default function KycPage() {
  const [status, setStatus] = useState<string>("NOT_STARTED");
  const [application, setApplication] = useState<Application>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [legalName, setLegalName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [country, setCountry] = useState("");
  const [address, setAddress] = useState("");
  const [governmentId, setGovernmentId] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [proofOfAddress, setProofOfAddress] = useState<File | null>(null);

  useEffect(() => {
    apiFetch<{ application: Application; status: string }>("/api/kyc")
      .then((res) => {
        setStatus(res.status);
        setApplication(res.application);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!governmentId || !selfie) {
      toast.error("Government ID and selfie are required.");
      return;
    }
    setSubmitting(true);
    try {
      const form = new FormData();
      form.set("legalName", legalName);
      form.set("dateOfBirth", dateOfBirth);
      form.set("country", country);
      form.set("address", address);
      form.set("governmentId", governmentId);
      form.set("selfie", selfie);
      if (proofOfAddress) form.set("proofOfAddress", proofOfAddress);

      const res = await fetch("/api/kyc", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Submission failed");

      toast.success("KYC application submitted.");
      setStatus("UNDER_REVIEW");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return null;

  const canSubmit = ["NOT_STARTED", "REJECTED", "MORE_INFO_REQUIRED"].includes(status);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Identity verification</h1>
        <StatusBadge status={status} />
      </div>

      {!canSubmit && (
        <Card>
          <p className="text-sm text-muted">
            {status === "UNDER_REVIEW" && "Your application is under manual review by our compliance team."}
            {status === "APPROVED" && "Your identity has been verified. All wallet features are unlocked."}
            {status === "PENDING" && "Please complete your submission below."}
          </p>
        </Card>
      )}

      {application?.reviewReason && (
        <Card className="border-warning/30 bg-warning/5">
          <p className="text-sm font-medium text-warning">Reviewer feedback</p>
          <p className="text-sm text-muted">{application.reviewReason}</p>
        </Card>
      )}

      {canSubmit && (
        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="legalName">Legal name</Label>
              <Input id="legalName" required value={legalName} onChange={(e) => setLegalName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="dateOfBirth">Date of birth</Label>
                <Input id="dateOfBirth" type="date" required value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="country">Country</Label>
                <Input id="country" required value={country} onChange={(e) => setCountry(e.target.value)} />
              </div>
            </div>
            <div>
              <Label htmlFor="address">Residential address</Label>
              <Textarea id="address" required rows={2} value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="governmentId">Government-issued ID</Label>
              <Input id="governmentId" type="file" required accept="image/*,.pdf" onChange={(e) => setGovernmentId(e.target.files?.[0] ?? null)} />
            </div>
            <div>
              <Label htmlFor="selfie">Selfie holding your ID</Label>
              <Input id="selfie" type="file" required accept="image/*" onChange={(e) => setSelfie(e.target.files?.[0] ?? null)} />
            </div>
            <div>
              <Label htmlFor="proofOfAddress">Proof of address (optional)</Label>
              <Input id="proofOfAddress" type="file" accept="image/*,.pdf" onChange={(e) => setProofOfAddress(e.target.files?.[0] ?? null)} />
            </div>
            <Button type="submit" className="w-full" loading={submitting}>
              Submit for review
            </Button>
            <p className="text-center text-xs text-muted">
              Documents are stored privately and are only accessible to authorized KYC administrators.
            </p>
          </form>
        </Card>
      )}
    </div>
  );
}
