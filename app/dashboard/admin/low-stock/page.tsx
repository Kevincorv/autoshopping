"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, PackageX, Search, RefreshCw } from "lucide-react";
import { useUI } from "@/lib/store";

interface ProductRow {
  id: string; name: string; unit: string; stock: number; minStock: number;
  brandName?: string | null; isActive: boolean; _count?: { orderItems?: number };
}

export default function LowStockPage() {
  const ui = useUI();
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [onlyActive, setOnlyActive] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/products?limit=100");
      const d = await r.json();
      setProducts(d.products || []);
    } catch { /* noop */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const low = products.filter((p) => p.stock <= p.minStock && (!onlyActive || p.isActive));
  const outOfStock = low.filter((p) => p.stock <= 0);
  const critical = low.filter((p) => p.stock > 0 && p.stock <= p.minStock);

  const filtered = low.filter((p) => q ? p.name.toLowerCase().includes(q.toLowerCase()) : true);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Stock bajo</h1>
          <p className="text-sm text-neutral-500 mt-1">Productos por debajo del stock mínimo</p>
        </div>
        <button onClick={load} className="btn-ghost text-sm py-2 flex items-center gap-2"><RefreshCw className="w-4 h-4" /> Actualizar</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-rose-950/40 to-neutral-950 border border-rose-500/20 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 flex items-center justify-center"><PackageX className="w-5 h-5 text-rose-400" /></div>
            <div><p className="text-xs text-neutral-500">Agotados</p><p className="text-2xl font-bold text-rose-400">{outOfStock.length}</p></div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-amber-950/40 to-neutral-950 border border-amber-500/20 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center"><AlertTriangle className="w-5 h-5 text-amber-400" /></div>
            <div><p className="text-xs text-neutral-500">Críticos</p><p className="text-2xl font-bold text-amber-400">{critical.length}</p></div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/15 flex items-center justify-center"><Search className="w-5 h-5 text-sky-400" /></div>
            <div><p className="text-xs text-neutral-500">Total en alerta</p><p className="text-2xl font-bold">{low.length}</p></div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-neutral-800 overflow-hidden">
        <div className="flex flex-wrap gap-3 p-3 border-b border-neutral-800 bg-neutral-900/40">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input className="input py-2 text-sm pl-9 w-72" placeholder="Filtrar por nombre..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm text-neutral-400 cursor-pointer">
            <input type="checkbox" checked={onlyActive} onChange={(e) => setOnlyActive(e.target.checked)} className="rounded border-neutral-700 bg-neutral-800" />
            Solo activos
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800 bg-neutral-900/50">
                <th className="text-left px-4 py-3 text-neutral-400 font-medium">Producto</th>
                <th className="text-left px-4 py-3 text-neutral-400 font-medium">Marca</th>
                <th className="text-right px-4 py-3 text-neutral-400 font-medium">Stock</th>
                <th className="text-right px-4 py-3 text-neutral-400 font-medium">Mínimo</th>
                <th className="text-center px-4 py-3 text-neutral-400 font-medium">Estado</th>
                <th className="text-right px-4 py-3 text-neutral-400 font-medium">Faltan</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => <tr key={i} className="border-b border-neutral-800/50">{Array.from({ length: 6 }).map((__, j) => <td key={j} className="px-4 py-4"><div className="h-4 bg-neutral-800 rounded animate-pulse" /></td>)}</tr>)
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-neutral-500">Sin alertas de stock. ¡Todo en orden!</td></tr>
              ) : filtered.map((p) => {
                const missing = p.stock > 0 ? Math.ceil(p.minStock - p.stock) : p.minStock;
                return (
                  <tr key={p.id} className="border-b border-neutral-800/50">
                    <td className="px-4 py-3">
                      <p className="font-medium">{p.name}</p>
                      <p className="text-[10px] text-neutral-500">{p.unit}</p>
                    </td>
                    <td className="px-4 py-3 text-neutral-400">{p.brandName || "—"}</td>
                    <td className={`px-4 py-3 text-right font-bold ${p.stock <= 0 ? "text-rose-400" : "text-amber-400"}`}>{p.stock} {p.unit}</td>
                    <td className="px-4 py-3 text-right text-neutral-400">{p.minStock}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${p.stock <= 0 ? "bg-rose-500/10 text-rose-400" : "bg-amber-500/10 text-amber-400"}`}>
                        <AlertTriangle className="w-3 h-3" /> {p.stock <= 0 ? "Sin stock" : "Stock bajo"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-rose-400">{missing}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      {filtered.length > 0 && (
        <div className="mt-4 flex justify-end">
          <a href="/dashboard/admin/purchases" className="btn-primary text-sm px-5 py-2.5">Crear orden de compra para reponer</a>
        </div>
      )}
    </div>
  );
}