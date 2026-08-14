"use client";

import Link from "next/link";
import Image from "next/image";
import { ShoppingCart, Heart, User, Menu, X, Home, Package, BarChart3, Car, LogOut, ChevronDown } from "lucide-react";
import { useCart, useWishlist } from "@/lib/store";
import { useEffect, useState, useRef } from "react";
import { ThemeToggle } from "./ThemeToggle";
import { SearchBar } from "./SearchBar";
import { useSocketStatus } from "@/lib/socket";
import { useAuth } from "@/lib/auth/store";

export function Header() {
  const items = useCart((s) => s.items);
  const openCart = useCart((s) => s.open);
  const wishlistIds = useWishlist((s) => s.ids);
  const { user, logout } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSearch, setMobileSearch] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const live = useSocketStatus();
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const cartCount = items.reduce((s, i) => s + i.quantity, 0);
  const wishCount = wishlistIds.length;

  const isAdmin = user?.role.name === "admin";

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-800/80 bg-neutral-950/80 backdrop-blur supports-[backdrop-filter]:bg-neutral-950/70">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
        <button
          className="md:hidden p-2 -ml-2 rounded-md hover:bg-neutral-800"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Menú"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        <Link href="/" className="flex items-center gap-1.5 shrink-0">
          <Image
            src="/logoautoshopping.png"
            alt="AUTOSHOPPING"
            width={120}
            height={36}
            className="h-7 md:h-9 w-auto rounded-sm"
            priority
          />
        </Link>

        <nav className="hidden lg:flex items-center gap-0.5 ml-2">
          <Link href="/" className="btn-ghost text-sm px-2.5">Inicio</Link>
          <Link href="/products" className="btn-ghost text-sm px-2.5">Productos</Link>
          {mounted && user && (
            <Link href="/dashboard" className="btn-ghost text-sm px-2.5 flex items-center gap-1">
              Dashboard
              {live && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
            </Link>
          )}
        </nav>

        <div className="hidden lg:block flex-1 min-w-0 mx-3">
          <SearchBar />
        </div>

        <div className="flex items-center gap-1 ml-auto">
          <button
            className="md:hidden p-2 rounded-md hover:bg-neutral-800"
            onClick={() => setMobileSearch((v) => !v)}
            aria-label="Buscar"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
          </button>
          <Link href="/wishlist" className="btn-ghost p-2 relative" aria-label="Favoritos">
            <Heart className="w-5 h-5" />
            {mounted && wishCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-[10px] font-bold flex items-center justify-center">
                {wishCount}
              </span>
            )}
          </Link>
          <button onClick={openCart} className="btn-ghost p-2 relative" aria-label="Carrito">
            <ShoppingCart className="w-5 h-5" />
            {mounted && cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-brand-500 text-[10px] font-bold flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
          <ThemeToggle />

          <div className="relative" ref={userMenuRef}>
            {!mounted ? null : user ? (
              <>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="btn-ghost p-2 flex items-center gap-1"
                >
                  <User className="w-5 h-5" />
                  <ChevronDown className="w-3 h-3 hidden md:block" />
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-lg border border-neutral-800 bg-neutral-950 shadow-xl py-1 z-50">
                    <div className="px-4 py-2 border-b border-neutral-800">
                      <p className="text-sm font-medium text-white truncate">{user.name} {user.lastname}</p>
                      <p className="text-xs text-gray-400 truncate">{user.email}</p>
                    </div>
                    <Link href="/dashboard" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-neutral-800">
                      <BarChart3 className="w-4 h-4" /> Dashboard
                    </Link>
                    {isAdmin && (
                      <Link href="/dashboard/admin" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:bg-neutral-800">
                        <Package className="w-4 h-4" /> Administración
                      </Link>
                    )}
                    <hr className="border-neutral-800 my-1" />
                    <button
                      onClick={() => { logout(); setUserMenuOpen(false); }}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-neutral-800 w-full"
                    >
                      <LogOut className="w-4 h-4" /> Cerrar Sesión
                    </button>
                  </div>
                )}
              </>
            ) : (
              <Link href="/login" className="btn-ghost p-2">
                <User className="w-5 h-5" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {mobileSearch && (
        <div className="md:hidden px-4 pb-3">
          <SearchBar onClose={() => setMobileSearch(false)} autoFocus />
        </div>
      )}

      {mobileOpen && (
        <div className="md:hidden border-t border-neutral-800 px-4 py-2 space-y-1">
          <Link href="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-neutral-800 text-sm">
            <Home className="w-4 h-4" /> Inicio
          </Link>
          <Link href="/products" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-neutral-800 text-sm">
            <Package className="w-4 h-4" /> Productos
          </Link>
          {user && (
            <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-neutral-800 text-sm">
              <BarChart3 className="w-4 h-4" /> Dashboard
            </Link>
          )}
          {!user && (
            <Link href="/login" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-neutral-800 text-sm">
              <User className="w-4 h-4" /> Iniciar Sesión
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
