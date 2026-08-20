"use client";

import { useEffect, useState } from "react";
import { Plus, Edit, Trash2, X } from "lucide-react";

export default function AdminCategories() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const r = await fetch("/api/categories");
    const data = await r.json();
    setCategories(data.categories || []);
    setLoading(false);
  }

  useEffect(() => {
    load().catch(() => {});
  }, []);

  function openNew() {
    setEditing(null);
    setName("");
    setDescription("");
    setError(null);
    setModalOpen(true);
  }

  function openEdit(cat: any) {
    setEditing(cat);
    setName(cat.name);
    setDescription(cat.description || "");
    setError(null);
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const url = editing ? `/api/categories/${editing.id}` : "/api/categories";
      const res = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al guardar");
        setSaving(false);
        return;
      }
      setModalOpen(false);
      setLoading(true);
      await load();
    } catch {
      setError("Error de conexión");
      setSaving(false);
    }
  }

  async function handleDelete(cat: any) {
    if (!confirm(`¿Seguro que querés eliminar "${cat.name}"?`)) return;
    try {
      const res = await fetch(`/api/categories/${cat.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Error al eliminar");
        return;
      }
      setLoading(true);
      await load();
    } catch {
      alert("Error de conexión");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Categorías</h1>
        <button onClick={openNew} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" />
          Nueva Categoría
        </button>
      </div>

      <div className="rounded-xl border border-neutral-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-800 bg-neutral-900/50">
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Nombre</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Slug</th>
              <th className="text-right px-4 py-3 text-gray-400 font-medium">Productos</th>
              <th className="text-right px-4 py-3 text-gray-400 font-medium">Acción</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-neutral-800/50">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <td key={j} className="px-4 py-4">
                      <div className="h-4 bg-neutral-800 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : categories.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-gray-500">
                  No hay categorías
                </td>
              </tr>
            ) : (
              categories.map((cat) => (
                <tr key={cat.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {cat.image && (
                        <div className="w-10 h-10 rounded-lg bg-neutral-800 overflow-hidden">
                          <img src={cat.image} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <span className="text-white font-medium">{cat.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{cat.slug}</td>
                  <td className="px-4 py-3 text-right text-gray-300">{cat.count}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(cat)} className="btn-ghost p-1.5">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(cat)} className="btn-ghost p-1.5 text-red-400">
                        <Trash2 className="w-4 h-4" />
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

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setModalOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">
                {editing ? "Editar Categoría" : "Nueva Categoría"}
              </h2>
              <button onClick={() => setModalOpen(false)} className="btn-ghost p-1.5">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Nombre</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className="input px-3 w-full" required autoFocus />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Descripción</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="input px-3 w-full resize-none" />
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
                  {saving ? "Guardando..." : editing ? "Guardar cambios" : "Crear categoría"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}