"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Save, ArrowLeft, Trash2 } from "lucide-react";

interface Option {
  id: string;
  name: string;
  slug: string;
}

export default function EditProduct() {
  const router = useRouter();
  const params = useParams();
  const isNew = params.id === "new";

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Option[]>([]);
  const [brands, setBrands] = useState<Option[]>([]);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    sku: "",
    manufacturerCode: "",
    brandId: "",
    categoryId: "",
    price: 0,
    comparePrice: 0,
    stock: 0,
    minStock: 5,
    description: "",
    shortDescription: "",
    isActive: true,
    isFeatured: false,
    isNew: true,
    weight: 0,
    images: [{ url: "", isPrimary: true }],
    specs: [{ specName: "", specValue: "" }],
    tags: [] as string[],
    tagInput: "",
  });

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) => setCategories(data.categories.map((c: any) => ({ id: c.slug, name: c.name, slug: c.slug }))));
    fetch("/api/brands")
      .then((r) => r.json())
      .then((data) => setBrands((data.brands || []).map((b: any) => ({ id: b.id, name: b.name, slug: b.slug }))));

    if (!isNew) {
      fetch(`/api/products/${params.id}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.product) {
            const p = data.product;
            setForm({
              name: p.name,
              slug: p.slug,
              sku: p.sku,
              manufacturerCode: p.manufacturerCode || "",
              brandId: p.brandId || "",
              categoryId: p.category || "",
              price: p.price,
              comparePrice: p.comparePrice || 0,
              stock: p.stock,
              minStock: p.minStock ?? 5,
              description: p.description || "",
              shortDescription: p.shortDescription || "",
              isActive: p.isActive,
              isFeatured: p.featured,
              isNew: p.isNew,
              weight: p.weight || 0,
              images: p.images?.length ? p.images.map((img: any, i: number) => ({
                url: typeof img === "string" ? img : img.url,
                isPrimary: i === 0,
              })) : [{ url: "", isPrimary: true }],
              specs: p.specs?.length ? p.specs.map((s: any) => ({ specName: s.specName || s.name, specValue: s.specValue || s.value })) : [{ specName: "", specValue: "" }],
              tags: p.tags || [],
              tagInput: "",
            });
          }
        })
        .finally(() => setLoading(false));
    }
  }, [params.id, isNew]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : type === "number" ? parseFloat(value) || 0 : value,
    }));
  }

  function addTag(e: React.KeyboardEvent) {
    if (e.key === "Enter" && form.tagInput.trim()) {
      e.preventDefault();
      setForm((prev) => ({ ...prev, tags: [...prev.tags, prev.tagInput.trim()], tagInput: "" }));
    }
  }

  function removeTag(tag: string) {
    setForm((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      name: form.name,
      slug: form.slug,
      sku: form.sku,
      manufacturerCode: form.manufacturerCode,
      brandId: form.brandId || null,
      categoryId: form.categoryId,
      price: form.price,
      comparePrice: form.comparePrice,
      stock: form.stock,
      minStock: form.minStock,
      description: form.description,
      shortDescription: form.shortDescription,
      isActive: form.isActive,
      isFeatured: form.isFeatured,
      isNew: form.isNew,
      weight: form.weight,
      images: form.images.filter((i) => i.url.trim()),
      specs: form.specs.filter((s) => s.specName.trim()),
      tags: form.tags,
    };

    try {
      const url = isNew ? "/api/products" : `/api/products/${params.id}`;
      const res = await fetch(url, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al guardar");
        setSaving(false);
        return;
      }
      router.push("/dashboard/admin/products");
      router.refresh();
    } catch {
      setError("Error de conexión al guardar");
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("¿Seguro que querés eliminar este producto?")) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/products/${params.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al eliminar");
        setSaving(false);
        return;
      }
      router.push("/dashboard/admin/products");
      router.refresh();
    } catch {
      setError("Error de conexión al eliminar");
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-neutral-800 rounded animate-pulse" />
        <div className="h-96 bg-neutral-800/50 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="btn-ghost p-2">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-white">
            {isNew ? "Nuevo Producto" : "Editar Producto"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {!isNew && (
            <button onClick={handleDelete} disabled={saving} className="btn-ghost text-red-400 flex items-center gap-2 text-sm">
              <Trash2 className="w-4 h-4" />
              Eliminar
            </button>
          )}
          <button onClick={handleSubmit} disabled={saving} className="btn-primary flex items-center gap-2 text-sm">
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5 space-y-4">
              <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Información básica</h2>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Nombre del producto</label>
                <input name="name" value={form.name} onChange={handleChange} className="input px-3 w-full" required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Slug</label>
                  <input name="slug" value={form.slug} onChange={handleChange} className="input px-3 w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">SKU</label>
                  <input name="sku" value={form.sku} onChange={handleChange} className="input px-3 w-full" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Categoría</label>
                  <select name="categoryId" value={form.categoryId} onChange={handleChange} className="input px-3 w-full">
                    <option value="">Seleccionar</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.slug}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Marca</label>
                  <select name="brandId" value={form.brandId} onChange={handleChange} className="input px-3 w-full">
                    <option value="">Seleccionar</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Descripción corta</label>
                <input name="shortDescription" value={form.shortDescription} onChange={handleChange} className="input px-3 w-full" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Descripción</label>
                <textarea name="description" value={form.description} onChange={handleChange} rows={4} className="input px-3 w-full resize-none" />
              </div>
            </div>

            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5 space-y-4">
              <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Precios y stock</h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Precio de venta (Gs.)</label>
                  <input name="price" type="number" value={form.price} onChange={handleChange} className="input px-3 w-full" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Precio de lista (Gs.)</label>
                  <input name="comparePrice" type="number" value={form.comparePrice} onChange={handleChange} className="input px-3 w-full" />
                  {form.comparePrice > form.price && form.price > 0 && (
                    <p className="text-xs text-emerald-400 mt-1">
                      Descuento: {Math.round((1 - form.price / form.comparePrice) * 100)}% OFF
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Stock</label>
                  <input name="stock" type="number" value={form.stock} onChange={handleChange} className="input px-3 w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">Stock mínimo</label>
                  <input name="minStock" type="number" value={form.minStock} onChange={handleChange} className="input px-3 w-full" />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5 space-y-4">
              <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Tags</h2>
              <div className="flex flex-wrap gap-2 mb-2">
                {form.tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-neutral-800 text-xs text-gray-300">
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)} className="text-gray-500 hover:text-white">&times;</button>
                  </span>
                ))}
              </div>
              <input
                value={form.tagInput}
                onChange={(e) => setForm((prev) => ({ ...prev, tagInput: e.target.value }))}
                onKeyDown={addTag}
                placeholder="Escribir y presionar Enter para agregar..."
                className="input px-3 w-full text-sm"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5 space-y-4">
              <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Estado</h2>
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))} className="rounded border-gray-600 bg-gray-800" />
                <span className="text-sm text-gray-300">Producto activo</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm((prev) => ({ ...prev, isFeatured: e.target.checked }))} className="rounded border-gray-600 bg-gray-800" />
                <span className="text-sm text-gray-300">Destacado</span>
              </label>
              <label className="flex items-center gap-3">
                <input type="checkbox" checked={form.isNew} onChange={(e) => setForm((prev) => ({ ...prev, isNew: e.target.checked }))} className="rounded border-gray-600 bg-gray-800" />
                <span className="text-sm text-gray-300">Nuevo</span>
              </label>
            </div>

            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5 space-y-3">
              <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Imagen principal</h2>
              <input
                value={form.images[0]?.url || ""}
                onChange={(e) => setForm((prev) => ({ ...prev, images: [{ url: e.target.value, isPrimary: true }] }))}
                placeholder="URL de la imagen..."
                className="input px-3 w-full text-sm"
              />
              {form.images[0]?.url && (
                <div className="w-full aspect-square rounded-lg overflow-hidden bg-neutral-800">
                  <img src={form.images[0].url} alt="" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          </div>
        </div>
      </form>

      {error && (
        <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
