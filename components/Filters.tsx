"use client";

import { useState } from "react";

export interface FilterState {
  category: string;
  brand: string;
  min: string;
  max: string;
  sort: string;
  q: string;
}

interface Props {
  value: FilterState;
  onChange: (v: FilterState) => void;
  brands: string[];
  categories: { id: string; name: string }[];
}

export function Filters({ value, onChange, brands, categories }: Props) {
  const [open, setOpen] = useState(false);
  const update = (patch: Partial<FilterState>) => onChange({ ...value, ...patch });
  const reset = () => onChange({ category: "all", brand: "all", min: "", max: "", sort: "featured", q: "" });

  return (
    <div className="card p-3 sm:p-4 sticky top-20">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm sm:text-base">Filtros</h3>
        <button onClick={() => setOpen((v) => !v)} className="text-xs text-brand-400 md:hidden">
          {open ? "Ocultar" : "Mostrar"}
        </button>
      </div>
      <div className={`space-y-3 sm:space-y-4 ${open ? "block" : "hidden md:block"}`}>
        <div>
          <label className="text-xs text-neutral-400 mb-1.5 block">Ordenar por</label>
          <select className="input px-3 text-sm" value={value.sort} onChange={(e) => update({ sort: e.target.value })}>
            <option value="featured">Destacados</option>
            <option value="price-asc">Precio: menor a mayor</option>
            <option value="price-desc">Precio: mayor a menor</option>
            <option value="name">Nombre A-Z</option>
            <option value="rating">Mejor valorados</option>
            <option value="sold">Más vendidos</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-neutral-400 mb-1.5 block">Categoría</label>
          <select className="input px-3 text-sm" value={value.category} onChange={(e) => update({ category: e.target.value })}>
            <option value="all">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-neutral-400 mb-1.5 block">Marca</label>
          <select className="input px-3 text-sm" value={value.brand} onChange={(e) => update({ brand: e.target.value })}>
            <option value="all">Todas las marcas</option>
            {brands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-neutral-400 mb-1.5 block">Precio (Gs.)</label>
          <div className="grid grid-cols-2 gap-2">
            <input
              className="input px-3 text-sm"
              placeholder="Mín."
              inputMode="numeric"
              value={value.min}
              onChange={(e) => update({ min: e.target.value.replace(/[^0-9]/g, "") })}
            />
            <input
              className="input px-3 text-sm"
              placeholder="Máx."
              inputMode="numeric"
              value={value.max}
              onChange={(e) => update({ max: e.target.value.replace(/[^0-9]/g, "") })}
            />
          </div>
        </div>
        <button onClick={reset} className="btn-ghost w-full text-xs">
          Limpiar filtros
        </button>
      </div>
    </div>
  );
}
