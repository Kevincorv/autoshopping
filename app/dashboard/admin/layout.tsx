"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard, Package, ShoppingCart, Box, BarChart3,
  Settings, ArrowLeft, CreditCard, Users, Shield,
  Bell, LogOut, Menu, X, ChevronDown, ChevronRight,
  TrendingUp, ClipboardList, Store,
  UserCircle2, Tags as TagsIcon, ArrowLeftRight,
  AlertTriangle, Truck, ShoppingBag, Wallet, Receipt,
  BadgePercent, Plug,
} from "lucide-react";

const NAV_GROUPS = [
  {
    label: "Panel Principal",
    items: [
      { href: "/dashboard/admin", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Ventas",
    items: [
      { href: "/dashboard/admin/orders", label: "Pedidos", icon: ShoppingCart },
      { href: "/dashboard/admin/customers", label: "Clientes", icon: UserCircle2 },
      { href: "/dashboard/admin/sales", label: "Ventas", icon: TrendingUp },
      { href: "/dashboard/admin/returns", label: "Devoluciones", icon: ArrowLeftRight },
    ],
  },
  {
    label: "Catálogo",
    items: [
      { href: "/dashboard/admin/products", label: "Productos", icon: Package },
      { href: "/dashboard/admin/categories", label: "Categorías", icon: TagsIcon },
      { href: "/dashboard/admin/brands", label: "Marcas", icon: BadgePercent },
    ],
  },
  {
    label: "Inventario",
    items: [
      { href: "/dashboard/admin/inventory", label: "Inventario", icon: Box },
      { href: "/dashboard/admin/stock-movements", label: "Movimientos", icon: ArrowLeftRight },
      { href: "/dashboard/admin/low-stock", label: "Stock bajo", icon: AlertTriangle },
      { href: "/dashboard/admin/purchases", label: "Compras", icon: ShoppingBag },
      { href: "/dashboard/admin/suppliers", label: "Proveedores", icon: Truck },
    ],
  },
  {
    label: "Finanzas",
    items: [
      { href: "/dashboard/admin/payments", label: "Pagos", icon: CreditCard },
      { href: "/dashboard/admin/cash", label: "Caja", icon: Wallet },
      { href: "/dashboard/admin/receivables", label: "Cuentas por cobrar", icon: Receipt },
    ],
  },
  {
    label: "Analítica",
    items: [
      { href: "/dashboard/admin/reports", label: "Reportes", icon: BarChart3 },
      { href: "/dashboard/admin/audit", label: "Auditoría", icon: ClipboardList },
    ],
  },
  {
    label: "Sistema",
    items: [
      { href: "/dashboard/admin/notifications", label: "Notificaciones", icon: Bell },
      { href: "/dashboard/admin/users", label: "Usuarios", icon: Users },
      { href: "/dashboard/admin/roles", label: "Roles y permisos", icon: Shield },
      { href: "/dashboard/admin/integrations", label: "Integraciones", icon: Plug },
      { href: "/dashboard/admin/settings", label: "Configuración", icon: Settings },
    ],
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => setUser(data.user || null))
      .catch(() => {});
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setShowUserMenu(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const isActive = (href: string) => {
    if (href === "/dashboard/admin") return pathname === "/dashboard/admin";
    return pathname.startsWith(href);
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="flex h-screen bg-neutral-950 overflow-hidden">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-72 flex flex-col bg-neutral-950 border-r border-neutral-800 transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="h-16 flex items-center gap-3 px-5 border-b border-neutral-800 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
            <Store className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">AutoShoppping</p>
            <p className="text-[10px] text-neutral-500">Panel Administrativo</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4 space-y-1">
          {NAV_GROUPS.map((group) => {
            const groupOpen = expandedGroups[group.label] !== false;
            const groupActive = group.items.some((item) => isActive(item.href));
            return (
              <div key={group.label}>
                <button
                  onClick={() => toggleGroup(group.label)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
                    groupActive ? "text-brand-400" : "text-neutral-500 hover:text-neutral-300"
                  }`}
                >
                  {group.label}
                  {groupOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                </button>
                {groupOpen && (
                  <div className="mt-1 space-y-0.5">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                            active
                              ? "bg-brand-500/10 text-brand-400 font-medium border-l-2 border-brand-500"
                              : "text-neutral-400 hover:text-white hover:bg-neutral-800/50 border-l-2 border-transparent"
                          }`}
                        >
                          <Icon className="w-4.5 h-4.5 shrink-0" />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="border-t border-neutral-800 p-3 shrink-0">
          <Link
            href="/"
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-neutral-500 hover:text-white hover:bg-neutral-800/50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Ir a la Tienda
          </Link>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-between px-4 md:px-6 shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 text-neutral-400 hover:text-white"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2 text-sm text-neutral-500">
              <BarChart3 className="w-4 h-4 text-brand-500" />
              <span>Panel de Control</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
              {showNotifications && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl shadow-black/50 overflow-hidden z-50">
                  <div className="p-3 border-b border-neutral-800">
                    <p className="text-sm font-semibold text-white">Notificaciones</p>
                  </div>
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-sm text-neutral-500">
                      <Bell className="w-8 h-8 mx-auto mb-2 text-neutral-700" />
                      Sin notificaciones
                    </div>
                  ) : (
                    <div className="max-h-72 overflow-y-auto">
                      {notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`p-3 border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors cursor-pointer ${
                            !n.isRead ? "bg-brand-500/5" : ""
                          }`}
                        >
                          <p className="text-sm text-white">{n.title}</p>
                          <p className="text-xs text-neutral-500 mt-0.5">{n.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-neutral-800 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-brand-600/20 border border-brand-500/30 flex items-center justify-center">
                  <span className="text-xs font-bold text-brand-400">
                    {user?.name?.[0]?.toUpperCase() || "A"}
                  </span>
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-xs font-medium text-white">{user?.name || "Admin"}</p>
                  <p className="text-[10px] text-neutral-500 capitalize">{user?.roleName || "admin"}</p>
                </div>
              </button>
              {showUserMenu && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl shadow-black/50 overflow-hidden z-50">
                  <div className="p-3 border-b border-neutral-800">
                    <p className="text-sm font-medium text-white">{user?.name} {user?.lastname}</p>
                    <p className="text-xs text-neutral-500">{user?.email}</p>
                  </div>
                  <div className="p-1">
                    <button
                      onClick={() => { router.push("/dashboard"); setShowUserMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-300 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      Mi Dashboard
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Cerrar sesión
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-neutral-950">
          <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
