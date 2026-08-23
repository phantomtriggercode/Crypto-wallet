"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { AssetIcon } from "@/components/ui/asset-icon";
import { apiFetch, ApiClientError } from "@/lib/apiClient";

type Network = { id: string; name: string; symbol: string; depositAddress: string; enabled: boolean; minDeposit: string; confirmationTimerMinutes: number };
type Asset = {
  id: string;
  symbol: string;
  name: string;
  iconUrl: string | null;
  enabled: boolean;
  depositEnabled: boolean;
  withdrawalEnabled: boolean;
  swapEnabled: boolean;
  escrowEnabled: boolean;
  demoPrice: string;
  priceChange24h: string;
  minDeposit: string;
  minWithdrawal: string;
  withdrawalFeeFixed: string;
  withdrawalFeePercent: string;
  swapFeePercent: string;
  networks: Network[];
};

export default function AdminAssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newAsset, setNewAsset] = useState({ symbol: "", name: "", demoPrice: "0" });
  const [newNetwork, setNewNetwork] = useState({ name: "", symbol: "", depositAddress: "", minDeposit: "0" });

  function load() {
    apiFetch<{ assets: Asset[] }>("/api/admin/assets").then((res) => setAssets(res.assets));
  }

  useEffect(load, []);

  async function updateAsset(id: string, changes: Partial<Asset>) {
    try {
      await apiFetch(`/api/admin/assets/${id}`, { method: "PATCH", body: JSON.stringify(changes) });
      load();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to update.");
    }
  }

  async function createAsset(e: React.FormEvent) {
    e.preventDefault();
    try {
      await apiFetch("/api/admin/assets", { method: "POST", body: JSON.stringify(newAsset) });
      toast.success("Asset created.");
      setShowNew(false);
      setNewAsset({ symbol: "", name: "", demoPrice: "0" });
      load();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to create asset.");
    }
  }

  async function addNetwork(assetId: string) {
    try {
      await apiFetch("/api/admin/networks", { method: "POST", body: JSON.stringify({ ...newNetwork, assetId }) });
      toast.success("Network added.");
      setNewNetwork({ name: "", symbol: "", depositAddress: "", minDeposit: "0" });
      load();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to add network.");
    }
  }

  async function updateNetwork(id: string, changes: Partial<Network>) {
    try {
      await apiFetch(`/api/admin/networks/${id}`, { method: "PATCH", body: JSON.stringify(changes) });
      load();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to update network.");
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Assets</h1>
        <Button size="sm" onClick={() => setShowNew((s) => !s)}>
          Add asset
        </Button>
      </div>

      {showNew && (
        <Card>
          <form onSubmit={createAsset} className="grid grid-cols-3 gap-3">
            <Input placeholder="Symbol (BTC)" required value={newAsset.symbol} onChange={(e) => setNewAsset({ ...newAsset, symbol: e.target.value })} />
            <Input placeholder="Name" required value={newAsset.name} onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })} />
            <Input placeholder="Demo price (USD)" type="number" value={newAsset.demoPrice} onChange={(e) => setNewAsset({ ...newAsset, demoPrice: e.target.value })} />
            <Button type="submit" size="sm" className="col-span-3">
              Create
            </Button>
          </form>
        </Card>
      )}

      {assets.map((a) => (
        <Card key={a.id}>
          <div className="flex items-center justify-between">
            <button className="flex items-center gap-3 text-left" onClick={() => setExpanded(expanded === a.id ? null : a.id)}>
              <AssetIcon symbol={a.symbol} iconUrl={a.iconUrl} size={32} />
              <div>
                <p className="text-sm font-medium">
                  {a.symbol} — {a.name}
                </p>
                <p className="text-xs text-muted">${a.demoPrice}</p>
              </div>
            </button>
            <div className="flex flex-wrap gap-1">
              <Flag label="Enabled" value={a.enabled} onChange={(v) => updateAsset(a.id, { enabled: v })} />
              <Flag label="Deposit" value={a.depositEnabled} onChange={(v) => updateAsset(a.id, { depositEnabled: v })} />
              <Flag label="Withdraw" value={a.withdrawalEnabled} onChange={(v) => updateAsset(a.id, { withdrawalEnabled: v })} />
              <Flag label="Swap" value={a.swapEnabled} onChange={(v) => updateAsset(a.id, { swapEnabled: v })} />
              <Flag label="Escrow" value={a.escrowEnabled} onChange={(v) => updateAsset(a.id, { escrowEnabled: v })} />
            </div>
          </div>

          {expanded === a.id && (
            <div className="mt-4 space-y-4 border-t border-border pt-4">
              <div className="flex items-center gap-3">
                <AssetIcon symbol={a.symbol} iconUrl={a.iconUrl} size={48} />
                <IconUploader onUploaded={(url) => updateAsset(a.id, { iconUrl: url })} />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <NumberField label="Demo price" defaultValue={a.demoPrice} onSave={(v) => updateAsset(a.id, { demoPrice: v as never })} />
                <NumberField label="24h change %" defaultValue={a.priceChange24h} onSave={(v) => updateAsset(a.id, { priceChange24h: v as never })} />
                <NumberField label="Min deposit" defaultValue={a.minDeposit} onSave={(v) => updateAsset(a.id, { minDeposit: v as never })} />
                <NumberField label="Min withdrawal" defaultValue={a.minWithdrawal} onSave={(v) => updateAsset(a.id, { minWithdrawal: v as never })} />
                <NumberField label="Withdrawal fee (fixed)" defaultValue={a.withdrawalFeeFixed} onSave={(v) => updateAsset(a.id, { withdrawalFeeFixed: v as never })} />
                <NumberField label="Withdrawal fee %" defaultValue={a.withdrawalFeePercent} onSave={(v) => updateAsset(a.id, { withdrawalFeePercent: v as never })} />
                <NumberField label="Swap fee %" defaultValue={a.swapFeePercent} onSave={(v) => updateAsset(a.id, { swapFeePercent: v as never })} />
              </div>

              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase text-muted">Networks</h3>
                <div className="space-y-2">
                  {a.networks.map((n) => (
                    <div key={n.id} className="rounded-lg border border-border p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{n.name}</p>
                        <Flag label="Enabled" value={n.enabled} onChange={(v) => updateNetwork(n.id, { enabled: v })} />
                      </div>
                      <p className="mt-1 break-all font-mono text-xs text-muted">{n.depositAddress}</p>
                      <EditAddress network={n} onSave={(addr) => updateNetwork(n.id, { depositAddress: addr })} />
                    </div>
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Input placeholder="Network name" value={newNetwork.name} onChange={(e) => setNewNetwork({ ...newNetwork, name: e.target.value })} />
                  <Input placeholder="Symbol" value={newNetwork.symbol} onChange={(e) => setNewNetwork({ ...newNetwork, symbol: e.target.value })} />
                  <Input placeholder="Deposit address" value={newNetwork.depositAddress} onChange={(e) => setNewNetwork({ ...newNetwork, depositAddress: e.target.value })} />
                  <Button size="sm" onClick={() => addNetwork(a.id)}>
                    Add network
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

function Flag({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
        value ? "border-success/40 bg-success/10 text-success" : "border-border text-muted"
      }`}
    >
      {label}
    </button>
  );
}

function NumberField({ label, defaultValue, onSave }: { label: string; defaultValue: string; onSave: (v: string) => void }) {
  const [value, setValue] = useState(defaultValue);
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex gap-1">
        <Input type="number" value={value} onChange={(e) => setValue(e.target.value)} />
        <Button size="sm" variant="secondary" onClick={() => onSave(value)}>
          Save
        </Button>
      </div>
    </div>
  );
}

function IconUploader({ onUploaded }: { onUploaded: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("folder", "asset-icons");
      const res = await fetch("/api/admin/media", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      onUploaded(data.media.url);
      toast.success("Icon updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <Label>Icon</Label>
      <input type="file" accept="image/*" disabled={uploading} onChange={handleFile} className="text-xs" />
    </div>
  );
}

function EditAddress({ network, onSave }: { network: Network; onSave: (addr: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [addr, setAddr] = useState(network.depositAddress);
  if (!editing) {
    return (
      <button className="mt-1 text-xs text-primary hover:underline" onClick={() => setEditing(true)}>
        Edit address
      </button>
    );
  }
  return (
    <div className="mt-2 flex gap-1">
      <Input value={addr} onChange={(e) => setAddr(e.target.value)} />
      <Button
        size="sm"
        onClick={() => {
          onSave(addr);
          setEditing(false);
        }}
      >
        Save
      </Button>
    </div>
  );
}
