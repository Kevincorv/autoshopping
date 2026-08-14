"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { ArrowDownCircle, ArrowUpCircle, Search, Package, Save, X } from "lucide-react";
import { useUI } from "@/lib/store";
import { formatPYG } from "@/lib/utils";

interface MoveRow {
  id: string; type: string; quantity: number; reason?: string | null; reference?: string | null;
  unit?: string | null; unitCost?: number | null; stockBefore?: number | null; stockAfter?: number | null;
  notes?: string | null; createdAt: string;
  product?: { id: string; name: string; unit: string } | null;
}
interface ProductRow { id: string; name: string; unit: string; stock: number; }

let seq = 0;

export default function StockMovementsPage() {
  const ui = useUI();
  const [movements, setMovements] = useState<MoveRow[]>([]);
  const [stats, setStats] = useState({ total: 0, entries: 0, entriesQty: 0, exits: 0, exitsQty: 0 });
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: "ENTRADA", reason: "ajuste", quantity: "", notes: "", productId: "" });
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<ProductRow[]>([]);
  const searchTimer = useRef<any>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (typeFilter) params.set("type", typeFilter);
      const r = await fetch(`/api/stock-movements?${params}`);
      const d = await r.json();
      setMovements(d.movements || []);
      setStats(d.stats || { total: 0, entries: 0, entriesQty: 0, exits: 0, exitsQty: 0 });
    } catch { /* noop */ }
    finally { setLoading(false); }
  }, [q, typeFilter]);

  useEffect(() => { load(); }, [load]);

  const searchProducts = async (t: string) => {
    if (t.length < 2) { setResults([]); return; }
    const r = await fetch(`/api/products/prices?q=${encodeURIComponent(t)}&limit=20`);
    const d = await r.json();
    setResults(d.products || []);
  };

  const save = async () => {
    if (!form.productId) { ui.showToast("Seleccioná un producto", "error"); return; }
    const quantity = Number(form.quantity);
    if (!quantity || quantity <= 0) { ui.showToast("Cantidad inválida", "error"); return; }
    setSaving(true);
    try {
      const r = await fetch("/api/stock-movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: form.productId, type: form.type, quantity, reason: form.reason, notes: form.notes || undefined }),
      });
      const d = await r.json();
      if (!r.ok) { ui.showToast(d.error || "Error", "error"); return; }
      ui.showToast("Movimiento registrado", "success");
      setForm({ type: "ENTRADA", reason: "ajuste", quantity: "", notes: "", productId: "" });
      setTerm("");
      setShowForm(false);
      load();
    } finally { setSaving(false); }
  };

  const REASONS = ["ajuste", "merma", "robo/extravió", "transpaso", "reposición", "otro"];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Movimientos de stock</h1>
          <p className="text-sm text-neutral-500 mt-1">Historial de entradas y salidas con auditoría</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary text-sm py-2 flex items-center gap-2">
          {showForm ? <X className="w-4 h-4" /> : <Package className="w-4 h-4" />} {showForm ? "Cancelar" : "Ajustar stock"}
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Movimientos", value: stats.total, icon: <Package className="w-5 h-5 text-brand-400" />, bg: "bg-brand-500/15" },
          { label: "Entradas", value: `${stats.entriesQty} uni`, icon: <ArrowDownCircle className="w-5 h-5 text-emerald-400" />, bg: "bg-emerald-500/15" },
          { label: "Salidas", value: `${stats.exitsQty} uni`, icon: <ArrowUpCircle className="w-5 h-5 text-rose-400" />, bg: "bg-rose-500/15" },
          { label: "Eventos", value: `${stats.entries + stats.exits}`, icon: <Search className="w-5 h-5 text-sky-400" />, bg: "bg-sky-500/15" },
        ].map((c) => (
          <div key={c.label} className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${c.bg}`}>{c.icon}</div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wide text-neutral-500">{c.label}</p>
                <p className="font-bold truncate">{c.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-xl p-5 mb-6">
          <h2 className="font-semibold mb-4">Registrar ajuste manual</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Producto *</label>
              <div className="relative">
                <input className="input py-2 text-sm" placeholder="Buscar..." value={term}
                  onChange={(e) => { setTerm(e.target.value); clearTimeout(searchTimer.current); searchTimer.current = setTimeout(() => searchProducts(e.target.value), 250); }} />
                {results.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full max-h-52 overflow-auto rounded-lg border border-neutral-700 bg-neutral-900 shadow-xl">
                    {results.map((p) => (
                      <button key={p.id} onClick={() => { setForm({ ...form, productId: p.id }); setTerm(`${p.name} (stock: ${p.stock} ${p.unit})`); setResults([]); }}
                        className="w-full text-left px-3 py-2 hover:bg-neutral-800 text-sm">
                        <span className="truncate">{p.name}</span>
                        <span className="text-neutral-500 text-xs ml-2">stock {p.stock} {p.unit}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Tipo *</label>
              <select className="input py-2 text-sm" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="ENTRADA">Entrada</option>
                <option value="SALIDA">Salida</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Cantidad *</label>
              <input type="number" min={0} step="any" className="input py-2 text-sm" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Motivo *</label>
              <select className="input py-2 text-sm" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}>
                {REASONS.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Nota</label>
              <input className="input py-2 text-sm" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button onClick={save} disabled={saving} className="btn-primary text-sm px-5 py-2 flex items-center gap-2"><Save className="w-4 h-4" /> {saving ? "Guardando..." : "Registrar"}</button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-neutral-800 overflow-hidden">
        <div className="flex flex-wrap gap-2 p-3 border-b border-neutral-800 bg-neutral-900/40">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input className="input py-2 text-sm pl-9 w-72" placeholder="Buscar por producto..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select className="input py-2 text-sm" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">Todos los tipos</option>
            <option value="ENTRADA">Entrada</option>
            <option value="SALIDA">Salida</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800 bg-neutral-900/50">
                <th className="text-left px-4 py-3 text-neutral-400 font-medium">Tipo</th>
                <th className="text-left px-4 py-3 text-neutral-400 font-medium">Producto</th>
                <th className="text-right px-4 py-3 text-neutral-400 font-medium">Cantidad</th>
                <th className="text-left px-4 py-3 text-neutral-400 font-medium">Motivo</th>
                <th className="text-right px-4 py-3 text-neutral-400 font-medium">Antes → Después</th>
                <th className="text-left px-4 py-3 text-neutral-400 font-medium">Referencia</th>
                <th className="text-left px-4 py-3 text-neutral-400 font-medium">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <tr key={i} className="border-b border-neutral-800/50">{Array.from({ length: 7 }).map((__, j) => <td key={j} className="px-4 py-4"><div className="h-4 bg-neutral-800 rounded animate-pulse" /></td>)}</tr>)
              ) : movements.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-neutral-500">Sin movimientos registrados</td></tr>
              ) : movements.map((m) => (
                <tr key={m.id} className="border-b border-neutral-800/50">
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${m.type === "ENTRADA" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
                      {m.type === "ENTRADA" ? <ArrowDownCircle className="w-3 h-3" /> : <ArrowUpCircle className="w-3 h-3" />} {m.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{m.product?.name || "—"}</p>
                    {m.notes && <p className="text-[10px] text-neutral-500">{m.notes}</p>}
                  </td>
                  <td className="px-4 py-3 text-right font-bold">{m.quantity} {m.unit || ""}</td>
                  <td className="px-4 py-3 text-xs text-neutral-400">{m.reason}</td>
                  <td className="px-4 py-3 text-right text-xs text-neutral-400">
                    {m.stockBefore != null ? <>{m.stockBefore} → <span className="font-bold text-white">{m.stockAfter}</span></> : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-neutral-500">{m.reference || "—"}</td>
                  <td className="px-4 py-3 text-xs text-neutral-400">{new Date(m.createdAt).toLocaleString("es-PY")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}