"use client";

import { useEffect, useState } from "react";
import { Search, RefreshCw, ChevronDown, CheckCircle, XCircle, Truck, Package } from "lucide-react";

const STATUS_FLOW = ["pending", "confirmed", "preparing", "shipped", "delivered"];
const ALL_STATUSES = [...STATUS_FLOW, "cancelled"];

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  preparing: "Preparando",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  confirmed: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  preparing: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  shipped: "bg-brand-500/10 text-brand-400 border-brand-500/20",
  delivered: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  cancelled: "bg-rose-500/10 text-rose-400 border-rose-500/20",
};

function getNextStatus(current: string): string | null {
  const idx = STATUS_FLOW.indexOf(current);
  if (idx >= 0 && idx < STATUS_FLOW.length - 1) return STATUS_FLOW[idx + 1];
  return null;
}

export default function AdminOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [updating, setUpdating] = useState<string | null>(null);

  function loadOrders() {
    setLoading(true);
    fetch("/api/orders")
      .then((r) => r.json())
      .then((data) => setOrders(data.orders || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(loadOrders, []);

  async function updateStatus(orderId: string, newStatus: string) {
    setUpdating(orderId);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
        );
      }
    } catch {}
    setUpdating(null);
  }

  const statusTabs = [
    { key: "all", label: "Todos", count: orders.length },
    ...ALL_STATUSES.map((s) => ({
      key: s,
      label: STATUS_LABELS[s],
      count: orders.filter((o) => o.status === s).length,
    })),
  ];

  const filtered = orders.filter((o) => {
    const matchesSearch =
      o.orderNumber?.toLowerCase().includes(search.toLowerCase()) ||
      o.customerName?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Pedidos</h1>
          <p className="text-sm text-neutral-500 mt-1">Gestión de pedidos y estados</p>
        </div>
        <button onClick={loadOrders} className="btn-ghost text-sm flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </button>
      </div>

      <div className="flex gap-1 mb-4 bg-neutral-900 rounded-lg p-0.5 border border-neutral-800 overflow-x-auto">
        {statusTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all ${
              statusFilter === tab.key
                ? "bg-brand-600 text-white"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      <div className="relative max-w-sm mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar pedido o cliente..."
          className="input pl-9 w-full text-sm"
        />
      </div>

      <div className="rounded-xl border border-neutral-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800 bg-neutral-900/50">
                <th className="text-left px-4 py-3 text-neutral-400 font-medium">Pedido</th>
                <th className="text-left px-4 py-3 text-neutral-400 font-medium">Cliente</th>
                <th className="text-left px-4 py-3 text-neutral-400 font-medium">Contacto</th>
                <th className="text-right px-4 py-3 text-neutral-400 font-medium">Total</th>
                <th className="text-center px-4 py-3 text-neutral-400 font-medium">Estado</th>
                <th className="text-center px-4 py-3 text-neutral-400 font-medium">Acción</th>
                <th className="text-right px-4 py-3 text-neutral-400 font-medium">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-neutral-800/50">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="h-4 bg-neutral-800 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-neutral-500">
                    No se encontraron pedidos
                  </td>
                </tr>
              ) : (
                filtered.map((o) => {
                  const next = getNextStatus(o.status);
                  return (
                    <tr key={o.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-white font-medium">{o.orderNumber || o.id.slice(0, 8)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-neutral-300">{o.customerName}</span>
                        {o.customerId && (
                          <span className="ml-1.5 text-[10px] text-emerald-500">● registrado</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-neutral-400 text-xs">{o.customerPhone}</div>
                        <div className="text-neutral-500 text-xs">{o.customerEmail}</div>
                      </td>
                      <td className="px-4 py-3 text-right text-white font-medium">
                        Gs. {o.total?.toLocaleString("es-PY") || "0"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <select
                          value={o.status}
                          onChange={(e) => updateStatus(o.id, e.target.value)}
                          disabled={updating === o.id}
                          className={`text-xs font-medium px-2 py-1 rounded-lg border appearance-none cursor-pointer ${
                            STATUS_COLORS[o.status] || "bg-neutral-800 text-neutral-400 border-neutral-700"
                          }`}
                        >
                          {ALL_STATUSES.map((s) => (
                            <option key={s} value={s} className="bg-neutral-900 text-white">
                              {STATUS_LABELS[s]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {next ? (
                          <button
                            onClick={() => updateStatus(o.id, next)}
                            disabled={updating === o.id}
                            className="text-xs text-brand-400 hover:text-brand-300 disabled:opacity-50 flex items-center gap-1 mx-auto"
                          >
                            {updating === o.id ? (
                              <div className="w-3 h-3 border border-brand-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <>
                                {o.status === "pending" ? <CheckCircle className="w-3.5 h-3.5" /> : <Truck className="w-3.5 h-3.5" />}
                                {STATUS_LABELS[next]}
                              </>
                            )}
                          </button>
                        ) : o.status === "cancelled" ? (
                          <span className="text-xs text-rose-500 flex items-center gap-1 justify-center">
                            <XCircle className="w-3.5 h-3.5" /> Cancelado
                          </span>
                        ) : (
                          <span className="text-xs text-emerald-500 flex items-center gap-1 justify-center">
                            <CheckCircle className="w-3.5 h-3.5" /> Completado
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-neutral-400 text-xs">
                        {new Date(o.createdAt).toLocaleDateString("es-PY", {
                          day: "2-digit", month: "2-digit", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
