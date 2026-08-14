import { create } from "zustand";

export interface User {
  id: string;
  name: string;
  lastname: string;
  email: string;
  phone?: string;
  document?: string;
  city?: string;
  department?: string;
  address?: string;
  role: { name: string };
}

interface AuthState {
  user: User | null;
  loading: boolean;
  fetchUser: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  register: (data: Record<string, string>) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: true,

  fetchUser: async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      set({ user: data.user, loading: false });
    } catch {
      set({ user: null, loading: false });
    }
  },

  login: async (email, password) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error };
      set({ user: data.user });
      return { ok: true };
    } catch {
      return { ok: false, error: "Error de conexión" };
    }
  },

  register: async (formData) => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error };
      set({ user: data.user });
      return { ok: true };
    } catch {
      return { ok: false, error: "Error de conexión" };
    }
  },

  logout: async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    set({ user: null });
  },

  setUser: (user) => set({ user, loading: false }),
}));
