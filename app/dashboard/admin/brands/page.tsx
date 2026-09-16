"use client";

import { useEffect, useState } from "react";
import { Plus, Edit, Trash2, Package, EyeOff, Eye, X, Save, BadgePercent } from "lucide-react";
import { useUI } from "@/lib/store";

interface BrandRow {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  description?: string | null;
  isActive: boolean;
  _count: { products: number };
}

const EMPTY = { name: "", logo: "", description: "" };

export default function BrandsPage() {
  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<BrandRow | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const showToast = useUI((s) => s.showToast);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/brands");
      const data = await r.json();
      setBrands(data.brands || []);
    } catch { /* noop */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(EMPTY); setShowForm(true); };
  const openEdit = (b: BrandRow) => { setEditing(b); setForm({ name: b.name, logo: b.logo || "", description: b.description || "" }); setShowForm(true); };

  const save = async () => {
    if (!form.name.trim()) { showToast("El nombre es obligatorio", "error"); return; }
    setSaving(true);
    try {
      const r = editing
        ? await fetch(`/api/brands/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
        : await fetch("/api/brands", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await r.json();
      if (!r.ok) { showToast(data.error || "Error", "error"); return; }
      showToast(editing ? "Marca actualizada" : "Marca creada", "success");
      setShowForm(false);
      load();
    } catch { showToast("Error de conexión", "error"); }
    finally { setSaving(false); }
  };

  const toggleActive = async (b: BrandRow) => {
    const r = await fetch(`/api/brands/${b.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !b.isActive }) });
    if (r.ok) { showToast(b.isActive ? "Marca desactivada" : "Marca activada", "success"); load(); }
  };

  const remove = async (b: BrandRow) => {
    if (!confirm(`¿Eliminar la marca "${b.name}"?`)) return;
    const r = await fetch(`/api/brands/${b.id}`, { method: "DELETE" });
    const data = await r.json();
    if (!r.ok) { showToast(data.error || "Error", "error"); return; }
    showToast("Marca eliminada", "success");
    load();
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Marcas</h1>
          <p className="text-sm text-neutral-500 mt-1">Toyota, Chevrolet, Hyundai, Kia, Pioneer, Sony y más</p>
        </div>
        <button onClick={openNew} className="btn-primary flex items-center gap-2 text-sm"><Plus className="w-4 h-4" /> Nueva Marca</button>
      </div>

      {showForm && (
        <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              {editing ? <><Edit className="w-4 h-4 text-brand-400" /> Editar marca</> : <><Plus className="w-4 h-4 text-brand-400" /> Nueva marca</>}
            </h2>
            <button onClick={() => setShowForm(false)} className="btn-ghost p-1.5"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Nombre *</label>
              <input className="input py-2 text-sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Toyota" />
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Logo (URL)</label>
              <input className="input py-2 text-sm" value={form.logo} onChange={(e) => setForm({ ...form, logo: e.target.value })} placeholder="https://..." />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-neutral-400 mb-1">Descripción</label>
              <input className="input py-2 text-sm" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end mt-4 gap-2">
            <button onClick={() => setShowForm(false)} className="btn-ghost text-sm">Cancelar</button>
            <button onClick={save} disabled={saving} className="btn-primary text-sm flex items-center gap-2">
              <Save className="w-4 h-4" /> {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-neutral-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800 bg-neutral-900/50">
                <th className="text-left px-4 py-3 text-neutral-400 font-medium">Marca</th>
                <th className="text-left px-4 py-3 text-neutral-400 font-medium">Slug</th>
                <th className="text-right px-4 py-3 text-neutral-400 font-medium">Productos</th>
                <th className="text-center px-4 py-3 text-neutral-400 font-medium">Estado</th>
                <th className="text-right px-4 py-3 text-neutral-400 font-medium">Acciones</th>
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
              ) : brands.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-neutral-500">No hay marcas registradas</td></tr>
              ) : (
                brands.map((b) => (
                  <tr key={b.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {b.logo ? (
                          <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0 overflow-hidden p-1">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={b.logo} alt={b.name} className="max-w-full max-h-full object-contain" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center shrink-0">
                            <BadgePercent className="w-4 h-4 text-neutral-500" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium">{b.name}</p>
                          {b.description && <p className="text-[10px] text-neutral-500 truncate max-w-[240px]">{b.description}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-neutral-500">{b.slug}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-800 text-neutral-300">
                        <Package className="w-3 h-3" /> {b._count.products}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => toggleActive(b)} title={b.isActive ? "Desactivar" : "Activar"}>
                        {b.isActive
                          ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400"><Eye className="w-3 h-3" /> Activa</span>
                          : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-800 text-neutral-400"><EyeOff className="w-3 h-3" /> Inactiva</span>}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(b)} className="btn-ghost p-1.5"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => remove(b)} className="btn-ghost p-1.5 text-rose-400"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}