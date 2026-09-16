"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  TrendingUp, ShoppingBag, Package, AlertTriangle, DollarSign,
  Users, Activity, BarChart3, Plus, Clock, Bell, Truck,
  ChevronRight, RefreshCw, ShoppingCart, Tag, Settings,
  FileText, Box, CreditCard, ArrowUp, ArrowDown,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell,
} from "recharts";
import { formatPYG } from "@/lib/utils";
import type { DashboardStats } from "@/lib/types";

const PIE_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#6b7280"];

function StatCard({ label, value, sub, icon: Icon, color, trend, trendLabel }: {
  label: string; value: string; sub?: string; icon: any; color: string;
  trend?: number; trendLabel?: string;
}) {
  const isUp = (trend || 0) >= 0;
  return (
    <div className="relative group bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-xl p-5 hover:border-neutral-700 transition-all">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider">{label}</p>
          <p className="text-2xl md:text-3xl font-extrabold text-white">{value}</p>
          {sub && <p className="text-xs text-neutral-500">{sub}</p>}
          {trend !== undefined && (
            <div className={`flex items-center gap-1 mt-1 ${isUp ? "text-emerald-400" : "text-rose-400"}`}>
              {isUp ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
              <span className="text-xs font-medium">{Math.abs(trend).toFixed(1)}%</span>
              {trendLabel && <span className="text-[10px] text-neutral-500">vs {trendLabel}</span>}
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

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-amber-500/10 text-amber-400",
    confirmed: "bg-sky-500/10 text-sky-400",
    preparing: "bg-violet-500/10 text-violet-400",
    shipped: "bg-brand-500/10 text-brand-400",
    delivered: "bg-emerald-500/10 text-emerald-400",
    cancelled: "bg-rose-500/10 text-rose-400",
  };
  const labels: Record<string, string> = {
    pending: "Pendiente", confirmed: "Confirmado", preparing: "Preparando",
    shipped: "Enviado", delivered: "Entregado", cancelled: "Cancelado",
  };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${styles[status] || ""}`}>
      {labels[status] || status}
    </span>
  );
}

function QuickAction({ href, icon: Icon, label, color }: { href: string; icon: any; label: string; color: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-3 rounded-xl bg-neutral-900/50 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-800/50 transition-all group"
    >
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-4.5 h-4.5" />
      </div>
      <span className="text-sm text-neutral-300 group-hover:text-white transition-colors">{label}</span>
      <ChevronRight className="w-4 h-4 text-neutral-600 ml-auto group-hover:text-neutral-400" />
    </Link>
  );
}

function AlertCard({ alert }: { alert: any }) {
  const colors: Record<string, string> = {
    danger: "bg-rose-500/10 border-rose-500/20 text-rose-400",
    warning: "bg-amber-500/10 border-amber-500/20 text-amber-400",
    info: "bg-sky-500/10 border-sky-500/20 text-sky-400",
    success: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
  };
  const icons: Record<string, any> = {
    danger: AlertTriangle, warning: Bell, info: Activity, success: TrendingUp,
  };
  const Icon = icons[alert.type] || Bell;
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border ${colors[alert.type] || colors.info}`}>
      <Icon className="w-5 h-5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{alert.message}</p>
        {alert.count && <p className="text-xs opacity-70">{alert.count} elemento(s)</p>}
      </div>
      {alert.link && (
        <Link href={alert.link} className="text-xs font-medium hover:underline shrink-0">Ver</Link>
      )}
    </div>
  );
}

function ActivityIcon({ type }: { type: string }) {
  const map: Record<string, any> = {
    order: ShoppingCart, product: Package, stock: Box, payment: CreditCard, status: Truck, user: Users,
  };
  const Icon = map[type] || Activity;
  return <Icon className="w-4 h-4" />;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 shadow-xl">
        <p className="text-xs text-neutral-400">{label}</p>
        <p className="text-sm font-bold text-white">{formatPYG(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

function SalesOverviewChart({ data }: { data: { date: string; total: number }[] }) {
  return (
    <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-white">Ventas diarias</h3>
          <p className="text-xs text-neutral-500">Últimos 14 días</p>
        </div>
        <TrendingUp className="w-5 h-5 text-brand-400" />
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ff3b1f" stopOpacity={0.3} />
                <stop offset="100%" stopColor="#ff3b1f" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#6b7280" }} tickFormatter={(v) => v.slice(5)} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="total" stroke="#ff3b1f" strokeWidth={2} fill="url(#salesGradient)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function SalesMonthChart({ data }: { data: { month: string; total: number }[] }) {
  return (
    <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white">Ventas mensuales</h3>
        <BarChart3 className="w-5 h-5 text-violet-400" />
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="month" tick={{ fontSize: 9, fill: "#6b7280" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 9, fill: "#6b7280" }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="total" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function TopProductsChart({ data }: { data: { name: string; sold: number }[] }) {
  return (
    <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white">Más vendidos</h3>
        <Package className="w-5 h-5 text-emerald-400" />
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical">
            <XAxis type="number" tick={{ fontSize: 9, fill: "#6b7280" }} axisLine={false} tickLine={false} />
            <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: "#6b7280" }} width={100} axisLine={false} tickLine={false} />
            <Tooltip />
            <Bar dataKey="sold" fill="#10b981" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function CategoryPie({ data }: { data: { name: string; sold: number }[] }) {
  return (
    <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white">Categorías</h3>
        <Tag className="w-5 h-5 text-sky-400" />
      </div>
      <div className="h-48 flex items-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="sold" nameKey="name" cx="50%" cy="50%" outerRadius={60} innerRadius={30}>
              {data.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
        <div className="space-y-1.5 text-xs shrink-0">
          {data.slice(0, 4).map((d, i) => (
            <div key={d.name} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
              <span className="text-neutral-400">{d.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"day" | "week" | "month">("day");

  const load = async () => {
    try {
      setError(null);
      const res = await fetch("/api/dashboard");
      if (!res.ok) throw new Error("Error de conexión");
      const data = await res.json();
      setStats(data);
    } catch (e: any) {
      setError(e.message || "Error al cargar");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading && !stats) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-28 bg-neutral-900 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-64 bg-neutral-900 rounded-xl animate-pulse" />
          <div className="h-64 bg-neutral-900 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertTriangle className="w-12 h-12 text-rose-400 mb-3" />
        <p className="text-rose-400 font-medium">{error}</p>
        <button onClick={load} className="mt-4 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-sm transition-colors">
          Reintentar
        </button>
      </div>
    );
  }

  if (!stats) return null;

  const s = stats.salesComparison;
  const orders = stats.ordersByStatus;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white">Dashboard</h1>
          <p className="text-sm text-neutral-500 mt-1">Resumen general del negocio</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-neutral-900 rounded-lg p-0.5 border border-neutral-800">
            {(["day", "week", "month"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  activeTab === tab ? "bg-brand-600 text-white" : "text-neutral-400 hover:text-white"
                }`}
              >
                {tab === "day" ? "Hoy" : tab === "week" ? "Semana" : "Mes"}
              </button>
            ))}
          </div>
          <button onClick={load} className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard
          label="Ventas Hoy"
          value={formatPYG(s.today)}
          sub={`${stats.ordersToday} pedidos`}
          icon={DollarSign}
          color="bg-emerald-500/15 text-emerald-400"
          trend={s.changeToday}
          trendLabel="ayer"
        />
        <StatCard
          label="Ventas Semana"
          value={formatPYG(s.week)}
          sub={`${stats.ordersWeek} pedidos`}
          icon={TrendingUp}
          color="bg-sky-500/15 text-sky-400"
          trend={s.changeWeek}
          trendLabel="sem. ant."
        />
        <StatCard
          label="Ventas Mes"
          value={formatPYG(s.month)}
          sub={`${stats.ordersMonth} pedidos`}
          icon={BarChart3}
          color="bg-violet-500/15 text-violet-400"
          trend={s.changeMonth}
          trendLabel="mes ant."
        />
        <StatCard
          label="Ventas Totales"
          value={formatPYG(s.total)}
          sub={`${stats.totalCustomers} clientes`}
          icon={Activity}
          color="bg-amber-500/15 text-amber-400"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8">
          {activeTab === "day" && <SalesOverviewChart data={stats.salesByDay} />}
          {activeTab === "week" && (
            <SalesMonthChart data={stats.salesByWeek.map((d) => ({ month: d.week, total: d.total }))} />
          )}
          {activeTab === "month" && <SalesMonthChart data={stats.salesByMonth} />}
        </div>
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-xl p-5">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-brand-400" /> Pedidos
            </h3>
            <div className="space-y-2">
              {Object.entries(orders).map(([status, count]) => {
                if (count === 0) return null;
                return (
                  <div key={status} className="flex items-center justify-between text-sm">
                    <StatusBadge status={status} />
                    <span className="text-white font-bold">{count}</span>
                  </div>
                );
              })}
              {Object.values(orders).every((v) => v === 0) && (
                <p className="text-sm text-neutral-500 text-center py-3">Sin pedidos</p>
              )}
            </div>
          </div>

          <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-xl p-5">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-sky-400" /> Clientes
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-400">Registrados</span>
                <span className="text-white font-bold">{stats.customerMetrics.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Nuevos (mes)</span>
                <span className="text-emerald-400 font-bold">{stats.customerMetrics.newThisMonth}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Frecuentes</span>
                <span className="text-brand-400 font-bold">{stats.customerMetrics.frequent}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Invitados</span>
                <span className="text-amber-400 font-bold">{stats.customerMetrics.guestCheckouts}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Ticket promedio</span>
                <span className="text-white font-bold">{formatPYG(stats.customerMetrics.averagePurchase)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TopProductsChart data={stats.topProducts.slice(0, 5).map((p) => ({ name: p.name, sold: p.sold }))} />
        <CategoryPie data={stats.categorySales} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-xl p-5">
          <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
            <Package className="w-4 h-4 text-emerald-400" /> Productos
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-neutral-400">Total</span>
              <span className="text-white font-bold">{stats.productMetrics.total}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Activos</span>
              <span className="text-emerald-400 font-bold">{stats.productMetrics.active}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Agotados</span>
              <span className="text-rose-400 font-bold">{stats.productMetrics.outOfStock}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Stock bajo</span>
              <span className="text-amber-400 font-bold">{stats.productMetrics.lowStock}</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-xl p-5">
          <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
            <Box className="w-4 h-4 text-violet-400" /> Inventario
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-neutral-400">Valor total</span>
              <span className="text-white font-bold">{formatPYG(stats.inventoryMetrics.totalValue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Unidades totales</span>
              <span className="text-white font-bold">{stats.inventoryMetrics.totalUnits}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Mayor rotación</span>
              <span className="text-emerald-400 font-bold">{stats.inventoryMetrics.highRotation[0]?.name || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Ticket promedio</span>
              <span className="text-white font-bold">{formatPYG(stats.averageTicket)}</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-xl p-5">
          <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-brand-400" /> Marcas
          </h3>
          <div className="space-y-2">
            {stats.brandSales.slice(0, 5).map((b) => (
              <div key={b.name} className="flex items-center justify-between text-sm">
                <span className="text-neutral-300">{b.name}</span>
                <span className="text-neutral-400">{b.sold} vendidos</span>
              </div>
            ))}
            {stats.brandSales.length === 0 && (
              <p className="text-sm text-neutral-500 text-center py-3">Sin datos</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Plus className="w-4 h-4 text-brand-400" /> Acciones rápidas
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <QuickAction href="/dashboard/admin/products/new" icon={Package} label="Nuevo Producto" color="bg-brand-500/15 text-brand-400" />
            <QuickAction href="/dashboard/admin/orders" icon={ShoppingCart} label="Nuevo Pedido" color="bg-sky-500/15 text-sky-400" />
            <QuickAction href="/dashboard/admin/users" icon={Users} label="Nuevo Usuario" color="bg-emerald-500/15 text-emerald-400" />
            <QuickAction href="/dashboard/admin/categories" icon={Tag} label="Nueva Categoría" color="bg-violet-500/15 text-violet-400" />
            <QuickAction href="/dashboard/admin/inventory" icon={Box} label="Actualizar Stock" color="bg-amber-500/15 text-amber-400" />
            <QuickAction href="/dashboard/admin/settings" icon={Settings} label="Configuración" color="bg-neutral-500/15 text-neutral-400" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-400" /> Alertas
            </h3>
          </div>
          <div className="space-y-2">
            {stats.alerts.length === 0 ? (
              <p className="text-sm text-neutral-500 text-center py-4">
                <TrendingUp className="w-8 h-8 mx-auto mb-2 text-neutral-700" />
                Sin alertas activas
              </p>
            ) : (
              stats.alerts.map((alert) => <AlertCard key={alert.id} alert={alert} />)
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-400" /> Actividad reciente
            </h3>
          </div>
          <div className="space-y-1">
            {stats.recentActivity.length === 0 ? (
              <p className="text-sm text-neutral-500 text-center py-4">Sin actividad reciente</p>
            ) : (
              stats.recentActivity.map((act) => (
                <div key={act.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-800/30 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-neutral-400">
                    <ActivityIcon type={act.type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-neutral-300 truncate">{act.description}</p>
                    <p className="text-[10px] text-neutral-600">{act.userName} · {new Date(act.createdAt).toLocaleString("es-PY", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-brand-400" /> Últimos pedidos
            </h3>
            <Link href="/dashboard/admin/orders" className="text-xs text-brand-400 hover:underline">Ver todos</Link>
          </div>
          {stats.recentOrders.length === 0 ? (
            <p className="text-sm text-neutral-500 text-center py-4">Sin pedidos</p>
          ) : (
            <div className="space-y-1">
              {stats.recentOrders.slice(0, 5).map((o) => (
                <div key={o.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-neutral-800/30 transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-brand-400">{o.orderNumber || o.id.slice(0, 8)}</span>
                      <StatusBadge status={o.status} />
                    </div>
                    <p className="text-xs text-neutral-500 mt-0.5">{o.customerName}</p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-sm font-bold text-white">{formatPYG(o.total)}</p>
                    <p className="text-[10px] text-neutral-600">
                      {new Date(o.createdAt).toLocaleString("es-PY", { day: "2-digit", month: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
