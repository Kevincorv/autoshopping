"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { api } from "./api";
import type { Product } from "./types";

interface CartState {
  items: { productId: string; quantity: number; addedAt: string }[];
  drawerOpen: boolean;
  loading: boolean;
  error: string | null;
  add: (productId: string, qty?: number) => void;
  remove: (productId: string) => void;
  setQty: (productId: string, qty: number) => void;
  clear: () => void;
  open: () => void;
  close: () => void;
  toggle: () => void;
  load: () => Promise<void>;
  sync: () => Promise<void>;
  count: () => number;
  total: (products: Product[]) => number;
}

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      drawerOpen: false,
      loading: false,
      error: null,
      add: (productId, qty = 1) => {
        try {
          const items = get().items.slice();
          const idx = items.findIndex((i) => i.productId === productId);
          if (idx >= 0) {
            items[idx] = { ...items[idx], quantity: Math.min(99, items[idx].quantity + qty) };
          } else {
            items.push({ productId, quantity: qty, addedAt: new Date().toISOString() });
          }
          set({ items, drawerOpen: true });
          void get().sync();
        } catch (e) {
          console.error("cart add error", e);
        }
      },
      remove: (productId) => {
        set({ items: get().items.filter((i) => i.productId !== productId) });
        void get().sync();
      },
      setQty: (productId, qty) => {
        if (qty <= 0) {
          get().remove(productId);
          return;
        }
        set({
          items: get().items.map((i) =>
            i.productId === productId ? { ...i, quantity: Math.min(99, qty) } : i
          ),
        });
        void get().sync();
      },
      clear: () => {
        set({ items: [] });
        void get().sync();
      },
      open: () => set({ drawerOpen: true }),
      close: () => set({ drawerOpen: false }),
      toggle: () => set({ drawerOpen: !get().drawerOpen }),
      load: async () => {
        try {
          const r = await api.getCart();
          if (Array.isArray(r.items)) {
            const items = r.items.map((i) => ({
              productId: String(i.productId || ""),
              quantity: Math.max(1, Number(i.quantity || 1)),
              addedAt: new Date().toISOString(),
            }));
            set({ items });
          }
        } catch (e) {
          console.error("cart load error", e);
        }
      },
      sync: async () => {
        try {
          await api.saveCart(
            get().items.map((i) => ({ productId: i.productId, quantity: i.quantity }))
          );
        } catch (e) {
          console.error("cart sync error", e);
        }
      },
      count: () => get().items.reduce((s, i) => s + i.quantity, 0),
      total: (products) => {
        const map = new Map(products.map((p) => [p.id, p]));
        return get().items.reduce((s, i) => {
          const p = map.get(i.productId);
          return s + (p ? p.price * i.quantity : 0);
        }, 0);
      },
    }),
    {
      name: "as_cart",
      storage: createJSONStorage(() => (typeof window === "undefined" ? (undefined as any) : localStorage)),
      partialize: (s) => ({ items: s.items }),
    }
  )
);

interface WishlistState {
  ids: string[];
  toggle: (id: string) => void;
  has: (id: string) => boolean;
  load: () => Promise<void>;
  sync: () => Promise<void>;
}

export const useWishlist = create<WishlistState>()(
  persist(
    (set, get) => ({
      ids: [],
      toggle: (id) => {
        const ids = get().ids.includes(id)
          ? get().ids.filter((x) => x !== id)
          : [...get().ids, id];
        set({ ids });
        void get().sync();
      },
      has: (id) => get().ids.includes(id),
      load: async () => {
        try {
          const r = await api.getWishlist();
          if (Array.isArray(r.ids)) set({ ids: r.ids });
        } catch (e) {
          console.error("wishlist load error", e);
        }
      },
      sync: async () => {
        try {
          await api.saveWishlist(get().ids);
        } catch (e) {
          console.error("wishlist sync error", e);
        }
      },
    }),
    {
      name: "as_wishlist",
      storage: createJSONStorage(() => (typeof window === "undefined" ? (undefined as any) : localStorage)),
      partialize: (s) => ({ ids: s.ids }),
    }
  )
);

interface UIState {
  theme: "light" | "dark";
  toggleTheme: () => void;
  toast: { id: number; message: string; type: "success" | "error" | "info" } | null;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
  hideToast: () => void;
}

export const useUI = create<UIState>()(
  persist(
    (set, get) => ({
      theme:
        typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: light)").matches
          ? "light"
          : "dark",
      toggleTheme: () => set({ theme: get().theme === "dark" ? "light" : "dark" }),
      toast: null,
      showToast: (message, type = "info") => {
        const id = Date.now();
        set({ toast: { id, message, type } });
        setTimeout(() => {
          if (get().toast?.id === id) set({ toast: null });
        }, 3000);
      },
      hideToast: () => set({ toast: null }),
    }),
    {
      name: "as_ui",
      storage: createJSONStorage(() => (typeof window === "undefined" ? (undefined as any) : localStorage)),
      partialize: (s) => ({ theme: s.theme }),
    }
  )
);
