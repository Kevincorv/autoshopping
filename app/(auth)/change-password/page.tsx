"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { useAuth } from "@/lib/auth/store";
import { sanitizeRedirect } from "@/lib/auth/redirect";

function ChangePasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get("redirect");
  const user = useAuth((s) => s.user);

  const isCustomer = user?.role?.name === "customer";
  const policyHint = isCustomer
    ? "Mínimo 8 caracteres."
    : "Mínimo 12 caracteres, con mayúscula, minúscula, número y símbolo.";

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (next !== confirm) {
      setError("Las contraseñas no coinciden");
      return;
    }
    if (next === current) {
      setError("La nueva contraseña debe ser distinta a la actual");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "No se pudo cambiar la contraseña");
        return;
      }

      if (data.requires2FASetup) {
        router.push("/2fa-setup");
        return;
      }

      router.push(sanitizeRedirect(rawRedirect, user?.role?.name));
      router.refresh();
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">Contraseña actual</label>
        <div className="relative">
          <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
          <input
            type={show ? "text" : "password"}
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            className="input pl-10 pr-12 w-full"
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
          <button
            type="button"
            onClick={() => setShow(!show)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-neutral-800 text-gray-500 hover:text-gray-300"
          >
            {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">Nueva contraseña</label>
        <div className="relative">
          <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
          <input
            type={show ? "text" : "password"}
            value={next}
            onChange={(e) => setNext(e.target.value)}
            className="input pl-10 pr-12 w-full"
            placeholder="••••••••"
            autoComplete="new-password"
            required
          />
        </div>
        <p className="text-xs text-gray-500 mt-1.5">{policyHint}</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">Repetir nueva contraseña</label>
        <div className="relative">
          <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
          <input
            type={show ? "text" : "password"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="input pl-10 w-full"
            placeholder="••••••••"
            autoComplete="new-password"
            required
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        {loading ? (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <LockKeyhole className="w-5 h-5" />
        )}
        {loading ? "Guardando..." : "Cambiar contraseña"}
      </button>

      <p className="text-xs text-gray-500 text-center">
        Al cambiar la contraseña se cierran las sesiones en otros dispositivos.
      </p>
    </form>
  );
}

export default function ChangePasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center">
            <LockKeyhole className="w-7 h-7 text-brand-500" />
          </div>
          <h1 className="text-3xl font-bold text-white">Cambio de contraseña</h1>
          <p className="text-gray-400 mt-2">Definí una contraseña nueva para tu cuenta</p>
        </div>

        <Suspense>
          <ChangePasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
