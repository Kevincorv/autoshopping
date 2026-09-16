"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useWishlist } from "@/lib/store";
import { ProductCard } from "@/components/ProductCard";
import { GridSkeleton } from "@/components/Skeleton";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Heart } from "lucide-react";
import type { Product } from "@/lib/types";

function WishlistInner() {
  const ids = useWishlist((s) => s.ids);
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

  const items = products.filter((p) => ids.includes(p.id));

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-2xl md:text-3xl font-extrabold mb-1">Favoritos</h1>
      <p className="text-sm text-neutral-400 mb-6">{ids.length} {ids.length === 1 ? "producto" : "productos"} guardados</p>

      {loading ? (
        <GridSkeleton count={4} />
      ) : items.length === 0 ? (
        <div className="card p-12 text-center">
          <Heart className="w-12 h-12 text-neutral-700 mx-auto mb-3" />
          <p className="text-neutral-300 mb-4">Aún no tenés productos favoritos</p>
          <Link href="/products" className="btn-primary inline-flex">
            Explorar productos
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function WishlistPage() {
  return (
    <ErrorBoundary>
      <WishlistInner />
    </ErrorBoundary>
  );
}
