"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { ProductCard } from "@/components/ProductCard";
import { Skeleton } from "@/components/Skeleton";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useCart, useUI, useWishlist } from "@/lib/store";
import { useSocketEvents } from "@/lib/socket";
import { formatPYG, classNames } from "@/lib/utils";
import { WishlistButton } from "@/components/WishlistButton";
import { ChevronLeft, ChevronRight, ShoppingCart, Shield, Truck, RotateCcw, Star, Package, Plus, Minus, Check, MessageCircle } from "lucide-react";
import type { Product } from "@/lib/types";

function getStockInfo(stock: number) {
  if (stock === 0) return { label: "Agotado", color: "text-rose-400", bg: "bg-rose-500/10" };
  if (stock <= 5) return { label: `Últimas ${stock} unidades`, color: "text-amber-400", bg: "bg-amber-500/10" };
  return { label: `${stock} unidades disponibles`, color: "text-emerald-400", bg: "bg-emerald-500/10" };
}

function ProductInner() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [buyNow, setBuyNow] = useState(false);
  const add = useCart((s) => s.add);
  const openCart = useCart((s) => s.open);
  const showToast = useUI((s) => s.showToast);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    setLoading(true);
    setError(null);
    setActiveImage(0);
    setQty(1);
    api
      .getProduct(id)
      .then((r) => {
        if (!alive) return;
        setProduct(r.product);
        setRelated(r.related || []);
      })
      .catch((e) => {
        console.error(e);
        if (alive) setError("No pudimos cargar el producto");
      })
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [id]);

  useSocketEvents((evt) => {
    if (evt.type === "product:updated" && product && evt.payload.id === product.id) {
      setProduct((p) => (p ? { ...p, stock: evt.payload.stock, price: evt.payload.price } : p));
    }
  });

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <Skeleton className="aspect-square w-full rounded-2xl" />
          <div className="grid grid-cols-4 gap-2 mt-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-5 w-1/4" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <Package className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
        <p className="text-neutral-300">{error || "Producto no encontrado"}</p>
        <Link href="/products" className="btn-primary inline-flex mt-4">Volver al catálogo</Link>
      </div>
    );
  }

  const hasDiscount = product.comparePrice && product.comparePrice > product.price;
  const discount = hasDiscount ? Math.round((1 - product.price / (product.comparePrice || 1)) * 100) : 0;
  const outOfStock = product.stock === 0;
  const stockInfo = getStockInfo(product.stock);

  const whatsappMsg = encodeURIComponent(
    `Hola, me interesa: ${product.name}\nPrecio: ${formatPYG(product.price)}\nhttps://autoshopping.vercel.app/products/${product.id}`
  );

  const handleAddToCart = () => {
    if (outOfStock) return;
    add(product.id, qty);
    setAdded(true);
    showToast(`Agregado al carrito (${qty})`, "success");
    setTimeout(() => setAdded(false), 1500);
  };

  const handleBuyNow = () => {
    if (outOfStock) return;
    setBuyNow(true);
    add(product.id, qty);
    setTimeout(() => {
      router.push("/checkout");
    }, 300);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-neutral-500 mb-4 flex-wrap">
        <Link href="/" className="hover:text-brand-400 transition-colors">Inicio</Link>
        <ChevronRight className="w-3 h-3" />
        <Link href="/products" className="hover:text-brand-400 transition-colors">Productos</Link>
        <ChevronRight className="w-3 h-3" />
        {product.categoryName && (
          <>
            <Link href={`/products?category=${product.category}`} className="hover:text-brand-400 transition-colors">{product.categoryName}</Link>
            <ChevronRight className="w-3 h-3" />
          </>
        )}
        <span className="text-neutral-300 truncate max-w-[200px]">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Gallery */}
        <div>
          <div className="aspect-square rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800 relative group">
            {product.images?.[activeImage] ? (
              <img
                src={product.images[activeImage]}
                alt={product.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-neutral-600">
                <Package className="w-16 h-16" />
              </div>
            )}
            {hasDiscount && (
              <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-brand-500 text-white text-sm font-bold shadow-lg">
                -{discount}%
              </div>
            )}
            {product.isNew && (
              <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-emerald-500 text-white text-sm font-bold shadow-lg">
                NUEVO
              </div>
            )}
          </div>
          {product.images && product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-2 mt-3">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={classNames(
                    "aspect-square rounded-lg overflow-hidden border-2 transition-all duration-200",
                    i === activeImage ? "border-brand-500 shadow-lg shadow-brand-500/20" : "border-neutral-800 hover:border-neutral-600"
                  )}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href={`/products?brand=${product.brand?.toLowerCase()}`} className="text-xs text-brand-400 hover:underline uppercase tracking-wider font-medium">
              {product.brand}
            </Link>
            <span className="text-neutral-700">·</span>
            <span className="text-xs text-neutral-500 uppercase tracking-wider">{product.categoryName || product.category}</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold leading-tight">{product.name}</h1>

          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={classNames("w-4 h-4", i < Math.round(product.rating) ? "text-amber-400 fill-amber-400" : "text-neutral-700")} />
              ))}
            </div>
            <span className="text-sm text-neutral-300">{product.rating.toFixed(1)}</span>
            <span className="text-xs text-neutral-500">({product.reviews} reseñas)</span>
            <span className="text-xs text-neutral-500">· {product.sold} vendidos</span>
          </div>

          <div className="mt-4 flex items-end gap-3">
            <p className="text-3xl font-extrabold text-brand-400">{formatPYG(product.price)}</p>
            {hasDiscount && (
              <>
                <p className="text-base text-neutral-500 line-through">{formatPYG(product.comparePrice!)}</p>
                <span className="px-2 py-0.5 text-xs font-bold rounded bg-brand-500/10 text-brand-400 border border-brand-500/20">-{discount}%</span>
              </>
            )}
          </div>

          {/* Stock badge */}
          <div className={classNames("mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium", stockInfo.bg, stockInfo.color)}>
            <span className={classNames("w-1.5 h-1.5 rounded-full", outOfStock ? "bg-rose-400" : product.stock <= 5 ? "bg-amber-400" : "bg-emerald-400")} />
            {stockInfo.label}
          </div>

          <p className="text-sm text-neutral-300 mt-4 leading-relaxed">{product.description}</p>

          {product.specs && product.specs.length > 0 && (
            <div className="mt-4">
              <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Especificaciones</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                {product.specs.map((s, i) => (
                  <div key={i} className="flex justify-between text-sm py-1 border-b border-neutral-800/50">
                    <span className="text-neutral-500">{s.name}</span>
                    <span className="text-neutral-200 font-medium">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quantity + Actions */}
          <div className="mt-6 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center border border-neutral-800 rounded-lg">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="p-2.5 hover:bg-neutral-800 transition-colors" aria-label="Disminuir">
                  <Minus className="w-4 h-4" />
                </button>
                <span className="px-3 text-sm tabular-nums w-10 text-center font-medium">{qty}</span>
                <button
                  onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
                  disabled={qty >= product.stock}
                  className="p-2.5 hover:bg-neutral-800 disabled:opacity-40 transition-colors"
                  aria-label="Aumentar"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="bg-neutral-900 rounded-lg border border-neutral-800">
                <WishlistButton productId={product.id} />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleAddToCart}
                disabled={outOfStock}
                className={classNames(
                  "flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium text-sm transition-all duration-200",
                  outOfStock
                    ? "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                    : added
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                      : "bg-brand-500 text-white hover:bg-brand-600 active:scale-[0.98]"
                )}
              >
                {added ? <><Check className="w-4 h-4" /> Agregado</> : <><ShoppingCart className="w-4 h-4" /> {outOfStock ? "Sin stock" : "Agregar al carrito"}</>}
              </button>
              <button
                onClick={handleBuyNow}
                disabled={outOfStock}
                className={classNames(
                  "flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium text-sm transition-all duration-200",
                  outOfStock
                    ? "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                    : "bg-neutral-800 text-white hover:bg-neutral-700 active:scale-[0.98]"
                )}
              >
                Comprar ahora
              </button>
            </div>

            <a
              href={`https://wa.me/595985231090?text=${whatsappMsg}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-medium text-sm bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
            >
              <MessageCircle className="w-4 h-4" /> Consultar por WhatsApp
            </a>
          </div>

          {/* Trust badges */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              { icon: Truck, t: "Envío 24/48h", d: "Asunción y Central" },
              { icon: Shield, t: "Garantía 1 año", d: "Producto original" },
              { icon: RotateCcw, t: "Devolución gratis", d: "30 días" },
            ].map((b, i) => (
              <div key={i} className="card p-3 flex items-center gap-2">
                <b.icon className="w-4 h-4 text-brand-400 shrink-0" />
                <div>
                  <p className="text-xs font-semibold">{b.t}</p>
                  <p className="text-[10px] text-neutral-500">{b.d}</p>
                </div>
              </div>
            ))}
          </div>

          {product.tags && product.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {product.tags.map((t) => (
                <span key={t} className="px-2 py-1 text-[10px] rounded-full bg-neutral-800 text-neutral-300">#{t}</span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-bold mb-4">Productos relacionados</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {related.slice(0, 4).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default function ProductDetailPage() {
  return (
    <ErrorBoundary>
      <ProductInner />
    </ErrorBoundary>
  );
}
