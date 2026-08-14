import type { Product, SearchResult, DashboardStats, Order } from "./types";

const BASE = "/api";

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let sid = localStorage.getItem("session_id");
  if (!sid) {
    sid = crypto.randomUUID?.() || Math.random().toString(36).slice(2);
    localStorage.setItem("session_id", sid);
  }
  return sid;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 15000);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(init?.headers as Record<string, string> || {}),
    };
    if (typeof window !== "undefined") {
      headers["x-session-id"] = getSessionId();
    }
    const res = await fetch(BASE + path, {
      ...init,
      signal: ctrl.signal,
      headers,
    });
    clearTimeout(to);
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status}: ${txt || res.statusText}`);
    }
    return (await res.json()) as T;
  } catch (e: any) {
    if (e?.name === "AbortError") throw new Error("Request timeout");
    throw e;
  }
}

export const api = {
  getProducts: (params?: { category?: string; brand?: string; min?: number; max?: number; q?: string; sort?: string }) => {
    const sp = new URLSearchParams();
    if (params?.category) sp.set("category", params.category);
    if (params?.brand) sp.set("brand", params.brand);
    if (params?.min != null) sp.set("minPrice", String(params.min));
    if (params?.max != null) sp.set("maxPrice", String(params.max));
    if (params?.q) sp.set("search", params.q);
    if (params?.sort) sp.set("sort", params.sort);
    const q = sp.toString();
    return request<{ products: Product[]; total: number }>(`/products${q ? "?" + q : ""}`);
  },
  getProduct: (id: string) => request<{ product: Product; related: Product[] }>(`/products/${encodeURIComponent(id)}`),
  search: (q: string) =>
    request<SearchResult>(`/search?q=${encodeURIComponent(q)}`),
  getCategories: () => request<{ categories: { id: string; name: string; count: number; image: string }[] }>(`/categories`),
  getDashboard: () => request<DashboardStats>(`/dashboard`),
  getOrders: () => request<{ orders: Order[] }>(`/orders`),
  createOrder: (data: any) =>
    request<{ order: Order }>(`/orders`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getCart: () =>
    request<{ items: { productId: string; quantity: number; product?: any }[] }>(`/cart`),
  saveCart: (items: { productId: string; quantity: number }[]) =>
    request<{ success: boolean }>(`/cart`, {
      method: "POST",
      body: JSON.stringify({ items }),
    }),
  getWishlist: () =>
    request<{ ids: string[] }>(`/wishlist`),
  saveWishlist: (ids: string[]) =>
    request<{ success: boolean }>(`/wishlist`, {
      method: "POST",
      body: JSON.stringify({ ids }),
    }),
};
