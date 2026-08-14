"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, UserPlus } from "lucide-react";
import { useAuth } from "@/lib/auth/store";

export default function RegisterPage() {
  const router = useRouter();
  const setUser = useAuth((s) => s.setUser);
  const [form, setForm] = useState({
    name: "",
    lastname: "",
    document: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
    city: "",
    address: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Las contraseñas no coinciden");
      setLoading(false);
      return;
    }

    if (form.password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          lastname: form.lastname,
          document: form.document,
          phone: form.phone,
          email: form.email,
          password: form.password,
          city: form.city,
          address: form.address,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al registrarse");
        return;
      }

      setUser(data.user);
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">Crear Cuenta</h1>
          <p className="text-gray-400 mt-2">Registrate en AutoShopping Paraguay</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Nombre</label>
              <input name="name" value={form.name} onChange={handleChange} className="input px-3 w-full" placeholder="Juan" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Apellido</label>
              <input name="lastname" value={form.lastname} onChange={handleChange} className="input px-3 w-full" placeholder="Pérez" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Documento</label>
              <input name="document" value={form.document} onChange={handleChange} className="input px-3 w-full" placeholder="4.567.890" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Teléfono</label>
              <input name="phone" value={form.phone} onChange={handleChange} className="input px-3 w-full" placeholder="0981 123 456" required />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
            <input name="email" type="email" value={form.email} onChange={handleChange} className="input px-3 w-full" placeholder="ejemplo@correo.com" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Contraseña</label>
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={handleChange}
                  className="input px-3 w-full pr-12"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-neutral-800 text-gray-500 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Confirmar</label>
              <input
                name="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={handleChange}
                className="input px-3 w-full"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Ciudad</label>
              <input name="city" value={form.city} onChange={handleChange} className="input px-3 w-full" placeholder="Asunción" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Dirección</label>
              <input name="address" value={form.address} onChange={handleChange} className="input px-3 w-full" placeholder="Av. Principal 123" />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 mt-6">
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <UserPlus className="w-5 h-5" />
            )}
            {loading ? "Creando cuenta..." : "Crear Cuenta"}
          </button>
        </form>

        <p className="text-center text-gray-400 mt-6 text-sm">
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="text-brand-500 hover:text-brand-400 font-medium">
            Iniciar Sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
