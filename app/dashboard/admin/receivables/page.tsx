"use client";

import { useEffect, useState } from "react";
import { Receipt, Wallet, Search, ArrowDownCircle, ArrowUpCircle, X } from "lucide-react";
import { useUI } from "@/lib/store";
import { formatPYG } from "@/lib/utils";

interface CustomerRow {
  id: string; name: string; lastname: string; phone: string; balance: number;
  _count?: { orders: number };
}
interface PayRow { id: string; type: string; amount: number; method?: string | null; reference?: string | null; notes?: string | null; createdAt: string; }

export default function ReceivablesPage() {
  const ui = useUI();
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CustomerRow | null>(null);
  const [history, setHistory] = useState<PayRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("efectivo");
  const [payNotes, setPayNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      const r = await fetch(`/api/customers?${params}`);
      const d = await r.json();
      setCustomers((d.customers || []).sort((a: CustomerRow, b: CustomerRow) => b.balance - a.balance));
    } catch { /* noop */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [q]);

  const debtors = customers.filter((c) => c.balance > 0);
  const totalDebt = debtors.reduce((s, c) => s + c.balance, 0);

  const openDetail = async (c: CustomerRow) => {
    setSelected(c);
    setHistoryLoading(true);
    setHistory([]);
    try {
      const r = await fetch(`/api/customers/${c.id}`);
      const d = await r.json();
      setHistory(d.customer?.receivablePayments || []);
      load();
    } catch { /* noop */ }
    finally { setHistoryLoading(false); }
  };

  const registerPayment = async () => {
    if (!selected) return;
    const amount = Number(payAmount);
    if (!amount || amount <= 0) { ui.showToast("Monto inválido", "error"); return; }
    if (amount > selected.balance + 0.01) { ui.showToast(`El cliente debe ${formatPYG(selected.balance)}`, "error"); return; }
    setBusy(true);
    try {
      const r = await fetch(`/api/customers/${selected.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "pago", amount, method: payMethod, notes: payNotes.trim() || undefined }),
      });
      const d = await r.json();
      if (!r.ok) { ui.showToast(d.error || "Error", "error"); return; }
      ui.showToast("Pago registrado", "success");
      setPayAmount("");
      setPayNotes("");
      openDetail(selected);
    } finally { setBusy(false); }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Cuentas por cobrar</h1>
          <p className="text-sm text-neutral-500 mt-1">Créditos otorgados y cobranzas</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center"><Receipt className="w-5 h-5 text-amber-400" /></div>
            <div><p className="text-xs text-neutral-500">Clientes con deuda</p><p className="text-2xl font-bold">{debtors.length}</p></div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 flex items-center justify-center"><Wallet className="w-5 h-5 text-rose-400" /></div>
            <div><p className="text-xs text-neutral-500">Total por cobrar</p><p className="text-2xl font-bold">{formatPYG(totalDebt)}</p></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`rounded-xl border border-neutral-800 overflow-hidden ${selected ? "" : "lg:col-span-3"}`}>
          <div className="p-3 border-b border-neutral-800 bg-neutral-900/40 relative">
            <Search className="w-4 h-4 absolute left-6 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input className="input py-2 text-sm pl-9 w-72" placeholder="Buscar cliente..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-800 bg-neutral-900/50">
                  <th className="text-left px-4 py-3 text-neutral-400 font-medium">Cliente</th>
                  <th className="text-right px-4 py-3 text-neutral-400 font-medium">Teléfono</th>
                  <th className="text-right px-4 py-3 text-neutral-400 font-medium">Deuda</th>
                  <th className="text-center px-4 py-3 text-neutral-400 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => <tr key={i} className="border-b border-neutral-800/50">{Array.from({ length: 4 }).map((__, j) => <td key={j} className="px-4 py-4"><div className="h-4 bg-neutral-800 rounded animate-pulse" /></td>)}</tr>)
                ) : debtors.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-12 text-center text-neutral-500">¡Todo al día! No hay cuentas por cobrar.</td></tr>
                ) : debtors.map((c) => (
                  <tr key={c.id} className={`border-b border-neutral-800/50 hover:bg-neutral-800/30 cursor-pointer transition-colors ${selected?.id === c.id ? "bg-brand-500/5" : ""}`} onClick={() => openDetail(c)}>
                    <td className="px-4 py-3">
                      <p className="font-medium">{c.name} {c.lastname}</p>
                      <p className="text-[10px] text-neutral-500">{c._count?.orders || 0} compras</p>
                    </td>
                    <td className="px-4 py-3 text-right text-neutral-400">{c.phone || "—"}</td>
                    <td className="px-4 py-3 text-right font-bold text-rose-400">{formatPYG(c.balance)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${c.balance > 0 ? "bg-rose-500/10 text-rose-400" : "bg-emerald-500/10 text-emerald-400"}`}>
                        {c.balance > 0 ? "Debe" : "Al día"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {selected && (
          <div className="rounded-xl border border-neutral-800 bg-gradient-to-b from-neutral-900 to-neutral-950 overflow-hidden lg:col-span-2">
            <div className="p-5 border-b border-neutral-800 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-bold text-lg">{selected.name} {selected.lastname}</h2>
                <p className="text-xs text-neutral-500 mt-0.5">{selected.phone || "Sin teléfono"}</p>
                <p className="text-2xl font-bold text-rose-400 mt-2">{formatPYG(selected.balance)} <span className="text-xs text-neutral-500 font-normal">de deuda</span></p>
              </div>
              <button onClick={() => setSelected(null)} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
            </div>

            <div className="p-5 border-b border-neutral-800">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><ArrowDownCircle className="w-4 h-4 text-emerald-400" /> Registrar cobro</h3>
              <div className="flex flex-wrap gap-2">
                <input type="number" min={0} className="input py-2 text-sm w-40" placeholder={`Monto (máx ${selected.balance.toLocaleString("es-PY")})`} value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
                <select className="input py-2 text-sm" value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                  {["efectivo", "tarjeta", "transferencia"].map((m) => <option key={m}>{m}</option>)}
                </select>
                <input className="input py-2 text-sm flex-1 min-w-[160px]" placeholder="Nota (opcional)" value={payNotes} onChange={(e) => setPayNotes(e.target.value)} />
                <button onClick={registerPayment} disabled={busy} className="btn-primary text-sm px-4 py-2 bg-emerald-600 flex items-center gap-1.5"><Wallet className="w-4 h-4" /> {busy ? "..." : "Cobrar"}</button>
              </div>
            </div>

            <div className="p-5">
              <h3 className="text-sm font-semibold mb-3">Historial de movimientos</h3>
              {historyLoading ? (
                <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-10 bg-neutral-800/60 rounded-lg animate-pulse" />)}</div>
              ) : history.length === 0 ? (
                <div className="border border-neutral-800 rounded-lg p-6 text-center text-sm text-neutral-500">Sin movimientos registrados</div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-auto">
                  {history.map((p) => (
                    <div key={p.id} className="flex items-center gap-3 border border-neutral-800 rounded-lg px-3 py-2.5 text-sm">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${p.type === "pago" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
                        {p.type === "pago" ? <ArrowDownCircle className="w-4 h-4" /> : <ArrowUpCircle className="w-4 h-4" />}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium capitalize">{p.type === "pago" ? "Pago" : "Cargo"} {p.reference ? `· ${p.reference}` : ""}</p>
                        <p className="text-[10px] text-neutral-500">{p.method || ""}{p.notes ? ` · ${p.notes}` : ""} · {new Date(p.createdAt).toLocaleString("es-PY")}</p>
                      </div>
                      <span className={`font-bold shrink-0 ${p.type === "pago" ? "text-emerald-400" : "text-rose-400"}`}>
                        {p.type === "pago" ? "-" : "+"}{formatPYG(p.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}