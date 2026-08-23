"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowUp, ArrowDown, Trash2, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select, Label } from "@/components/ui/input";
import { apiFetch, ApiClientError } from "@/lib/apiClient";

const WIDGET_TYPE_INFO: Record<string, { label: string; defaultConfig: Record<string, unknown> }> = {
  ASSET_PRICE: { label: "Asset Price", defaultConfig: { symbol: "BTC" } },
  MARKET_OVERVIEW: { label: "Market Overview", defaultConfig: { count: 6 } },
  TRENDING: { label: "Trending Coins", defaultConfig: { count: 5 } },
  TOP_GAINERS: { label: "Top Gainers", defaultConfig: { count: 5 } },
  TOP_LOSERS: { label: "Top Losers", defaultConfig: { count: 5 } },
  FEAR_GREED: { label: "Fear & Greed Index", defaultConfig: { value: 50 } },
  MARKET_DOMINANCE: { label: "Market Dominance", defaultConfig: { count: 5 } },
  GAS_PRICES: { label: "Gas Prices", defaultConfig: { networks: [{ name: "Ethereum", gwei: 25 }] } },
  CONVERSION_CALCULATOR: { label: "Conversion Calculator", defaultConfig: {} },
  EXCHANGE_CALCULATOR: { label: "Exchange Calculator", defaultConfig: {} },
  PRICE_CHART: { label: "Price Chart", defaultConfig: { symbol: "BTC" } },
  NEWS: { label: "Crypto News", defaultConfig: { count: 3 } },
  PORTFOLIO_CHART: { label: "Portfolio Chart (dashboard only)", defaultConfig: {} },
};

type Widget = {
  id: string;
  type: string;
  title: string | null;
  placement: string;
  enabled: boolean;
  order: number;
  config: Record<string, unknown> | null;
};

export default function AdminWidgetsPage() {
  const [placement, setPlacement] = useState<"homepage" | "dashboard">("homepage");
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [newType, setNewType] = useState("ASSET_PRICE");

  const load = useCallback((p: "homepage" | "dashboard" = placement) => {
    apiFetch<{ widgets: Widget[] }>(`/api/admin/widgets?placement=${p}`).then((res) => setWidgets(res.widgets));
  }, [placement]);

  useEffect(() => load(placement), [placement, load]);

  async function addWidget() {
    try {
      await apiFetch("/api/admin/widgets", {
        method: "POST",
        body: JSON.stringify({ type: newType, placement, config: WIDGET_TYPE_INFO[newType].defaultConfig }),
      });
      toast.success("Widget added.");
      load();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to add widget.");
    }
  }

  async function updateWidget(id: string, changes: Partial<Widget>) {
    try {
      await apiFetch(`/api/admin/widgets/${id}`, { method: "PATCH", body: JSON.stringify(changes) });
      load();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to update widget.");
    }
  }

  async function remove(id: string) {
    await apiFetch(`/api/admin/widgets/${id}`, { method: "DELETE" });
    toast.success("Widget removed.");
    load();
  }

  async function move(index: number, direction: -1 | 1) {
    const next = [...widgets];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setWidgets(next);
    await apiFetch("/api/admin/widgets/reorder", { method: "POST", body: JSON.stringify({ ids: next.map((w) => w.id) }) });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Widgets</h1>
        <Select value={placement} onChange={(e) => setPlacement(e.target.value as "homepage" | "dashboard")} className="w-auto">
          <option value="homepage">Homepage</option>
          <option value="dashboard">Wallet Dashboard</option>
        </Select>
      </div>

      <Card>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Label htmlFor="newType">Add widget</Label>
            <Select id="newType" value={newType} onChange={(e) => setNewType(e.target.value)}>
              {Object.entries(WIDGET_TYPE_INFO).map(([type, info]) => (
                <option key={type} value={type}>
                  {info.label}
                </option>
              ))}
            </Select>
          </div>
          <Button size="sm" onClick={addWidget}>
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
        </div>
      </Card>

      <div className="space-y-3">
        {widgets.length === 0 && <p className="text-center text-sm text-muted">No widgets on this placement yet.</p>}
        {widgets.map((w, i) => (
          <WidgetRow
            key={w.id}
            widget={w}
            onUpdate={(changes) => updateWidget(w.id, changes)}
            onDelete={() => remove(w.id)}
            onMoveUp={() => move(i, -1)}
            onMoveDown={() => move(i, 1)}
          />
        ))}
      </div>
    </div>
  );
}

function WidgetRow({
  widget,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  widget: Widget;
  onUpdate: (changes: Partial<Widget>) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState(widget.title ?? "");
  const [config, setConfig] = useState(widget.config ?? {});

  return (
    <Card>
      <div className="flex items-center justify-between gap-2">
        <button className="flex-1 text-left" onClick={() => setExpanded((s) => !s)}>
          <p className="text-sm font-medium">{WIDGET_TYPE_INFO[widget.type]?.label ?? widget.type}</p>
          <p className="text-xs text-muted">{widget.title}</p>
        </button>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={onMoveUp}>
            <ArrowUp className="h-3.5 w-3.5" />
          </Button>
          <Button size="sm" variant="ghost" onClick={onMoveDown}>
            <ArrowDown className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant={widget.enabled ? "primary" : "secondary"}
            onClick={() => onUpdate({ enabled: !widget.enabled })}
          >
            {widget.enabled ? "Enabled" : "Disabled"}
          </Button>
          <Button size="sm" variant="ghost" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 space-y-3 border-t border-border pt-3">
          <div>
            <Label>Title</Label>
            <div className="flex gap-2">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              <Button size="sm" variant="secondary" onClick={() => onUpdate({ title })}>
                Save
              </Button>
            </div>
          </div>
          <WidgetConfigEditor
            type={widget.type}
            config={config}
            onChange={setConfig}
            onSave={() => onUpdate({ config })}
          />
        </div>
      )}
    </Card>
  );
}

function WidgetConfigEditor({
  type,
  config,
  onChange,
  onSave,
}: {
  type: string;
  config: Record<string, unknown>;
  onChange: (c: Record<string, unknown>) => void;
  onSave: () => void;
}) {
  if (["ASSET_PRICE", "PRICE_CHART"].includes(type)) {
    return (
      <div>
        <Label>Asset symbol</Label>
        <div className="flex gap-2">
          <Input
            value={String(config.symbol ?? "")}
            onChange={(e) => onChange({ ...config, symbol: e.target.value.toUpperCase() })}
          />
          <Button size="sm" variant="secondary" onClick={onSave}>
            Save
          </Button>
        </div>
      </div>
    );
  }

  if (["MARKET_OVERVIEW", "TRENDING", "TOP_GAINERS", "TOP_LOSERS", "NEWS", "MARKET_DOMINANCE"].includes(type)) {
    return (
      <div>
        <Label>Number of items</Label>
        <div className="flex gap-2">
          <Input
            type="number"
            min={1}
            max={20}
            value={String(config.count ?? 5)}
            onChange={(e) => onChange({ ...config, count: Number(e.target.value) })}
          />
          <Button size="sm" variant="secondary" onClick={onSave}>
            Save
          </Button>
        </div>
      </div>
    );
  }

  if (type === "FEAR_GREED") {
    return (
      <div>
        <Label>Index value (0-100)</Label>
        <div className="flex gap-2">
          <Input
            type="number"
            min={0}
            max={100}
            value={String(config.value ?? 50)}
            onChange={(e) => onChange({ ...config, value: Number(e.target.value) })}
          />
          <Button size="sm" variant="secondary" onClick={onSave}>
            Save
          </Button>
        </div>
      </div>
    );
  }

  if (type === "GAS_PRICES") {
    const networks = (config.networks as { name: string; gwei: number }[]) ?? [];
    return (
      <div className="space-y-2">
        <Label>Networks</Label>
        {networks.map((n, i) => (
          <div key={i} className="flex gap-2">
            <Input
              placeholder="Name"
              value={n.name}
              onChange={(e) => {
                const next = [...networks];
                next[i] = { ...n, name: e.target.value };
                onChange({ ...config, networks: next });
              }}
            />
            <Input
              type="number"
              placeholder="Gwei"
              value={n.gwei}
              onChange={(e) => {
                const next = [...networks];
                next[i] = { ...n, gwei: Number(e.target.value) };
                onChange({ ...config, networks: next });
              }}
            />
            <Button size="sm" variant="ghost" onClick={() => onChange({ ...config, networks: networks.filter((_, idx) => idx !== i) })}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => onChange({ ...config, networks: [...networks, { name: "", gwei: 0 }] })}>
            Add network
          </Button>
          <Button size="sm" onClick={onSave}>
            Save
          </Button>
        </div>
      </div>
    );
  }

  return <p className="text-xs text-muted">This widget type has no additional configuration.</p>;
}
