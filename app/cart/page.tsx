"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useCart } from "@/lib/store";
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, Package } from "lucide-react";
import { formatPYG } from "@/lib/utils";
import { Skeleton } from "@/components/Skeleton";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import type { Product } from "@/lib/types";

function CartInner() {
  const items = useCart((s) => s.items);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const clear = useCart((s) => s.clear);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api
      .getProducts({})
      .then((r) => alive && setProducts(r.products || []))
      .catch((e) => console.error(e))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const map = new Map(products.map((p) => [p.id, p]));
  const subtotal = items.reduce((s, i) => {
    const p = map.get(i.productId);
    return s + (p ? p.price * i.quantity : 0);
  }, 0);
  const shipping = subtotal > 0 ? (subtotal > 2000000 ? 0 : 50000) : 0;
  const total = subtotal + shipping;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-2xl md:text-3xl font-extrabold mb-1">Carrito</h1>
      <p className="text-sm text-neutral-400 mb-6">{items.length} {items.length === 1 ? "producto" : "productos"}</p>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="card p-12 text-center">
          <ShoppingBag className="w-12 h-12 text-neutral-700 mx-auto mb-3" />
          <p className="text-neutral-300 mb-4">Tu carrito está vacío</p>
          <Link href="/products" className="btn-primary inline-flex">
            Explorar productos <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
          <div className="space-y-3">
            {items.map((it) => {
              const p = map.get(it.productId);
              if (!p) return null;
              return (
                <div key={it.productId} className="card p-4 flex gap-4">
                  <Link href={`/products/${p.id}`} className="w-24 h-24 rounded-lg overflow-hidden bg-neutral-800 shrink-0">
                    {p.images?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-600">
                        <Package className="w-8 h-8" />
                      </div>
                    )}
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/products/${p.id}`} className="font-semibold hover:text-brand-400 line-clamp-2">
                      {p.name}
                    </Link>
                    <p className="text-xs text-neutral-500 mt-0.5">{p.brand} · SKU {p.sku}</p>
                    <p className="text-base font-bold text-brand-400 mt-1">{formatPYG(p.price)}</p>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center border border-neutral-800 rounded-md">
                        <button onClick={() => setQty(it.productId, it.quantity - 1)} className="p-1.5 hover:bg-neutral-800" aria-label="Disminuir">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-3 text-sm tabular-nums">{it.quantity}</span>
                        <button
                          onClick={() => setQty(it.productId, Math.min(p.stock, it.quantity + 1))}
                          disabled={it.quantity >= p.stock}
                          className="p-1.5 hover:bg-neutral-800 disabled:opacity-40"
                          aria-label="Aumentar"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <button onClick={() => remove(it.productId)} className="text-rose-400 hover:text-rose-300 p-2">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">{formatPYG(p.price * it.quantity)}</p>
                  </div>
                </div>
              );
            })}
            <button
              onClick={() => {
                if (confirm("¿Vaciar el carrito?")) clear();
              }}
              className="btn-ghost text-xs"
            >
              Vaciar carrito
            </button>
          </div>

          <aside className="card p-5 h-fit sticky top-20">
            <h3 className="font-semibold mb-4">Resumen</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-neutral-400">
                <span>Subtotal</span>
                <span>{formatPYG(subtotal)}</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Envío</span>
                <span>{shipping === 0 ? "Gratis" : formatPYG(shipping)}</span>
              </div>
              {shipping > 0 && (
                <p className="text-[11px] text-emerald-400">
                  ¡Envío gratis en compras mayores a {formatPYG(2000000)}!
                </p>
              )}
              <div className="border-t border-neutral-800 pt-2 flex justify-between font-bold text-base">
                <span>Total</span>
                <span className="text-brand-400">{formatPYG(total)}</span>
              </div>
            </div>
            <Link href="/checkout" className="btn-primary w-full mt-4">
              Finalizar compra <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/products" className="btn-ghost w-full mt-2 text-sm">
              Seguir comprando
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}

export default function CartPage() {
  return (
    <ErrorBoundary>
      <CartInner />
    </ErrorBoundary>
  );
}
