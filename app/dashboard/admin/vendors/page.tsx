"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Plus, Pencil, Trash2, Store, Power, Percent } from "lucide-react";

interface Vendor {
  id: string;
  name: string;
  slug: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  commissionPct: number;
  status: string;
  grossSales: number;
  itemsSold: number;
  commission: number;
  _count?: { products: number };
}

const EMPTY = { name: "", contactName: "", email: "", phone: "", commissionPct: "10" };

export default function AdminVendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ...EMPTY });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function load() {
    setLoading(true);
    fetch("/api/admin/vendors")
      .then((r) => r.json())
      .then((data) => setVendors(data.vendors || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function startCreate() {
    setForm({ ...EMPTY });
    setEditingId(null);
    setError("");
    setShowForm(true);
  }

  function startEdit(v: Vendor) {
    setForm({
      name: v.name,
      contactName: v.contactName || "",
      email: v.email || "",
      phone: v.phone || "",
      commissionPct: String(v.commissionPct),
    });
    setEditingId(v.id);
    setError("");
    setShowForm(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        contactName: form.contactName.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        commissionPct: parseFloat(form.commissionPct) || 0,
      };
      const res = await fetch(editingId ? `/api/admin/vendors/${editingId}` : "/api/admin/vendors", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      setShowForm(false);
      load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(v: Vendor) {
    await fetch(`/api/admin/vendors/${v.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: v.status === "active" ? "inactive" : "active" }),
    });
    load();
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar este vendedor? Sus productos quedarán sin vendedor asignado.")) return;
    await fetch(`/api/admin/vendors/${id}`, { method: "DELETE" });
    load();
  }

  const totalGross = vendors.reduce((s, v) => s + v.grossSales, 0);
  const totalCommission = vendors.reduce((s, v) => s + v.commission, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Store className="w-6 h-6 text-red-400" /> Vendedores</h1>
          <p className="text-sm text-neutral-400">Marketplace: proveedores externos con comisión por venta</p>
        </div>
        <button onClick={load} className="btn-secondary flex items-center gap-2" disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Actualizar
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4">
          <p className="text-xs text-neutral-400">Vendedores activos</p>
          <p className="text-2xl font-bold mt-1">{vendors.filter((v) => v.status === "active").length}</p>
        </div>
        <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4">
          <p className="text-xs text-neutral-400">Ventas por vendedores (brutas)</p>
          <p className="text-2xl font-bold mt-1 text-emerald-400">Gs. {Math.round(totalGross).toLocaleString("es-PY")}</p>
        </div>
        <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4">
          <p className="text-xs text-neutral-400">Comisiones acumuladas</p>
          <p className="text-2xl font-bold mt-1 text-amber-400">Gs. {Math.round(totalCommission).toLocaleString("es-PY")}</p>
        </div>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-lg px-4 py-2">{error}</div>}

      {showForm ? (
        <form onSubmit={save} className="bg-neutral-900 rounded-xl border border-neutral-800 p-6 space-y-4 max-w-2xl">
          <h2 className="font-semibold">{editingId ? "Editar vendedor" : "Nuevo vendedor"}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Nombre / Razón social</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-dark w-full" required maxLength={120} />
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Contacto</label>
              <input value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} className="input-dark w-full" maxLength={100} />
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-dark w-full" maxLength={120} />
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Teléfono / WhatsApp</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-dark w-full" maxLength={30} />
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1 flex items-center gap-1"><Percent className="w-3 h-3" /> Comisión (%)</label>
              <input type="number" min={0} max={100} step={0.5} value={form.commissionPct} onChange={(e) => setForm({ ...form, commissionPct: e.target.value })} className="input-dark w-full" required />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Guardando..." : "Guardar"}</button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
          </div>
        </form>
      ) : (
        <button onClick={startCreate} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nuevo vendedor
        </button>
      )}

      {loading ? (
        <p className="text-neutral-500 text-sm">Cargando...</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-neutral-800">
          <table className="w-full text-sm">
            <thead className="bg-neutral-900 text-neutral-400">
              <tr>
                <th className="text-left px-4 py-2">Vendedor</th>
                <th className="text-left px-4 py-2">Productos</th>
                <th className="text-right px-4 py-2">Ventas</th>
                <th className="text-right px-4 py-2">Comisión</th>
                <th className="text-left px-4 py-2">Estado</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {vendors.map((v) => (
                <tr key={v.id} className="border-t border-neutral-800 hover:bg-neutral-900/50">
                  <td className="px-4 py-2">
                    <div className="font-medium">{v.name}</div>
                    <div className="text-neutral-500 text-xs">{v.email || v.phone || "—"}</div>
                  </td>
                  <td className="px-4 py-2">{v._count?.products ?? 0}</td>
                  <td className="px-4 py-2 text-right">
                    <div>Gs. {Math.round(v.grossSales).toLocaleString("es-PY")}</div>
                    <div className="text-neutral-500 text-xs">{v.itemsSold} ítems</div>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="text-amber-400 font-semibold">Gs. {Math.round(v.commission).toLocaleString("es-PY")}</div>
                    <div className="text-neutral-500 text-xs">{v.commissionPct}%</div>
                  </td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${v.status === "active" ? "bg-emerald-500/15 text-emerald-400" : "bg-neutral-700/40 text-neutral-500"}`}>
                      {v.status === "active" ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right space-x-2 whitespace-nowrap">
                    <button onClick={() => startEdit(v)} className="text-neutral-400 hover:text-white"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => toggleStatus(v)} className="text-neutral-400 hover:text-amber-400"><Power className="w-4 h-4" /></button>
                    <button onClick={() => remove(v.id)} className="text-neutral-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
              {vendors.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-neutral-500 text-sm">No hay vendedores. Creá uno para empezar con el marketplace.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
