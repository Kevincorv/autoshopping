"use client";

import { useEffect, useMemo, useState } from "react";
import { Car, Search } from "lucide-react";
import { api } from "@/lib/api";
import { ProductCard } from "@/components/ProductCard";
import { Skeleton } from "@/components/Skeleton";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import type { Product } from "@/lib/types";

interface VehicleModelInfo {
  id: string;
  name: string;
  slug: string;
  yearFrom: number | null;
  yearTo: number | null;
  productCount: number;
}

interface VehicleMakeInfo {
  id: string;
  name: string;
  slug: string;
  models: VehicleModelInfo[];
}

function yearsForModel(m: VehicleModelInfo | null): number[] {
  if (!m) return [];
  const current = new Date().getFullYear();
  const from = m.yearFrom ?? current - 15;
  const to = m.yearTo ?? current + 1;
  const years: number[] = [];
  for (let y = to; y >= from; y--) years.push(y);
  return years;
}

function VehiclesInner() {
  const [makes, setMakes] = useState<VehicleMakeInfo[]>([]);
  const [loadingMakes, setLoadingMakes] = useState(true);
  const [makeIdx, setMakeIdx] = useState(-1);
  const [modelIdx, setModelIdx] = useState(-1);
  const [year, setYear] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    fetch("/api/vehicles")
      .then((r) => r.json())
      .then((data) => setMakes(data.makes || []))
      .catch(() => setMakes([]))
      .finally(() => setLoadingMakes(false));
  }, []);

  const make = makeIdx >= 0 ? makes[makeIdx] : null;
  const model = make && modelIdx >= 0 ? make.models[modelIdx] : null;
  const years = useMemo(() => yearsForModel(model), [model]);

  async function search() {
    if (!model) return;
    setSearching(true);
    setSearched(true);
    try {
      const r = await api.getProducts({
        vehicle: model.slug,
        vehicleYear: year ? parseInt(year, 10) : undefined,
        limit: 100,
      });
      setProducts(r.products);
      setTotal(r.total);
    } catch {
      setProducts([]);
      setTotal(0);
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold flex items-center gap-2">
          <Car className="w-6 h-6 text-brand-400" /> Buscar por vehículo
        </h1>
        <p className="text-sm text-neutral-400 mt-1">
          Elegí tu marca, modelo y año para ver los repuestos compatibles.
        </p>
      </div>

      <div className="card p-4 md:p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs text-neutral-400 mb-1">Marca</label>
            <select
              className="input px-3 py-2 text-sm w-full"
              value={makeIdx}
              onChange={(e) => {
                setMakeIdx(parseInt(e.target.value, 10));
                setModelIdx(-1);
                setYear("");
                setProducts([]);
                setSearched(false);
              }}
              disabled={loadingMakes}
            >
              <option value={-1}>{loadingMakes ? "Cargando…" : "Elegí una marca"}</option>
              {makes.map((m, i) => (
                <option key={m.id} value={i}>{m.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-neutral-400 mb-1">Modelo</label>
            <select
              className="input px-3 py-2 text-sm w-full"
              value={modelIdx}
              onChange={(e) => {
                setModelIdx(parseInt(e.target.value, 10));
                setYear("");
                setProducts([]);
                setSearched(false);
              }}
              disabled={!make}
            >
              <option value={-1}>{make ? "Elegí un modelo" : "Elegí una marca primero"}</option>
              {make?.models.map((m, i) => (
                <option key={m.id} value={i}>
                  {m.name}{m.productCount === 0 ? " (sin repuestos cargados)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-neutral-400 mb-1">Año (opcional)</label>
            <select
              className="input px-3 py-2 text-sm w-full"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              disabled={!model}
            >
              <option value="">Todos los años</option>
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <button
            onClick={search}
            disabled={!model || searching}
            className="btn-primary py-2.5 flex items-center justify-center gap-2"
          >
            <Search className="w-4 h-4" />
            {searching ? "Buscando…" : "Buscar repuestos"}
          </button>
        </div>
      </div>

      {searched && (
        <section className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">
              {model ? `Repuestos para ${make?.name} ${model.name}${year ? ` ${year}` : ""}` : "Resultados"}
            </h2>
            <span className="text-sm text-neutral-400">{total} resultado{total === 1 ? "" : "s"}</span>
          </div>

          {searching ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-64 rounded-xl" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="card p-10 text-center">
              <Car className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
              <p className="text-neutral-300">No encontramos repuestos para esa combinación todavía.</p>
              <p className="text-sm text-neutral-500 mt-1">Probá con otro modelo o escribinos por WhatsApp para consultas específicas.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export default function VehiclesPage() {
  return (
    <ErrorBoundary>
      <VehiclesInner />
    </ErrorBoundary>
  );
}
