"use client";

import { useState } from "react";
import Link from "next/link";
import { ShoppingCart, Star, Package, MessageCircle, Check } from "lucide-react";
import { useCart, useUI } from "@/lib/store";
import { useSocketEvents } from "@/lib/socket";
import { formatPYG } from "@/lib/utils";
import { WishlistButton } from "./WishlistButton";
import { WHATSAPP_LINK } from "@/lib/constants";
import type { Product } from "@/lib/types";

interface Props {
  product: Product;
}

function getStockInfo(stock: number) {
  if (stock === 0) return { label: "Agotado", color: "text-rose-400", dot: "bg-rose-400" };
  if (stock <= 5) return { label: `Últimas ${stock} u.`, color: "text-amber-400", dot: "bg-amber-400" };
  return { label: "En stock", color: "text-emerald-400", dot: "bg-emerald-400" };
}

export function ProductCard({ product }: Props) {
  const add = useCart((s) => s.add);
  const showToast = useUI((s) => s.showToast);
  const [liveStock, setLiveStock] = useState<number | null>(null);
  const [added, setAdded] = useState(false);
  const stock = liveStock ?? product.stock;
  const hasDiscount = product.comparePrice && product.comparePrice > product.price;
  const discount = hasDiscount ? Math.round((1 - product.price / (product.comparePrice || 1)) * 100) : 0;
  const stockInfo = getStockInfo(stock);

  useSocketEvents((evt) => {
    if (evt.type === "product:updated" && evt.payload.id === product.id) {
      setLiveStock(evt.payload.stock);
    }
  });

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (stock === 0 || added) return;
    add(product.id, 1);
    setAdded(true);
    showToast(`${product.name} agregado al carrito`, "success");
    setTimeout(() => setAdded(false), 1500);
  };

  const whatsappMsg = encodeURIComponent(
    `Hola, me interesa: ${product.name}\nPrecio: ${formatPYG(product.price)}\nhttps://autoshopping.vercel.app/products/${product.id}`
  );

  return (
    <Link
      href={`/products/${product.id}`}
      className="card overflow-hidden group hover:border-brand-500/50 hover:shadow-lg hover:shadow-brand-500/5 transition-all duration-300 flex flex-col"
    >
      <div className="relative aspect-[4/3] bg-neutral-800 overflow-hidden">
        {product.images?.[0] ? (
          <img
            src={product.images[0]}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-600">
            <Package className="w-12 h-12" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {product.isNew && (
            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-500 text-white shadow-sm">NUEVO</span>
          )}
          {hasDiscount && (
            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-brand-500 text-white shadow-sm">-{discount}%</span>
          )}
        </div>

        <div className="absolute top-2 right-2">
          <div className="bg-neutral-900/80 backdrop-blur rounded-full">
            <WishlistButton productId={product.id} size="sm" />
          </div>
        </div>

        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
          <a
            href={`https://wa.me/595985231090?text=${whatsappMsg}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-2 rounded-full bg-emerald-500/90 backdrop-blur text-white hover:bg-emerald-600 transition-colors shadow-lg"
            title="Consultar por WhatsApp"
          >
            <MessageCircle className="w-4 h-4" />
          </a>
        </div>

        {stock === 0 && (
          <div className="absolute inset-0 bg-neutral-950/70 flex items-center justify-center backdrop-blur-[1px]">
            <span className="px-4 py-1.5 rounded-full bg-rose-500/90 text-white text-xs font-bold tracking-wide">SIN STOCK</span>
          </div>
        )}
      </div>

      <div className="p-3 flex-1 flex flex-col">
        <p className="text-[11px] text-neutral-500 uppercase tracking-wide font-medium">{product.brand}</p>
        <h3 className="text-sm font-medium text-neutral-100 line-clamp-2 mt-0.5 group-hover:text-brand-400 transition min-h-[2.5rem]">
          {product.name}
        </h3>

        <div className="flex items-center gap-2 mt-1.5">
          <div className="flex items-center gap-0.5 text-xs text-neutral-400">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span>{product.rating.toFixed(1)}</span>
          </div>
          <span className="text-neutral-700">·</span>
          <div className="flex items-center gap-1 text-xs">
            <span className={`w-1.5 h-1.5 rounded-full ${stockInfo.dot}`} />
            <span className={stockInfo.color}>{stockInfo.label}</span>
          </div>
        </div>

        <div className="mt-auto pt-3 flex items-end justify-between gap-2">
          <div>
            <p className="text-lg font-extrabold text-brand-400 leading-none">{formatPYG(product.price)}</p>
            {hasDiscount && (
              <p className="text-[11px] text-neutral-500 line-through mt-0.5">{formatPYG(product.comparePrice!)}</p>
            )}
          </div>
          <button
            type="button"
            disabled={stock === 0}
            onClick={handleAdd}
            className={`px-3 py-2 text-xs font-medium rounded-lg transition-all duration-200 shrink-0 flex items-center gap-1.5 ${
              stock === 0
                ? "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                : added
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                  : "bg-brand-500/10 text-brand-400 border border-brand-500/30 hover:bg-brand-500/20 active:scale-95"
            }`}
            aria-label="Agregar al carrito"
          >
            {added ? (
              <>
                <Check className="w-3.5 h-3.5" />
                Agregado
              </>
            ) : (
              <>
                <ShoppingCart className="w-3.5 h-3.5" />
                Comprar
              </>
            )}
          </button>
        </div>
      </div>
    </Link>
  );
}
