"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Plus, X, Save, Search, Trash2, TrendingUp, Wallet, CheckCircle2, AlertTriangle, Receipt } from "lucide-react";
import { useUI } from "@/lib/store";
import { formatPYG } from "@/lib/utils";

interface ProductRow { id: string; name: string; unit: string; stock: number; salePrice?: number | null; wholesalePrice?: number | null; brand?: { name: string } | null; }
interface SaleRow {
  id: string; orderNumber: string; status: string; paymentStatus: string; paymentMethod?: string | null;
  subtotal: number; discount: number; shipping: number; total: number; amountPaid: number;
  customerName: string; customerPhone: string; createdAt: string; customer?: { id: string; name: string } | null;
  items?: { id: string; productName: string; quantity: number; unitPrice: number }[];
}
interface DraftItem { key: string; productId: string; productName: string; unit: string; quantity: number; unitPrice: number; maxStock: number; }

let seq = 0;

export default function SalesPage() {
  const ui = useUI();
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [stats, setStats] = useState({ count: 0, total: 0, discount: 0, paid: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"list" | "create" | "detail">("list");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<SaleRow | null>(null);
  const [detail, setDetail] = useState<any>(null);

  const [customers, setCustomers] = useState<{ id: string; name: string; lastname: string; phone: string; balance: number }[]>([]);
  const [form, setForm] = useState({ customerId: "", customerName: "", customerPhone: "", paymentMethod: "efectivo", paymentStatus: "paid", discount: 0, shipping: 0, paidAmount: 0, notes: "" });
  const [items, setItems] = useState<DraftItem[]>([]);
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<ProductRow[]>([]);
  const searchTimer = useRef<any>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      const r = await fetch(`/api/sales?${params}`);
      const data = await r.json();
      setSales(data.sales || []);
      setStats(data.stats || { count: 0, total: 0, discount: 0, paid: 0, pending: 0 });
    } catch { /* noop */ }
    finally { setLoading(false); }
  }, [q]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadCustomers(); }, []);

  const loadCustomers = async () => {
    try {
      const r = await fetch("/api/customers");
      const data = await r.json();
      setCustomers(data.customers || []);
    } catch { /* noop */ }
  };

  const searchProducts = async (t: string) => {
    if (t.length < 2) { setResults([]); return; }
    try {
      const r = await fetch(`/api/products/prices?q=${encodeURIComponent(t)}&limit=20`);
      const data = await r.json();
      setResults(data.products || []);
    } catch { /* noop */ }
  };

  const addItem = (p: ProductRow) => {
    const price = p.salePrice && p.salePrice > 0 ? p.salePrice : 0;
    const existing = items.find((i) => i.productId === p.id);
    if (existing) {
      setItems(items.map((i) => i.key === existing.key ? { ...i, quantity: Math.min(i.quantity + 1, i.maxStock) } : i));
    } else {
      setItems([...items, { key: `k${seq++}`, productId: p.id, productName: p.name, unit: p.unit, quantity: 1, unitPrice: price, maxStock: p.stock }]);
    }
    setTerm("");
    setResults([]);
  };

  const addManual = () => {
    setItems([...items, { key: `k${seq++}`, productId: "", productName: term.trim(), unit: "pieza", quantity: 1, unitPrice: 0, maxStock: 0 }]);
    setTerm("");
    setResults([]);
  };

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const discount = Math.min(Number(form.discount || 0), subtotal);
  const total = Math.round((subtotal - discount + Number(form.shipping || 0)) * 100) / 100;

  const save = async () => {
    if (items.length === 0) { ui.showToast("Agregá al menos un producto", "error"); return; }
    if (items.some((i) => !i.productId && !i.productName.trim())) { ui.showToast("Revisá los ítems", "error"); return; }
    if (form.paymentStatus !== "pending" && !form.customerId && !form.customerName.trim()) {
      ui.showToast("Para cobrar, cargá el cliente (o selecciona pagado sin cliente)", "error"); return;
    }
    setSaving(true);
    try {
      const customer = customers.find((c) => c.id === form.customerId);
      const body: any = {
        customerId: form.customerId || undefined,
        customerName: form.customerId ? undefined : form.customerName.trim() || undefined,
        customerPhone: form.customerId ? undefined : form.customerPhone.trim() || undefined,
        paymentMethod: form.paymentMethod || undefined,
        paymentStatus: form.paymentStatus,
        paidAmount: Number(form.paidAmount || 0),
        discount: Number(form.discount || 0),
        shipping: Number(form.shipping || 0),
        notes: form.notes || undefined,
        items: items.map((i) => ({
          productId: i.productId || undefined,
          quantity: i.quantity,
          unitPrice: i.unitPrice > 0 ? i.unitPrice : undefined,
        })),
      };
      if (form.customerId) body.customerName = `${customer?.name || ""} ${customer?.lastname || ""}`.trim();
      const r = await fetch("/api/sales", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await r.json();
      if (!r.ok) { ui.showToast(data.error || "Error al registrar venta", "error"); return; }
      ui.showToast(`Venta ${data.sale.orderNumber} registrada`, "success");
      setItems([]);
      setForm({ customerId: "", customerName: "", customerPhone: "", paymentMethod: "efectivo", paymentStatus: "paid", discount: 0, shipping: 0, paidAmount: 0, notes: "" });
      setTab("list");
      load();
      loadCustomers();
    } catch { ui.showToast("Error de conexión", "error"); }
    finally { setSaving(false); }
  };

  const openDetail = async (s: SaleRow) => {
    setSelected(s);
    setTab("detail");
    setDetail(null);
    try {
      const r = await fetch(`/api/sales/${s.id}`);
      const data = await r.json();
      setDetail(data.sale);
      load();
    } catch { /* noop */ }
  };

  const doAction = async (action: string, extra: Record<string, unknown> = {}) => {
    if (!selected) return;
    const r = await fetch(`/api/sales/${selected.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...extra }) });
    const data = await r.json();
    if (!r.ok) { ui.showToast(data.error || "Error", "error"); return; }
    ui.showToast("Operación exitosa", "success");
    openDetail(selected);
  };

  const payBadge = (s: string) => {
    const map: Record<string, string> = { paid: "bg-emerald-500/10 text-emerald-400", partial: "bg-amber-500/10 text-amber-400", pending: "bg-rose-500/10 text-rose-400" };
    return <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${map[s] || map.pending}`}>{s}</span>;
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Ventas</h1>
          <p className="text-sm text-neutral-500 mt-1">Registro de ventas, cobros y créditos</p>
        </div>
        <button onClick={() => setTab("create")} className="btn-primary flex items-center gap-2 text-sm"><Plus className="w-4 h-4" /> Nueva Venta</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Ventas", value: stats.count, icon: <TrendingUp className="w-5 h-5 text-brand-400" />, bg: "bg-brand-500/15" },
          { label: "Total vendido", value: formatPYG(stats.total), icon: <Receipt className="w-5 h-5 text-sky-400" />, bg: "bg-sky-500/15" },
          { label: "Cobrado", value: formatPYG(stats.paid), icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />, bg: "bg-emerald-500/15" },
          { label: "Por cobrar", value: formatPYG(stats.pending), icon: <AlertTriangle className="w-5 h-5 text-amber-400" />, bg: "bg-amber-500/15" },
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

      {tab === "create" && (
        <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-xl p-5 mb-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2"><Plus className="w-4 h-4 text-brand-400" /> Registrar venta</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Cliente</label>
              <select className="input py-2 text-sm" value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}>
                <option value="">Sin cliente...</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} {c.lastname}{c.balance > 0 ? ` (debe ${formatPYG(c.balance)})` : ""}</option>
                ))}
              </select>
              {!form.customerId && (
                <div className="flex gap-2 mt-2">
                  <input className="input py-2 text-sm flex-1" placeholder="Nombre cliente nuevo" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
                  <input className="input py-2 text-sm w-28" placeholder="Celular" value={form.customerPhone} onChange={(e) => setForm({ ...form, customerPhone: e.target.value })} />
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Método de pago</label>
              <select className="input py-2 text-sm" value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
                {["efectivo", "tarjeta", "transferencia", "crédito"].map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Estado de pago</label>
              <select className="input py-2 text-sm" value={form.paymentStatus} onChange={(e) => setForm({ ...form, paymentStatus: e.target.value })}>
                <option value="paid">Pagado</option>
                <option value="partial">Pago parcial</option>
                <option value="pending">A crédito</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-neutral-400 mb-1">Descuento (Gs)</label>
                <input type="number" min={0} className="input py-2 text-sm" value={form.discount || ""} onChange={(e) => setForm({ ...form, discount: Number(e.target.value) || 0 })} />
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1">Entrega (Gs)</label>
                <input type="number" min={0} className="input py-2 text-sm" value={form.shipping || ""} onChange={(e) => setForm({ ...form, shipping: Number(e.target.value) || 0 })} />
              </div>
            </div>
            {form.paymentStatus === "partial" && (
              <div>
                <label className="block text-xs text-neutral-400 mb-1">Monto inicial cobrado (Gs)</label>
                <input type="number" min={0} className="input py-2 text-sm" value={form.paidAmount || ""} onChange={(e) => setForm({ ...form, paidAmount: Number(e.target.value) || 0 })} />
              </div>
            )}
          </div>

          <div className="border border-neutral-800 rounded-xl overflow-hidden mb-4">
            <div className="px-4 py-3 bg-neutral-900/60 border-b border-neutral-800 flex flex-wrap gap-2 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input className="input py-2 text-sm pl-9" placeholder="Buscar producto por nombre o código..."
                  value={term} onChange={(e) => { setTerm(e.target.value); clearTimeout(searchTimer.current); searchTimer.current = setTimeout(() => searchProducts(e.target.value), 250); }}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (results.length === 1) addItem(results[0]); else if (!results.length) addManual(); } }} />
                {results.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full max-h-64 overflow-auto rounded-lg border border-neutral-700 bg-neutral-900 shadow-xl">
                    {results.map((p) => (
                      <button key={p.id} onClick={() => addItem(p)} className="w-full text-left px-3 py-2 hover:bg-neutral-800 flex justify-between gap-3 text-sm">
                        <span className="truncate">{p.name} {p.brand?.name ? `(${p.brand.name})` : ""}</span>
                        <span className="text-neutral-500 shrink-0 text-xs">{p.stock} {p.unit} · {p.salePrice ? formatPYG(p.salePrice) : "sin precio"}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={addManual} disabled={!term.trim()} className="btn-ghost text-xs py-2">Agregar manual</button>
            </div>

            {items.length === 0 ? (
              <div className="p-10 text-center text-sm text-neutral-500">Sin productos en la venta</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-800 bg-neutral-900/50">
                      <th className="text-left px-4 py-2.5 text-neutral-400 font-medium">Producto</th>
                      <th className="w-24 text-center px-2 py-2.5 text-neutral-400 font-medium">Cant.</th>
                      <th className="w-32 text-right px-2 py-2.5 text-neutral-400 font-medium">Precio unit.</th>
                      <th className="w-32 text-right px-4 py-2.5 text-neutral-400 font-medium">Subtotal</th>
                      <th className="w-10 px-2 py-2.5"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it) => (
                      <tr key={it.key} className="border-b border-neutral-800/50">
                        <td className="px-4 py-2.5">
                          {it.productId ? <p className="font-medium">{it.productName}</p> : (
                            <input className="input py-1.5 text-sm w-full max-w-xs" value={it.productName} onChange={(e) => setItems(items.map((x) => x.key === it.key ? { ...x, productName: e.target.value } : x))} />
                          )}
                          <p className="text-[10px] text-neutral-500">{it.unit}{it.maxStock ? ` · stock ${it.maxStock}` : ""}</p>
                        </td>
                        <td className="px-2 py-2.5 text-center">
                          <input type="number" min={0} step="any" className="input py-1.5 text-sm w-20 text-center" value={it.quantity || ""}
                            onChange={(e) => { const v = Number(e.target.value); if (!isNaN(v) && v >= 0 && v <= it.maxStock) setItems(items.map((x) => x.key === it.key ? { ...x, quantity: v } : x)); }} />
                        </td>
                        <td className="px-2 py-2.5">
                          <input type="number" min={0} step="any" className="input py-1.5 text-sm w-28 text-right" value={it.unitPrice || ""}
                            onChange={(e) => { const v = Number(e.target.value); if (!isNaN(v) && v >= 0) setItems(items.map((x) => x.key === it.key ? { ...x, unitPrice: v } : x)); }} />
                        </td>
                        <td className="px-4 py-2.5 text-right font-medium">{formatPYG(it.quantity * it.unitPrice)}</td>
                        <td className="px-2 py-2.5 text-center">
                          <button onClick={() => setItems(items.filter((x) => x.key !== it.key))} className="text-neutral-600 hover:text-rose-400"><Trash2 className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-neutral-800">
                      <td colSpan={3} className="px-4 py-2.5 text-sm text-neutral-400">Subtotal</td>
                      <td className="px-4 py-2.5 text-right font-semibold">{formatPYG(subtotal)}</td><td></td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="px-4 py-1 text-xs text-neutral-500">Descuento</td>
                      <td className="px-4 py-1 text-right text-xs text-rose-400">-{formatPYG(discount)}</td><td></td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="px-4 py-2 text-sm font-semibold">TOTAL</td>
                      <td className="px-4 py-2 text-right font-bold text-brand-400">{formatPYG(total)}</td><td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-neutral-500">La venta descuenta stock automáticamente y, si es a crédito, suma al saldo del cliente.</p>
            <div className="flex gap-2">
              <button onClick={() => { setTab("list"); setItems([]); }} className="btn-ghost text-sm py-2">Cancelar</button>
              <button onClick={save} disabled={saving} className="btn-primary text-sm px-5 py-2 flex items-center gap-2"><Save className="w-4 h-4" /> {saving ? "Guardando..." : `Cobrar ${formatPYG(total)}`}</button>
            </div>
          </div>
        </div>
      )}

      {tab === "detail" && selected && detail && (
        <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-xl p-5 mb-6">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold">{selected.orderNumber}</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-700/50 text-neutral-300">{selected.status}</span>
                {payBadge(selected.paymentStatus)}
              </div>
              <p className="text-xs text-neutral-500 mt-1">{new Date(selected.createdAt).toLocaleString("es-PY")} · {selected.customerName}{selected.customerPhone && selected.customerPhone !== "—" ? ` · ${selected.customerPhone}` : ""} · {selected.paymentMethod}</p>
              <div className="flex flex-wrap gap-5 mt-3">
                <div><p className="text-xs text-neutral-500">Total</p><p className="font-bold">{formatPYG(detail.total)}</p></div>
                <div><p className="text-xs text-neutral-500">Cobrado</p><p className="font-bold text-emerald-400">{formatPYG(detail.amountPaid)}</p></div>
                <div><p className="text-xs text-neutral-500">Saldo</p><p className={`font-bold ${detail.total - detail.amountPaid > 0 ? "text-amber-400" : "text-neutral-600"}`}>{formatPYG(detail.total - detail.amountPaid)}</p></div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {detail.total - detail.amountPaid > 0 && detail.status !== "cancelled" && (
                <button onClick={() => { const amt = prompt("Monto del cobro (Gs):", String(Math.round(detail.total - detail.amountPaid))); if (amt && Number(amt) > 0) doAction("pay", { amount: Number(amt) }); }}
                  className="btn-primary text-xs py-2 bg-emerald-600 flex items-center gap-1.5"><Wallet className="w-3.5 h-3.5" /> Registrar cobro</button>
              )}
              {detail.status !== "cancelled" && (
                <button onClick={() => { if (confirm("¿Anular esta venta? Se devolverá el stock y se quitará el saldo pendiente.")) doAction("cancel"); }}
                  className="btn-ghost text-xs py-2 border border-rose-500/30 text-rose-400 hover:bg-rose-500/10">Anular venta</button>
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
                  <th className="text-right px-4 py-2.5 text-neutral-400 font-medium">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {detail.items.map((it: any) => (
                  <tr key={it.id} className="border-b border-neutral-800/50">
                    <td className="px-4 py-2.5">{it.productName}</td>
                    <td className="px-2 py-2.5 text-center">{it.quantity}</td>
                    <td className="px-2 py-2.5 text-right">{formatPYG(it.unitPrice)}</td>
                    <td className="px-4 py-2.5 text-right font-medium">{formatPYG(it.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr><td colSpan={3} className="px-4 py-2 text-xs text-neutral-500">Descuento: -{formatPYG(detail.discount)} · Entrega: {formatPYG(detail.shipping)}</td></tr>
                <tr><td colSpan={3} className="px-4 py-2 font-semibold">TOTAL</td><td className="px-4 py-2 text-right font-bold">{formatPYG(detail.total)}</td></tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-neutral-800 overflow-hidden">
        <div className="p-3 border-b border-neutral-800 bg-neutral-900/40 relative">
          <Search className="w-4 h-4 absolute left-6 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input className="input py-2 text-sm pl-9 w-72" placeholder="Buscar venta, cliente, teléfono..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800 bg-neutral-900/50">
                <th className="text-left px-4 py-3 text-neutral-400 font-medium">N°</th>
                <th className="text-left px-4 py-3 text-neutral-400 font-medium">Cliente</th>
                <th className="text-right px-4 py-3 text-neutral-400 font-medium">Ítems</th>
                <th className="text-right px-4 py-3 text-neutral-400 font-medium">Total</th>
                <th className="text-right px-4 py-3 text-neutral-400 font-medium">Saldo</th>
                <th className="text-center px-4 py-3 text-neutral-400 font-medium">Pago</th>
                <th className="text-left px-4 py-3 text-neutral-400 font-medium">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <tr key={i} className="border-b border-neutral-800/50">{Array.from({ length: 7 }).map((__, j) => <td key={j} className="px-4 py-4"><div className="h-4 bg-neutral-800 rounded animate-pulse" /></td>)}</tr>)
              ) : sales.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-neutral-500">Sin ventas registradas</td></tr>
              ) : sales.map((s) => (
                <tr key={s.id} className={`border-b border-neutral-800/50 hover:bg-neutral-800/30 cursor-pointer transition-colors ${selected?.id === s.id ? "bg-brand-500/5" : ""}`} onClick={() => openDetail(s)}>
                  <td className="px-4 py-3 font-bold text-brand-400">{s.orderNumber}</td>
                  <td className="px-4 py-3">
                    <p>{s.customerName}</p>
                    {s.customerPhone !== "—" && <p className="text-[10px] text-neutral-500">{s.customerPhone}</p>}
                  </td>
                  <td className="px-4 py-3 text-right text-neutral-400">{s.items?.length || 0}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatPYG(s.total)}</td>
                  <td className={`px-4 py-3 text-right font-medium ${s.total - s.amountPaid > 0 ? "text-amber-400" : "text-emerald-400"}`}>{formatPYG(s.total - s.amountPaid)}</td>
                  <td className="px-4 py-3 text-center">{payBadge(s.paymentStatus)}</td>
                  <td className="px-4 py-3 text-xs text-neutral-400">{new Date(s.createdAt).toLocaleDateString("es-PY")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}