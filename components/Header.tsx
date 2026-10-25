"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { ShoppingCart, Heart, User, Menu, X, Package, BarChart3, LogOut, ChevronDown, Percent, LayoutGrid, Tags } from "lucide-react";
import { useEffect, useState, useRef, useCallback } from "react";
import { ThemeToggle } from "./ThemeToggle";
import { SearchBar } from "./SearchBar";
import { useSocketStatus } from "@/lib/socket";
import { useAuth } from "@/lib/auth/store";
import { api } from "@/lib/api";
import { useCart, useWishlist } from "@/lib/store";

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const items = useCart((s) => s.items);
  const openCart = useCart((s) => s.open);
  const wishlistIds = useWishlist((s) => s.ids);
  const { user, logout } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSearch, setMobileSearch] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const live = useSocketStatus();
  const cartCount = items.reduce((s, i) => s + i.quantity, 0);
  const wishCount = wishlistIds.length;
  const showDashboard = !!user && user.role.name !== "customer";
  const isAdmin = user?.role.name === "admin";

  useEffect(() => setMounted(true), []);

  const handleLogout = async () => {
    setUserMenuOpen(false);
    setMobileOpen(false);
    await logout();
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-800/80 bg-neutral-950/90 backdrop-blur supports-[backdrop-filter]:bg-neutral-950/80">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center gap-3">
        <button className="lg:hidden p-2 -ml-2 rounded-md hover:bg-neutral-800 min-w-[44px] min-h-[44px] flex items-center justify-center" onClick={() => setMobileOpen(true)} aria-label="Abrir menú">
          <Menu className="w-5 h-5" />
        </button>
        <Link href="/" className="flex items-center gap-2 shrink-0" aria-label="AutoShopping — Inicio">
          <Image src="/logoautoshopping.png" alt="AUTOSHOPPING" width={140} height={42} className="h-8 md:h-10 w-auto rounded-sm" priority />
        </Link>
        <nav className="hidden lg:flex items-center gap-0.5 ml-2">
          <Link href="/" className="text-sm font-medium">Inicio</Link>
          <Link href="/products" className="text-sm font-medium">Productos</Link>
          <Link href="/products?sale=1" className="text-sm font-medium">Ofertas</Link>
          <Link href="/blog" className="text-sm font-medium">Blog</Link>
        </nav>
        <div className="hidden lg:block flex-1 min-w-0 mx-3">
          <SearchBar />
        </div>
        <div className="flex items-center gap-1 ml-auto">
          <button className="lg:hidden p-2 rounded-md hover:bg-neutral-800 min-w-[44px] min-h-[44px] flex items-center justify-center" onClick={() => setMobileSearch(true)} aria-label="Buscar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
          </button>
          <Link href="/wishlist" className="p-2 rounded-md hover:bg-neutral-800 text-neutral-200 min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Favoritos">
            <Heart className="w-5 h-5" />
            {mounted && wishCount > 0 && (<span className="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-rose-500 text-[10px] font-bold flex items-center justify-center">{wishCount}</span>)}
          </Link>
          <button onClick={openCart} className="p-2 rounded-md hover:bg-neutral-800 text-neutral-200 min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Carrito">
            <ShoppingCart className="w-5 h-5" />
            {mounted && cartCount > 0 && (<span className="absolute top-1 right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-brand-500 text-[10px] font-bold flex items-center justify-center">{cartCount}</span>)}
          </button>
          <ThemeToggle />
          <div className="relative">
            <button onClick={() => setUserMenuOpen(!userMenuOpen)} className="p-2 rounded-md hover:bg-neutral-800 flex items-center gap-1 text-neutral-200 min-w-[44px] min-h-[44px] justify-center" aria-label="Mi cuenta">
              <User className="w-5 h-5" />
            </button>
            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-lg border border-neutral-800 bg-neutral-950 shadow-xl py-1 z-50">
                {user ? (
                  <>
                    <div className="px-4 py-2 border-b border-neutral-800"><p className="text-sm font-medium text-white">{user.name} {user.lastname}</p><p className="text-xs text-neutral-400">{user.email}</p></div>
                    {showDashboard && (<a href="/dashboard" className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800"><BarChart3 className="w-4 h-4" /> Dashboard</a>)}
                    {isAdmin && (<a href="/dashboard/admin" className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800"><Package className="w-4 h-4" /> Administración</a>)}
                    <hr className="border-neutral-800 my-1" />
                    <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-neutral-800 w-full"><LogOut className="w-4 h-4" /> Cerrar sesión</button>
                  </>
                ) : (
                  <div className="px-4 py-2">
                    <Link href="/login" className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800">Iniciar sesión</Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}