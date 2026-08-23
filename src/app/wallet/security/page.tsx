"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { apiFetch, ApiClientError } from "@/lib/apiClient";
import { formatDate } from "@/lib/format";

type Me = { fullName: string; email: string; twoFactorEnabled: boolean; emailVerified: boolean; kycStatus: string };
type Session = { id: string; ip: string | null; userAgent: string | null; lastSeenAt: string; isCurrent: boolean };

export default function SecurityPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);

  function reload() {
    apiFetch<{ user: Me }>("/api/auth/me").then((res) => setMe(res.user));
    apiFetch<{ sessions: Session[] }>("/api/auth/sessions").then((res) => setSessions(res.sessions));
  }

  useEffect(reload, []);

  if (!me) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-xl font-semibold">Security Center</h1>

      <Card>
        <h2 className="mb-3 text-sm font-semibold text-muted">Status</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Status label="Email verification" ok={me.emailVerified} />
          <Status label="KYC" ok={me.kycStatus === "APPROVED"} />
          <Status label="2FA" ok={me.twoFactorEnabled} />
          <Status label="Active sessions" ok value={String(sessions.length)} />
        </div>
      </Card>

      <TwoFactorCard enabled={me.twoFactorEnabled} onChange={reload} />
      <RecoveryPhraseCard />
      <ChangePasswordCard />
      <SessionsCard sessions={sessions} onChange={reload} />
    </div>
  );
}

function Status({ label, ok, value }: { label: string; ok: boolean; value?: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface-2/40 px-3 py-2.5">
      <p className="text-xs text-muted">{label}</p>
      <p className={`text-sm font-medium ${ok ? "text-success" : "text-warning"}`}>{value ?? (ok ? "Enabled" : "Not set")}</p>
    </div>
  );
}

function TwoFactorCard({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  const [step, setStep] = useState<"idle" | "setup" | "disable">("idle");
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function startSetup() {
    const res = await apiFetch<{ secret: string; qrCodeDataUrl: string }>("/api/auth/2fa/setup", { method: "POST" });
    setSecret(res.secret);
    setQrCodeDataUrl(res.qrCodeDataUrl);
    setStep("setup");
  }

  async function confirmEnable(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiFetch<{ backupCodes: string[] }>("/api/auth/2fa/enable", {
        method: "POST",
        body: JSON.stringify({ code }),
      });
      setBackupCodes(res.backupCodes);
      setStep("idle");
      onChange();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to enable 2FA.");
    } finally {
      setLoading(false);
    }
  }

  async function confirmDisable(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await apiFetch("/api/auth/2fa/disable", { method: "POST", body: JSON.stringify({ code }) });
      toast.success("2FA disabled.");
      setStep("idle");
      setCode("");
      onChange();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to disable 2FA.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold">Two-factor authentication</h2>
          <p className="text-xs text-muted">Required for withdrawals and sensitive account changes.</p>
        </div>
        {enabled ? (
          <Button variant="secondary" size="sm" onClick={() => setStep("disable")}>
            Disable
          </Button>
        ) : (
          <Button size="sm" onClick={startSetup}>
            Enable 2FA
          </Button>
        )}
      </div>

      {step === "setup" && (
        <form onSubmit={confirmEnable} className="mt-4 space-y-3 border-t border-border pt-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrCodeDataUrl} alt="2FA QR code" className="mx-auto h-40 w-40 rounded-lg bg-white p-2" />
          <p className="text-center font-mono text-xs text-muted">{secret}</p>
          <div>
            <Label htmlFor="enableCode">Enter the 6-digit code from your authenticator app</Label>
            <Input id="enableCode" value={code} onChange={(e) => setCode(e.target.value)} required />
          </div>
          <Button type="submit" className="w-full" loading={loading}>
            Confirm and enable
          </Button>
        </form>
      )}

      {step === "disable" && (
        <form onSubmit={confirmDisable} className="mt-4 space-y-3 border-t border-border pt-4">
          <div>
            <Label htmlFor="disableCode">Enter your 2FA code to disable</Label>
            <Input id="disableCode" value={code} onChange={(e) => setCode(e.target.value)} required />
          </div>
          <Button type="submit" variant="danger" className="w-full" loading={loading}>
            Confirm disable
          </Button>
        </form>
      )}

      {backupCodes && (
        <div className="mt-4 rounded-xl border border-warning/30 bg-warning/5 p-4">
          <p className="mb-2 text-sm font-medium text-warning">Save your backup codes</p>
          <div className="grid grid-cols-2 gap-1 font-mono text-xs">
            {backupCodes.map((c) => (
              <span key={c}>{c}</span>
            ))}
          </div>
          <Button size="sm" variant="secondary" className="mt-3" onClick={() => setBackupCodes(null)}>
            I&apos;ve saved these
          </Button>
        </div>
      )}
    </Card>
  );
}

function RecoveryPhraseCard() {
  const [phrase, setPhrase] = useState<string[] | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);

  async function generate() {
    const res = await apiFetch<{ phrase: string[] }>("/api/wallet/recovery-phrase/generate", { method: "POST" });
    setPhrase(res.phrase);
    setConfirmed(false);
  }

  async function save() {
    if (!phrase) return;
    setLoading(true);
    try {
      await apiFetch("/api/wallet/recovery-phrase/setup", { method: "POST", body: JSON.stringify({ phrase }) });
      toast.success("Recovery phrase saved.");
      setPhrase(null);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to save recovery phrase.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <h2 className="text-sm font-semibold">Wallet recovery phrase</h2>
      <p className="text-xs text-muted">
        A simulated 12-word recovery phrase for this educational wallet. It is never visible to administrators.
      </p>
      {!phrase && (
        <Button size="sm" className="mt-3" onClick={generate}>
          Generate recovery phrase
        </Button>
      )}
      {phrase && (
        <div className="mt-4 space-y-3 border-t border-border pt-4">
          <div className="grid grid-cols-3 gap-2 rounded-xl bg-surface-2/50 p-3 font-mono text-xs">
            {phrase.map((w, i) => (
              <span key={i}>
                {i + 1}. {w}
              </span>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs text-muted">
            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
            I have written down my recovery phrase and stored it safely.
          </label>
          <Button size="sm" disabled={!confirmed} loading={loading} onClick={save}>
            Confirm and save
          </Button>
        </div>
      )}
    </Card>
  );
}

function ChangePasswordCard() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await apiFetch("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      toast.success("Password changed.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to change password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <h2 className="mb-3 text-sm font-semibold">Change password</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Input
          type="password"
          placeholder="Current password"
          required
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
        <Input
          type="password"
          placeholder="New password"
          required
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <Input
          type="password"
          placeholder="Confirm new password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        <Button type="submit" size="sm" loading={loading}>
          Update password
        </Button>
      </form>
    </Card>
  );
}

function SessionsCard({ sessions, onChange }: { sessions: Session[]; onChange: () => void }) {
  async function revoke(id: string) {
    await apiFetch(`/api/auth/sessions/${id}`, { method: "DELETE" });
    toast.success("Session revoked.");
    onChange();
  }

  return (
    <Card>
      <h2 className="mb-3 text-sm font-semibold">Active sessions</h2>
      <div className="space-y-2">
        {sessions.map((s) => (
          <div key={s.id} className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5 text-sm">
            <div>
              <p className="font-medium">
                {s.ip ?? "Unknown IP"} {s.isCurrent && <span className="text-xs text-success">(this device)</span>}
              </p>
              <p className="max-w-xs truncate text-xs text-muted">{s.userAgent}</p>
              <p className="text-xs text-muted">Last active {formatDate(s.lastSeenAt)}</p>
            </div>
            {!s.isCurrent && (
              <Button size="sm" variant="ghost" onClick={() => revoke(s.id)}>
                Revoke
              </Button>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
