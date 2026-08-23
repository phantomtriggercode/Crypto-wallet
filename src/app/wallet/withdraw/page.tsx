"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ShieldAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { apiFetch, ApiClientError } from "@/lib/apiClient";
import { formatAmount } from "@/lib/format";

type Network = { id: string; name: string };
type Asset = {
  id: string;
  symbol: string;
  name: string;
  decimals: number;
  minWithdrawal: string;
  withdrawalEnabled: boolean;
  withdrawalFeeFixed: string;
  withdrawalFeePercent: string;
  networks: Network[];
};
type Holding = { asset: { id: string }; available: string };

export default function WithdrawPage() {
  const router = useRouter();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [me, setMe] = useState<{ twoFactorEnabled: boolean } | null>(null);
  const [assetId, setAssetId] = useState("");
  const [networkId, setNetworkId] = useState("");
  const [destinationAddress, setDestinationAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiFetch<{ assets: Asset[] }>("/api/assets").then((res) => {
      const withdrawable = res.assets.filter((a) => a.withdrawalEnabled && a.networks.length > 0);
      setAssets(withdrawable);
      if (withdrawable[0]) {
        setAssetId(withdrawable[0].id);
        setNetworkId(withdrawable[0].networks[0]?.id ?? "");
      }
    });
    apiFetch<{ holdings: Holding[] }>("/api/wallet/summary").then((res) => setHoldings(res.holdings));
    apiFetch<{ user: { twoFactorEnabled: boolean } }>("/api/auth/me").then((res) => setMe(res.user));
  }, []);

  const asset = assets.find((a) => a.id === assetId);
  const available = holdings.find((h) => h.asset.id === assetId)?.available ?? "0";

  const fees = useMemo(() => {
    if (!asset || !amount) return { platformFee: 0, total: 0 };
    const amt = Number(amount) || 0;
    const platformFee = Number(asset.withdrawalFeeFixed) + (amt * Number(asset.withdrawalFeePercent)) / 100;
    return { platformFee, total: amt + platformFee };
  }, [asset, amount]);

  function handleAssetChange(id: string) {
    setAssetId(id);
    const a = assets.find((x) => x.id === id);
    setNetworkId(a?.networks[0]?.id ?? "");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await apiFetch<{ withdrawal: { id: string } }>("/api/withdrawals", {
        method: "POST",
        body: JSON.stringify({ assetId, networkId, destinationAddress, amount, twoFactorCode }),
      });
      toast.success("Withdrawal submitted for admin approval.");
      router.push(`/wallet/withdraw/${res.withdrawal.id}`);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to submit withdrawal.");
    } finally {
      setSubmitting(false);
    }
  }

  if (me && !me.twoFactorEnabled) {
    return (
      <div className="mx-auto max-w-lg">
        <Card className="flex flex-col items-center gap-3 text-center">
          <ShieldAlert className="h-10 w-10 text-warning" />
          <h1 className="text-lg font-semibold">Enable 2FA to withdraw</h1>
          <p className="text-sm text-muted">
            For your security, two-factor authentication is required before you can submit a withdrawal request.
          </p>
          <Link href="/wallet/security">
            <Button>Set up 2FA</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-xl font-semibold">Withdraw</h1>
      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="asset">Asset</Label>
              <Select id="asset" value={assetId} onChange={(e) => handleAssetChange(e.target.value)}>
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.symbol}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="network">Network</Label>
              <Select id="network" value={networkId} onChange={(e) => setNetworkId(e.target.value)}>
                {asset?.networks.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <p className="text-xs text-muted">
            Available: {formatAmount(available, asset?.decimals ?? 8)} {asset?.symbol}
          </p>
          <div>
            <Label htmlFor="destinationAddress">Destination address</Label>
            <Input
              id="destinationAddress"
              required
              value={destinationAddress}
              onChange={(e) => setDestinationAddress(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="amount">Amount</Label>
            <Input id="amount" type="number" step="any" min="0" required value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>

          <div className="space-y-1 rounded-xl border border-border bg-surface-2/50 px-4 py-3 text-sm">
            <div className="flex justify-between text-muted">
              <span>Requested amount</span>
              <span>
                {amount || 0} {asset?.symbol}
              </span>
            </div>
            <div className="flex justify-between text-muted">
              <span>Platform fee</span>
              <span>
                {fees.platformFee.toFixed(8)} {asset?.symbol}
              </span>
            </div>
            <div className="flex justify-between font-medium">
              <span>Total deducted</span>
              <span>
                {fees.total.toFixed(8)} {asset?.symbol}
              </span>
            </div>
          </div>

          <div>
            <Label htmlFor="twoFactorCode">2FA code</Label>
            <Input
              id="twoFactorCode"
              inputMode="numeric"
              required
              value={twoFactorCode}
              onChange={(e) => setTwoFactorCode(e.target.value)}
              placeholder="123456"
            />
          </div>

          <Button type="submit" className="w-full" loading={submitting}>
            Confirm Withdrawal
          </Button>
          <p className="text-center text-xs text-muted">
            This withdrawal will be manually reviewed by an administrator. No blockchain transaction will be broadcast.
          </p>
        </form>
      </Card>
    </div>
  );
}
