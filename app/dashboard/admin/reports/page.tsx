"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  FileText, Download, Filter, FileSpreadsheet,
  TrendingUp, DollarSign, Box, Search,
} from "lucide-react";
import { formatPYG } from "@/lib/utils";

type ReportType = "sales" | "financial" | "inventory";

interface ReportFilters {
  dateFrom: string;
  dateTo: string;
  productId: string;
  categoryId: string;
}

export default function AdminReports() {
  const [type, setType] = useState<ReportType>("sales");
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<"pdf" | "excel" | null>(null);
  const [data, setData] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [filters, setFilters] = useState<ReportFilters>({
    dateFrom: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10),
    dateTo: new Date().toISOString().slice(0, 10),
    productId: "",
    categoryId: "",
  });

  useEffect(() => {
    fetch("/api/products?limit=200")
      .then((r) => r.json())
      .then((res) => setProducts(res.products || []))
      .catch(() => {});
  }, []);

  const generateReport = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type, dateFrom: filters.dateFrom, dateTo: filters.dateTo });
      if (filters.productId) params.set("productId", filters.productId);
      if (filters.categoryId) params.set("categoryId", filters.categoryId);
      const res = await fetch(`/api/reports?${params}`);
      const result = await res.json();
      setData(result);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [type, filters.dateFrom, filters.dateTo, filters.productId, filters.categoryId]);

  useEffect(() => { generateReport(); }, [generateReport]);

  const exportPDF = async () => {
    if (!data) return;
    setExporting("pdf");
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");
      const doc = new jsPDF("landscape", "mm", "a4");
      const title = type === "sales" ? "Reporte de Ventas" : type === "financial" ? "Reporte Financiero" : "Reporte de Inventario";
      const period = `${filters.dateFrom} al ${filters.dateTo}`;

      doc.setFontSize(18);
      doc.text(title, 14, 20);
      doc.setFontSize(10);
      doc.text(`Período: ${period}`, 14, 28);
      doc.setFontSize(10);
      doc.text(`Generado: ${new Date().toLocaleString("es-PY")}`, 14, 34);

      if (type === "sales" && data.items?.length) {
        const rows = data.items.map((i: any) => [i.productName, i.quantity, formatPYG(i.unitPrice), formatPYG(i.subtotal)]);
        autoTable(doc, {
          startY: 40,
          head: [["Producto", "Cant.", "P. Unitario", "Total"]],
          body: rows,
          foot: [["", "", "Total", formatPYG(data.totalSales)]],
          theme: "grid",
          headStyles: { fillColor: [255, 59, 31] },
        });
      }

      if (type === "inventory" && data.products?.length) {
        const rows = data.products.map((p: any) => [p.name, p.sku, p.stock, formatPYG(p.price), formatPYG(p.price * p.stock)]);
        autoTable(doc, {
          startY: 40,
          head: [["Producto", "SKU", "Stock", "Precio", "Valor"]],
          body: rows,
          theme: "grid",
          headStyles: { fillColor: [255, 59, 31] },
        });
      }

      if (type === "financial") {
        doc.setFontSize(12);
        doc.text(`Ingresos: ${formatPYG(data.totalSales || 0)}`, 14, 45);
        doc.text(`Pedidos: ${data.totalOrders || 0}`, 14, 53);
        doc.text(`Gastos: Gs. 0 (preparado)`, 14, 61);
      }

      doc.save(`reporte-${type}-${filters.dateFrom}.pdf`);
    } catch (e) {
      console.error("PDF error", e);
    }
    setExporting(null);
  };

  const exportExcel = async () => {
    if (!data) return;
    setExporting("excel");
    try {
      const XLSX = await import("xlsx");

      if (type === "sales") {
        const rows = (data.items || []).map((i: any) => ({
          Producto: i.productName,
          Cantidad: i.quantity,
          "P. Unitario": i.unitPrice,
          Subtotal: i.subtotal,
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Ventas");
        XLSX.writeFile(wb, `reporte-ventas-${filters.dateFrom}.xlsx`);
      }

      if (type === "inventory") {
        const rows = (data.products || []).map((p: any) => ({
          Producto: p.name,
          SKU: p.sku,
          Stock: p.stock,
          Precio: p.price,
          Valor: p.price * p.stock,
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Inventario");
        XLSX.writeFile(wb, `reporte-inventario-${filters.dateFrom}.xlsx`);
      }

      if (type === "financial") {
        const rows = [{ Indicador: "Ingresos", Valor: data.totalSales || 0 }, { Indicador: "Pedidos", Valor: data.totalOrders || 0 }];
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Financiero");
        XLSX.writeFile(wb, `reporte-financiero-${filters.dateFrom}.xlsx`);
      }
    } catch (e) {
      console.error("Excel error", e);
    }
    setExporting(null);
  };

  const TABS: { value: ReportType; label: string; icon: any }[] = [
    { value: "sales", label: "Ventas", icon: TrendingUp },
    { value: "financial", label: "Financiero", icon: DollarSign },
    { value: "inventory", label: "Inventario", icon: Box },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Reportes</h1>
          <p className="text-sm text-neutral-500 mt-1">Analítica y exportación de datos</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportExcel}
            disabled={!data || exporting !== null}
            className="btn-ghost text-sm flex items-center gap-2 disabled:opacity-40"
          >
            <FileSpreadsheet className="w-4 h-4" />
            {exporting === "excel" ? "Exportando..." : "Excel"}
          </button>
          <button
            onClick={exportPDF}
            disabled={!data || exporting !== null}
            className="btn-ghost text-sm flex items-center gap-2 disabled:opacity-40"
          >
            <FileText className="w-4 h-4" />
            {exporting === "pdf" ? "Exportando..." : "PDF"}
          </button>
        </div>
      </div>

      <div className="flex gap-1 mb-6 bg-neutral-900 rounded-lg p-0.5 border border-neutral-800 w-fit">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.value}
              onClick={() => setType(tab.value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                type === tab.value ? "bg-brand-600 text-white" : "text-neutral-400 hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-neutral-400" />
          <h3 className="text-sm font-medium text-white">Filtros</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-neutral-500 mb-1">Desde</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
              className="input px-3 w-full text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-neutral-500 mb-1">Hasta</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
              className="input px-3 w-full text-sm"
            />
          </div>
          {type === "sales" && (
            <>
              <div>
                <label className="block text-xs text-neutral-500 mb-1">Producto</label>
                <select
                  value={filters.productId}
                  onChange={(e) => setFilters((prev) => ({ ...prev, productId: e.target.value }))}
                  className="input px-3 w-full text-sm"
                >
                  <option value="">Todos</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button onClick={generateReport} disabled={loading} className="btn-primary w-full text-sm">
                  {loading ? "Cargando..." : "Generar"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {loading && (
        <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-xl p-8">
          <div className="flex items-center justify-center gap-3 text-neutral-400">
            <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Generando reporte...</span>
          </div>
        </div>
      )}

      {data && !loading && type === "sales" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-xl p-4">
              <p className="text-xs text-neutral-500">Total ventas</p>
              <p className="text-xl font-bold text-white mt-1">{formatPYG(data.totalSales || 0)}</p>
            </div>
            <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-xl p-4">
              <p className="text-xs text-neutral-500">Pedidos</p>
              <p className="text-xl font-bold text-white mt-1">{data.totalOrders || 0}</p>
            </div>
            <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-xl p-4">
              <p className="text-xs text-neutral-500">Ticket promedio</p>
              <p className="text-xl font-bold text-white mt-1">{data.totalOrders ? formatPYG(data.totalSales / data.totalOrders) : "Gs. 0"}</p>
            </div>
            <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-xl p-4">
              <p className="text-xs text-neutral-500">Productos vendidos</p>
              <p className="text-xl font-bold text-white mt-1">{data.totalItems || 0}</p>
            </div>
          </div>

          {data.items?.length > 0 && (
            <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-800 bg-neutral-900/50">
                      <th className="text-left px-4 py-3 text-neutral-400 font-medium">Producto</th>
                      <th className="text-right px-4 py-3 text-neutral-400 font-medium">Cant.</th>
                      <th className="text-right px-4 py-3 text-neutral-400 font-medium">Unitario</th>
                      <th className="text-right px-4 py-3 text-neutral-400 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((item: any, i: number) => (
                      <tr key={i} className="border-b border-neutral-800/50 hover:bg-neutral-800/30">
                        <td className="px-4 py-3 text-neutral-300">{item.productName}</td>
                        <td className="px-4 py-3 text-right text-neutral-400">{item.quantity}</td>
                        <td className="px-4 py-3 text-right text-neutral-400">{formatPYG(item.unitPrice)}</td>
                        <td className="px-4 py-3 text-right text-white font-medium">{formatPYG(item.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {data && !loading && type === "financial" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-neutral-400">Ingresos</p>
                <p className="text-2xl font-bold text-white">{formatPYG(data.totalSales || 0)}</p>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-neutral-400">Gastos</p>
                <p className="text-2xl font-bold text-white">Gs. 0</p>
                <p className="text-[10px] text-neutral-600">Preparado para futura implementación</p>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-brand-500/15 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-brand-400" />
              </div>
              <div>
                <p className="text-sm text-neutral-400">Ganancia estimada</p>
                <p className="text-2xl font-bold text-white">{formatPYG(data.totalSales || 0)}</p>
                <p className="text-[10px] text-neutral-600">Sin gastos registrados</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {data && !loading && type === "inventory" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-xl p-4">
              <p className="text-xs text-neutral-500">Stock actual</p>
              <p className="text-xl font-bold text-white mt-1">{data.stats?.totalStock || 0}</p>
            </div>
            <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-xl p-4">
              <p className="text-xs text-neutral-500">Valor total</p>
              <p className="text-xl font-bold text-white mt-1">{formatPYG(data.stats?.totalValue || 0)}</p>
            </div>
            <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-xl p-4">
              <p className="text-xs text-neutral-500">Productos activos</p>
              <p className="text-xl font-bold text-white mt-1">{data.stats?.activeProducts || 0}</p>
            </div>
            <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-xl p-4">
              <p className="text-xs text-neutral-500">Agotados</p>
              <p className="text-xl font-bold text-white mt-1">{data.stats?.outOfStock || 0}</p>
            </div>
          </div>

          {data.products?.length > 0 && (
            <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-800 bg-neutral-900/50">
                      <th className="text-left px-4 py-3 text-neutral-400 font-medium">Producto</th>
                      <th className="text-left px-4 py-3 text-neutral-400 font-medium">SKU</th>
                      <th className="text-right px-4 py-3 text-neutral-400 font-medium">Stock</th>
                      <th className="text-right px-4 py-3 text-neutral-400 font-medium">Precio</th>
                      <th className="text-right px-4 py-3 text-neutral-400 font-medium">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.products.map((p: any) => (
                      <tr key={p.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/30">
                        <td className="px-4 py-3 text-neutral-300">{p.name}</td>
                        <td className="px-4 py-3 text-neutral-500">{p.sku}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={p.stock <= 0 ? "text-rose-400 font-medium" : "text-neutral-300"}>{p.stock}</span>
                        </td>
                        <td className="px-4 py-3 text-right text-neutral-400">{formatPYG(p.price)}</td>
                        <td className="px-4 py-3 text-right text-white font-medium">{formatPYG(p.price * p.stock)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
