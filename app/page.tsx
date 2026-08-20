"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Zap, Shield, Truck, Award, TrendingUp, Tag, MapPin, Star, Sparkles, Percent, Package } from "lucide-react";
import { api } from "@/lib/api";
import { ProductCard } from "@/components/ProductCard";
import { GridSkeleton } from "@/components/Skeleton";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import type { Product } from "@/lib/types";
import { useSocketEvents } from "@/lib/socket";
import { countPlus } from "@/lib/utils";

function HomeInner() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string; count: number; image: string }[]>([]);
  const [kojima, setKojima] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([api.getProducts({}), api.getCategories(), api.getProducts({ q: "KOJIMA", limit: 12 })])
      .then(([p, c, k]) => {
        if (!alive) return;
        setProducts(p.products || []);
        setCategories(c.categories || []);
        setKojima(k.products || []);
      })
      .catch((e) => {
        console.error(e);
        if (alive) setError("No pudimos cargar los productos");
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  useSocketEvents((evt) => {
    if (evt.type === "product:updated") {
      setProducts((cur) =>
        cur.map((p) => (p.id === evt.payload.id ? { ...p, stock: evt.payload.stock } : p))
      );
    }
  });

  const featured = kojima.slice(0, 10);
  const onSale = products.filter((p) => p.comparePrice && p.comparePrice > p.price).slice(0, 8);
  const newArrivals = products.filter((p) => p.isNew).slice(0, 8);
  const top = products.slice().sort((a, b) => b.sold - a.sold).slice(0, 8);

  return (
    <div className="max-w-7xl mx-auto px-4">
      <section className="hero-grad relative overflow-hidden rounded-2xl mt-6 bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 p-8 md:p-14 text-white">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 70% 20%, white 0%, transparent 40%)" }} />
        <div className="relative max-w-2xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur text-xs font-semibold mb-4">
            <MapPin className="w-3.5 h-3.5" /> Equipá tu vehículo con lo mejor
          </span>
          <h1 className="text-3xl md:text-5xl font-extrabold leading-tight tracking-tight">
            Todo para mejorar, proteger y <span className="underline decoration-white/40">equipar tu vehículo</span>
          </h1>
          <p className="mt-4 text-white/90 text-sm md:text-base max-w-lg">
            Accesorios, multimedia, carpas, detailing, luces, barra led y productos de marcas reconocidas.
            Productos originales, stock real y envíos a todo Paraguay.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <Link href="/products" className="btn bg-white text-brand-700 hover:bg-neutral-100 font-bold text-center">
              Ver catálogo <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="mt-8 grid grid-cols-3 gap-3 sm:gap-4 max-w-md">
            <div>
              <p className="text-xl sm:text-2xl md:text-3xl font-extrabold">{products.length}+</p>
              <p className="text-[10px] sm:text-xs text-white/80">Productos</p>
            </div>
            <div>
              <p className="text-xl sm:text-2xl md:text-3xl font-extrabold">24/48h</p>
              <p className="text-[10px] sm:text-xs text-white/80">Envíos</p>
            </div>
            <div>
              <p className="text-xl sm:text-2xl md:text-3xl font-extrabold flex items-center gap-1">4.8<Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-amber-300 text-amber-300" /></p>
              <p className="text-[10px] sm:text-xs text-white/80">Reseñas</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 mt-6 sm:mt-8">
        {[
          { icon: Truck, title: "Envíos 24/48h", desc: "A todo Paraguay" },
          { icon: Shield, title: "Productos originales", desc: "Marcas verificadas" },
          { icon: Award, title: "Asesoramiento", desc: "Atención personalizada" },
          { icon: Tag, title: "Cuotas sin interés", desc: "Pagá como quieras" },
        ].map((f, i) => (
          <div key={i} className="card p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-brand-500/10 text-brand-400 flex items-center justify-center shrink-0">
              <f.icon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-semibold truncate">{f.title}</p>
              <p className="text-[10px] sm:text-xs text-neutral-500 truncate">{f.desc}</p>
            </div>
          </div>
        ))}
      </section>

      {categories.length > 0 && (
        <section className="mt-10">
          <div className="flex items-end justify-between mb-4">
            <div>
              <h2 className="text-xl md:text-2xl font-bold">Categorías</h2>
              <p className="text-sm text-neutral-400">Explorá por tipo de accesorio</p>
            </div>
            <Link href="/products" className="text-sm text-brand-400 hover:underline">
              Ver todo →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[...categories].sort((a, b) => b.count - a.count).slice(0, 10).map((c) => (
              <Link
                key={c.id}
                href={`/products?category=${c.id}`}
                className="group card overflow-hidden hover:border-brand-500/50 transition"
              >
                <div className="aspect-[4/3] bg-neutral-800 relative">
                  {c.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.image} alt={c.name} referrerPolicy="no-referrer" className="w-full h-full object-cover group-hover:scale-105 transition" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-neutral-600">
                      <Package className="w-10 h-10" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/90 to-transparent" />
                  <div className="absolute bottom-2 left-2 right-2">
                    <p className="font-semibold text-sm text-white">{c.name}</p>
                    <p className="text-[10px] text-white/70">{countPlus(c.count)} productos</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mt-10">
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
              <Zap className="w-5 h-5 text-brand-500" /> Productos Kojima
            </h2>
            <p className="text-sm text-neutral-400">Variedad de productos Kojima</p>
          </div>
          <Link href="/products?q=KOJIMA" className="text-sm text-brand-400 hover:underline">
            Ver todo →
          </Link>
        </div>
        {loading ? (
          <GridSkeleton count={8} />
        ) : error ? (
          <div className="card p-8 text-center text-rose-400">{error}</div>
        ) : featured.length === 0 ? (
          <div className="card p-8 text-center text-neutral-500">No hay productos Kojima disponibles.</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      {onSale.length > 0 && (
        <section className="mt-10">
          <div className="flex items-end justify-between mb-4">
            <div>
              <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                <Percent className="w-5 h-5 text-amber-400" /> Ofertas
              </h2>
              <p className="text-sm text-neutral-400">Productos con descuento</p>
            </div>
            <Link href="/products?sort=price-asc" className="text-sm text-brand-400 hover:underline">Ver todo →</Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {onSale.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      <section className="mt-10">
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" /> Más vendidos
            </h2>
            <p className="text-sm text-neutral-400">Lo que otros ya están disfrutando</p>
          </div>
        </div>
        {!loading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {top.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <div className="flex items-end justify-between mb-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold">Recién llegados</h2>
            <p className="text-sm text-neutral-400">Lo último en stock</p>
          </div>
        </div>
        {!loading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {newArrivals.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function HomePage() {
  return (
    <ErrorBoundary>
      <HomeInner />
    </ErrorBoundary>
  );
}
