"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { apiFetch, ApiClientError } from "@/lib/apiClient";

type Network = { id: string; name: string; symbol: string; depositAddress: string; minDeposit: string; confirmationTimerMinutes: number };
type Asset = { id: string; symbol: string; name: string; minDeposit: string; depositEnabled: boolean; networks: Network[] };

export default function DepositPage() {
  const router = useRouter();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetId, setAssetId] = useState("");
  const [networkId, setNetworkId] = useState("");
  const [amount, setAmount] = useState("");
  const [txHash, setTxHash] = useState("");
  const [senderAddress, setSenderAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiFetch<{ assets: Asset[] }>("/api/assets").then((res) => {
      const depositable = res.assets.filter((a) => a.depositEnabled && a.networks.length > 0);
      setAssets(depositable);
      if (depositable[0]) {
        setAssetId(depositable[0].id);
        setNetworkId(depositable[0].networks[0]?.id ?? "");
      }
    });
  }, []);

  const asset = assets.find((a) => a.id === assetId);
  const network = asset?.networks.find((n) => n.id === networkId);

  function handleAssetChange(id: string) {
    setAssetId(id);
    const a = assets.find((x) => x.id === id);
    setNetworkId(a?.networks[0]?.id ?? "");
  }

  function copyAddress() {
    if (!network) return;
    navigator.clipboard.writeText(network.depositAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!asset || !network) return;
    setSubmitting(true);
    try {
      const res = await apiFetch<{ deposit: { id: string } }>("/api/deposits", {
        method: "POST",
        body: JSON.stringify({ assetId, networkId, amount, txHash, senderAddress, notes }),
      });
      router.push(`/wallet/deposit/${res.deposit.id}/thank-you`);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to submit deposit request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-xl font-semibold">Deposit</h1>

      <Card>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="asset">Select asset</Label>
            <Select id="asset" value={assetId} onChange={(e) => handleAssetChange(e.target.value)}>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.symbol} — {a.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="network">Select network</Label>
            <Select id="network" value={networkId} onChange={(e) => setNetworkId(e.target.value)}>
              {asset?.networks.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {network && (
          <div className="mt-5 space-y-4">
            <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface-2/50 p-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/qrcode?data=${encodeURIComponent(network.depositAddress)}`}
                alt="Deposit address QR code"
                className="h-40 w-40 rounded-lg bg-white p-2"
              />
              <p className="break-all text-center font-mono text-sm">{network.depositAddress}</p>
              <Button type="button" variant="secondary" size="sm" onClick={copyAddress}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy address"}
              </Button>
            </div>

            <p className="rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning">
              Important: Only send {asset?.symbol} on the {network.name} network to this address. Minimum deposit:{" "}
              {network.minDeposit} {asset?.symbol}. Estimated processing time: {network.confirmationTimerMinutes} minutes.
            </p>
            <p className="text-xs text-muted">
              Educational demonstration — transactions are manually processed and are not broadcast to a blockchain.
            </p>

            <form onSubmit={handleSubmit} className="space-y-3 border-t border-border pt-4">
              <div>
                <Label htmlFor="amount">Amount sent</Label>
                <Input
                  id="amount"
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="txHash">Transaction hash (optional)</Label>
                <Input id="txHash" value={txHash} onChange={(e) => setTxHash(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="senderAddress">Sender address (optional)</Label>
                <Input id="senderAddress" value={senderAddress} onChange={(e) => setSenderAddress(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea id="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" loading={submitting}>
                I Have Sent The Deposit
              </Button>
            </form>
          </div>
        )}
      </Card>
    </div>
  );
}
