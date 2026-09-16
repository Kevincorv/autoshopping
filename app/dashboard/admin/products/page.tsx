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
  images: { url: string }[];
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

      {/* Table */}
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
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="border-b border-neutral-800/50">
                    <td colSpan={8} className="px-4 py-3">
                      <div className="h-5 bg-neutral-800/50 rounded animate-pulse" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-neutral-500">
                    No se encontraron productos
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-neutral-800 flex items-center justify-center overflow-hidden shrink-0">
                          {p.images?.[0]?.url ? (
                            <img src={p.images[0].url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-4 h-4 text-neutral-500" />
                          )}
                        </div>
                        <div>
                          <p className="text-white font-medium truncate max-w-[250px]">{p.name}</p>
                          <p className="text-neutral-500 text-xs">{p.brand?.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-neutral-400">{p.sku}</td>
                    <td className="px-4 py-3 text-neutral-400">{p.category?.name}</td>
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
                        p.isFeatured ? "bg-amber-500/10 text-amber-400" : p.isActive ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"
                      }`}>
                        {p.isFeatured && <Star className="w-3 h-3" />}
                        {p.isFeatured ? "Destacado" : p.isActive ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/dashboard/admin/products/${p.id}`} className="btn-ghost p-1.5 inline-flex">
                        <Edit className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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
