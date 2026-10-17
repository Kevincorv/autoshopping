"use client";

import { useEffect, useState } from "react";
import { Search, RefreshCw, Plus, Pencil, Power, Ticket, Percent, Coins } from "lucide-react";

interface Coupon {
  id: string;
  code: string;
  type: string;
  value: number;
  description: string | null;
  minPurchase: number | null;
  maxUses: number | null;
  usedCount: number;
  startsAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
}

const EMPTY_FORM = {
  code: "",
  type: "percentage",
  value: "",
  description: "",
  minPurchase: "",
  maxUses: "",
  startsAt: "",
  expiresAt: "",
};

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function load() {
    setLoading(true);
    fetch("/api/coupons")
      .then((r) => r.json())
      .then((data) => setCoupons(data.coupons || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  function startCreate() {
    setForm({ ...EMPTY_FORM });
    setEditingId(null);
    setError("");
    setShowForm(true);
  }

  function startEdit(c: Coupon) {
    setForm({
      code: c.code,
      type: c.type,
      value: String(c.value),
      description: c.description || "",
      minPurchase: c.minPurchase != null ? String(c.minPurchase) : "",
      maxUses: c.maxUses != null ? String(c.maxUses) : "",
      startsAt: c.startsAt ? c.startsAt.slice(0, 10) : "",
      expiresAt: c.expiresAt ? c.expiresAt.slice(0, 10) : "",
    });
    setEditingId(c.id);
    setError("");
    setShowForm(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const value = parseFloat(form.value);
    if (!form.code.trim() || isNaN(value) || value <= 0) {
      setError("Código y valor son obligatorios (valor > 0)");
      return;
    }
    if (form.type === "percentage" && value > 100) {
      setError("El porcentaje no puede superar 100");
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        code: form.code.trim().toUpperCase(),
        type: form.type,
        value,
        description: form.description.trim() || undefined,
        minPurchase: form.minPurchase ? parseFloat(form.minPurchase) : undefined,
        maxUses: form.maxUses ? parseInt(form.maxUses, 10) : undefined,
        startsAt: form.startsAt || undefined,
        expiresAt: form.expiresAt || undefined,
      };
      const res = await fetch(editingId ? `/api/coupons/${editingId}` : "/api/coupons", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "No se pudo guardar");
        return;
      }
      setShowForm(false);
      load();
    } catch {
      setError("Error de conexión");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(c: Coupon) {
    if (c.isActive) {
      const hasOrders = c.usedCount > 0;
      if (hasOrders && !confirm(`El cupón ${c.code} ya fue usado en ${c.usedCount} orden(es). ¿Desactivarlo de todos modos?`)) return;
      else if (!hasOrders && !confirm(`¿Desactivar el cupón ${c.code}?`)) return;
      const res = await fetch(`/api/coupons/${c.id}`, { method: "DELETE" });
      if (res.ok) load();
    } else {
      const res = await fetch(`/api/coupons/${c.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true }),
      });
      if (res.ok) load();
    }
  }

  const filtered = coupons.filter((c) => c.code.toLowerCase().includes(search.toLowerCase()));

  function couponStatus(c: Coupon): { label: string; cls: string } {
    if (!c.isActive) return { label: "Inactivo", cls: "bg-neutral-800 text-neutral-400 border-neutral-700" };
    if (c.startsAt && new Date(c.startsAt) > new Date()) return { label: "Programado", cls: "bg-sky-500/10 text-sky-400 border-sky-500/20" };
    if (c.expiresAt && new Date(c.expiresAt) < new Date()) return { label: "Expirado", cls: "bg-rose-500/10 text-rose-400 border-rose-500/20" };
    if (c.maxUses != null && c.usedCount >= c.maxUses) return { label: "Agotado", cls: "bg-amber-500/10 text-amber-400 border-amber-500/20" };
    return { label: "Activo", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" };
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Cupones</h1>
          <p className="text-sm text-neutral-500 mt-1">Descuentos para la tienda en línea</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-ghost text-sm flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Actualizar
          </button>
          <button onClick={startCreate} className="btn-primary text-sm flex items-center gap-2">
            <Plus className="w-4 h-4" /> Nuevo cupón
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={save} className="card p-5 mb-6 space-y-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Ticket className="w-4 h-4 text-brand-400" />
            {editingId ? "Editar cupón" : "Nuevo cupón"}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Código *</label>
              <input className="input px-3 py-2 text-sm uppercase w-full" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} maxLength={40} required />
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Tipo *</label>
              <select className="input px-3 py-2 text-sm w-full" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                <option value="percentage">Porcentaje (%)</option>
                <option value="fixed">Monto fijo (Gs.)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1">{form.type === "percentage" ? "Descuento (%) *" : "Descuento (Gs.) *"}</label>
              <input type="number" step="0.01" min="0.01" className="input px-3 py-2 text-sm w-full" value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} required />
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Compra mínima (Gs.)</label>
              <input type="number" step="1" min="0" className="input px-3 py-2 text-sm w-full" value={form.minPurchase} onChange={(e) => setForm((f) => ({ ...f, minPurchase: e.target.value }))} placeholder="Sin mínimo" />
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Usos máximos</label>
              <input type="number" step="1" min="1" className="input px-3 py-2 text-sm w-full" value={form.maxUses} onChange={(e) => setForm((f) => ({ ...f, maxUses: e.target.value }))} placeholder="Ilimitado" />
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Descripción</label>
              <input className="input px-3 py-2 text-sm w-full" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} maxLength={200} placeholder="10% en indumentaria" />
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Vigencia desde</label>
              <input type="date" className="input px-3 py-2 text-sm w-full" value={form.startsAt} onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Vigencia hasta</label>
              <input type="date" className="input px-3 py-2 text-sm w-full" value={form.expiresAt} onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))} />
            </div>
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary px-4 py-2 text-sm">
              {saving ? "Guardando…" : "Guardar"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-ghost px-4 py-2 text-sm">Cancelar</button>
          </div>
        </form>
      )}

      <div className="relative max-w-sm mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por código..."
          className="input pl-9 w-full text-sm"
        />
      </div>

      <div className="rounded-xl border border-neutral-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800 bg-neutral-900/50">
                <th className="text-left px-4 py-3 text-neutral-400 font-medium">Código</th>
                <th className="text-center px-4 py-3 text-neutral-400 font-medium">Descuento</th>
                <th className="text-right px-4 py-3 text-neutral-400 font-medium">Mínimo</th>
                <th className="text-center px-4 py-3 text-neutral-400 font-medium">Usos</th>
                <th className="text-left px-4 py-3 text-neutral-400 font-medium">Vigencia</th>
                <th className="text-center px-4 py-3 text-neutral-400 font-medium">Estado</th>
                <th className="text-center px-4 py-3 text-neutral-400 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="border-b border-neutral-800/50">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="h-4 bg-neutral-800 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-neutral-500">
                    <Ticket className="w-8 h-8 mx-auto mb-2 text-neutral-700" />
                    No hay cupones{search ? " con ese código" : ""}
                  </td>
                </tr>
              ) : (
                filtered.map((c) => {
                  const status = couponStatus(c);
                  return (
                    <tr key={c.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-white font-mono font-semibold">{c.code}</span>
                        {c.description && <p className="text-xs text-neutral-500 mt-0.5">{c.description}</p>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 text-white font-medium">
                          {c.type === "percentage" ? (
                            <><Percent className="w-3.5 h-3.5 text-brand-400" />{c.value}%</>
                          ) : (
                            <><Coins className="w-3.5 h-3.5 text-emerald-400" />Gs. {c.value.toLocaleString("es-PY")}</>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-neutral-400">
                        {c.minPurchase ? `Gs. ${c.minPurchase.toLocaleString("es-PY")}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-neutral-300">{c.usedCount}</span>
                        <span className="text-neutral-600"> / {c.maxUses ?? "∞"}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-neutral-400">
                        {c.startsAt || c.expiresAt ? (
                          <>
                            {c.startsAt ? new Date(c.startsAt).toLocaleDateString("es-PY") : "…"} → {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString("es-PY") : "…"}
                          </>
                        ) : (
                          "Sin límite"
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs font-medium px-2 py-1 rounded-lg border ${status.cls}`}>{status.label}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => startEdit(c)} className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors" title="Editar">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => toggle(c)} className={`p-1.5 rounded-lg transition-colors ${c.isActive ? "text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10" : "text-neutral-400 hover:text-emerald-400 hover:bg-emerald-500/10"}`} title={c.isActive ? "Desactivar" : "Activar"}>
                            <Power className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
