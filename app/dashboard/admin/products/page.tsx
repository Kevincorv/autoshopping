"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Edit, Search, Package, AlertTriangle, Star, EyeOff } from "lucide-react";

interface ProductRow {
  id: string;
  name: string;
  slug: string;
  sku: string;
  price: number;
  stock: number;
  isActive: boolean;
  isFeatured: boolean;
  brand: string;
  category: string;
  categoryName: string;
  images: string[];
  sold: number;
}

const TABS = [
  { key: "all", label: "Todos", icon: Package },
  { key: "active", label: "Activos", icon: Star },
  { key: "outOfStock", label: "Agotados", icon: AlertTriangle },
  { key: "featured", label: "Destacados", icon: Star },
  { key: "inactive", label: "Inactivos", icon: EyeOff },
];

export default function AdminProducts() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("createdAt");
  const [tab, setTab] = useState("all");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

  useEffect(() => {
    fetch(`/api/products?sort=${sort}&limit=5000&all=1`)
      .then((r) => r.json())
      .then((data) => setProducts(data.products || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [sort]);

  const filtered = products.filter((p) => {
    const searchMatch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    if (!searchMatch) return false;
    if (tab === "active") return p.isActive && p.stock > 0;
    if (tab === "outOfStock") return p.stock === 0;
    if (tab === "featured") return p.isFeatured;
    if (tab === "inactive") return !p.isActive;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const counts = {
    all: products.length,
    active: products.filter((p) => p.isActive && p.stock > 0).length,
    outOfStock: products.filter((p) => p.stock === 0).length,
    featured: products.filter((p) => p.isFeatured).length,
    inactive: products.filter((p) => !p.isActive).length,
  };

  useEffect(() => { setPage(1); }, [search, tab, sort]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-neutral-800 rounded animate-pulse" />
        <div className="h-10 bg-neutral-800/50 rounded-lg animate-pulse" />
        <div className="h-64 bg-neutral-800/50 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Productos</h1>
          <p className="text-sm text-neutral-500 mt-1">Gestión de catálogo</p>
        </div>
        <Link
          href="/dashboard/admin/products/new"
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          Nuevo Producto
        </Link>
      </div>

      <div className="flex gap-1 mb-4 bg-neutral-900 rounded-lg p-0.5 border border-neutral-800 overflow-x-auto">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
                tab === t.key
                  ? "bg-brand-600 text-white"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label} ({counts[t.key as keyof typeof counts]})
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar productos..."
            className="input pl-9 w-full text-sm"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="input px-3 text-sm w-40"
        >
          <option value="createdAt">Más recientes</option>
          <option value="sold">Más vendidos</option>
          <option value="price-asc">Menor precio</option>
          <option value="price-desc">Mayor precio</option>
          <option value="name">Nombre A-Z</option>
        </select>
      </div>

      <div className="rounded-xl border border-neutral-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800 bg-neutral-900/50">
                <th className="text-left px-4 py-3 text-neutral-400 font-medium">Producto</th>
                <th className="text-left px-4 py-3 text-neutral-400 font-medium">SKU</th>
                <th className="text-left px-4 py-3 text-neutral-400 font-medium">Categoría</th>
                <th className="text-right px-4 py-3 text-neutral-400 font-medium">Precio</th>
                <th className="text-right px-4 py-3 text-neutral-400 font-medium">Stock</th>
                <th className="text-right px-4 py-3 text-neutral-400 font-medium">Vendidos</th>
                <th className="text-center px-4 py-3 text-neutral-400 font-medium">Estado</th>
                <th className="text-right px-4 py-3 text-neutral-400 font-medium">Acción</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((p) => (
                <tr key={p.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center overflow-hidden shrink-0">
                        {p.images?.[0] ? (
                          <img src={p.images[0]} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-4 h-4 text-neutral-500" />
                        )}
                      </div>
                      <div>
                        <p className="text-white font-medium truncate max-w-[250px]">{p.name}</p>
                        <p className="text-neutral-500 text-xs">{p.brand}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-neutral-400">{p.sku}</td>
                  <td className="px-4 py-3 text-neutral-400">{p.categoryName}</td>
                  <td className="px-4 py-3 text-right text-white font-medium">
                    Gs. {p.price.toLocaleString("es-PY")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={p.stock <= 0 ? "text-rose-400 font-medium" : p.stock <= 5 ? "text-amber-400 font-medium" : "text-neutral-300"}>
                      {p.stock}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-neutral-400">{p.sold}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      p.isFeatured
                        ? "bg-amber-500/10 text-amber-400"
                        : p.isActive
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-rose-500/10 text-rose-400"
                    }`}>
                      {p.isFeatured && <Star className="w-3 h-3" />}
                      {p.isFeatured ? "Destacado" : p.isActive ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/dashboard/admin/products/${p.id}`}
                      className="btn-ghost p-1.5 inline-flex"
                    >
                      <Edit className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))}
              {paged.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-neutral-500">
                    No se encontraron productos
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-neutral-500">
            Mostrando {(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, filtered.length)} de {filtered.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="btn-ghost px-3 py-1.5 text-sm disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="text-sm text-neutral-400">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="btn-ghost px-3 py-1.5 text-sm disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
