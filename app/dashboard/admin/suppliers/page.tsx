"use client";

import { useEffect, useState } from "react";
import { Plus, Truck, Phone, Mail, MapPin, Wallet, X, Save, Eye, Users, ShoppingBag } from "lucide-react";
import { useUI } from "@/lib/store";
import { formatPYG } from "@/lib/utils";

interface SupplierRow {
  id: string;
  code: string;
  name: string;
  ruc?: string | null;
  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  address?: string | null;
  city?: string | null;
  notes?: string | null;
  paymentTerms?: string | null;
  contacts?: string | null;
  balance: number;
  isActive: boolean;
  _count: { purchases: number };
}

const EMPTY = { name: "", ruc: "", email: "", phone: "", whatsapp: "", address: "", city: "", paymentTerms: "", contactsJson: "" };

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [stats, setStats] = useState({ total: 0, debt: 0 });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<SupplierRow | null>(null);
  const [detail, setDetail] = useState<{ purchases: any[]; stats: any } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const showToast = useUI((s) => s.showToast);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/suppliers");
      const data = await r.json();
      setSuppliers(data.suppliers || []);
      setStats(data.stats || { total: 0, debt: 0 });
    } catch { /* noop */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openDetail = async (s: SupplierRow) => {
    setSelected(s);
    setDetail(null);
    setDetailLoading(true);
    try {
      const r = await fetch(`/api/suppliers/${s.id}`);
      const data = await r.json();
      setDetail({ purchases: data.supplier?.purchases || [], stats: data.stats || {} });
    } catch { /* noop */ }
    finally { setDetailLoading(false); }
  };

  const save = async () => {
    if (!form.name.trim()) { showToast("El nombre es obligatorio", "error"); return; }
    setSaving(true);
    try {
      const r = await fetch("/api/suppliers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await r.json();
      if (!r.ok) { showToast(data.error || "Error", "error"); return; }
      showToast("Proveedor creado", "success");
      setShowForm(false);
      setForm(EMPTY);
      load();
    } catch { showToast("Error de conexión", "error"); }
    finally { setSaving(false); }
  };

  const toggleActive = async (s: SupplierRow) => {
    const r = await fetch(`/api/suppliers/${s.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !s.isActive }) });
    if (r.ok) load();
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Proveedores</h1>
          <p className="text-sm text-neutral-500 mt-1">Datos del proveedor, productos suministrados, deudas y contactos</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2 text-sm">
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />} {showForm ? "Cancelar" : "Nuevo Proveedor"}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/15 flex items-center justify-center"><Truck className="w-5 h-5 text-brand-400" /></div>
            <div>
              <p className="text-xs text-neutral-500">Proveedores</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center"><Wallet className="w-5 h-5 text-amber-400" /></div>
            <div>
              <p className="text-xs text-neutral-500">Deuda total (cuentas por pagar)</p>
              <p className="text-2xl font-bold">{formatPYG(stats.debt)}</p>
            </div>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-xl p-5 mb-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2"><Truck className="w-4 h-4 text-brand-400" /> Registrar proveedor</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {([
              ["name", "Nombre / Razón social *", "text"], ["ruc", "RUC", "text"], ["email", "Email", "email"],
              ["phone", "Teléfono", "tel"], ["whatsapp", "WhatsApp", "tel"], ["paymentTerms", "Condiciones de pago", "text"],
              ["city", "Ciudad", "text"], ["address", "Dirección", "text"],
            ] as [string, string, string][]).map(([key, label, type]) => (
              <div key={key}>
                <label className="block text-xs text-neutral-400 mb-1">{label}</label>
                <input type={type} className="input py-2 text-sm" value={(form as any)[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
              </div>
            ))}
            <div className="lg:col-span-3">
              <label className="block text-xs text-neutral-400 mb-1">Contactos (JSON: [{`{"name":"...","role":"...","phone":"..."}`}])</label>
              <input className="input py-2 text-sm font-mono" value={form.contactsJson} onChange={(e) => setForm({ ...form, contactsJson: e.target.value })} placeholder='[{"name":"Ricardo","role":"Ventas","phone":"+595 ..."}]' />
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button onClick={save} disabled={saving} className="btn-primary text-sm flex items-center gap-2"><Save className="w-4 h-4" /> {saving ? "Guardando..." : "Guardar Proveedor"}</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`rounded-xl border border-neutral-800 overflow-hidden ${selected ? "" : "lg:col-span-3"}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-800 bg-neutral-900/50">
                  <th className="text-left px-4 py-3 text-neutral-400 font-medium">Proveedor</th>
                  <th className="text-left px-4 py-3 text-neutral-400 font-medium">Contacto</th>
                  <th className="text-right px-4 py-3 text-neutral-400 font-medium">Compras</th>
                  <th className="text-right px-4 py-3 text-neutral-400 font-medium">Deuda</th>
                  <th className="text-center px-4 py-3 text-neutral-400 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-neutral-800/50">
                      {Array.from({ length: 5 }).map((__, j) => (
                        <td key={j} className="px-4 py-4"><div className="h-4 bg-neutral-800 rounded animate-pulse" /></td>
                      ))}
                    </tr>
                  ))
                ) : suppliers.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-12 text-center text-neutral-500">No hay proveedores registrados</td></tr>
                ) : (
                  suppliers.map((s) => (
                    <tr key={s.id} className={`border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors cursor-pointer ${selected?.id === s.id ? "bg-brand-500/5" : ""}`} onClick={() => openDetail(s)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-neutral-800 flex items-center justify-center shrink-0"><Truck className="w-4 h-4 text-brand-400" /></div>
                          <div className="min-w-0">
                            <p className="font-medium">{s.name}</p>
                            <p className="text-[10px] text-neutral-500">{s.code}{s.ruc ? ` · RUC ${s.ruc}` : ""}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-neutral-400">
                        {s.phone && <p className="flex items-center gap-1 text-xs"><Phone className="w-3 h-3" /> {s.phone}</p>}
                        {s.email && <p className="text-[10px] truncate max-w-[160px]">{s.email}</p>}
                      </td>
                      <td className="px-4 py-3 text-right text-neutral-300">{s._count.purchases}</td>
                      <td className={`px-4 py-3 text-right font-medium ${s.balance > 0 ? "text-amber-400" : "text-neutral-500"}`}>{formatPYG(s.balance)}</td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={(e) => { e.stopPropagation(); toggleActive(s); }}>
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${s.isActive ? "bg-emerald-500/10 text-emerald-400" : "bg-neutral-800 text-neutral-500"}`}>
                            {s.isActive ? "Activo" : "Inactivo"}
                          </span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {selected && detail && (
          <div className="rounded-xl border border-neutral-800 bg-gradient-to-b from-neutral-900 to-neutral-950 overflow-hidden lg:col-span-2">
            <div className="p-5 border-b border-neutral-800 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-bold text-lg">{selected.name}</h2>
                <p className="text-xs text-neutral-500 mt-0.5">{selected.code}{selected.ruc ? ` · RUC ${selected.ruc}` : ""} · {selected.paymentTerms || "Sin condiciones"}</p>
                <div className="flex flex-wrap gap-3 mt-2 text-xs text-neutral-400">
                  {selected.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {selected.phone}</span>}
                  {selected.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {selected.email}</span>}
                  {selected.address && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {selected.address}{selected.city ? `, ${selected.city}` : ""}</span>}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-neutral-800 text-neutral-300">
                    <ShoppingBag className="w-3.5 h-3.5" /> {detail.stats.totalPurchases} compras · {formatPYG(detail.stats.totalSpent)} invertidos
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${detail.stats.unpaid > 0 ? "bg-amber-500/10 text-amber-400" : "bg-emerald-500/10 text-emerald-400"}`}>
                    <Wallet className="w-3.5 h-3.5" /> Deuda: {formatPYG(detail.stats.unpaid)}
                  </span>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 p-5">
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><ShoppingBag className="w-4 h-4 text-brand-400" /> Historial de compras</h3>
                {detailLoading ? (
                  <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-10 bg-neutral-800/60 rounded-lg animate-pulse" />)}</div>
                ) : detail.purchases.length === 0 ? (
                  <div className="border border-neutral-800 rounded-lg p-6 text-center text-sm text-neutral-500">Sin compras registradas</div>
                ) : (
                  <div className="overflow-x-auto border border-neutral-800 rounded-lg">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-neutral-800 bg-neutral-900/50">
                          <th className="text-left px-3 py-2 text-neutral-400 font-medium">N°</th>
                          <th className="text-left px-3 py-2 text-neutral-400 font-medium">Fecha</th>
                          <th className="text-left px-3 py-2 text-neutral-400 font-medium">Estado</th>
                          <th className="text-right px-3 py-2 text-neutral-400 font-medium">Total</th>
                          <th className="text-right px-3 py-2 text-neutral-400 font-medium">Pagado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.purchases.map((p) => (
                          <tr key={p.id} className="border-b border-neutral-800/50">
                            <td className="px-3 py-2.5 font-medium">{p.purchaseNumber}</td>
                            <td className="px-3 py-2.5 text-xs text-neutral-400">{new Date(p.createdAt).toLocaleDateString("es-PY")}</td>
                            <td className="px-3 py-2.5 text-xs">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${p.status === "received" ? "bg-emerald-500/10 text-emerald-400" : p.status === "cancelled" ? "bg-rose-500/10 text-rose-400" : "bg-amber-500/10 text-amber-400"}`}>
                                {p.status}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-right">{formatPYG(p.total)}</td>
                            <td className="px-3 py-2.5 text-right text-emerald-400">{formatPYG(p.amountPaid)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><Users className="w-4 h-4 text-sky-400" /> Contactos</h3>
                {(() => {
                  let contacts: any[] = [];
                  try { contacts = selected.contacts ? JSON.parse(selected.contacts) : []; } catch { contacts = []; }
                  return contacts.length === 0 ? (
                    <div className="border border-neutral-800 rounded-lg p-6 text-center text-sm text-neutral-500">Sin contactos registrados</div>
                  ) : (
                    <div className="space-y-2">
                      {contacts.map((c, i) => (
                        <div key={i} className="flex items-center gap-3 border border-neutral-800 rounded-lg px-3 py-2.5">
                          <div className="w-8 h-8 rounded-full bg-brand-500/10 flex items-center justify-center"><span className="text-xs font-bold text-brand-400">{c.name?.[0] || "?"}</span></div>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{c.name || "—"}</p>
                            <p className="text-[10px] text-neutral-500">{c.role || "—"}</p>
                          </div>
                          <div className="text-right text-xs text-neutral-400">
                            <p className="flex items-center justify-end gap-1"><Phone className="w-3 h-3" /> {c.phone || "—"}</p>
                            {c.email && <p>{c.email}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}