"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { formatPYG } from "@/lib/utils";
import { Skeleton } from "@/components/Skeleton";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import {
  TrendingUp, ShoppingBag, Package, AlertTriangle, DollarSign,
  Users, Activity, BarChart3, ArrowUp, ArrowDown, RefreshCw,
  ShoppingCart, Clock, Box,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, AreaChart, Area,
} from "recharts";
import type { DashboardStats } from "@/lib/types";

function StatCard({ label, value, sub, icon: Icon, color, trend }: {
  label: string; value: string; sub?: string; icon: any; color: string; trend?: number;
}) {
  return (
    <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-xl p-5 hover:border-neutral-700 transition-all">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider">{label}</p>
          <p className="text-2xl md:text-3xl font-extrabold text-white">{value}</p>
          {sub && <p className="text-xs text-neutral-500">{sub}</p>}
          {trend !== undefined && (
            <div className={`flex items-center gap-1 mt-1 ${trend >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {trend >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
              <span className="text-xs font-medium">{Math.abs(trend).toFixed(1)}%</span>
            </div>
          )}
        </div>
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
          <Icon className="w-5.5 h-5.5" />
        </div>
      </div>
    </div>
  );
}

function SalesChart({ data }: { data: { date: string; total: number }[] }) {
  return (
    <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white">Ventas últimos 14 días</h3>
        <BarChart3 className="w-5 h-5 text-brand-400" />
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ff3b1f" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#ff3b1f" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#6b7280" }} tickFormatter={(v) => v.slice(5)} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} axisLine={false} tickLine={false} />
            <Tooltip content={({ active, payload, label }) => {
              if (active && payload?.length) {
                return (
                  <div className="bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 shadow-xl">
                    <p className="text-xs text-neutral-400">{label}</p>
                    <p className="text-sm font-bold text-white">{formatPYG(payload[0].value as number)}</p>
                  </div>
                );
              }
              return null;
            }} />
            <Area type="monotone" dataKey="total" stroke="#ff3b1f" strokeWidth={2} fill="url(#salesGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-amber-500/10 text-amber-400",
    paid: "bg-sky-500/10 text-sky-400",
    shipped: "bg-violet-500/10 text-violet-400",
    delivered: "bg-emerald-500/10 text-emerald-400",
    cancelled: "bg-rose-500/10 text-rose-400",
  };
  const label: Record<string, string> = {
    pending: "Pendiente", paid: "Pagado", shipped: "Enviado",
    delivered: "Entregado", cancelled: "Cancelado",
  };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${map[status] || ""}`}>
      {label[status] || status}
    </span>
  );
}

function DashboardInner() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<string>("customer");

  const load = async () => {
    try {
      const [dashboardRes, meRes] = await Promise.all([
        api.getDashboard(),
        fetch("/api/auth/me").then((r) => r.json()).catch(() => ({})),
      ]);
      setStats(dashboardRes as DashboardStats);
      setRole(meRes?.user?.roleName || "customer");
      setError(null);
    } catch (e: any) {
      setError("No pudimos cargar el dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading && !stats) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
          <Skeleton className="h-64 col-span-2 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <AlertTriangle className="w-12 h-12 text-rose-400 mx-auto mb-3" />
        <p className="text-rose-400">{error}</p>
        <button onClick={() => load()} className="btn-primary mt-4">Reintentar</button>
      </div>
    );
  }

  if (!stats) return null;

  const s = stats.salesComparison;
  const isAdmin = role === "admin";
  const isSales = role === "sales";
  const isStock = role === "stock_manager";

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white">Dashboard</h1>
          <p className="text-sm text-neutral-500 mt-1">Resumen de tu tienda</p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Link href="/dashboard/admin" className="btn-ghost text-xs">
              Panel Admin
            </Link>
          )}
          <button onClick={load} className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {(isAdmin || isSales) && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <StatCard label="Ventas Hoy" value={formatPYG(s.today)} sub={`${stats.ordersToday} pedidos`} icon={DollarSign} color="bg-emerald-500/15 text-emerald-400" trend={s.changeToday} />
          <StatCard label="Ventas Semana" value={formatPYG(s.week)} sub={`${stats.ordersWeek} pedidos`} icon={TrendingUp} color="bg-sky-500/15 text-sky-400" trend={s.changeWeek} />
          <StatCard label="Ventas Mes" value={formatPYG(s.month)} sub={`${stats.ordersMonth} pedidos`} icon={BarChart3} color="bg-violet-500/15 text-violet-400" trend={s.changeMonth} />
          <StatCard label="Total Clientes" value={String(stats.totalCustomers)} sub={`${stats.customerMetrics.newThisMonth} nuevos`} icon={Users} color="bg-amber-500/15 text-amber-400" />
        </div>
      )}

      {(isStock || (!isAdmin && !isSales)) && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <StatCard label="Productos" value={String(stats.productMetrics.total)} sub={`${stats.productMetrics.active} activos`} icon={Package} color="bg-emerald-500/15 text-emerald-400" />
          <StatCard label="Stock bajo" value={String(stats.productMetrics.lowStock)} sub={`${stats.productMetrics.outOfStock} agotados`} icon={AlertTriangle} color="bg-amber-500/15 text-amber-400" />
          <StatCard label="Valor inventario" value={formatPYG(stats.inventoryMetrics.totalValue)} sub={`${stats.inventoryMetrics.totalUnits} unidades`} icon={Box} color="bg-violet-500/15 text-violet-400" />
          <StatCard label="Ticket promedio" value={formatPYG(stats.averageTicket)} icon={ShoppingCart} color="bg-sky-500/15 text-sky-400" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <SalesChart data={stats.salesByDay} />
        </div>

        <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-xl p-5">
          <h3 className="font-semibold text-white flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-400" /> Stock bajo
          </h3>
          {stats.lowStock.length === 0 ? (
            <p className="text-sm text-neutral-500 text-center py-6">Sin alertas de stock</p>
          ) : (
            <ul className="space-y-2">
              {stats.lowStock.slice(0, 6).map((p) => (
                <li key={p.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-neutral-800/30 transition">
                  <div className="min-w-0">
                    <p className="text-sm text-neutral-300 truncate">{p.name}</p>
                    <p className="text-[10px] text-neutral-500">{p.sku}</p>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded shrink-0 ${
                    p.stock === 0 ? "bg-rose-500/10 text-rose-400"
                      : p.stock <= 3 ? "bg-amber-500/10 text-amber-400"
                      : "bg-yellow-500/10 text-yellow-400"
                  }`}>
                    {p.stock === 0 ? "Sin stock" : `${p.stock} u.`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-xl p-5">
          <h3 className="font-semibold text-white flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-brand-400" /> Más vendidos
          </h3>
          {stats.topProducts.length === 0 ? (
            <p className="text-sm text-neutral-500 text-center py-6">Sin ventas registradas</p>
          ) : (
            <ul className="space-y-2">
              {stats.topProducts.map((p, i) => (
                <li key={p.productId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-800/30 transition">
                  <span className="w-6 h-6 rounded-full bg-neutral-800 text-xs font-bold flex items-center justify-center text-brand-400 shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-neutral-300 truncate">{p.name}</p>
                    <p className="text-[10px] text-neutral-500">{p.sold} vendidos</p>
                  </div>
                  <p className="text-sm font-bold text-emerald-400 shrink-0">{formatPYG(p.revenue)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-sky-400" /> Últimos pedidos
            </h3>
            <span className="text-xs text-neutral-500">{stats.recentOrders.length}</span>
          </div>
          {stats.recentOrders.length === 0 ? (
            <p className="text-sm text-neutral-500 text-center py-6">Sin pedidos aún</p>
          ) : (
            <ul className="space-y-1 max-h-80 overflow-y-auto scrollbar-thin">
              {stats.recentOrders.slice(0, 6).map((o) => (
                <li key={o.id} className="p-2 rounded-lg hover:bg-neutral-800/30 transition">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-brand-400">{o.orderNumber || o.id.slice(0, 8)}</span>
                    <StatusBadge status={o.status} />
                  </div>
                  <p className="text-sm mt-0.5 text-neutral-300 truncate">{o.customerName}</p>
                  <div className="flex items-center justify-between mt-0.5">
                    <p className="text-[10px] text-neutral-500">
                      {new Date(o.createdAt).toLocaleString("es-PY", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <p className="text-sm font-bold text-white">{formatPYG(o.total)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Package className="w-4 h-4 text-violet-400" />
          <h3 className="font-semibold text-white">Resumen del sistema</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-xs text-neutral-500">Total productos</p>
            <p className="text-lg font-bold text-white">{stats.productMetrics.total}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-500">Pedidos del día</p>
            <p className="text-lg font-bold text-white">{stats.ordersToday}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-500">Pedidos del mes</p>
            <p className="text-lg font-bold text-white">{stats.ordersMonth}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-500">Ticket promedio</p>
            <p className="text-lg font-bold text-white">{formatPYG(stats.averageTicket)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ErrorBoundary>
      <DashboardInner />
    </ErrorBoundary>
  );
}
