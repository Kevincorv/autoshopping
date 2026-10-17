"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Scale, ShoppingCart, Star, Package, X, ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import { useCompare, useCart, useUI } from "@/lib/store";
import { formatPYG, classNames } from "@/lib/utils";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import type { Product } from "@/lib/types";

function CompareInner() {
  const ids = useCompare((s) => s.ids);
  const remove = useCompare((s) => s.remove);
  const clear = useCompare((s) => s.clear);
  const add = useCart((s) => s.add);
  const showToast = useUI((s) => s.showToast);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ids.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    Promise.all(ids.map((id) => api.getProduct(id).then((r) => r.product).catch(() => null)))
      .then((list) => {
        if (alive) setProducts(list.filter(Boolean) as Product[]);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [ids.join(",")]);

  const allSpecs = Array.from(
    new Set(products.flatMap((p) => (p.specs || []).map((s) => s.name)))
  );

  if (ids.length === 0 && !loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <Scale className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
        <h1 className="text-xl font-bold">No hay productos para comparar</h1>
        <p className="text-sm text-neutral-400 mt-2">
          Agregá hasta 3 productos desde el catálogo con el botón <Scale className="w-4 h-4 inline" /> para compararlos acá.
        </p>
        <Link href="/products" className="btn-primary inline-flex mt-5">
          <ArrowLeft className="w-4 h-4" /> Ir al catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold flex items-center gap-2">
            <Scale className="w-6 h-6 text-brand-400" /> Comparar productos
          </h1>
          <p className="text-sm text-neutral-400 mt-1">Compará hasta 3 repuestos lado a lado.</p>
        </div>
        <button onClick={clear} className="btn-ghost text-sm text-rose-400">
          Vaciar comparación
        </button>
      </div>

      {loading ? (
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${Math.max(ids.length, 1)}, minmax(0, 1fr))` }}>
          {ids.map((id) => (
            <div key={id} className="h-64 bg-neutral-900 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-separate border-spacing-0 min-w-[640px]">
            <thead>
              <tr>
                <th className="w-32" />
                {products.map((p) => (
                  <td key={p.id} className="p-3 align-top" style={{ width: `${100 / products.length}%` }}>
                    <div className="card p-4 relative h-full">
                      <button
                        onClick={() => remove(p.id)}
                        className="absolute top-2 right-2 p-1 rounded-full text-neutral-500 hover:text-rose-400 hover:bg-neutral-800"
                        aria-label="Quitar de la comparación"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <Link href={`/products/${p.id}`} className="block">
                        <div className="aspect-square rounded-lg overflow-hidden bg-neutral-800 mb-3">
                          {p.images?.[0] ? (
                            <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-neutral-600">
                              <Package className="w-10 h-10" />
                            </div>
                          )}
                        </div>
                        <p className="text-[11px] text-neutral-500 uppercase">{p.brand}</p>
                        <h3 className="font-semibold line-clamp-2 min-h-[2.5rem] hover:text-brand-400">{p.name}</h3>
                      </Link>
                      <p className="text-xl font-extrabold text-brand-400 mt-2">{formatPYG(p.price)}</p>
                      {p.comparePrice && p.comparePrice > p.price && (
                        <p className="text-xs text-neutral-500 line-through">{formatPYG(p.comparePrice)}</p>
                      )}
                      <button
                        onClick={() => {
                          add(p.id, 1);
                          showToast(`${p.name} agregado al carrito`, "success");
                        }}
                        disabled={p.stock === 0}
                        className={classNames(
                          "w-full mt-3 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5",
                          p.stock === 0
                            ? "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                            : "bg-brand-500 text-white hover:bg-brand-600"
                        )}
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        {p.stock === 0 ? "Sin stock" : "Agregar al carrito"}
                      </button>
                    </div>
                  </td>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th className="text-left px-3 py-2.5 text-xs text-neutral-400 uppercase tracking-wider">Stock</th>
                {products.map((p) => (
                  <td key={p.id} className="px-3 py-2.5 text-center">
                    <span className={classNames("font-medium", p.stock === 0 ? "text-rose-400" : p.stock <= 5 ? "text-amber-400" : "text-emerald-400")}>
                      {p.stock === 0 ? "Agotado" : `${p.stock} u.`}
                    </span>
                  </td>
                ))}
              </tr>
              <tr>
                <th className="text-left px-3 py-2.5 text-xs text-neutral-400 uppercase tracking-wider">Categoría</th>
                {products.map((p) => (
                  <td key={p.id} className="px-3 py-2.5 text-center text-neutral-300">{p.categoryName || p.category}</td>
                ))}
              </tr>
              <tr>
                <th className="text-left px-3 py-2.5 text-xs text-neutral-400 uppercase tracking-wider">Valoración</th>
                {products.map((p) => (
                  <td key={p.id} className="px-3 py-2.5 text-center">
                    <span className="inline-flex items-center gap-1 text-neutral-300">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      {p.rating.toFixed(1)} ({p.reviews})
                    </span>
                  </td>
                ))}
              </tr>
              <tr>
                <th className="text-left px-3 py-2.5 text-xs text-neutral-400 uppercase tracking-wider">Vendidos</th>
                {products.map((p) => (
                  <td key={p.id} className="px-3 py-2.5 text-center text-neutral-300">{p.sold}</td>
                ))}
              </tr>
              <tr>
                <th className="text-left px-3 py-2.5 text-xs text-neutral-400 uppercase tracking-wider">SKU</th>
                {products.map((p) => (
                  <td key={p.id} className="px-3 py-2.5 text-center font-mono text-xs text-neutral-400">{p.sku}</td>
                ))}
              </tr>
              {allSpecs.map((specName) => (
                <tr key={specName} className="border-t border-neutral-800/50">
                  <th className="text-left px-3 py-2.5 text-xs text-neutral-400 uppercase tracking-wider align-top">{specName}</th>
                  {products.map((p) => {
                    const spec = (p.specs || []).find((s) => s.name === specName);
                    return (
                      <td key={p.id} className="px-3 py-2.5 text-center text-neutral-200 align-top">
                        {spec ? spec.value : <span className="text-neutral-600">—</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function ComparePage() {
  return (
    <ErrorBoundary>
      <CompareInner />
    </ErrorBoundary>
  );
}
