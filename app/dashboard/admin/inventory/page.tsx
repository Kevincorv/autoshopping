"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";

export default function AdminInventory() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/products?limit=100")
      .then((r) => r.json())
      .then((data) => setProducts(data.products || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const sorted = [...products]
    .sort((a, b) => a.stock - b.stock)
    .filter(
      (p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Inventario</h1>
      </div>

      <div className="relative max-w-sm mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar producto..."
          className="input pl-9 w-full text-sm"
        />
      </div>

      <div className="rounded-xl border border-neutral-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-800 bg-neutral-900/50">
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Producto</th>
              <th className="text-left px-4 py-3 text-gray-400 font-medium">SKU</th>
              <th className="text-right px-4 py-3 text-gray-400 font-medium">Stock</th>
              <th className="text-right px-4 py-3 text-gray-400 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-neutral-800/50">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <td key={j} className="px-4 py-4">
                      <div className="h-4 bg-neutral-800 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-gray-500">
                  No hay productos
                </td>
              </tr>
            ) : (
              sorted.map((p) => (
                <tr key={p.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors">
                  <td className="px-4 py-3 text-white">{p.name}</td>
                  <td className="px-4 py-3 text-gray-400">{p.sku}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-medium ${p.stock <= 5 ? "text-red-400" : p.stock <= 10 ? "text-yellow-400" : "text-gray-300"}`}>
                      {p.stock}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      p.stock <= 0 ? "bg-red-500/10 text-red-400" :
                      p.stock <= 5 ? "bg-yellow-500/10 text-yellow-400" :
                      p.stock <= 10 ? "bg-brand-500/10 text-brand-400" :
                      "bg-emerald-500/10 text-emerald-400"
                    }`}>
                      {p.stock <= 0 ? "Sin stock" : p.stock <= 5 ? "Crítico" : p.stock <= 10 ? "Bajo" : "Normal"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
