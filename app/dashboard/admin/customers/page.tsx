"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Plus, UserPlus, Ban, CheckCircle2, Wallet, Users, Trash2, ArrowLeft, Package, Phone, MapPin, FileText, X, BadgeCheck, AlertTriangle, MessageCircle } from "lucide-react";
import { formatPYG } from "@/lib/utils";
import { useUI } from "@/lib/store";

interface CustomerRow {
  id: string;
  name: string;
  lastname: string;
  document: string;
  phone: string;
  whatsapp?: string | null;
  email: string;
  city?: string | null;
  balance: number;
  isBlocked: boolean;
  notes?: string | null;
  createdAt: string;
  _count: { orders: number };
}

const EMPTY_FORM = { name: "", lastname: "", document: "", phone: "", email: "", whatsapp: "", city: "", address: "", notes: "" };

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [stats, setStats] = useState<{ total: number; totalBalance: number; blocked: number }>({ total: 0, totalBalance: 0, blocked: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "blocked" | "debt" | "active">("all");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<CustomerRow | null>(null);
  const [detail, setDetail] = useState<{ orders: any[]; payments: any[] } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [payForm, setPayForm] = useState({ type: "pago", amount: "", method: "Efectivo", notes: "" });
  const showToast = useUI((s) => s.showToast);

  const load = async () => {
    setLoading(true);
    try {
      const q = search ? `&q=${encodeURIComponent(search)}` : "";
      const f = filter === "blocked" ? "&blocked=1" : filter === "debt" ? "&debt=1" : filter === "active" ? "&blocked=0" : "";
      const r = await fetch(`/api/customers${q}${f}`);
      const data = await r.json();
      setCustomers(data.customers || []);
      setStats(data.stats || { total: 0, totalBalance: 0, blocked: 0 });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [filter]);

  const openDetail = async (c: CustomerRow) => {
    setSelected(c);
    setDetail(null);
    setDetailLoading(true);
    try {
      const r = await fetch(`/api/customers/${c.id}`);
      const data = await r.json();
      setDetail({ orders: data.customer?.orders || [], payments: data.customer?.receivablePayments || [] });
    } catch { /* noop */ }
    finally { setDetailLoading(false); }
  };

  const toggleBlock = async (c: CustomerRow) => {
    const r = await fetch(`/api/customers/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isBlocked: !c.isBlocked, blockedReason: !c.isBlocked ? "Bloqueado desde panel" : undefined }),
    });
    if (r.ok) { showToast(c.isBlocked ? "Cliente reactivado" : "Cliente bloqueado", "success"); load(); if (selected?.id === c.id) openDetail(c); }
    else showToast("Error al actualizar", "error");
  };

  const handleCreate = async () => {
    setSaving(true);
    try {
      const r = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await r.json();
      if (!r.ok) { showToast(data.error || "Error al crear", "error"); return; }
      showToast("Cliente creado", "success");
      setShowCreate(false);
      setForm(EMPTY_FORM);
      load();
    } catch { showToast("Error de conexión", "error"); }
    finally { setSaving(false); }
  };

  const handlePayment = async () => {
    if (!selected) return;
    const amount = parseFloat(payForm.amount);
    if (!amount || amount <= 0) { showToast("Monto inválido", "error"); return; }
    const r = await fetch(`/api/customers/${selected.id}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payForm, amount }),
    });
    const data = await r.json();
    if (r.ok) {
      showToast(payForm.type === "pago" ? "Pago registrado" : "Cargo registrado", "success");
      setPayForm({ type: "pago", amount: "", method: "Efectivo", notes: "" });
      setSelected((prev) => prev ? { ...prev, balance: data.customer.balance } : prev);
      openDetail({ ...selected, balance: data.customer.balance });
      load();
    } else showToast(data.error || "Error", "error");
  };

  const inputCls = "input px-9 py-2 text-sm";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-sm text-neutral-500 mt-1">Datos personales, historial de compras, deudas y estados</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="btn-primary flex items-center gap-2 text-sm">
          {showCreate ? <X className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
          {showCreate ? "Cancelar" : "Nuevo Cliente"}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/15 flex items-center justify-center"><Users className="w-5 h-5 text-brand-400" /></div>
            <div>
              <p className="text-xs text-neutral-500">Clientes totales</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center"><Wallet className="w-5 h-5 text-amber-400" /></div>
            <div>
              <p className="text-xs text-neutral-500">Total en deudas</p>
              <p className="text-2xl font-bold">{formatPYG(stats.totalBalance)}</p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 flex items-center justify-center"><Ban className="w-5 h-5 text-rose-400" /></div>
            <div>
              <p className="text-xs text-neutral-500">Bloqueados</p>
              <p className="text-2xl font-bold">{stats.blocked}</p>
            </div>
          </div>
        </div>
      </div>

      {showCreate && (
        <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-xl p-5 mb-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2"><UserPlus className="w-4 h-4 text-brand-400" /> Registrar nuevo cliente</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {([
              ["name", "Nombre", "text"], ["lastname", "Apellido", "text"], ["document", "Cédula", "text"],
              ["phone", "Teléfono", "tel"], ["whatsapp", "WhatsApp", "tel"], ["email", "Email", "email"],
              ["city", "Ciudad", "text"], ["address", "Dirección", "text"], ["notes", "Notas", "text"],
            ] as [string, string, string][]).map(([key, label, type]) => (
              <div key={key}>
                <label className="block text-xs text-neutral-400 mb-1">{label}</label>
                <input type={type} className="input py-2 text-sm" value={(form as any)[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
              </div>
            ))}
          </div>
          <div className="flex justify-end mt-4">
            <button onClick={handleCreate} disabled={saving} className="btn-primary text-sm">
              {saving ? "Guardando..." : "Guardar Cliente"}
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); }}
            onKeyDown={(e) => e.key === "Enter" && load()}
            placeholder="Buscar por nombre, doc, email, teléfono..."
            className="input pl-9 pr-9 text-sm"
          />
          {search && <button onClick={() => { setSearch(""); setTimeout(load, 50); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"><X className="w-4 h-4" /></button>}
        </div>
        {([["all", "Todos"], ["debt", "Con deuda"], ["active", "Activos"], ["blocked", "Bloqueados"]] as [string, string][]).map(([v, l]) => (
          <button
            key={v}
            onClick={() => setFilter(v as any)}
            className={`px-3 py-1.5 rounded-lg text-sm border transition ${filter === v ? "bg-brand-600 text-white border-brand-600" : "border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-600"}`}
          >
            {l}
          </button>
        ))}
        <button onClick={load} className="btn-ghost text-sm px-3 py-1.5">Buscar</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`rounded-xl border border-neutral-800 overflow-hidden ${selected ? "lg:col-span-1" : "lg:col-span-3"}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-800 bg-neutral-900/50">
                  <th className="text-left px-4 py-3 text-neutral-400 font-medium">Cliente</th>
                  <th className="text-left px-4 py-3 text-neutral-400 font-medium">Contacto</th>
                  <th className="text-right px-4 py-3 text-neutral-400 font-medium">Pedidos</th>
                  <th className="text-right px-4 py-3 text-neutral-400 font-medium">Deuda</th>
                  <th className="text-center px-4 py-3 text-neutral-400 font-medium">Estado</th>
                  <th className="text-right px-4 py-3 text-neutral-400 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-neutral-800/50">
                      {Array.from({ length: 6 }).map((__, j) => (
                        <td key={j} className="px-4 py-4"><div className="h-4 bg-neutral-800 rounded animate-pulse" /></td>
                      ))}
                    </tr>
                  ))
                ) : customers.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-neutral-500">No hay clientes</td></tr>
                ) : (
                  customers.map((c) => (
                    <tr key={c.id} className={`border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors ${selected?.id === c.id ? "bg-brand-500/5" : ""}`} onClick={() => openDetail(c)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-neutral-800 flex items-center justify-center shrink-0">
                            <span className="text-xs font-bold text-neutral-400">{c.name[0]}{c.lastname[0]}</span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{c.name} {c.lastname}</p>
                            <p className="text-[10px] text-neutral-500">C.I. {c.document}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-neutral-400">
                        <p className="flex items-center gap-1"><Phone className="w-3 h-3" /> {c.phone || "—"}</p>
                        <p className="text-[10px] truncate max-w-[160px]">{c.email}</p>
                      </td>
                      <td className="px-4 py-3 text-right text-neutral-300">{c._count.orders}</td>
                      <td className={`px-4 py-3 text-right font-medium ${c.balance > 0 ? "text-amber-400" : "text-neutral-500"}`}>{formatPYG(c.balance)}</td>
                      <td className="px-4 py-3 text-center">
                        {c.isBlocked
                          ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400"><Ban className="w-3 h-3" /> Bloqueado</span>
                          : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400"><BadgeCheck className="w-3 h-3" /> Activo</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => toggleBlock(c)} className="btn-ghost p-1.5" title={c.isBlocked ? "Reactivar" : "Bloquear"}>
                            {c.isBlocked ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Ban className="w-4 h-4 text-rose-400" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {selected && (
          <div className="rounded-xl border border-neutral-800 bg-gradient-to-b from-neutral-900 to-neutral-950 overflow-hidden lg:col-span-2">
            <div className="p-5 border-b border-neutral-800 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-bold text-lg">{selected.name} {selected.lastname}</h2>
                <p className="text-xs text-neutral-500 mt-0.5">C.I. {selected.document} · {selected.email}</p>
                <div className="flex flex-wrap gap-3 mt-2 text-xs text-neutral-400">
                  <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {selected.phone || "—"}</span>
                  {selected.whatsapp && <span className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5 text-emerald-400" /> {selected.whatsapp}</span>}
                  {selected.city && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {selected.city}</span>}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${selected.balance > 0 ? "bg-amber-500/10 text-amber-400" : "bg-emerald-500/10 text-emerald-400"}`}>
                    <Wallet className="w-3.5 h-3.5" /> Saldo: {formatPYG(selected.balance)}
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${selected.isBlocked ? "bg-rose-500/10 text-rose-400" : "bg-neutral-800 text-neutral-300"}`}>
                    {selected.isBlocked ? <><Ban className="w-3.5 h-3.5" /> Bloqueado{selected.notes ? "" : ""}</> : <><BadgeCheck className="w-3.5 h-3.5" /> Activo</>}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-neutral-800 text-neutral-300">
                    <Package className="w-3.5 h-3.5" /> {selected._count.orders} pedidos
                  </span>
                </div>
              </div>
              <button onClick={() => toggleBlock(selected)} className={`btn-ghost text-xs ${selected.isBlocked ? "text-emerald-400" : "text-rose-400"}`}>
                {selected.isBlocked ? "Reactivar" : "Bloquear"}
              </button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 p-5">
              <div className="xl:col-span-2 space-y-5">
                <div>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><Package className="w-4 h-4 text-brand-400" /> Historial de compras</h3>
                  {detailLoading ? (
                    <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)}</div>
                  ) : !detail || detail.orders.length === 0 ? (
                    <div className="border border-neutral-800 rounded-lg p-6 text-center text-sm text-neutral-500">Sin pedidos registrados</div>
                  ) : (
                    <div className="overflow-x-auto border border-neutral-800 rounded-lg">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-neutral-800 bg-neutral-900/50">
                            <th className="text-left px-3 py-2 text-neutral-400 font-medium">N° Pedido</th>
                            <th className="text-left px-3 py-2 text-neutral-400 font-medium">Fecha</th>
                            <th className="text-left px-3 py-2 text-neutral-400 font-medium">Estado</th>
                            <th className="text-right px-3 py-2 text-neutral-400 font-medium">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail.orders.map((o) => (
                            <tr key={o.id} className="border-b border-neutral-800/50">
                              <td className="px-3 py-2.5 font-medium">{o.orderNumber}</td>
                              <td className="px-3 py-2.5 text-neutral-400 text-xs">{new Date(o.createdAt).toLocaleDateString("es-PY")}</td>
                              <td className="px-3 py-2.5 text-xs">{o.status}</td>
                              <td className="px-3 py-2.5 text-right font-medium">{formatPYG(o.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><FileText className="w-4 h-4 text-sky-400" /> Movimientos de cuenta</h3>
                  {detailLoading ? (
                    <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)}</div>
                  ) : !detail || detail.payments.length === 0 ? (
                    <div className="border border-neutral-800 rounded-lg p-6 text-center text-sm text-neutral-500">Sin movimientos de cuenta</div>
                  ) : (
                    <div className="overflow-x-auto border border-neutral-800 rounded-lg">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-neutral-800 bg-neutral-900/50">
                            <th className="text-left px-3 py-2 text-neutral-400 font-medium">Fecha</th>
                            <th className="text-left px-3 py-2 text-neutral-400 font-medium">Tipo</th>
                            <th className="text-left px-3 py-2 text-neutral-400 font-medium">Método</th>
                            <th className="text-right px-3 py-2 text-neutral-400 font-medium">Monto</th>
                            <th className="text-left px-3 py-2 text-neutral-400 font-medium">Detalle</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detail.payments.map((p) => (
                            <tr key={p.id} className="border-b border-neutral-800/50">
                              <td className="px-3 py-2.5 text-xs text-neutral-400">{new Date(p.createdAt).toLocaleString("es-PY")}</td>
                              <td className="px-3 py-2.5">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${p.type === "pago" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"}`}>
                                  {p.type === "pago" ? "Pago" : "Cargo"}
                                </span>
                              </td>
                              <td className="px-3 py-2.5 text-neutral-400">{p.method || "—"}</td>
                              <td className={`px-3 py-2.5 text-right font-medium ${p.type === "pago" ? "text-emerald-400" : "text-amber-400"}`}>
                                {p.type === "pago" ? "-" : "+"}{formatPYG(p.amount)}
                              </td>
                              <td className="px-3 py-2.5 text-neutral-500 text-xs">{p.notes || p.reference || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="border border-neutral-800 rounded-xl p-4 bg-neutral-900/40">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><ArrowLeft className="w-4 h-4 text-amber-400 rotate-180" /> Registrar movimiento</h3>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      {(["pago", "cargo"] as const).map((t) => (
                        <button key={t} onClick={() => setPayForm({ ...payForm, type: t })}
                          className={`px-3 py-2 rounded-lg text-sm font-medium border transition ${payForm.type === t ? (t === "pago" ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400" : "bg-amber-500/10 border-amber-500/50 text-amber-400") : "border-neutral-800 text-neutral-400 hover:text-white"}`}>
                          {t === "pago" ? "Pago recibido" : "Cargo (deuda)"}
                        </button>
                      ))}
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Monto (Gs.)</label>
                      <input type="number" min={0} className="input py-2 text-sm" value={payForm.amount} onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Método</label>
                      <select className="input py-2 text-sm" value={payForm.method} onChange={(e) => setPayForm({ ...payForm, method: e.target.value })}>
                        {["Efectivo", "Transferencia", "Tarjeta", "Cheque", "Crédito", "Otro"].map((m) => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Referencia / Nota</label>
                      <input type="text" className="input py-2 text-sm" value={payForm.notes} onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })} />
                    </div>
                    <button onClick={handlePayment} className="btn-primary w-full text-sm">Registrar</button>
                  </div>
                </div>

                {selected.notes && (
                  <div className="mt-4 border border-neutral-800 rounded-xl p-4">
                    <h3 className="text-xs font-semibold text-neutral-400 uppercase mb-2">Notas del cliente</h3>
                    <p className="text-sm text-neutral-300">{selected.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SkeletonRow() {
  return <div className="h-10 bg-neutral-800/60 rounded-lg animate-pulse" />;
}