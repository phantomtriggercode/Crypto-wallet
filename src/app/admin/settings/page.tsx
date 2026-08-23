"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { apiFetch, ApiClientError } from "@/lib/apiClient";

type Settings = {
  siteName: string;
  siteTagline: string;
  supportEmail: string;
  currency: string;
  timezone: string;
  demoModeEnabled: boolean;
  priceMode: "MANUAL" | "LIVE";
  depositTimerMinutes: number;
  withdrawalTimerMinutes: number;
  require2FAForWithdrawals: boolean;
  require2FAGlobal: boolean;
  requireKycForWallet: boolean;
  swapApprovalMode: "AUTOMATIC" | "MANUAL";
  minWithdrawalUsd: number;
  maxWithdrawalUsd: number;
  dailyWithdrawalLimitUsd: number;
  maxDepositUsd: number;
  maintenance: {
    website: boolean;
    deposits: boolean;
    withdrawals: boolean;
    swaps: boolean;
    escrow: boolean;
    kyc: boolean;
  };
};

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch<{ settings: Settings }>("/api/admin/settings").then((res) => setSettings(res.settings));
  }, []);

  async function save() {
    if (!settings) return;
    setSaving(true);
    try {
      await apiFetch("/api/admin/settings", { method: "PATCH", body: JSON.stringify(settings) });
      toast.success("Settings saved.");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }

  if (!settings) return null;

  function set<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((s) => (s ? { ...s, [key]: value } : s));
  }

  function setMaintenance<K extends keyof Settings["maintenance"]>(key: K, value: boolean) {
    setSettings((s) => (s ? { ...s, maintenance: { ...s.maintenance, [key]: value } } : s));
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">General Settings</h1>
        <Button loading={saving} onClick={save}>
          Save changes
        </Button>
      </div>

      <Card className="space-y-3">
        <h2 className="text-sm font-semibold">Branding</h2>
        <div>
          <Label htmlFor="siteName">Site name</Label>
          <Input id="siteName" value={settings.siteName} onChange={(e) => set("siteName", e.target.value)} />
        </div>
        <div>
          <Label htmlFor="siteTagline">Tagline</Label>
          <Input id="siteTagline" value={settings.siteTagline} onChange={(e) => set("siteTagline", e.target.value)} />
        </div>
        <div>
          <Label htmlFor="supportEmail">Support email</Label>
          <Input id="supportEmail" type="email" value={settings.supportEmail} onChange={(e) => set("supportEmail", e.target.value)} />
        </div>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-sm font-semibold">Environment</h2>
        <ToggleRow label="Demo mode label" value={settings.demoModeEnabled} onChange={(v) => set("demoModeEnabled", v)} />
        <div>
          <Label htmlFor="priceMode">Price mode</Label>
          <Select id="priceMode" value={settings.priceMode} onChange={(e) => set("priceMode", e.target.value as Settings["priceMode"])}>
            <option value="MANUAL">Simulated / Admin controlled</option>
            <option value="LIVE">Live market data</option>
          </Select>
        </div>
        <div>
          <Label htmlFor="swapApprovalMode">Swap approval mode</Label>
          <Select id="swapApprovalMode" value={settings.swapApprovalMode} onChange={(e) => set("swapApprovalMode", e.target.value as Settings["swapApprovalMode"])}>
            <option value="AUTOMATIC">Automatic demo swap</option>
            <option value="MANUAL">Manual admin approval</option>
          </Select>
        </div>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-sm font-semibold">Timers (display only)</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="depositTimer">Deposit processing timer (minutes)</Label>
            <Input id="depositTimer" type="number" value={settings.depositTimerMinutes} onChange={(e) => set("depositTimerMinutes", Number(e.target.value))} />
          </div>
          <div>
            <Label htmlFor="withdrawalTimer">Withdrawal review timer (minutes)</Label>
            <Input id="withdrawalTimer" type="number" value={settings.withdrawalTimerMinutes} onChange={(e) => set("withdrawalTimerMinutes", Number(e.target.value))} />
          </div>
        </div>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-sm font-semibold">Requirements</h2>
        <ToggleRow label="Require 2FA for withdrawals" value={settings.require2FAForWithdrawals} onChange={(v) => set("require2FAForWithdrawals", v)} />
        <ToggleRow label="Require 2FA for all logins" value={settings.require2FAGlobal} onChange={(v) => set("require2FAGlobal", v)} />
        <ToggleRow label="Require KYC for wallet features" value={settings.requireKycForWallet} onChange={(v) => set("requireKycForWallet", v)} />
      </Card>

      <Card className="space-y-3">
        <h2 className="text-sm font-semibold">Limits (USD)</h2>
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Min withdrawal" value={settings.minWithdrawalUsd} onChange={(v) => set("minWithdrawalUsd", v)} />
          <NumberField label="Max withdrawal" value={settings.maxWithdrawalUsd} onChange={(v) => set("maxWithdrawalUsd", v)} />
          <NumberField label="Daily withdrawal limit" value={settings.dailyWithdrawalLimitUsd} onChange={(v) => set("dailyWithdrawalLimitUsd", v)} />
          <NumberField label="Max deposit" value={settings.maxDepositUsd} onChange={(v) => set("maxDepositUsd", v)} />
        </div>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-sm font-semibold">Maintenance mode</h2>
        {(Object.keys(settings.maintenance) as (keyof Settings["maintenance"])[]).map((k) => (
          <ToggleRow key={k} label={k[0].toUpperCase() + k.slice(1)} value={settings.maintenance[k]} onChange={(v) => setMaintenance(k, v)} />
        ))}
      </Card>
    </div>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={`h-6 w-11 rounded-full transition ${value ? "bg-primary" : "bg-surface-2"}`}
      >
        <span className={`block h-5 w-5 translate-y-0.5 rounded-full bg-white transition ${value ? "translate-x-5" : "translate-x-0.5"}`} />
      </button>
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <Label>{label}</Label>
      <Input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}
