"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Search, X, Loader2, Package } from "lucide-react";
import { api } from "@/lib/api";
import { debounce, formatPYG, classNames } from "@/lib/utils";
import { useRouter } from "next/navigation";
import type { Product } from "@/lib/types";
import { Skeleton } from "./Skeleton";

interface Props {
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
  onClose?: () => void;
}

export function SearchBar({ className, placeholder = "Buscar productos, marcas, SKU...", autoFocus, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [took, setTook] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const acRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const runSearch = useCallback(async (q: string) => {
    if (acRef.current) {
      try {
        acRef.current.abort();
      } catch (_) {}
    }
    if (!q || q.trim().length < 1) {
      setResults([]);
      setLoading(false);
      setTook(0);
      return;
    }
    const ac = new AbortController();
    acRef.current = ac;
    setLoading(true);
    try {
      const r = await api.search(q);
      if (!ac.signal.aborted) {
        setResults(r.products || []);
        setTook(r.took || 0);
      }
    } catch (e: any) {
      if (!ac.signal.aborted) {
        console.error("search error", e);
        setResults([]);
      }
    } finally {
      if (!ac.signal.aborted) setLoading(false);
    }
  }, []);

  const debounced = useMemo(() => debounce(runSearch, 300), [runSearch]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value || "";
    setQuery(v);
    setOpen(true);
    if (v.trim().length === 0) {
      setResults([]);
      setLoading(false);
      return;
    }
    debounced(v);
  };

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        onClose?.();
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [onClose]);

  const clear = () => {
    setQuery("");
    setResults([]);
    setLoading(false);
    inputRef.current?.focus();
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length > 0) {
      router.push(`/products?q=${encodeURIComponent(query.trim())}`);
      setOpen(false);
      onClose?.();
    }
  };

  const onPick = (p: Product) => {
    router.push(`/products/${p.id}`);
    setOpen(false);
    onClose?.();
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setOpen(false);
      onClose?.();
    }
  };

  const inputRect = useRef<{ top: number; left: number; width: number } | null>(null);

  const updateRect = useCallback(() => {
    if (inputRef.current) {
      const r = inputRef.current.getBoundingClientRect();
      inputRect.current = { top: r.bottom + 8, left: r.left, width: r.width };
    }
  }, []);

  return (
    <div ref={containerRef} className={classNames("w-full", className)}>
      <form onSubmit={onSubmit}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
          <input
            ref={inputRef}
            value={query}
            onChange={onChange}
            onFocus={() => {
              updateRect();
              if (query.length > 0) setOpen(true);
            }}
            onKeyDown={onKey}
            type="text"
            inputMode="search"
            autoComplete="off"
            spellCheck={false}
            placeholder={placeholder}
            className="input pl-9 pr-20 h-11"
            aria-label="Buscar productos"
            aria-autocomplete="list"
            aria-controls="search-results"
          />
          {query.length > 0 && (
            <button
              type="button"
              onClick={clear}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-neutral-800 text-neutral-400"
              aria-label="Limpiar"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </form>

      {open && query.trim().length > 0 && (() => {
        const rect = inputRect.current;
        const style = rect ? {
          position: 'fixed' as const,
          top: rect.top + 'px',
          left: rect.left + 'px',
          width: rect.width + 'px',
          zIndex: 999,
        } : {};
        return (
        <div
          style={style}
          className="card overflow-hidden shadow-2xl animate-fade-in max-h-[70vh] overflow-y-auto scrollbar-thin"
        >
          {loading && results.length === 0 && (
            <div className="p-3 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-2">
                  <Skeleton className="w-12 h-12 rounded-md shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-2/3" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && results.length === 0 && (
            <div className="p-8 text-center">
              <Package className="w-10 h-10 text-neutral-600 mx-auto mb-2" />
              <p className="text-sm text-neutral-300">No encontramos productos para &quot;{query}&quot;</p>
              <p className="text-xs text-neutral-500 mt-1">Probá con otra marca o palabra clave.</p>
            </div>
          )}

          {!loading && results.length > 0 && (
            <>
              <div className="px-3 py-2 text-xs text-neutral-500 border-b border-neutral-800 flex items-center justify-between">
                <span>
                  {results.length} resultado{results.length !== 1 ? "s" : ""} para &quot;{query}&quot;
                </span>
                {took > 0 && <span>{took}ms</span>}
              </div>
              <ul role="listbox">
                {results.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => onPick(p)}
                      className="w-full flex items-center gap-3 p-2.5 hover:bg-neutral-800/70 transition text-left"
                    >
                      <div className="w-12 h-12 rounded-md overflow-hidden bg-neutral-800 shrink-0">
                        {p.images?.[0] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-neutral-600">
                            <Package className="w-5 h-5" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-neutral-100 truncate">{p.name}</p>
                        <p className="text-xs text-neutral-500 truncate">
                          {p.brand} · {p.sku}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-brand-400">{formatPYG(p.price)}</p>
                        <p className={classNames("text-[10px] mt-0.5", p.stock > 0 ? "text-emerald-400" : "text-rose-400")}>
                          {p.stock > 0 ? `Stock: ${p.stock}` : "Sin stock"}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={onSubmit}
                className="w-full px-3 py-2.5 text-sm font-medium text-brand-400 hover:bg-neutral-800/60 border-t border-neutral-800"
              >
                Ver todos los resultados →
              </button>
            </>
          )}

          {loading && results.length > 0 && (
            <div className="px-3 py-1.5 text-xs text-neutral-500 flex items-center gap-2 border-t border-neutral-800">
              <Loader2 className="w-3 h-3 animate-spin" /> Buscando mas...
            </div>
          )}
        </div>
      );
      })()}
    </div>
  );
}
