"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, Newspaper, Eye, EyeOff, Search } from "lucide-react";

interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string | null;
  authorName: string;
  tags: string;
  published: boolean;
  publishedAt: string | null;
  createdAt: string;
}

const EMPTY = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  coverImage: "",
  authorName: "AutoShopping",
  tags: "",
  published: false,
  metaTitle: "",
  metaDescription: "",
};

export default function AdminBlog() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function load() {
    setLoading(true);
    fetch("/api/posts?all=1&limit=100")
      .then((r) => r.json())
      .then((data) => setPosts(data.posts || []))
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

  function startEdit(p: Post) {
    setEditingId(p.id);
    setError("");
    setShowForm(true);
    fetch(`/api/posts/${p.id}`)
      .then((r) => r.json())
      .then((data) => {
        const full = data.post;
        if (!full) return;
        setForm({
          title: full.title,
          slug: full.slug,
          excerpt: full.excerpt || "",
          content: full.content || "",
          coverImage: full.coverImage || "",
          authorName: full.authorName || "AutoShopping",
          tags: full.tagList?.join(", ") || full.tags || "",
          published: !!full.published,
          metaTitle: full.metaTitle || "",
          metaDescription: full.metaDescription || "",
        });
      })
      .catch(() => {});
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.title.trim()) {
      setError("El título es obligatorio");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        slug: form.slug || form.title,
        excerpt: form.excerpt,
        content: form.content,
        coverImage: form.coverImage || null,
        authorName: form.authorName,
        tags: form.tags,
        published: form.published,
        metaTitle: form.metaTitle || null,
        metaDescription: form.metaDescription || null,
      };
      const res = await fetch(editingId ? `/api/posts/${editingId}` : "/api/posts", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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

  async function togglePublish(p: Post) {
    const res = await fetch(`/api/posts/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ published: !p.published }),
    });
    if (res.ok) load();
  }

  async function remove(p: Post) {
    if (!confirm(`¿Eliminar el artículo "${p.title}"?`)) return;
    const res = await fetch(`/api/posts/${p.id}`, { method: "DELETE" });
    if (res.ok) load();
  }

  const filtered = posts.filter(
    (p) => p.title.toLowerCase().includes(search.toLowerCase()) || p.slug.includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Blog</h1>
          <p className="text-sm text-neutral-500 mt-1">Artículos para el blog automotriz de la tienda</p>
        </div>
        <button onClick={startCreate} className="btn-primary text-sm flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nuevo artículo
        </button>
      </div>

      {showForm && (
        <form onSubmit={save} className="card p-5 mb-6 space-y-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Newspaper className="w-4 h-4 text-brand-400" />
            {editingId ? "Editar artículo" : "Nuevo artículo"}
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-neutral-400 mb-1">Título *</label>
                <input className="input px-3 py-2 text-sm w-full" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required maxLength={200} />
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1">Slug (URL)</label>
                <input className="input px-3 py-2 text-sm w-full" value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} placeholder="Se genera del título si lo dejás vacío" maxLength={200} />
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1">Extracto</label>
                <textarea className="input px-3 py-2 text-sm w-full" rows={2} value={form.excerpt} onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))} maxLength={500} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Autor</label>
                  <input className="input px-3 py-2 text-sm w-full" value={form.authorName} onChange={(e) => setForm((f) => ({ ...f, authorName: e.target.value }))} maxLength={100} />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Tags (coma)</label>
                  <input className="input px-3 py-2 text-sm w-full" value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} placeholder="mantenión, frenos" maxLength={300} />
                </div>
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1">Imagen de portada (URL)</label>
                <input className="input px-3 py-2 text-sm w-full" value={form.coverImage} onChange={(e) => setForm((f) => ({ ...f, coverImage: e.target.value }))} maxLength={500} />
              </div>
              <label className="flex items-center gap-2 text-sm text-neutral-300">
                <input type="checkbox" checked={form.published} onChange={(e) => setForm((f) => ({ ...f, published: e.target.checked }))} className="rounded border-neutral-600 bg-neutral-800" />
                Publicado (visible en /blog)
              </label>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-neutral-400 mb-1">Contenido (separá párrafos con línea en blanco)</label>
                <textarea className="input px-3 py-2 text-sm w-full font-mono" rows={14} value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Meta título (SEO)</label>
                  <input className="input px-3 py-2 text-sm w-full" value={form.metaTitle} onChange={(e) => setForm((f) => ({ ...f, metaTitle: e.target.value }))} maxLength={200} />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Meta descripción (SEO)</label>
                  <input className="input px-3 py-2 text-sm w-full" value={form.metaDescription} onChange={(e) => setForm((f) => ({ ...f, metaDescription: e.target.value }))} maxLength={300} />
                </div>
              </div>
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
          placeholder="Buscar artículo..."
          className="input pl-9 w-full text-sm"
        />
      </div>

      <div className="rounded-xl border border-neutral-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800 bg-neutral-900/50">
                <th className="text-left px-4 py-3 text-neutral-400 font-medium">Artículo</th>
                <th className="text-left px-4 py-3 text-neutral-400 font-medium">Tags</th>
                <th className="text-center px-4 py-3 text-neutral-400 font-medium">Estado</th>
                <th className="text-right px-4 py-3 text-neutral-400 font-medium">Fecha</th>
                <th className="text-center px-4 py-3 text-neutral-400 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-neutral-800/50">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="h-4 bg-neutral-800 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-neutral-500">
                    <Newspaper className="w-8 h-8 mx-auto mb-2 text-neutral-700" />
                    No hay artículos{search ? " que coincidan" : ""}
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-white font-medium">{p.title}</p>
                      <p className="text-xs text-neutral-500 font-mono">/blog/{p.slug}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-neutral-400">
                      {p.tags || "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => togglePublish(p)}
                        className={`text-xs font-medium px-2 py-1 rounded-lg border inline-flex items-center gap-1 ${
                          p.published
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-neutral-800 text-neutral-400 border-neutral-700"
                        }`}
                      >
                        {p.published ? <><Eye className="w-3 h-3" /> Publicado</> : <><EyeOff className="w-3 h-3" /> Borrador</>}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right text-neutral-400 text-xs">
                      {p.publishedAt ? new Date(p.publishedAt).toLocaleDateString("es-PY") : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {p.published && (
                          <Link href={`/blog/${p.slug}`} target="_blank" className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800" title="Ver">
                            <Eye className="w-4 h-4" />
                          </Link>
                        )}
                        <button onClick={() => startEdit(p)} className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800" title="Editar">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => remove(p)} className="p-1.5 text-neutral-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10" title="Eliminar">
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
    </div>
  );
}
