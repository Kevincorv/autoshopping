"use client";

import { useEffect, useState } from "react";
import { Plus, Edit, Trash2, Search, X } from "lucide-react";

interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  count: number;
}

interface CategoryForm {
  name: string;
  slug: string;
  isActive: boolean;
}

export default function AdminCategories() {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<CategoryForm>({ name: "", slug: "", isActive: true });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) => {
        setCategories((data.categories || []).map((c: any) => ({ id: c.slug, name: c.name, slug: c.slug, count: c.count })));
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const openModal = (category?: CategoryRow) => {
    setEditing(category ? category.slug : null);
    setForm({
      name: category ? category.name : "",
      slug: category ? category.slug : "",
      isActive: true,
    });
    setModalOpen(true);
    setError(null);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setForm({ name: "", slug: "", isActive: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (editing) {
        await fetch(`/api/categories?id=${editing}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      } else {
        await fetch("/api/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      }
      closeModal();
      setError(null);
      // Recargar la lista
      fetch("/api/categories")
        .then((r) => r.json())
        .then((data) => {
          setCategories((data.categories || []).map((c: any) => ({ id: c.slug, name: c.name, slug: c.slug, count: c.count })));
        })
        .catch(() => {});
    } catch (err: any) {
      setError(err?.message || "Error al guardar categoría");
    }
  };

  const handleDelete = async (slug: string) => {
    if (!confirm("¿Eliminar esta categoría?")) return;
    try {
      await fetch(`/api/categories?id=${slug}`, { method: "DELETE" });
      setError(null);
      // Recargar la lista
      fetch("/api/categories")
        .then((r) => r.json())
        .then((data) => {
          setCategories((data.categories || []).map((c: any) => ({ id: c.slug, name: c.name, slug: c.slug, count: c.count })));
        })
        .catch(() => {});
    } catch (err: any) {
      setError(err?.message || "Error al borrar categoría");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Categorías</h1>
        <button className="btn-primary flex items-center gap-2" onClick={() => openModal()}>
          <Plus className="w-4 h-4" /> Nueva Categoría
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-md p-4 mb-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-neutral-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800 bg-neutral-900/50">
                <th className="text-left px-4 py-3 text-neutral-400 font-medium">Nombre</th>
                <th className="text-left px-4 py-3 text-neutral-400 font-medium">Slug</th>
                <th className="text-right px-4 py-3 text-neutral-400 font-medium">Productos</th>
                <th className="text-right px-4 py-3 text-neutral-400 font-medium">Acción</th>
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
                  <td colSpan={4} className="px-4 py-12 text-center text-neutral-500">
                    No hay categorías
                  </td>
                </tr>
              ) : categories.map((cat) => {
                return (
                  <tr key={cat.slug} className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-white font-medium">{cat.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-neutral-300">{cat.slug}</td>
                    <td className="px-4 py-3 text-right text-neutral-300">{cat.count}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          className="btn-ghost p-1.5"
                          onClick={() => openModal(cat)}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          className="btn-ghost p-1.5 text-red-400"
                          onClick={() => handleDelete(cat.slug)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur z-50 animate-fade-in flex items-center justify-center">
          <div className="bg-neutral-950 rounded-xl p-6 w-full max-w-md border border-neutral-800">
            <h2 className="text-xl font-bold mb-4">
              {editing ? `Editar categoría "${editing}"` : "Nueva categoría"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-neutral-300 mb-2">Nombre</label>
                <input
                  name="name"
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  required
                  className="input w-full px-3 py-2 border border-neutral-700 rounded-md text-white placeholder-neutral-500"
                />
              </div>
              <div>
                <label className="block text-sm text-neutral-300 mb-2">Slug</label>
                <input
                  name="slug"
                  value={form.slug}
                  onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
                  required
                  className="input w-full px-3 py-2 border border-neutral-700 rounded-md text-white placeholder-neutral-500"
                />
                {editing && (
                  <p className="text-xs text-neutral-500 mt-1">
                    El slug se genera automáticamente. Cambialo si es necesario.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm text-neutral-300 mb-2">Activo</label>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, isActive: e.target.checked }))
                    }
                    className="rounded border-neutral-700 bg-neutral-800"
                  />
                  <span className="text-neutral-400">Producto activo</span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="btn-primary flex-1"
                >
                  {editing ? "Actualizar" : "Crear"}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="btn-ghost flex-1"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}