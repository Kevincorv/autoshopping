"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Plus, X, Save, Search, Trash2, ArrowLeftRight, RotateCcw } from "lucide-react";
import { useUI } from "@/lib/store";
import { formatPYG } from "@/lib/utils";

interface ReturnRow { id: string; returnNumber: string; customerName?: string | null; reason?: string | null; status: string; refundAmount: number; createdAt: string; order?: { orderNumber: string } | null; items?: { id: string; productName: string; quantity: number; unitPrice: number; condition?: string }[]; }
interface DraftItem { key: string; productId?: string; productName: string; quantity: number; unitPrice: number; condition: string; }
interface SearchResult { id: string; name: string; unit: string; price?: number | null; salePrice?: number | null; }

let seq = 0;

export default function ReturnsPage() {
  const ui = useUI();
  const [returns, setReturns] = useState<ReturnRow[]>([]);
  const [stats, setStats] = useState({ count: 0, refunded: 0 });
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [tab, setTab] = useState<"list" | "create" | "detail">("list");
  const [selected, setSelected] = useState<ReturnRow | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [form, setForm] = useState({ orderId: "", customerId: "", customerName: "", reason: "" });
  const [items, setItems] = useState<DraftItem[]>([]);
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [orderTerm, setOrderTerm] = useState("");
  const [orderResults, setOrderResults] = useState<{ id: string; orderNumber: string; customerName: string }[]>([]);
  const searchTimer = useRef<any>(null);
  const orderTimer = useRef<any>(null);
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState<{ id: string; name: string; lastname: string }[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (statusFilter) params.set("status", statusFilter);
      const r = await fetch(`/api/returns?${params}`);
      const data = await r.json();
      setReturns(data.returns || []);
      setStats(data.stats || { count: 0, refunded: 0 });
    } catch { /* noop */ }
    finally { setLoading(false); }
  }, [q, statusFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    fetch("/api/customers").then((r) => r.json()).then((d) => setCustomers(d.customers || [])).catch(() => {});
  }, []);

  const searchOrders = async (t: string) => {
    if (t.length < 2) { setOrderResults([]); return; }
    const r = await fetch(`/api/sales?q=${encodeURIComponent(t)}&limit=10`);
    const d = await r.json();
    setOrderResults(d.sales || []);
  };

  const pickOrder = async (sale: any) => {
    setForm({ ...form, orderId: sale.id, customerName: sale.customerName || "", reason: form.reason });
    setOrderTerm(`${sale.orderNumber} — ${sale.customerName}`);
    setOrderResults([]);
    const r = await fetch(`/api/sales/${sale.id}`);
    const d = await r.json();
    if (d.sale?.items) {
      setItems(d.sale.items.map((i: any) => ({ key: `k${seq++}`, productId: i.productId, productName: i.productName, quantity: i.quantity, unitPrice: i.unitPrice, condition: "bueno" })));
      ui.showToast("Ítems de la venta cargados", "success");
    }
  };

  const searchProducts = async (t: string) => {
    if (t.length < 2) { setResults([]); return; }
    const r = await fetch(`/api/products/prices?q=${encodeURIComponent(t)}&limit=20`);
    const d = await r.json();
    setResults(d.products || []);
  };

  const addItem = (p?: SearchResult) => {
    setItems([...items, { key: `k${seq++}`, productId: p?.id, productName: p?.name || term.trim(), quantity: 1, unitPrice: (p?.salePrice && p.salePrice > 0 ? p.salePrice : p?.price) || 0, condition: "bueno" }]);
    setTerm("");
    setResults([]);
  };

  const refund = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

  const save = async () => {
    if (!form.reason.trim()) { ui.showToast("El motivo es obligatorio", "error"); return; }
    if (items.length === 0) { ui.showToast("Agregá al menos un ítem", "error"); return; }
    setSaving(true);
    try {
      const body: any = {
        orderId: form.orderId || undefined,
        customerId: form.customerId || undefined,
        customerName: form.customerId ? undefined : form.customerName.trim() || undefined,
        reason: form.reason.trim(),
        items: items.map((i) => ({ productId: i.productId || undefined, productName: i.productName, quantity: i.quantity, unitPrice: i.unitPrice, condition: i.condition })),
      };
      const r = await fetch("/api/returns", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await r.json();
      if (!r.ok) { ui.showToast(data.error || "Error", "error"); return; }
      ui.showToast("Devolución registrada", "success");
      setTab("list");
      setItems([]);
      setForm({ orderId: "", customerId: "", customerName: "", reason: "" });
      setOrderTerm("");
      load();
    } catch { ui.showToast("Error de conexión", "error"); }
    finally { setSaving(false); }
  };

  const openDetail = async (r: ReturnRow) => {
    setSelected(r);
    setTab("detail");
    try {
      const res = await fetch(`/api/returns/${r.id}`);
      const d = await res.json();
      setDetail(d.ret);
      load();
    } catch { /* noop */ }
  };

  const doAction = async (action: string) => {
    if (!selected) return;
    const r = await fetch(`/api/returns/${selected.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    const d = await r.json();
    if (!r.ok) { ui.showToast(d.error || "Error", "error"); return; }
    ui.showToast("Operación exitosa", "success");
    openDetail(selected);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Devoluciones</h1>
          <p className="text-sm text-neutral-500 mt-1">Devoluciones de clientes y reposición de stock</p>
        </div>
        <button onClick={() => setTab("create")} className="btn-primary flex items-center gap-2 text-sm"><Plus className="w-4 h-4" /> Nueva Devolución</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/15 flex items-center justify-center"><ArrowLeftRight className="w-5 h-5 text-brand-400" /></div>
            <div><p className="text-xs text-neutral-500">Devoluciones</p><p className="text-2xl font-bold">{stats.count}</p></div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/15 flex items-center justify-center"><RotateCcw className="w-5 h-5 text-sky-400" /></div>
            <div><p className="text-xs text-neutral-500">Monto devuelto</p><p className="text-2xl font-bold">{formatPYG(stats.refunded)}</p></div>
          </div>
        </div>
      </div>

      {tab === "create" && (
        <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-xl p-5 mb-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2"><ArrowLeftRight className="w-4 h-4 text-brand-400" /> Registrar devolución</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Desde venta (opcional)</label>
              <div className="relative">
                <input className="input py-2 text-sm" placeholder="Buscar venta por N° o cliente..." value={orderTerm}
                  onChange={(e) => { setOrderTerm(e.target.value); clearTimeout(orderTimer.current); orderTimer.current = setTimeout(() => searchOrders(e.target.value), 300); }} />
                {orderResults.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full max-h-52 overflow-auto rounded-lg border border-neutral-700 bg-neutral-900 shadow-xl">
                    {orderResults.map((s) => (
                      <button key={s.id} onClick={() => pickOrder(s)} className="w-full text-left px-3 py-2 hover:bg-neutral-800 text-sm">
                        <span className="font-medium text-brand-400">{s.orderNumber}</span> — {s.customerName}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Cliente (opcional)</label>
              <select className="input py-2 text-sm" value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}>
                <option value="">Sin cliente...</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name} {c.lastname}</option>)}
              </select>
              {!form.customerId && (
                <input className="input py-2 text-sm mt-2" placeholder="...o nombre" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
              )}
            </div>
            <div className="lg:col-span-2">
              <label className="block text-xs text-neutral-400 mb-1">Motivo *</label>
              <select className="input py-2 text-sm" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })}>
                <option value="">Seleccionar motivo...</option>
                <option>Producto incorrecto</option>
                <option>Producto dañado / fallado</option>
                <option>No le sirve al cliente</option>
                <option>Falta de repuesto</option>
                <option>Otro</option>
              </select>
            </div>
          </div>

          <div className="border border-neutral-800 rounded-xl overflow-hidden mb-4">
            <div className="px-4 py-3 bg-neutral-900/60 border-b border-neutral-800 flex flex-wrap gap-2 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input className="input py-2 text-sm pl-9" placeholder="Agregar producto a devolver..."
                  value={term} onChange={(e) => { setTerm(e.target.value); clearTimeout(searchTimer.current); searchTimer.current = setTimeout(() => searchProducts(e.target.value), 250); }}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addItem(); } }} />
                {results.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full max-h-52 overflow-auto rounded-lg border border-neutral-700 bg-neutral-900 shadow-xl">
                    {results.map((p) => (
                      <button key={p.id} onClick={() => addItem(p)} className="w-full text-left px-3 py-2 hover:bg-neutral-800 text-sm">
                        {p.name} · {p.salePrice ? formatPYG(p.salePrice) : "sin precio"}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {items.length === 0 ? (
              <div className="p-10 text-center text-sm text-neutral-500">Sin ítems. Cargá una venta o agregá productos manualmente.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-800 bg-neutral-900/50">
                      <th className="text-left px-4 py-2.5 text-neutral-400 font-medium">Producto</th>
                      <th className="w-20 text-center px-2 py-2.5 text-neutral-400 font-medium">Cant.</th>
                      <th className="w-32 text-right px-2 py-2.5 text-neutral-400 font-medium">Precio dev.</th>
                      <th className="w-28 text-center px-2 py-2.5 text-neutral-400 font-medium">Estado</th>
                      <th className="w-32 text-right px-4 py-2.5 text-neutral-400 font-medium">Reembolso</th>
                      <th className="w-10 px-2 py-2.5"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it) => (
                      <tr key={it.key} className="border-b border-neutral-800/50">
                        <td className="px-4 py-2.5">
                          {it.productId ? <p className="font-medium">{it.productName}</p> : <input className="input py-1.5 text-sm w-full max-w-xs" value={it.productName} onChange={(e) => setItems(items.map((x) => x.key === it.key ? { ...x, productName: e.target.value } : x))} />}
                        </td>
                        <td className="px-2 py-2.5 text-center">
                          <input type="number" min={0.01} step="any" className="input py-1.5 text-sm w-20 text-center" value={it.quantity || ""}
                            onChange={(e) => { const v = Number(e.target.value); if (!isNaN(v) && v >= 0) setItems(items.map((x) => x.key === it.key ? { ...x, quantity: v } : x)); }} />
                        </td>
                        <td className="px-2 py-2.5">
                          <input type="number" min={0} step="any" className="input py-1.5 text-sm w-28 text-right" value={it.unitPrice || ""}
                            onChange={(e) => { const v = Number(e.target.value); if (!isNaN(v) && v >= 0) setItems(items.map((x) => x.key === it.key ? { ...x, unitPrice: v } : x)); }} />
                        </td>
                        <td className="px-2 py-2.5 text-center">
                          <select className="input py-1.5 text-xs" value={it.condition} onChange={(e) => setItems(items.map((x) => x.key === it.key ? { ...x, condition: e.target.value } : x))}>
                            <option value="bueno">Buen estado</option>
                            <option value="dañado">Dañado</option>
                          </select>
                        </td>
                        <td className="px-4 py-2.5 text-right font-medium">{formatPYG(it.quantity * it.unitPrice)}</td>
                        <td className="px-2 py-2.5 text-center">
                          <button onClick={() => setItems(items.filter((x) => x.key !== it.key))} className="text-neutral-600 hover:text-rose-400"><Trash2 className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr><td colSpan={4} className="px-4 py-2 font-semibold">TOTAL REEMBOLSO</td><td className="px-4 py-2 text-right font-bold text-brand-400">{formatPYG(refund)}</td><td></td></tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <button onClick={() => { setTab("list"); setItems([]); }} className="btn-ghost text-sm py-2">Cancelar</button>
            <button onClick={save} disabled={saving} className="btn-primary text-sm px-5 py-2 flex items-center gap-2"><Save className="w-4 h-4" /> {saving ? "Guardando..." : `Registrar Devolución`}</button>
          </div>
        </div>
      )}

      {tab === "detail" && selected && detail && (
        <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-xl p-5 mb-6">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold">{selected.returnNumber}</h2>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${detail.status === "completed" ? "bg-emerald-500/10 text-emerald-400" : detail.status === "cancelled" ? "bg-rose-500/10 text-rose-400" : "bg-amber-500/10 text-amber-400"}`}>{detail.status}</span>
              </div>
              <p className="text-xs text-neutral-500 mt-1">{new Date(detail.createdAt).toLocaleString("es-PY")} · {detail.customerName || "Cliente sin registrar"}{detail.order ? ` · ${detail.order.orderNumber}` : ""}</p>
              <p className="text-xs text-neutral-400 mt-2">Motivo: {detail.reason}</p>
              <div className="flex gap-5 mt-3">
                <div><p className="text-xs text-neutral-500">Reembolso</p><p className="font-bold text-sky-400">{formatPYG(detail.refundAmount)}</p></div>
              </div>
            </div>
            <div className="flex gap-2">
              {detail.status === "pending" && (
                <>
                  <button onClick={() => doAction("complete")} className="btn-primary text-xs py-2 bg-emerald-600">Completar</button>
                  <button onClick={() => { if (confirm("¿Anular la devolución? Se sacará el stock reingresado.")) doAction("cancel"); }} className="btn-ghost text-xs py-2 border border-rose-500/30 text-rose-400">Anular</button>
                </>
              )}
              <button onClick={() => { setTab("list"); setSelected(null); }} className="btn-ghost text-xs py-2"><X className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="overflow-x-auto border border-neutral-800 rounded-xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-800 bg-neutral-900/50">
                  <th className="text-left px-4 py-2.5 text-neutral-400 font-medium">Producto</th>
                  <th className="text-center px-2 py-2.5 text-neutral-400 font-medium">Cant.</th>
                  <th className="text-right px-2 py-2.5 text-neutral-400 font-medium">Precio</th>
                  <th className="text-center px-2 py-2.5 text-neutral-400 font-medium">Estado</th>
                  <th className="text-right px-4 py-2.5 text-neutral-400 font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {detail.items.map((it: any) => (
                  <tr key={it.id} className="border-b border-neutral-800/50">
                    <td className="px-4 py-2.5">{it.productName}</td>
                    <td className="px-2 py-2.5 text-center">{it.quantity}</td>
                    <td className="px-2 py-2.5 text-right">{formatPYG(it.unitPrice)}</td>
                    <td className="px-2 py-2.5 text-center"><span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${it.condition === "dañado" ? "bg-rose-500/10 text-rose-400" : "bg-emerald-500/10 text-emerald-400"}`}>{it.condition}</span></td>
                    <td className="px-4 py-2.5 text-right font-medium">{formatPYG(it.quantity * it.unitPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-neutral-800 overflow-hidden">
        <div className="flex flex-wrap gap-2 p-3 border-b border-neutral-800 bg-neutral-900/40">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input className="input py-2 text-sm pl-9 w-72" placeholder="Buscar devolución..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select className="input py-2 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Todos los estados</option>
            <option value="pending">Pendiente</option>
            <option value="completed">Completada</option>
            <option value="cancelled">Anulada</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800 bg-neutral-900/50">
                <th className="text-left px-4 py-3 text-neutral-400 font-medium">N°</th>
                <th className="text-left px-4 py-3 text-neutral-400 font-medium">Cliente</th>
                <th className="text-left px-4 py-3 text-neutral-400 font-medium">Venta</th>
                <th className="text-left px-4 py-3 text-neutral-400 font-medium">Motivo</th>
                <th className="text-right px-4 py-3 text-neutral-400 font-medium">Reembolso</th>
                <th className="text-center px-4 py-3 text-neutral-400 font-medium">Estado</th>
                <th className="text-left px-4 py-3 text-neutral-400 font-medium">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <tr key={i} className="border-b border-neutral-800/50">{Array.from({ length: 7 }).map((__, j) => <td key={j} className="px-4 py-4"><div className="h-4 bg-neutral-800 rounded animate-pulse" /></td>)}</tr>)
              ) : returns.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-neutral-500">Sin devoluciones registradas</td></tr>
              ) : returns.map((r) => (
                <tr key={r.id} className={`border-b border-neutral-800/50 hover:bg-neutral-800/30 cursor-pointer transition-colors ${selected?.id === r.id ? "bg-brand-500/5" : ""}`} onClick={() => openDetail(r)}>
                  <td className="px-4 py-3 font-bold text-brand-400">{r.returnNumber}</td>
                  <td className="px-4 py-3">{r.customerName || "—"}</td>
                  <td className="px-4 py-3 text-neutral-400 text-xs">{r.order?.orderNumber || "—"}</td>
                  <td className="px-4 py-3 text-neutral-400 text-xs">{r.reason}</td>
                  <td className="px-4 py-3 text-right font-medium text-sky-400">{formatPYG(r.refundAmount)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${r.status === "completed" ? "bg-emerald-500/10 text-emerald-400" : r.status === "cancelled" ? "bg-rose-500/10 text-rose-400" : "bg-amber-500/10 text-amber-400"}`}>{r.status}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-neutral-400">{new Date(r.createdAt).toLocaleDateString("es-PY")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}