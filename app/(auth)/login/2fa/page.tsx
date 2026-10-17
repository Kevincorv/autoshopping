"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShieldCheck, KeyRound } from "lucide-react";
import { useAuth } from "@/lib/auth/store";
import { sanitizeRedirect } from "@/lib/auth/redirect";

function TwoFaForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get("redirect");
  const setUser = useAuth((s) => s.setUser);

  const [code, setCode] = useState("");
  const [useRecovery, setUseRecovery] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "No se pudo verificar el código");
        return;
      }

      const roleName: string | undefined = data.user?.role?.name;
      const target = sanitizeRedirect(rawRedirect, roleName);
      setUser(data.user);

      if (data.mustChangePassword) {
        router.push(`/change-password?redirect=${encodeURIComponent(target)}`);
      } else if (roleName === "admin" && data.user?.twoFactorEnabled === false) {
        router.push("/2fa-setup");
      } else {
        router.push(target);
        router.refresh();
      }
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
        <label className="block text-sm font-medium text-gray-300 mb-1.5">
          {useRecovery ? "Código de recuperación" : "Código de verificación"}
        </label>
        <div className="relative">
          {useRecovery ? (
            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
          ) : (
            <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 pointer-events-none" />
          )}
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="input pl-10 w-full"
            placeholder={useRecovery ? "XXXXXX-XXXXXX" : "123456"}
            autoComplete="one-time-code"
            autoFocus
            required
          />
        </div>
        <p className="text-xs text-gray-500 mt-1.5">
          {useRecovery
            ? "Ingresá uno de los códigos de recuperación que guardaste al activar el 2FA."
            : "Abrí tu app autenticadora (Google Authenticator, Authy, etc.) y copiá el código de 6 dígitos."}
        </p>
      </div>

      <button
        type="submit"
        disabled={loading || code.trim().length < 4}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        {loading ? (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <ShieldCheck className="w-5 h-5" />
        )}
        {loading ? "Verificando..." : "Verificar"}
      </button>

      <div className="text-center text-sm">
        <button
          type="button"
          onClick={() => {
            setUseRecovery(!useRecovery);
            setCode("");
            setError("");
          }}
          className="text-brand-500 hover:text-brand-400"
        >
          {useRecovery ? "Usar código de la app autenticadora" : "Usar código de recuperación"}
        </button>
      </div>
    </form>
  );
}

export default function TwoFaPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center">
            <ShieldCheck className="w-7 h-7 text-brand-500" />
          </div>
          <h1 className="text-3xl font-bold text-white">Verificación en dos pasos</h1>
          <p className="text-gray-400 mt-2">
            Ingresá el código para completar el inicio de sesión
          </p>
        </div>

        <Suspense>
          <TwoFaForm />
        </Suspense>

        <p className="text-center text-gray-500 mt-6 text-sm">
          <a href="/login" className="hover:text-gray-300">
            Volver al inicio de sesión
          </a>
        </p>
      </div>
    </div>
  );
}
