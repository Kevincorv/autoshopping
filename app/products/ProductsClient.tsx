"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { api } from "@/lib/api";
import { ProductCard } from "@/components/ProductCard";
import { Filters, type FilterState } from "@/components/Filters";
import { GridSkeleton } from "@/components/Skeleton";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useSocketEvents } from "@/lib/socket";
import { SearchX, ChevronLeft, ChevronRight } from "lucide-react";
import type { Product } from "@/lib/types";

const PER_PAGE = 100;

export default function ProductsClient() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const totalPages = Math.ceil(total / PER_PAGE);
  const [filters, setFilters] = useState<FilterState>({
    category: sp.get("category") || "all",
    brand: sp.get("brand") || "all",
    min: sp.get("min") || "",
    max: sp.get("max") || "",
    sort: sp.get("sort") || "featured",
    q: sp.get("q") || "",
  });

  useEffect(() => {
    let alive = true;
    api
      .getCategories()
      .then((c) => alive && setCategories(c.categories || []))
      .catch((e) => console.error(e));
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.category !== "all") params.set("category", filters.category);
    if (filters.brand !== "all") params.set("brand", filters.brand);
    if (filters.min) params.set("min", filters.min);
    if (filters.max) params.set("max", filters.max);
    if (filters.sort !== "featured") params.set("sort", filters.sort);
    if (filters.q) params.set("q", filters.q);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [filters, pathname, router]);

  const fetchProducts = useCallback(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    api
      .getProducts({
        category: filters.category !== "all" ? filters.category : undefined,
        brand: filters.brand !== "all" ? filters.brand : undefined,
        min: filters.min ? Number(filters.min) : undefined,
        max: filters.max ? Number(filters.max) : undefined,
        sort: filters.sort,
        q: filters.q || undefined,
        page,
        limit: PER_PAGE,
      })
      .then((r) => {
        if (alive) {
          setProducts(r.products || []);
          setTotal(r.total || 0);
        }
      })
      .catch((e) => {
        console.error(e);
        if (alive) setError("No pudimos cargar los productos");
      })
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [filters, page]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  useEffect(() => { setPage(1); }, [filters.category, filters.brand, filters.min, filters.max, filters.sort, filters.q]);

  useSocketEvents((evt) => {
    if (evt.type === "product:updated") {
      setProducts((cur) =>
        cur.map((p) => (p.id === evt.payload.id ? { ...p, stock: evt.payload.stock, price: evt.payload.price } : p))
      );
    }
  });

  const brands = useMemo(() => Array.from(new Set(products.map((p) => p.brand))).sort(), [products]);

  return (
    <ErrorBoundary>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-4">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Productos</h1>
          <p className="text-sm text-neutral-400">
            {loading ? "Cargando…" : `${total.toLocaleString("es-PY")} resultado${total !== 1 ? "s" : ""}`}
            {filters.q && (
              <>
                {" "}para &quot;<span className="text-brand-400">{filters.q}</span>&quot;
              </>
            )}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
          <aside>
            <Filters value={filters} onChange={setFilters} brands={brands} categories={categories} />
          </aside>
          <div>
            {error ? (
              <div className="card p-8 text-center text-rose-400">{error}</div>
            ) : loading ? (
              <GridSkeleton count={8} />
            ) : products.length === 0 ? (
              <div className="card p-10 text-center">
                <SearchX className="w-10 h-10 text-neutral-600 mx-auto mb-2" />
                <p className="text-neutral-300">No encontramos productos con esos filtros.</p>
                <button
                  onClick={() => setFilters({ category: "all", brand: "all", min: "", max: "", sort: "featured", q: "" })}
                  className="btn-primary mt-4"
                >
                  Limpiar filtros
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {products.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-8">
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
              </>
            )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
