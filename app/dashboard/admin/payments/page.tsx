"use client";

import { useEffect, useState } from "react";
import { CreditCard, Wallet, Smartphone, QrCode, Banknote, RefreshCw, Plus, X, Edit, Trash2 } from "lucide-react";

const ICON_MAP: Record<string, any> = {
  card: CreditCard,
  wallet: Wallet,
  mobile: Smartphone,
  qr: QrCode,
  cash: Banknote,
};

export default function AdminPayments() {
  const [methods, setMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", type: "efectivo", icon: "cash", commission: 0, minAmount: 0, sortOrder: 0 });

  async function load() {
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/payment-methods");
      const d = await r.json();
      setMethods(d.methods || []);
    } catch {
      setError("Error al cargar métodos de pago");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openNew() {
    setEditing(null);
    setForm({ name: "", type: "efectivo", icon: "cash", commission: 0, minAmount: 0, sortOrder: 0 });
    setModalOpen(true);
  }

  function openEdit(m: any) {
    setEditing(m);
    setForm({ name: m.name, type: m.type || "efectivo", icon: m.icon || "cash", commission: m.commission || 0, minAmount: m.minAmount || 0, sortOrder: m.sortOrder || 0 });
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editing ? `/api/payment-methods/${editing.id}` : "/api/payment-methods";
      const res = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Error al guardar"); setSaving(false); return; }
      setModalOpen(false);
      load();
    } catch {
      setError("Error de conexión");
      setSaving(false);
    }
  }

  async function handleDelete(m: any) {
    if (!confirm(`¿Eliminar "${m.name}"?`)) return;
    const r = await fetch(`/api/payment-methods/${m.id}`, { method: "DELETE" });
    const d = await r.json();
    if (!r.ok) { alert(d.error || "Error"); return; }
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Configuración de Pagos</h1>
        <div className="flex items-center gap-2">
          <button onClick={load} disabled={loading} className="btn-ghost text-sm flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </button>
          <button onClick={openNew} className="btn-primary text-sm flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Agregar método de pago
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm mb-6">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-neutral-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-800 bg-neutral-900/50">
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Método</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Tipo</th>
              <th className="text-right px-4 py-3 text-gray-400 font-medium">Comisión</th>
              <th className="text-right px-4 py-3 text-gray-400 font-medium">Monto mínimo</th>
              <th className="text-right px-4 py-3 text-gray-400 font-medium">Estado</th>
              <th className="text-right px-4 py-3 text-gray-400 font-medium">Acción</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-neutral-800/50">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-4 py-4">
                      <div className="h-4 bg-neutral-800 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : methods.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                  No hay métodos de pago. Hacé clic en &quot;Agregar método de pago&quot; para crear uno.
                </td>
              </tr>
            ) : (
              methods.map((m: any) => {
                const Icon = ICON_MAP[m.icon] || Banknote;
                return (
                  <tr key={m.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5 text-gray-400" />
                        <span className="text-white font-medium">{m.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-300 capitalize">{m.type}</td>
                    <td className="px-4 py-3 text-right text-gray-300">{m.commission}%</td>
                    <td className="px-4 py-3 text-right text-gray-300">
                      Gs. {m.minAmount?.toLocaleString("es-PY") || "0"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        m.isActive ? "bg-emerald-500/10 text-emerald-400" : "bg-neutral-800 text-gray-500"
                      }`}>
                        {m.isActive ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(m)} className="btn-ghost p-1.5">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(m)} className="btn-ghost p-1.5 text-red-400">
                          <Trash2 className="w-4 h-4" />
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

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setModalOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">
                {editing ? "Editar método" : "Agregar método de pago"}
              </h2>
              <button onClick={() => setModalOpen(false)} className="btn-ghost p-1.5">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Nombre</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="input px-3 w-full"
                  required
                  autoFocus
                  placeholder="Ej: Efectivo, Tarjeta, Transferencia..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Tipo</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}
                    className="input px-3 w-full"
                  >
                    <option value="efectivo">Efectivo</option>
                    <option value="tarjeta">Tarjeta</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="credito">Crédito</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Ícono</label>
                  <select
                    value={form.icon}
                    onChange={(e) => setForm((p) => ({ ...p, icon: e.target.value }))}
                    className="input px-3 w-full"
                  >
                    <option value="cash">Efectivo</option>
                    <option value="card">Tarjeta</option>
                    <option value="wallet">Billetera</option>
                    <option value="mobile">Celular</option>
                    <option value="qr">QR</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Comisión (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.commission}
                    onChange={(e) => setForm((p) => ({ ...p, commission: parseFloat(e.target.value) || 0 }))}
                    className="input px-3 w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Monto mínimo (Gs.)</label>
                  <input
                    type="number"
                    value={form.minAmount}
                    onChange={(e) => setForm((p) => ({ ...p, minAmount: parseFloat(e.target.value) || 0 }))}
                    className="input px-3 w-full"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModalOpen(false)} className="btn-ghost px-4 py-2 text-sm">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="btn-primary px-4 py-2 text-sm">
                  {saving ? "Guardando..." : editing ? "Guardar cambios" : "Agregar método"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}