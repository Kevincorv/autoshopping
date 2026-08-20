"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { api } from "@/lib/api";
import { ProductCard } from "@/components/ProductCard";
import { Filters, type FilterState } from "@/components/Filters";
import { GridSkeleton } from "@/components/Skeleton";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useSocketEvents } from "@/lib/socket";
import { SearchX } from "lucide-react";
import type { Product } from "@/lib/types";

function pageRange(current: number, total: number, maxVisible = 10): (number | string)[] {
  const pages: (number | string)[] = [];
  if (total <= maxVisible) {
    for (let i = 1; i <= total; i++) pages.push(i);
    return pages;
  }
  const half = Math.floor(maxVisible / 2);
  let start = Math.max(1, current - half);
  let end = Math.min(total, current + half);
  if (current - 1 <= half) { start = 1; end = maxVisible; }
  if (total - current <= half) { start = total - maxVisible + 1; end = total; }
  if (start > 1) {
    pages.push(1);
    if (start > 2) pages.push("…");
  }
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total) {
    if (end < total - 1) pages.push("…");
    pages.push(total);
  }
  return pages;
}

export default function ProductsClient() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 24;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
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
    return () => {
      alive = false;
    };
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

  useEffect(() => {
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
        limit: PAGE_SIZE,
      })
      .then((r) => {
        if (!alive) return;
        setProducts(r.products || []);
        setTotal(r.total || 0);
      })
      .catch((e) => {
        console.error(e);
        if (alive) setError("No pudimos cargar los productos");
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [filters, page]);

  useSocketEvents((evt) => {
    if (evt.type === "product:updated") {
      setProducts((cur) =>
        cur.map((p) => (p.id === evt.payload.id ? { ...p, stock: evt.payload.stock, price: evt.payload.price } : p))
      );
    }
  });

  const brands = useMemo(() => Array.from(new Set(products.map((p) => p.brand))).sort(), [products]);

  function applyFilters(next: FilterState) {
    setFilters(next);
    setPage(1);
  }

  return (
    <ErrorBoundary>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-4">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Productos</h1>
          <p className="text-sm text-neutral-400">
            {loading ? "Cargando…" : `${total} resultado${total !== 1 ? "s" : ""}`}
            {filters.q && (
              <>
                {" "}para &quot;<span className="text-brand-400">{filters.q}</span>&quot;
              </>
            )}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
          <aside>
            <Filters value={filters} onChange={applyFilters} brands={brands} categories={categories} />
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
                  onClick={() => applyFilters({ category: "all", brand: "all", min: "", max: "", sort: "featured", q: "" })}
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
                  <div className="flex items-center justify-center gap-1.5 mt-8 flex-wrap">
                    <button
                      onClick={() => { setPage((p) => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                      disabled={page === 1}
                      className="btn-ghost text-sm px-3 py-1.5 disabled:opacity-30"
                    >
                      Anterior
                    </button>
                    {pageRange(page, totalPages, 10).map((p, i) =>
                      typeof p === "string" ? (
                        <span key={`gap-${i}`} className="px-1 text-neutral-600">…</span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => { setPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                          className={`min-w-[2rem] h-8 rounded-md text-sm font-medium transition ${
                            p === page
                              ? "bg-brand-600 text-white"
                              : "hover:bg-neutral-800 text-neutral-400"
                          }`}
                        >
                          {p}
                        </button>
                      )
                    )}
                    <button
                      onClick={() => { setPage((p) => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                      disabled={page === totalPages}
                      className="btn-ghost text-sm px-3 py-1.5 disabled:opacity-30"
                    >
                      Siguiente
                    </button>
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
