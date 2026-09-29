"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, Edit, Search, Package, AlertTriangle, Star, EyeOff, Loader2, ChevronLeft, ChevronRight } from "lucide-react";

interface ProductRow {
  id: string;
  name: string;
  slug: string;
  sku: string;
  price: number;
  stock: number;
  isActive: boolean;
  isFeatured: boolean;
  brand: { name: string };
  category: { name: string; slug: string };
  images: string[];
  sold: number;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  count: number;
}

const STATUS_TABS = [
  { key: "all", label: "Todos", icon: Package },
  { key: "active", label: "Activos", icon: Star },
  { key: "outOfStock", label: "Agotados", icon: AlertTriangle },
  { key: "featured", label: "Destacados", icon: Star },
  { key: "inactive", label: "Inactivos", icon: EyeOff },
];

const PER_PAGE = 100;

export default function AdminProducts() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("createdAt");
  const [categoryTab, setCategoryTab] = useState("all");
  const [statusTab, setStatusTab] = useState("all");
  const [searchInput, setSearchInput] = useState("");

  const totalPages = Math.ceil(total / PER_PAGE);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories || []))
      .catch(() => {});
  }, []);

  const fetchProducts = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({
      sort,
      page: String(page),
      limit: String(PER_PAGE),
    });
    if (categoryTab !== "all") params.set("category", categoryTab);
    if (search) params.set("search", search);
    params.set("includeInactive", "1");

    fetch(`/api/products?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setProducts(d.products || []);
        setTotal(d.total || 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [sort, page, categoryTab, search]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  useEffect(() => { setPage(1); }, [categoryTab, sort, search]);

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const filtered = products.filter((p) => {
    if (statusTab === "active") return p.isActive && p.stock > 0;
    if (statusTab === "outOfStock") return p.stock === 0;
    if (statusTab === "featured") return p.isFeatured;
    if (statusTab === "inactive") return !p.isActive;
    return true;
  });

  const statusCounts = {
    all: products.length,
    active: products.filter((p) => p.isActive && p.stock > 0).length,
    outOfStock: products.filter((p) => p.stock === 0).length,
    featured: products.filter((p) => p.isFeatured).length,
    inactive: products.filter((p) => !p.isActive).length,
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Productos</h1>
          <p className="text-sm text-neutral-500 mt-1">{total.toLocaleString("es-PY")} productos en el catálogo</p>
        </div>
        <Link href="/dashboard/admin/products/new" className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Nuevo Producto
        </Link>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 mb-3 bg-neutral-900 rounded-lg p-0.5 border border-neutral-800 overflow-x-auto scrollbar-thin">
        <button
          onClick={() => setCategoryTab("all")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
            categoryTab === "all" ? "bg-brand-600 text-white" : "text-neutral-400 hover:text-white"
          }`}
        >
          Todas ({total.toLocaleString("es-PY")})
        </button>
        {categories.map((cat) => (
          <button
            key={cat.slug}
            onClick={() => setCategoryTab(cat.slug)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
              categoryTab === cat.slug ? "bg-brand-600 text-white" : "text-neutral-400 hover:text-white"
            }`}
          >
            {cat.name} ({cat.count})
          </button>
        ))}
      </div>

      {/* Status tabs + Search + Sort */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex gap-1 bg-neutral-900 rounded-lg p-0.5 border border-neutral-800">
          {STATUS_TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setStatusTab(t.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
                  statusTab === t.key ? "bg-brand-600 text-white" : "text-neutral-400 hover:text-white"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label} ({statusCounts[t.key as keyof typeof statusCounts]})
              </button>
            );
          })}
        </div>

        <div className="flex-1" />

        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Buscar..."
            className="input pl-9 w-full text-sm"
          />
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="input px-3 text-sm w-40">
          <option value="createdAt">Más recientes</option>
          <option value="sold">Más vendidos</option>
          <option value="price-asc">Menor precio</option>
          <option value="price-desc">Mayor precio</option>
          <option value="name">Nombre A-Z</option>
        </select>
      </div>

      {/* Product cards */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-neutral-800 overflow-hidden">
              <div className="aspect-[4/3] bg-neutral-800/50 animate-pulse" />
              <div className="p-3 space-y-2">
                <div className="h-4 bg-neutral-800/50 rounded animate-pulse" />
                <div className="h-3 w-2/3 bg-neutral-800/50 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-neutral-800 py-16 text-center text-neutral-500">
          No se encontraron productos
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((p) => {
            const statusLabel = p.isFeatured ? "Destacado" : p.isActive ? "Activo" : "Inactivo";
            const statusClass = p.isFeatured
              ? "bg-amber-500/10 text-amber-400"
              : p.isActive
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-rose-500/10 text-rose-400";
            return (
              <div
                key={p.id}
                className="group rounded-xl border border-neutral-800 bg-neutral-900/50 overflow-hidden flex flex-col hover:border-neutral-700 transition-colors"
              >
                <Link
                  href={`/dashboard/admin/products/${p.id}`}
                  className="relative aspect-[4/3] bg-neutral-800 overflow-hidden block"
                >
                  <div className="absolute inset-0 flex items-center justify-center text-neutral-600">
                    <Package className="w-10 h-10" />
                  </div>
                  {p.images?.[0] && (
                    <img
                      src={p.images[0]}
                      alt={p.name}
                      loading="lazy"
                      onError={(e) => { e.currentTarget.style.display = "none"; }}
                      className="relative w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  )}
                  <span
                    className={`absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${statusClass}`}
                  >
                    {p.isFeatured && <Star className="w-3 h-3" />}
                    {statusLabel}
                  </span>
                  {p.stock <= 0 && (
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/90 text-white">
                      Sin stock
                    </span>
                  )}
                </Link>
                <div className="p-3 flex flex-col flex-1">
                  <p className="text-sm text-white font-medium line-clamp-2 min-h-[2.5rem]">{p.name}</p>
                  <p className="text-xs text-neutral-500 mt-1 truncate">
                    {p.brand?.name} · {p.category?.name}
                  </p>
                  <p className="text-[11px] text-neutral-600 mt-0.5 truncate">SKU {p.sku}</p>
                  <div className="flex items-center justify-between gap-2 mt-3">
                    <span className="text-brand-400 font-bold text-sm">
                      Gs. {p.price.toLocaleString("es-PY")}
                    </span>
                    <span
                      className={`text-xs shrink-0 ${
                        p.stock <= 0 ? "text-rose-400 font-medium" : p.stock <= 5 ? "text-amber-400 font-medium" : "text-neutral-400"
                      }`}
                    >
                      Stock: {p.stock}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-neutral-800/70">
                    <span className="text-[11px] text-neutral-500">{p.sold} vendidos</span>
                    <Link
                      href={`/dashboard/admin/products/${p.id}`}
                      className="btn-ghost p-1.5 inline-flex"
                      aria-label="Editar producto"
                    >
                      <Edit className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-neutral-500">
            Página {page} de {totalPages} ({total.toLocaleString("es-PY")} productos)
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-ghost p-2 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 7) {
                pageNum = i + 1;
              } else if (page <= 4) {
                pageNum = i + 1;
              } else if (page >= totalPages - 3) {
                pageNum = totalPages - 6 + i;
              } else {
                pageNum = page - 3 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                    page === pageNum ? "bg-brand-600 text-white" : "text-neutral-400 hover:text-white hover:bg-neutral-800"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="btn-ghost p-2 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
