"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Zap, Shield, Truck, Award, TrendingUp, Tag, MapPin, Sparkles, Percent, ChevronRight } from "lucide-react";
import { api } from "@/lib/api";
import { ProductCard } from "@/components/ProductCard";
import { GridSkeleton } from "@/components/Skeleton";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import type { Product } from "@/lib/types";
import { useSocketEvents } from "@/lib/socket";

function HomeInner() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string; count: number; image: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([api.getProducts({}), api.getCategories()])
      .then(([p, c]) => {
        if (!alive) return;
        setProducts(p.products || []);
        setCategories(c.categories || []);
      })
      .catch((e) => {
        console.error(e);
        if (alive) setError("No pudimos cargar los productos");
      })
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  useSocketEvents((evt) => {
    if (evt.type === "product:updated") {
      setProducts((cur) =>
        cur.map((p) => (p.id === evt.payload.id ? { ...p, stock: evt.payload.stock } : p))
      );
    }
  });

  const featured = products.filter((p) => p.featured).slice(0, 8);
  const onSale = products.filter((p) => p.comparePrice && p.comparePrice > p.price).slice(0, 8);
  const newArrivals = products.filter((p) => p.isNew).slice(0, 8);
  const top = products.slice().sort((a, b) => b.sold - a.sold).slice(0, 8);

  return (
    <div className="max-w-7xl mx-auto px-4">
      {/* Hero */}
      <section className="hero-grad relative overflow-hidden rounded-2xl mt-6 bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 p-8 md:p-14 text-white">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 70% 20%, white 0%, transparent 40%)" }} />
        <div className="relative max-w-2xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur text-xs font-semibold mb-4 animate-fade-in">
            <MapPin className="w-3.5 h-3.5" /> San Ignacio Misiones · Envíos a todo Paraguay
          </span>
          <h1 className="text-3xl md:text-5xl font-extrabold leading-tight tracking-tight">
            AUTOSHOPPING: accesorios automotrices{" "}
            <span className="underline decoration-white/40">premium</span>
          </h1>
          <p className="mt-4 text-white/90 text-sm md:text-base max-w-lg">
            Carpitas, multimedias, Suntek 🇺🇸, detailing Vonixx y accesorios Sparco.
            Trabajamos sólo marcas originales, con stock real, precios en guaraníes y atención personalizada.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <Link
              href="/products"
              className="btn bg-white text-brand-700 hover:bg-neutral-100 font-bold text-center inline-flex items-center gap-2"
            >
              Ver catálogo <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/products?category=suntek"
              className="btn bg-white/10 backdrop-blur hover:bg-white/20 text-white text-center"
            >
              Suntek 🇺🇸
            </Link>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 max-w-md">
            <div>
              <p className="text-xl sm:text-2xl md:text-3xl font-extrabold">3000+</p>
              <p className="text-[10px] sm:text-xs text-white/80">Productos</p>
            </div>
            <div>
              <p className="text-xl sm:text-2xl md:text-3xl font-extrabold">24/48h</p>
              <p className="text-[10px] sm:text-xs text-white/80">Envíos</p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 mt-6 sm:mt-8">
        {[
          { icon: Truck, title: "Envíos 24/48h", desc: "A todo Paraguay" },
          { icon: Shield, title: "Productos originales", desc: "Marcas verificadas" },
          { icon: Award, title: "Asesoramiento", desc: "Atención personalizada" },
          { icon: Tag, title: "Cuotas sin interés", desc: "Pagá como quieras" },
        ].map((f, i) => (
          <div key={i} className="card p-3 sm:p-4 flex items-center gap-2 sm:gap-3 hover:border-brand-500/30 transition-colors">
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

      {/* Categories */}
      {categories.length > 0 && (
        <section className="mt-12">
          <div className="flex items-end justify-between mb-5">
            <div>
              <h2 className="text-xl md:text-2xl font-bold">Categorías</h2>
              <p className="text-sm text-neutral-400 mt-0.5">Explorá por tipo de accesorio</p>
            </div>
            <Link href="/products" className="text-sm text-brand-400 hover:underline inline-flex items-center gap-1">
              Ver todo <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {categories.slice(0, 10).map((c) => (
              <Link
                key={c.id}
                href={`/products?category=${c.id}`}
                className="group card overflow-hidden hover:border-brand-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-brand-500/5"
              >
                <div className="aspect-[4/3] bg-neutral-800 relative overflow-hidden">
                  <img
                    src={c.image}
                    alt={c.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/90 via-neutral-950/20 to-transparent" />
                  <div className="absolute bottom-2 left-2 right-2">
                    <p className="font-semibold text-sm text-white">{c.name}</p>
                    <p className="text-[10px] text-white/70">{c.count} productos</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured */}
      <section className="mt-12">
        <div className="flex items-end justify-between mb-5">
          <div>
            <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
              <Zap className="w-5 h-5 text-brand-500" /> Destacados
            </h2>
            <p className="text-sm text-neutral-400 mt-0.5">Los más populares del momento</p>
          </div>
          <Link href="/products" className="text-sm text-brand-400 hover:underline inline-flex items-center gap-1">
            Ver todo <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        {loading ? (
          <GridSkeleton count={8} />
        ) : error ? (
          <div className="card p-8 text-center text-rose-400">{error}</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      {/* On Sale */}
      {onSale.length > 0 && (
        <section className="mt-12">
          <div className="flex items-end justify-between mb-5">
            <div>
              <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                <Percent className="w-5 h-5 text-amber-400" /> Ofertas
              </h2>
              <p className="text-sm text-neutral-400 mt-0.5">Productos con descuento</p>
            </div>
            <Link href="/products?sort=price-asc" className="text-sm text-brand-400 hover:underline inline-flex items-center gap-1">
              Ver todo <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {onSale.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      {/* Top Selling */}
      <section className="mt-12">
        <div className="flex items-end justify-between mb-5">
          <div>
            <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" /> Más vendidos
            </h2>
            <p className="text-sm text-neutral-400 mt-0.5">Lo que otros ya están disfrutando</p>
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

      {/* New Arrivals */}
      <section className="mt-12">
        <div className="flex items-end justify-between mb-5">
          <div>
            <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet-400" /> Recién llegados
            </h2>
            <p className="text-sm text-neutral-400 mt-0.5">Lo último en stock</p>
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

      {/* CTA */}
      <section className="mt-12 mb-8 rounded-2xl bg-gradient-to-r from-brand-600/20 to-brand-500/10 border border-brand-500/20 p-8 text-center">
        <h2 className="text-xl md:text-2xl font-bold">¿No encontrás lo que buscás?</h2>
        <p className="text-neutral-400 mt-2 text-sm">Contactanos por WhatsApp y te asesoramos personalizadamente</p>
        <a
          href="https://wa.me/595985231090?text=Hola,%20quiero%20consultar%20sobre%20un%20producto"
          target="_blank"
          rel="noopener noreferrer"
          className="btn bg-emerald-500 hover:bg-emerald-600 text-white font-bold mt-4 inline-flex items-center gap-2"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          Escribinos por WhatsApp
        </a>
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
