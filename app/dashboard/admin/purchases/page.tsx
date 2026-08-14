"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Plus, X, Save, Trash2, Truck, Search, PackageSearch, CheckCircle2, Package } from "lucide-react";
import { useUI } from "@/lib/store";
import { formatPYG } from "@/lib/utils";

interface ProductRow { id: string; name: string; unit: string; stock: number; brand?: { name: string } | null; cost?: number; salePrice?: number; }
interface PurchaseRow {
  id: string; purchaseNumber: string; invoiceNumber?: string | null; supplierName?: string | null; supplier?: { id: string; name: string } | null;
  status: string; total: number; amountPaid: number; createdAt: string; _count?: { items: number };
}
interface DraftItem { id: string; productId?: string; productName: string; quantity: number; unitCost: number; notes?: string; receivedQty?: number; }

let draftSeq = 0;

export default function PurchasesPage() {
  const ui = useUI();
  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
  const [stats, setStats] = useState({ count: 0, total: 0, paid: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [tab, setTab] = useState<"list" | "create" | "detail">("list");
  const [selected, setSelected] = useState<PurchaseRow | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({ supplierId: "", supplierName: "", invoiceNumber: "", shippingCost: 0, notes: "" });
  const [items, setItems] = useState<DraftItem[]>([]);
  const [showNewItem, setShowNewItem] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [searchResults, setSearchResults] = useState<ProductRow[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef<any>(null);
  const [saving, setSaving] = useState(false);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (statusFilter) params.set("status", statusFilter);
      const r = await fetch(`/api/purchases?${params}`);
      const data = await r.json();
      setPurchases(data.purchases || []);
      setStats(data.stats || { count: 0, total: 0, paid: 0, pending: 0 });
    } catch { /* noop */ }
    finally { setLoading(false); }
  }, [q, statusFilter]);

  useEffect(() => { loadList(); }, [loadList]);

  useEffect(() => { loadSuppliers(); }, []);

  const loadSuppliers = async () => {
    try {
      const r = await fetch("/api/suppliers");
      const data = await r.json();
      setSuppliers(data.suppliers || []);
    } catch { /* noop */ }
  };

  const openDetail = async (p: PurchaseRow, refresh = false) => {
    setSelected(p);
    setTab("detail");
    setDetail(null);
    setDetailLoading(true);
    try {
      const r = await fetch(`/api/purchases/${p.id}`);
      const data = await r.json();
      setDetail(data.purchase);
      if (refresh) loadList();
    } catch { /* noop */ }
    finally { setDetailLoading(false); }
  };

  const searchProducts = async (term: string) => {
    if (term.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const r = await fetch(`/api/products/prices?q=${encodeURIComponent(term)}`);
      const data = await r.json();
      setSearchResults(data.products || []);
    } catch { /* noop */ }
    finally { setSearching(false); }
  };

  const onSearchChange = (v: string) => {
    setNewItemName(v);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => searchProducts(v), 250);
  };

  const addItem = (product?: ProductRow) => {
    const qty = 1;
    const cost = product?.cost && product.cost > 0 ? product.cost : 0;
    const existing = items.find((i) => i.productId && i.productId === product?.id);
    if (existing) {
      setItems(items.map((i) => (i.id === existing.id ? { ...i, quantity: i.quantity + 1 } : i)));
    } else {
      setItems([...items, { id: `d${draftSeq++}`, productId: product?.id, productName: product?.name || newItemName.trim(), quantity: qty, unitCost: cost }]);
    }
    setNewItemName("");
    setSearchResults([]);
    setShowNewItem(false);
  };

  const itemTotal = items.reduce((s, i) => s + i.quantity * i.unitCost, 0);
  const grandTotal = Math.round((itemTotal + Number(form.shippingCost || 0)) * 100) / 100;

  const savePurchase = async () => {
    if (items.length === 0) { ui.showToast("Agregá al menos un ítem", "error"); return; }
    if (items.some((i) => !i.productName.trim() || i.quantity <= 0 || i.unitCost < 0)) {
      ui.showToast("Revisá los ítems: nombre, cantidad y costo", "error"); return;
    }
    setSaving(true);
    try {
      const body: any = {
        supplierId: form.supplierId || undefined,
        supplierName: form.supplierId ? undefined : form.supplierName.trim() || undefined,
        invoiceNumber: form.invoiceNumber || undefined,
        shippingCost: Number(form.shippingCost || 0),
        notes: form.notes || undefined,
        items: items.map((i) => ({ productId: i.productId, productName: i.productName, quantity: i.quantity, unitCost: i.unitCost, notes: i.notes })),
      };
      const r = await fetch("/api/purchases", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await r.json();
      if (!r.ok) { ui.showToast(data.error || "Error al crear compra", "error"); return; }
      ui.showToast("Compra creada", "success");
      setItems([]);
      setForm({ supplierId: "", supplierName: "", invoiceNumber: "", shippingCost: 0, notes: "" });
      setTab("list");
      loadList();
      loadSuppliers();
    } catch { ui.showToast("Error de conexión", "error"); }
    finally { setSaving(false); }
  };

  const doAction = async (action: string, extra: Record<string, unknown> = {}) => {
    if (!selected) return;
    const r = await fetch(`/api/purchases/${selected.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    const data = await r.json();
    if (!r.ok) { ui.showToast(data.error || "Error", "error"); return; }
    ui.showToast("Operación exitosa", "success");
    openDetail(selected, true);
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      draft: "bg-neutral-700/50 text-neutral-300", ordered: "bg-sky-500/10 text-sky-400",
      received: "bg-amber-500/10 text-amber-400", completed: "bg-emerald-500/10 text-emerald-400", cancelled: "bg-rose-500/10 text-rose-400",
    };
    return `px-2 py-0.5 rounded-full text-[10px] font-bold ${map[s] || map.draft}`;
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Compras</h1>
          <p className="text-sm text-neutral-500 mt-1">Órdenes de compra y recepción de mercadería</p>
        </div>
        <button onClick={() => { setTab("create"); setShowNewItem(true); }} disabled={tab === "create"} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Nueva Compra
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Compras", value: stats.count, icon: <Truck className="w-5 h-5 text-brand-400" />, bg: "bg-brand-500/15" },
          { label: "Total comprado", value: formatPYG(stats.total), icon: <Package className="w-5 h-5 text-sky-400" />, bg: "bg-sky-500/15" },
          { label: "Pagado", value: formatPYG(stats.paid), icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />, bg: "bg-emerald-500/15" },
          { label: "Por pagar", value: formatPYG(stats.pending), icon: <PackageSearch className="w-5 h-5 text-amber-400" />, bg: "bg-amber-500/15" },
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
          <h2 className="font-semibold mb-4">Nueva Orden de Compra</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Proveedor</label>
              <div className="flex gap-2">
                <select className="input py-2 text-sm flex-1" value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>
                  <option value="">Sin proveedor...</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              {!form.supplierId && (
                <input className="input py-2 text-sm mt-2" placeholder="...o nombre de proveedor nuevo" value={form.supplierName}
                  onChange={(e) => setForm({ ...form, supplierName: e.target.value })} />
              )}
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Factura / remito N°</label>
              <input className="input py-2 text-sm" value={form.invoiceNumber} onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Flete / costo extra (Gs)</label>
              <input type="number" min={0} className="input py-2 text-sm" value={form.shippingCost || ""}
                onChange={(e) => setForm({ ...form, shippingCost: Number(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Notas</label>
              <input className="input py-2 text-sm" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Observaciones" />
            </div>
          </div>

          <div className="border border-neutral-800 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-neutral-900/60 border-b border-neutral-800">
              <h3 className="text-sm font-semibold flex items-center gap-2"><Package className="w-4 h-4 text-brand-400" /> Ítems ({items.length})</h3>
              <button onClick={() => setShowNewItem(true)} className="btn-ghost text-xs flex items-center gap-1 py-1.5"><Plus className="w-3.5 h-3.5" /> Agregar ítem</button>
            </div>

            {showNewItem && (
              <div className="px-4 py-3 border-b border-neutral-800 bg-brand-500/5">
                <div className="flex flex-wrap gap-2">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                    <input autoFocus className="input py-2 text-sm pl-9" placeholder="Buscar o escribir nombre del repuesto..."
                      value={newItemName} onChange={(e) => onSearchChange(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addItem(); } }} />
                    {searchResults.length > 0 && (
                      <div className="absolute z-20 mt-1 w-full max-h-56 overflow-auto rounded-lg border border-neutral-700 bg-neutral-900 shadow-xl">
                        {searchResults.map((p) => (
                          <button key={p.id} onClick={() => addItem(p)}
                            className="w-full text-left px-3 py-2 hover:bg-neutral-800 flex justify-between gap-3 text-sm">
                            <span className="truncate">{p.name} {p.brand?.name ? `(${p.brand.name})` : ""}</span>
                            <span className="text-neutral-500 shrink-0 text-xs">
                              {p.cost && p.cost > 0 ? `Costo ${formatPYG(p.cost)}` : p.salePrice && p.salePrice > 0 ? `Venta ${formatPYG(p.salePrice)}` : "sin precio"}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button onClick={() => addItem()} disabled={!newItemName.trim()} className="btn-primary text-xs py-2 flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Agregar</button>
                  <button onClick={() => setShowNewItem(false)} className="btn-ghost p-2"><X className="w-4 h-4" /></button>
                </div>
                {searching && <p className="text-[10px] text-neutral-500 mt-1">Buscando...</p>}
              </div>
            )}

            {items.length === 0 ? (
              <div className="p-10 text-center text-sm text-neutral-500">Sin ítems. Toque “Agregar ítem” para cargar la mercadería.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-800 bg-neutral-900/50">
                      <th className="text-left px-4 py-2.5 text-neutral-400 font-medium">Repuesto</th>
                      <th className="w-20 text-center px-2 py-2.5 text-neutral-400 font-medium">Cant.</th>
                      <th className="w-32 text-right px-2 py-2.5 text-neutral-400 font-medium">Costo unit.</th>
                      <th className="w-32 text-right px-4 py-2.5 text-neutral-400 font-medium">Subtotal</th>
                      <th className="w-10 px-2 py-2.5"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it) => (
                      <tr key={it.id} className="border-b border-neutral-800/50">
                        <td className="px-4 py-2.5">
                          <input className="input py-1.5 text-sm w-full max-w-xs" value={it.productName}
                            onChange={(e) => setItems(items.map((x) => (x.id === it.id ? { ...x, productName: e.target.value } : x)))} />
                        </td>
                        <td className="px-2 py-2.5 text-center">
                          <input type="number" min={0.01} step="any" className="input py-1.5 text-sm w-20 text-center" value={it.quantity || ""}
                            onChange={(e) => { const v = Number(e.target.value); if (!isNaN(v) && v >= 0) setItems(items.map((x) => (x.id === it.id ? { ...x, quantity: v } : x))); }} />
                        </td>
                        <td className="px-2 py-2.5">
                          <input type="number" min={0} step="any" className="input py-1.5 text-sm w-28 text-right" value={it.unitCost || ""}
                            onChange={(e) => { const v = Number(e.target.value); if (!isNaN(v) && v >= 0) setItems(items.map((x) => (x.id === it.id ? { ...x, unitCost: v } : x))); }} />
                        </td>
                        <td className="px-4 py-2.5 text-right font-medium">{formatPYG(it.quantity * it.unitCost)}</td>
                        <td className="px-2 py-2.5 text-center">
                          <button onClick={() => setItems(items.filter((x) => x.id !== it.id))} className="text-neutral-600 hover:text-rose-400"><Trash2 className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-neutral-800">
                      <td colSpan={3} className="px-4 py-3 text-sm text-neutral-400">Subtotal mercadería</td>
                      <td className="px-4 py-3 text-right font-bold">{formatPYG(itemTotal)}</td>
                      <td></td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="px-4 py-1 text-xs text-neutral-500">Flete / extras</td>
                      <td className="px-4 py-1 text-right text-xs">{formatPYG(Number(form.shippingCost || 0))}</td>
                      <td></td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="px-4 py-3 text-sm font-semibold">TOTAL COMPRA</td>
                      <td className="px-4 py-3 text-right font-bold text-brand-400">{formatPYG(grandTotal)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
            <p className="text-xs text-neutral-500">Al confirmar, la compra se crea en estado “ordenada” y suma a la deuda del proveedor. La mercadería ingresa al stock al recibirla.</p>
            <div className="flex gap-2">
              <button onClick={() => { setTab("list"); setItems([]); }} className="btn-ghost text-sm py-2">Cancelar</button>
              <button onClick={savePurchase} disabled={saving} className="btn-primary text-sm px-5 py-2 flex items-center gap-2">
                <Save className="w-4 h-4" /> {saving ? "Guardando..." : `Guardar Compra (${formatPYG(grandTotal)})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === "detail" && selected && (
        <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-xl p-5 mb-6">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold">{selected.purchaseNumber}</h2>
                <span className={statusBadge(selected.status)}>{selected.status}</span>
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                {new Date(selected.createdAt).toLocaleString("es-PY")} · {selected.supplier?.name || selected.supplierName || "Sin proveedor"}
              </p>
              <div className="flex flex-wrap gap-5 mt-3">
                <div>
                  <p className="text-xs text-neutral-500">Total</p>
                  <p className="font-bold">{formatPYG(selected.total)}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500">Pagado</p>
                  <p className="font-bold text-emerald-400">{formatPYG(selected.amountPaid)}</p>
                </div>
                <div>
                  <p className="text-xs text-neutral-500">Saldo</p>
                  <p className={`font-bold ${selected.total - selected.amountPaid > 0 ? "text-amber-400" : "text-neutral-600"}`}>{formatPYG(selected.total - selected.amountPaid)}</p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {["draft", "ordered", "received"].includes(selected.status) && (
                <button onClick={() => doAction("cancel")} className="btn-ghost text-xs py-2 border border-rose-500/30 text-rose-400 hover:bg-rose-500/10">Cancelar compra</button>
              )}
              {selected.status === "draft" && (
                <button onClick={async () => { if (confirm("¿Eliminar este borrador?")) { const r = await fetch(`/api/purchases/${selected.id}`, { method: "DELETE" }); if (r.ok) { ui.showToast("Borrador eliminado", "success"); setTab("list"); loadList(); } else ui.showToast("No se pudo eliminar", "error"); } }}
                  className="btn-ghost text-xs py-2 border border-rose-500/30 text-rose-400 hover:bg-rose-500/10">Eliminar</button>
              )}
              {["ordered", "received"].includes(selected.status) && (
                <button onClick={() => doAction("receive", { items: detail?.items?.map((i: any) => ({ id: i.id, receivedQty: i.quantity })) })} className="btn-primary text-xs py-2 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Recibir todo
                </button>
              )}
              {selected.status === "received" && (
                <button onClick={() => doAction("complete")} className="btn-primary text-xs py-2">Completar compra</button>
              )}
              {selected.total - selected.amountPaid > 0 && ["received", "completed"].includes(selected.status) && (
                <button onClick={() => { const amt = prompt("Monto del pago (Gs):", String(selected.total - selected.amountPaid)); if (amt && Number(amt) > 0) doAction("pay", { amount: Number(amt) }); }}
                  className="btn-primary text-xs py-2 bg-emerald-600">Registrar pago</button>
              )}
            </div>
          </div>

          {detailLoading ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-10 bg-neutral-800/60 rounded-lg animate-pulse" />)}</div>
          ) : detail && (
            <div>
              <div className="overflow-x-auto border border-neutral-800 rounded-xl mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-800 bg-neutral-900/50">
                      <th className="text-left px-4 py-2.5 text-neutral-400 font-medium">Repuesto</th>
                      <th className="text-center px-2 py-2.5 text-neutral-400 font-medium">Cant.</th>
                      <th className="text-center px-2 py-2.5 text-neutral-400 font-medium">Recibido</th>
                      <th className="text-right px-2 py-2.5 text-neutral-400 font-medium">Costo unit.</th>
                      <th className="text-right px-4 py-2.5 text-neutral-400 font-medium">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.items.map((it: any) => (
                      <tr key={it.id} className="border-b border-neutral-800/50">
                        <td className="px-4 py-2.5">
                          <p className="font-medium">{it.productName}</p>
                          {it.notes && <p className="text-[10px] text-neutral-500">{it.notes}</p>}
                        </td>
                        <td className="px-2 py-2.5 text-center">{it.quantity}</td>
                        <td className="px-2 py-2.5 text-center">
                          <span className={it.receivedQty >= it.quantity ? "text-emerald-400" : "text-neutral-400"}>{it.receivedQty}</span>
                        </td>
                        <td className="px-2 py-2.5 text-right">{formatPYG(it.unitCost)}</td>
                        <td className="px-4 py-2.5 text-right font-medium">{formatPYG(it.quantity * it.unitCost)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr><td colSpan={3} className="px-4 py-2 text-xs text-neutral-500">Flete: {formatPYG(detail.shippingCost)}</td></tr>
                    <tr><td colSpan={3} className="px-4 py-2 font-semibold">TOTAL</td><td className="px-2 py-2 text-right font-bold">{formatPYG(detail.total)}</td><td></td></tr>
                  </tfoot>
                </table>
              </div>
              {detail.notes && <p className="text-xs text-neutral-500 mb-4">📝 {detail.notes}</p>}
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl border border-neutral-800 overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 p-3 border-b border-neutral-800 bg-neutral-900/40">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input className="input py-2 text-sm pl-9 w-64" placeholder="Buscar por N°, proveedor, factura..."
              value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select className="input py-2 text-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Todos los estados</option>
            <option value="draft">Borrador</option>
            <option value="ordered">Ordenada</option>
            <option value="received">Recibida</option>
            <option value="completed">Completada</option>
            <option value="cancelled">Cancelada</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800 bg-neutral-900/50">
                <th className="text-left px-4 py-3 text-neutral-400 font-medium">N°</th>
                <th className="text-left px-4 py-3 text-neutral-400 font-medium">Proveedor</th>
                <th className="text-left px-4 py-3 text-neutral-400 font-medium">Factura</th>
                <th className="text-right px-4 py-3 text-neutral-400 font-medium">Ítems</th>
                <th className="text-right px-4 py-3 text-neutral-400 font-medium">Total</th>
                <th className="text-right px-4 py-3 text-neutral-400 font-medium">Saldo</th>
                <th className="text-center px-4 py-3 text-neutral-400 font-medium">Estado</th>
                <th className="text-left px-4 py-3 text-neutral-400 font-medium">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <tr key={i} className="border-b border-neutral-800/50">{Array.from({ length: 8 }).map((__, j) => <td key={j} className="px-4 py-4"><div className="h-4 bg-neutral-800 rounded animate-pulse" /></td>)}</tr>)
              ) : purchases.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-neutral-500">Sin compras registradas</td></tr>
              ) : purchases.map((p) => (
                <tr key={p.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/30 cursor-pointer transition-colors" onClick={() => openDetail(p)}>
                  <td className="px-4 py-3 font-bold text-brand-400">{p.purchaseNumber}</td>
                  <td className="px-4 py-3">{p.supplier?.name || p.supplierName || "—"}</td>
                  <td className="px-4 py-3 text-neutral-400 text-xs">{p.invoiceNumber || "—"}</td>
                  <td className="px-4 py-3 text-right text-neutral-400">{p._count?.items ?? 0}</td>
                  <td className="px-4 py-3 text-right font-medium">{formatPYG(p.total)}</td>
                  <td className={`px-4 py-3 text-right font-medium ${p.total - p.amountPaid > 0 ? "text-amber-400" : "text-emerald-400"}`}>{formatPYG(p.total - p.amountPaid)}</td>
                  <td className="px-4 py-3 text-center"><span className={statusBadge(p.status)}>{p.status}</span></td>
                  <td className="px-4 py-3 text-xs text-neutral-400">{new Date(p.createdAt).toLocaleDateString("es-PY")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}