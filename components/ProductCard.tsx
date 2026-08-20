"use client";

import { useState } from "react";
import Link from "next/link";
import { ShoppingCart, Star, Package } from "lucide-react";
import { useCart, useUI } from "@/lib/store";
import { useSocketEvents } from "@/lib/socket";
import { formatPYG, classNames } from "@/lib/utils";
import { WishlistButton } from "./WishlistButton";
import type { Product } from "@/lib/types";

interface Props {
  product: Product;
}

export function ProductCard({ product }: Props) {
  const add = useCart((s) => s.add);
  const showToast = useUI((s) => s.showToast);
  const [liveStock, setLiveStock] = useState<number | null>(null);
  const stock = liveStock ?? product.stock;
  const hasDiscount = product.comparePrice && product.comparePrice > product.price;
  const discount = hasDiscount ? Math.round((1 - product.price / (product.comparePrice || 1)) * 100) : 0;

  useSocketEvents((evt) => {
    if (evt.type === "product:updated" && evt.payload.id === product.id) {
      setLiveStock(evt.payload.stock);
    }
  });

  return (
    <Link
      href={`/products/${product.id}`}
      className="card overflow-hidden group hover:border-brand-500/50 transition flex flex-col"
    >
      <div className="relative aspect-[4/3] bg-neutral-800 overflow-hidden">
        {product.images?.[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.images[0]}
            alt={product.name}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-600">
            <Package className="w-12 h-12" />
          </div>
        )}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {product.isNew && <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-500 text-white">NUEVO</span>}
          {hasDiscount && <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-brand-500 text-white">-{discount}%</span>}
        </div>
        <div className="absolute top-2 right-2">
          <div className="bg-neutral-900/80 backdrop-blur rounded-full">
            <WishlistButton productId={product.id} size="sm" />
          </div>
        </div>
        {stock === 0 && (
          <div className="absolute inset-0 bg-neutral-950/70 flex items-center justify-center">
            <span className="px-3 py-1 rounded-full bg-rose-500 text-white text-xs font-bold">SIN STOCK</span>
          </div>
        )}
      </div>
      <div className="p-3 flex-1 flex flex-col">
        <p className="text-[11px] text-neutral-500 uppercase tracking-wide">{product.brand}</p>
        <h3 className="text-sm font-medium text-neutral-100 line-clamp-2 mt-0.5 group-hover:text-brand-400 transition min-h-[2.5rem]">
          {product.name}
        </h3>
        <div className="flex items-center gap-1 mt-1 text-xs text-neutral-400">
          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <span>{product.rating.toFixed(1)}</span>
          <span className="text-neutral-600">·</span>
          <span>{product.reviews} reseñas</span>
        </div>
        <div className="mt-2 flex items-end justify-between gap-2">
          <div>
            <p className="text-base font-bold text-brand-400 leading-none">{formatPYG(product.price)}</p>
            {hasDiscount && (
              <p className="text-[11px] text-neutral-500 line-through mt-0.5">{formatPYG(product.comparePrice!)}</p>
            )}
          </div>
          <button
            type="button"
            disabled={stock === 0}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              try {
                add(product.id, 1);
                showToast(`${product.name} agregado al carrito`, "success");
              } catch (err) {
                console.error(err);
              }
            }}
            className="btn-primary px-2.5 py-1.5 text-xs shrink-0"
            aria-label="Agregar al carrito"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Comprar</span>
          </button>
        </div>
        {stock > 0 && stock <= 5 && (
          <p className="mt-1.5 text-[11px] text-amber-400">¡Últimas {stock} unidades!</p>
        )}
      </div>
    </Link>
  );
}
