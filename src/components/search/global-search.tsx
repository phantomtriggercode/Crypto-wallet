"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { apiFetch } from "@/lib/apiClient";
import { formatUsd } from "@/lib/format";

type UserResults = {
  coins: { symbol: string; name: string }[];
  transactions: { id: string; type: string; amount: string; asset: { symbol: string } }[];
  escrow: { id: string; title: string; escrowRef: string }[];
  help: { question: string; answer: string }[];
};

type AdminResults = {
  users: { id: string; fullName: string; email: string }[];
  deposits: { id: string; depositRef: string; amount: string; asset: { symbol: string }; user: { email: string } }[];
  withdrawals: { id: string; withdrawalRef: string; amount: string; asset: { symbol: string }; user: { email: string } }[];
  kyc: { id: string; legalName: string; user: { email: string } }[];
  transactions: { id: string; type: string; amount: string; asset: { symbol: string }; user: { email: string } }[];
  escrow: { id: string; title: string; escrowRef: string }[];
  auditLogs: { id: string; action: string; targetType: string }[];
};

export function GlobalSearch({ scope }: { scope: "user" | "admin" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [userResults, setUserResults] = useState<UserResults | null>(null);
  const [adminResults, setAdminResults] = useState<AdminResults | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const hasQuery = query.trim().length >= 2;

  useEffect(() => {
    if (!hasQuery) return;
    const timer = setTimeout(() => {
      const path = scope === "admin" ? "/api/admin/search" : "/api/search";
      apiFetch(`${path}?q=${encodeURIComponent(query)}`).then((res) => {
        if (scope === "admin") setAdminResults(res as AdminResults);
        else setUserResults(res as UserResults);
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [hasQuery, query, scope]);

  function go(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href as never);
  }

  const hasUserResults = userResults && (userResults.coins.length || userResults.transactions.length || userResults.escrow.length || userResults.help.length);
  const hasAdminResults =
    adminResults &&
    (adminResults.users.length ||
      adminResults.deposits.length ||
      adminResults.withdrawals.length ||
      adminResults.kyc.length ||
      adminResults.transactions.length ||
      adminResults.escrow.length ||
      adminResults.auditLogs.length);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-2 rounded-lg border border-border bg-surface-2/50 px-3 py-2 text-sm text-muted hover:bg-surface-2"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Search…</span>
        <kbd className="rounded border border-border px-1.5 py-0.5 text-[10px]">⌘K</kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 pt-24" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-lg rounded-xl border border-border bg-surface shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <Search className="h-4 w-4 text-muted" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={scope === "admin" ? "Search users, deposits, withdrawals, KYC, escrow, audit logs…" : "Search coins, transactions, escrow, help…"}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
              />
              <button onClick={() => setOpen(false)} className="text-muted hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto p-2">
              {!hasQuery && <p className="px-3 py-6 text-center text-sm text-muted">Type at least 2 characters…</p>}

              {hasQuery && scope === "user" && userResults && !hasUserResults && (
                <p className="px-3 py-6 text-center text-sm text-muted">No results.</p>
              )}
              {hasQuery && scope === "user" && userResults && (
                <>
                  <ResultGroup label="Coins">
                    {userResults.coins.map((c) => (
                      <ResultRow key={c.symbol} onClick={() => go(`/market/${c.symbol.toLowerCase()}`)}>
                        {c.symbol} — {c.name}
                      </ResultRow>
                    ))}
                  </ResultGroup>
                  <ResultGroup label="Transactions">
                    {userResults.transactions.map((t) => (
                      <ResultRow key={t.id} onClick={() => go("/wallet/transactions")}>
                        {t.type.replaceAll("_", " ")} · {t.amount} {t.asset.symbol}
                      </ResultRow>
                    ))}
                  </ResultGroup>
                  <ResultGroup label="Escrow">
                    {userResults.escrow.map((e) => (
                      <ResultRow key={e.id} onClick={() => go(`/wallet/escrow/${e.id}`)}>
                        {e.title} ({e.escrowRef})
                      </ResultRow>
                    ))}
                  </ResultGroup>
                  <ResultGroup label="Help">
                    {userResults.help.map((h) => (
                      <ResultRow key={h.question} onClick={() => go("/faq")}>
                        {h.question}
                      </ResultRow>
                    ))}
                  </ResultGroup>
                </>
              )}

              {hasQuery && scope === "admin" && adminResults && !hasAdminResults && (
                <p className="px-3 py-6 text-center text-sm text-muted">No results.</p>
              )}
              {hasQuery && scope === "admin" && adminResults && (
                <>
                  <ResultGroup label="Users">
                    {adminResults.users.map((u) => (
                      <ResultRow key={u.id} onClick={() => go(`/admin/users/${u.id}`)}>
                        {u.fullName} — {u.email}
                      </ResultRow>
                    ))}
                  </ResultGroup>
                  <ResultGroup label="Deposits">
                    {adminResults.deposits.map((d) => (
                      <ResultRow key={d.id} onClick={() => go(`/admin/deposits/${d.id}`)}>
                        {d.depositRef} · {formatUsd(d.amount)} {d.asset.symbol} · {d.user.email}
                      </ResultRow>
                    ))}
                  </ResultGroup>
                  <ResultGroup label="Withdrawals">
                    {adminResults.withdrawals.map((w) => (
                      <ResultRow key={w.id} onClick={() => go("/admin/withdrawals")}>
                        {w.withdrawalRef} · {w.amount} {w.asset.symbol} · {w.user.email}
                      </ResultRow>
                    ))}
                  </ResultGroup>
                  <ResultGroup label="KYC">
                    {adminResults.kyc.map((k) => (
                      <ResultRow key={k.id} onClick={() => go("/admin/kyc")}>
                        {k.legalName} — {k.user.email}
                      </ResultRow>
                    ))}
                  </ResultGroup>
                  <ResultGroup label="Transactions">
                    {adminResults.transactions.map((t) => (
                      <ResultRow key={t.id} onClick={() => go("/admin/ledger")}>
                        {t.type.replaceAll("_", " ")} · {t.amount} {t.asset.symbol} · {t.user.email}
                      </ResultRow>
                    ))}
                  </ResultGroup>
                  <ResultGroup label="Escrow">
                    {adminResults.escrow.map((e) => (
                      <ResultRow key={e.id} onClick={() => go("/admin/escrow")}>
                        {e.title} ({e.escrowRef})
                      </ResultRow>
                    ))}
                  </ResultGroup>
                  <ResultGroup label="Audit logs">
                    {adminResults.auditLogs.map((a) => (
                      <ResultRow key={a.id} onClick={() => go("/admin/audit-logs")}>
                        {a.action.replaceAll("_", " ")} — {a.targetType}
                      </ResultRow>
                    ))}
                  </ResultGroup>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ResultGroup({ label, children }: { label: string; children: React.ReactNode }) {
  const hasAny = Array.isArray(children) ? children.length > 0 : Boolean(children);
  if (!hasAny) return null;
  return (
    <div className="mb-2">
      <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      {children}
    </div>
  );
}

function ResultRow({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-surface-2">
      {children}
    </button>
  );
}
