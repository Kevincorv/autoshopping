"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Zap,
  Shield,
  Truck,
  Award,
  Tag,
  MapPin,
  Percent,
  ChevronRight,
  Package,
  TrendingUp,
  Sparkles,
  Clock,
  Headphones,
  Instagram,
} from "lucide-react";
import { api } from "@/lib/api";
import { ProductCard } from "@/components/ProductCard";
import { GridSkeleton } from "@/components/Skeleton";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { WHATSAPP_LINK } from "@/lib/constants";
import { formatPYG } from "@/lib/utils";
import { useSocketEvents } from "@/lib/socket";
import type { Product } from "@/lib/types";

type TabId = "featured" | "sale" | "top" | "new";

const TABS: { id: TabId; label: string; icon: typeof Zap }[] = [
  { id: "featured", label: "Destacados", icon: Zap },
  { id: "sale", label: "Ofertas", icon: Percent },
  { id: "top", label: "Más vendidos", icon: TrendingUp },
  { id: "new", label: "Novedades", icon: Sparkles },
];

const LIMIT = 8;

async function fetchList(params: Record<string, string | number>): Promise<Product[]> {
  try {
    const r = await api.getProducts({ ...params, limit: LIMIT } as any);
    return r.products || [];
  } catch {
    return [];
  }
}

function HomeInner() {
  const [categories, setCategories] = useState<{ id: string; name: string; count: number; image: string }[]>([]);
  const [brands, setBrands] = useState<{ id: string; name: string }[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [lists, setLists] = useState<Record<TabId, Product[]>>({
    featured: [],
    sale: [],
    top: [],
    new: [],
  });
  const [activeTab, setActiveTab] = useState<TabId>("featured");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([
      api.getCategories().catch(() => ({ categories: [] })),
      fetch("/api/brands").then((r) => r.json()).catch(() => ({ brands: [] })),
      api.getProducts({ limit: 1 }).catch(() => ({ products: [], total: 0 })),
      fetchList({ featured: 1 }),
      fetchList({ sale: 1 }),
      fetchList({ sort: "sold" }),
      fetchList({ sort: "new" }),
    ])
      .then(([c, b, p, featured, sale, top, fresh]) => {
        if (!alive) return;
        setCategories(c.categories || []);
        setBrands(((b.brands || []) as { id: string; name: string }[]).slice(0, 12));
        setTotal(p.total || 0);
        setLists({ featured, sale, top, new: fresh });
      })
      .catch((e) => {
        console.error(e);
        if (alive) setError("No pudimos cargar el catálogo. Reintentá en unos segundos.");
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  useSocketEvents((evt) => {
    if (evt.type === "product:updated") {
      setLists((cur) => {
        const next = { ...cur } as Record<TabId, Product[]>;
        (Object.keys(next) as TabId[]).forEach((k) => {
          next[k] = next[k].map((p) =>
            p.id === evt.payload.id ? { ...p, stock: evt.payload.stock, price: evt.payload.price } : p
          );
        });
        return next;
      });
    }
  });

  const activeProducts = lists[activeTab];
  const spotlight = useMemo(() => lists.featured.slice(0, 2), [lists.featured]);

  const benefits = [
    { icon: Truck, title: "Envíos a todo Paraguay", desc: "Coordinamos la entrega con vos" },
    { icon: Shield, title: "Marcas originales", desc: "Stock real y garantía oficial" },
    { icon: Headphones, title: "Asesoramiento", desc: "Te ayudamos a elegir" },
    { icon: Tag, title: "Pagá como quieras", desc: "Transferencia, QR o contra entrega" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4">
      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden rounded-2xl mt-6 bg-gradient-to-br from-brand-700 via-brand-600 to-brand-500 text-white">
        <div className="absolute inset-0 pattern-racing opacity-70" aria-hidden />
        <div
          className="absolute inset-0 opacity-25"
          style={{ backgroundImage: "radial-gradient(circle at 78% 18%, white 0%, transparent 45%)" }}
          aria-hidden
        />
        <div className="absolute -bottom-16 -right-10 w-72 h-72 rounded-full bg-black/15 blur-2xl" aria-hidden />

        <div className="relative grid grid-cols-1 lg:grid-cols-[1.25fr_1fr] gap-8 p-7 md:p-12">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur text-xs font-semibold mb-5 animate-fade-in">
              <MapPin className="w-3.5 h-3.5" /> San Ignacio Misiones · Envíos a todo Paraguay
            </span>

            <p className="eyebrow text-white/90 before:bg-white/70 mb-3">Accesorios y equipamiento automotriz</p>

            <h1 className="text-3xl md:text-5xl font-extrabold leading-[1.08] tracking-tight">
              Tu auto, como vos lo querés
            </h1>

            <p className="mt-4 text-white/90 text-sm md:text-base max-w-lg leading-relaxed">
              Carpitas, multimedias, film <strong>Suntek</strong>, detailing <strong>Vonixx</strong> y equipamiento{" "}
              <strong>Sparco</strong>. Trabajamos sólo marcas originales, con stock real y precios en guaraníes.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Link
                href="/products"
                className="btn bg-white text-brand-700 hover:bg-neutral-100 font-bold text-center inline-flex items-center justify-center gap-2 px-5 py-3"
              >
                Ver catálogo <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/products?sale=1"
                className="btn bg-black/25 backdrop-blur hover:bg-black/35 text-white text-center border border-white/20 px-5 py-3"
              >
                <Percent className="w-4 h-4" /> Ver ofertas
              </Link>
            </div>

            <dl className="mt-8 grid grid-cols-3 gap-3 sm:gap-4 max-w-md">
              <div className="rounded-xl bg-black/20 backdrop-blur px-3 py-2.5 border border-white/10">
                <dt className="text-[10px] uppercase tracking-wider text-white/70">Catálogo</dt>
                <dd className="text-xl sm:text-2xl font-extrabold tabular-nums">
                  {total === null ? "…" : total.toLocaleString("es-PY")}
                </dd>
              </div>
              <div className="rounded-xl bg-black/20 backdrop-blur px-3 py-2.5 border border-white/10">
                <dt className="text-[10px] uppercase tracking-wider text-white/70">Categorías</dt>
                <dd className="text-xl sm:text-2xl font-extrabold tabular-nums">{categories.length || "…"}</dd>
              </div>
              <div className="rounded-xl bg-black/20 backdrop-blur px-3 py-2.5 border border-white/10">
                <dt className="text-[10px] uppercase tracking-wider text-white/70">Atención</dt>
                <dd className="text-xl sm:text-2xl font-extrabold">Directa</dd>
              </div>
            </dl>
          </div>

          {/* Spotlights reales del catálogo */}
          <div className="hidden lg:flex flex-col justify-center gap-3">
            {loading ? (
              <>
                <div className="h-32 rounded-xl bg-white/10 animate-pulse" />
                <div className="h-32 rounded-xl bg-white/10 animate-pulse" />
              </>
            ) : (
              spotlight.map((p) => (
                <Link
                  key={p.id}
                  href={`/products/${p.id}`}
                  className="group flex items-center gap-4 rounded-xl bg-black/25 backdrop-blur border border-white/15 p-3 hover:bg-black/35 hover:border-white/30 transition-all"
                >
                  <div className="w-24 h-24 rounded-lg overflow-hidden bg-black/30 shrink-0 flex items-center justify-center">
                    {p.images?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                    ) : (
                      <Package className="w-8 h-8 text-white/50" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-wider text-white/60 font-semibold">{p.brand}</p>
                    <p className="text-sm font-semibold line-clamp-2">{p.name}</p>
                    <p className="mt-1 text-lg font-extrabold tabular-nums">{formatPYG(p.price)}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 ml-auto shrink-0 text-white/50 group-hover:text-white transition-colors" />
                </Link>
              ))
            )}
          </div>
        </div>
      </section>

      {/* ============ BENEFICIOS ============ */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 mt-4 sm:mt-6" aria-label="Beneficios de comprar en AutoShopping">
        {benefits.map((f, i) => (
          <div key={i} className="card p-3 sm:p-4 flex items-center gap-2 sm:gap-3 hover:border-brand-500/30 transition-colors">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-brand-500/10 text-brand-400 flex items-center justify-center shrink-0">
              <f.icon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-semibold truncate">{f.title}</p>
              <p className="text-[10px] sm:text-xs text-neutral-500 truncate">{f.desc}</p>
            </div>
          </div>
        ))}
      </section>

      {/* ============ CATEGORÍAS ============ */}
      {categories.length > 0 && (
        <section className="mt-12" aria-labelledby="cat-title">
          <div className="section-head">
            <div>
              <p className="eyebrow mb-1.5">Comprá por rubro</p>
              <h2 id="cat-title" className="section-title">Categorías</h2>
            </div>
            <Link href="/products" className="text-sm text-brand-400 hover:underline inline-flex items-center gap-1 shrink-0">
              Ver todo <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {categories.slice(0, 12).map((c) => (
              <Link
                key={c.id}
                href={`/products?category=${encodeURIComponent(c.id)}`}
                className="group card overflow-hidden hover:border-brand-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-brand-500/5"
              >
                <div className="aspect-[4/3] bg-neutral-800 relative overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center text-neutral-600">
                    <Package className="w-8 h-8" />
                  </div>
                  {c.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.image}
                      alt={c.name}
                      className="relative w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      loading="lazy"
                      onError={(e) => { e.currentTarget.style.display = "none"; }}
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/90 via-neutral-950/20 to-transparent" />
                  <div className="absolute bottom-2 left-2 right-2">
                    <p className="font-semibold text-xs sm:text-sm text-white leading-tight line-clamp-2">{c.name}</p>
                    <p className="text-[10px] text-white/70 tabular-nums">{c.count} productos</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ============ PRODUCTOS (tabs) ============ */}
      <section className="mt-12" aria-labelledby="prod-title">
        <div className="section-head flex-col sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow mb-1.5">Selección del momento</p>
            <h2 id="prod-title" className="section-title">Productos</h2>
          </div>
          <Link href="/products" className="text-sm text-brand-400 hover:underline inline-flex items-center gap-1">
            Ver todo el catálogo <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="flex gap-1 overflow-x-auto no-scrollbar border-b border-neutral-800 mb-5" role="tablist" aria-label="Grupos de productos">
          {TABS.map((t) => {
            const selected = activeTab === t.id;
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={selected}
                onClick={() => setActiveTab(t.id)}
                className={`inline-flex items-center gap-1.5 whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors ${
                  selected ? "text-brand-400 tab-indicator" : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                <t.icon className="w-4 h-4" /> {t.label}
                {t.id === "sale" && lists.sale.length > 0 && (
                  <span className="badge bg-brand-500/15 text-brand-300 ml-1">{lists.sale.length}</span>
                )}
              </button>
            );
          })}
        </div>

        <div role="tabpanel" aria-label={TABS.find((t) => t.id === activeTab)?.label}>
          {loading ? (
            <GridSkeleton count={8} />
          ) : error ? (
            <div className="card p-8 text-center text-rose-400">{error}</div>
          ) : activeProducts.length === 0 ? (
            <div className="card p-10 text-center">
              <Package className="w-10 h-10 text-neutral-600 mx-auto mb-2" />
              <p className="text-neutral-300">No hay productos en esta sección por el momento.</p>
              <Link href="/products" className="btn-primary inline-flex mt-4">Explorar el catálogo</Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {activeProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ============ MARCAS ============ */}
      {brands.length > 0 && (
        <section className="mt-12" aria-labelledby="brand-title">
          <div className="section-head">
            <div>
              <p className="eyebrow mb-1.5">Trabajamos con</p>
              <h2 id="brand-title" className="section-title">Marcas disponibles</h2>
            </div>
            <Link href="/products" className="text-sm text-brand-400 hover:underline inline-flex items-center gap-1 shrink-0">
              Ver todo <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {brands.map((b) => (
              <Link
                key={b.id}
                href={`/products?brand=${encodeURIComponent(b.id)}`}
                className="card px-4 py-5 text-center hover:border-brand-500/50 hover:bg-brand-500/5 transition-all group"
              >
                <p className="text-sm font-bold uppercase tracking-wide text-neutral-300 group-hover:text-brand-400 transition-colors line-clamp-2">
                  {b.name}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ============ ENVÍOS + CONTACTO ============ */}
      <section className="mt-12 mb-8 rounded-2xl border border-brand-500/20 bg-gradient-to-r from-brand-600/15 to-brand-500/5 overflow-hidden cut-accent">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-7">
          <div className="md:col-span-2">
            <p className="eyebrow mb-2">Envíos y atención</p>
            <h2 className="text-xl md:text-2xl font-extrabold">¿No encontrás lo que buscás?</h2>
            <p className="text-neutral-400 mt-2 text-sm max-w-xl">
              Coordinamos el envío a todo el país y te asesoramos personalmente para que elijas el producto correcto.
              Escribinos y te respondemos rápido.
            </p>
            <div className="mt-5 flex flex-col sm:flex-row gap-3">
              <a
                href={WHATSAPP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="btn bg-emerald-500 hover:bg-emerald-600 text-white font-bold inline-flex items-center justify-center gap-2 px-5 py-3"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Escribinos por WhatsApp
              </a>
              <Link
                href="/products"
                className="btn border border-neutral-800 hover:border-brand-500/40 hover:bg-neutral-900 font-semibold inline-flex items-center justify-center gap-2 px-5 py-3"
              >
                Seguir comprando <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-3">
              <Clock className="w-4 h-4 text-brand-400 mt-0.5 shrink-0" />
              <span className="text-neutral-300">Atención personalizada de lunes a sábado</span>
            </li>
            <li className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-brand-400 mt-0.5 shrink-0" />
              <span className="text-neutral-300">San Ignacio Misiones, Paraguay — con envíos a todo el país</span>
            </li>
            <li className="flex items-start gap-3">
              <Award className="w-4 h-4 text-brand-400 mt-0.5 shrink-0" />
              <span className="text-neutral-300">Productos originales con respaldo de marca</span>
            </li>
            <li className="flex items-start gap-3">
              <Instagram className="w-4 h-4 text-brand-400 mt-0.5 shrink-0" />
              <a
                href="https://www.instagram.com/autoshoppingsi/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-300 hover:text-brand-400 transition-colors"
              >
                @autoshoppingsi en Instagram
              </a>
            </li>
          </ul>
        </div>
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
