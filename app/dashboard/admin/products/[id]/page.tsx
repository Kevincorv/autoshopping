"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Save, ArrowLeft, Trash2, Plus } from "lucide-react";

interface Option {
  id: string;
  name: string;
  slug: string;
}

interface ImageItem {
  id?: string;
  url: string;
  alt: string;
  isPrimary: boolean;
}

export default function EditProduct() {
  const router = useRouter();
  const params = useParams();
  const isNew = params.id === "new";

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [imgBusy, setImgBusy] = useState(false);
  const [categories, setCategories] = useState<Option[]>([]);
  const [brands, setBrands] = useState<Option[]>([]);
  const [images, setImages] = useState<ImageItem[]>([{ url: "", isPrimary: true, alt: "" }]);
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
              specs: p.specs?.length ? p.specs.map((s: any) => ({ specName: s.specName || s.name, specValue: s.specValue || s.value })) : [{ specName: "", specValue: "" }],
              tags: p.tags || [],
              tagInput: "",
            });
            const arr: ImageItem[] = (p.images as any[]).map((img: any) => ({
              id: typeof img === "string" ? undefined : img.id,
              url: typeof img === "string" ? img : img.url,
              alt: typeof img === "string" ? "" : img.alt || "",
              isPrimary: typeof img === "string" ? false : !!img.isPrimary,
            }));
            if (arr.length && !arr.some((i) => i.isPrimary)) arr[0].isPrimary = true;
            setImages(arr.length ? arr : [{ url: "", isPrimary: true, alt: "" }]);
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

  async function addImage() {
    const url = newImageUrl.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
      setError("La URL debe empezar con http:// o https://");
      return;
    }
    setError(null);
    setNewImageUrl("");

    // preview optimista inmediato
    const tempId = `temp-${Date.now()}`;
    setImages((prev) => {
      const hasPrimary = prev.some((i) => i.isPrimary && i.url);
      const arr = prev.filter((i) => i.url);
      return [...arr, { id: tempId, url, alt: "", isPrimary: !hasPrimary }];
    });

    if (isNew) return;

    setImgBusy(true);
    try {
      const res = await fetch(`/api/products/${params.id}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al guardar la imagen");
      setImages((prev) => prev.map((i) => (i.id === tempId ? { ...i, id: data.image.id } : i)));
    } catch (e: any) {
      setImages((prev) => prev.filter((i) => i.id !== tempId));
      setError(e.message || "Error al agregar la imagen");
    } finally {
      setImgBusy(false);
    }
  }

  async function removeImage(idx: number) {
    const img = images[idx];
    if (!img || !img.url) return;

    if (isNew || !img.id) {
      setImages((prev) => {
        const arr = prev.filter((_, i) => i !== idx);
        if (arr.length && !arr.some((i) => i.isPrimary)) arr[0].isPrimary = true;
        return arr.length ? arr : [{ url: "", isPrimary: true, alt: "" }];
      });
      return;
    }

    setImgBusy(true);
    try {
      const res = await fetch(`/api/products/${params.id}/images/${img.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al eliminar");
      }
      setImages((prev) => {
        const arr = prev.filter((_, i) => i !== idx);
        if (arr.length && !arr.some((i) => i.isPrimary)) arr[0].isPrimary = true;
        return arr.length ? arr : [{ url: "", isPrimary: true, alt: "" }];
      });
    } catch (e: any) {
      setError(e.message || "Error al eliminar la imagen");
    } finally {
      setImgBusy(false);
    }
  }

  async function setPrimaryImage(idx: number) {
    const img = images[idx];
    if (!img || img.isPrimary) return;

    setImages((prev) => prev.map((im, i) => ({ ...im, isPrimary: i === idx })));

    if (isNew || !img.id) return;

    setImgBusy(true);
    try {
      const res = await fetch(`/api/products/${params.id}/images/${img.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPrimary: true }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al marcar principal");
      }
    } catch (e: any) {
      setError(e.message || "Error al marcar principal");
    } finally {
      setImgBusy(false);
    }
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
      images: images.filter((i) => i.url.trim()),
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
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Imágenes (URL)</h2>
                {imgBusy && <span className="text-xs text-neutral-500">Guardando...</span>}
              </div>

              <div className="flex gap-2">
                <input
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addImage(); } }}
                  placeholder="Pegar URL (https://...) y Enter"
                  className="input px-3 w-full text-sm"
                />
                <button type="button" onClick={addImage} disabled={imgBusy || !newImageUrl.trim()} className="btn-primary px-3 py-2 text-sm whitespace-nowrap disabled:opacity-50">
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {images.filter((i) => i.url.trim()).length === 0 ? (
                <p className="text-xs text-gray-500">Sin imágenes. Agregá una URL arriba.</p>
              ) : (
                <div className="space-y-2">
                  {images.map((img, idx) => (
                    !img.url.trim() ? null : (
                      <div key={img.id || idx} className="flex items-start gap-3 p-2 rounded-lg bg-neutral-800/50">
                        <div className="relative w-16 h-16 rounded-md overflow-hidden bg-neutral-700 flex-shrink-0">
                          <img src={img.url} alt={img.alt} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          {img.isPrimary && (
                            <span className="absolute top-0.5 left-0.5 px-1 py-0.5 rounded bg-emerald-500/90 text-white text-[9px] font-bold">PRAL</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <p className="text-xs text-neutral-400 truncate" title={img.url}>{img.url}</p>
                          <div className="flex items-center gap-3">
                            <button type="button" onClick={() => setPrimaryImage(idx)} disabled={img.isPrimary || imgBusy} className="text-xs text-blue-400 hover:text-blue-300 disabled:text-gray-600">
                              {img.isPrimary ? "Principal" : "Marcar principal"}
                            </button>
                            <button type="button" onClick={() => removeImage(idx)} disabled={imgBusy} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 disabled:opacity-50">
                              <Trash2 className="w-3 h-3" /> Quitar
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  ))}
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
