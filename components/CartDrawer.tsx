"use client";

import { useCart } from "@/lib/store";
import { X, Plus, Minus, ShoppingBag, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Link from "next/link";
import { formatPYG } from "@/lib/utils";
import type { Product } from "@/lib/types";
import { Skeleton } from "./Skeleton";

export function CartDrawer() {
  const open = useCart((s) => s.drawerOpen);
  const close = useCart((s) => s.close);
  const items = useCart((s) => s.items);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const clear = useCart((s) => s.clear);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setLoading(true);
    api
      .getProducts({})
      .then((r) => {
        if (alive) setProducts(r.products || []);
      })
      .catch((e) => console.error(e))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [open]);

  const map = new Map(products.map((p) => [p.id, p]));
  const total = items.reduce((s, i) => {
    const p = map.get(i.productId);
    return s + (p ? p.price * i.quantity : 0);
  }, 0);

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/60 z-50 animate-fade-in" onClick={close} aria-hidden />}
      <aside
        className={classNames(
          "fixed top-0 right-0 z-50 h-full w-full sm:w-[420px] bg-neutral-950 border-l border-neutral-800 shadow-2xl transform transition-transform duration-300 flex flex-col",
          open ? "translate-x-0" : "translate-x-full"
        )}
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between p-4 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-brand-500" />
            <h2 className="font-semibold">Tu carrito</h2>
            <span className="text-xs text-neutral-500">({items.length})</span>
          </div>
          <button onClick={close} aria-label="Cerrar" className="p-2 rounded-md hover:bg-neutral-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {loading && items.length > 0 && (
            <div className="p-4 space-y-3">
              {items.map((i) => (
                <div key={i.productId} className="flex gap-3">
                  <Skeleton className="w-16 h-16 rounded-md shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-3/4" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && items.length === 0 && (
            <div className="p-10 text-center text-neutral-400">
              <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-neutral-700" />
              <p className="text-sm">Tu carrito está vacío</p>
              <Link href="/products" onClick={close} className="btn-primary inline-flex mt-4">
                Explorar productos
              </Link>
            </div>
          )}

          {!loading && items.length > 0 && (
            <ul className="divide-y divide-neutral-800">
              {items.map((it) => {
                const p = map.get(it.productId);
                if (!p) {
                  return (
                    <li key={it.productId} className="p-4 flex items-center justify-between text-sm">
                      <span className="text-neutral-500">Producto no disponible</span>
                      <button onClick={() => remove(it.productId)} className="text-rose-400 text-xs">
                        Quitar
                      </button>
                    </li>
                  );
                }
                return (
                  <li key={it.productId} className="p-4 flex gap-3">
                    <Link
                      href={`/products/${p.id}`}
                      onClick={close}
                      className="w-16 h-16 rounded-md overflow-hidden bg-neutral-800 shrink-0"
                    >
                      {p.images?.[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.images[0]} alt={p.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                      ) : null}
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link href={`/products/${p.id}`} onClick={close} className="text-sm line-clamp-2 hover:text-brand-400">
                        {p.name}
                      </Link>
                      <p className="text-xs text-neutral-500 mt-0.5">{p.brand}</p>
                      <div className="flex items-center justify-between mt-1.5">
                        <div className="flex items-center border border-neutral-800 rounded-md">
                          <button
                            onClick={() => setQty(it.productId, it.quantity - 1)}
                            className="p-1.5 hover:bg-neutral-800"
                            aria-label="Disminuir"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-2 text-sm tabular-nums">{it.quantity}</span>
                          <button
                            onClick={() => setQty(it.productId, it.quantity + 1)}
                            className="p-1.5 hover:bg-neutral-800"
                            aria-label="Aumentar"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="text-sm font-semibold text-brand-400">{formatPYG(p.price * it.quantity)}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => remove(it.productId)}
                      className="p-1.5 self-start rounded-md hover:bg-neutral-800 text-neutral-500 hover:text-rose-400"
                      aria-label="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-neutral-800 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-400">Subtotal</span>
              <span className="text-lg font-bold text-brand-400">{formatPYG(total)}</span>
            </div>
            <Link href="/checkout" onClick={close} className="btn-primary w-full">
              Finalizar compra
            </Link>
            <button
              onClick={() => {
                if (confirm("¿Vaciar el carrito?")) clear();
              }}
              className="btn-ghost w-full text-xs"
            >
              Vaciar carrito
            </button>
          </div>
        )}
      </aside>
    </>
  );
}

function classNames(...xs: (string | false | null | undefined)[]) {
  return xs.filter(Boolean).join(" ");
}
