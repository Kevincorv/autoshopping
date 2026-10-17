"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Download, ShieldCheck, CheckCircle2 } from "lucide-react";
import { defaultRedirect } from "@/lib/auth/redirect";

type Phase = "loading" | "qr" | "verify" | "recovery" | "error";

export default function TwoFaSetupPage() {
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("loading");
  const [qr, setQr] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [savedAck, setSavedAck] = useState(false);

  async function loadSetup() {
    try {
      const res = await fetch("/api/auth/2fa/setup", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        if (data.error && data.error.includes("ya está activada")) {
          router.push("/dashboard/admin");
          return;
        }
        setError(data.error || "No se pudo iniciar la configuración");
        setPhase("error");
        return;
      }
      setQr(data.qr);
      setSecret(data.secret);
      setPhase("qr");
    } catch {
      setError("Error de conexión");
      setPhase("error");
    }
  }

  useEffect(() => {
    loadSetup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleEnable(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/2fa/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Código incorrecto");
        return;
      }
      setRecoveryCodes(data.recoveryCodes || []);
      setPhase("recovery");
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  async function copyCodes() {
    try {
      await navigator.clipboard.writeText(recoveryCodes.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  function downloadCodes() {
    const blob = new Blob([`AUTOSHOPPING - Códigos de recuperación 2FA\n\n${recoveryCodes.join("\n")}\n`], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "autoshopping-codigos-recuperacion.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function finish() {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      const roleName = data?.user?.roleName || data?.user?.role?.name;
      router.push(defaultRedirect(roleName));
      router.refresh();
    } catch {
      router.push("/dashboard");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center">
            <ShieldCheck className="w-7 h-7 text-brand-500" />
          </div>
          <h1 className="text-3xl font-bold text-white">Activar verificación en dos pasos</h1>
          <p className="text-gray-400 mt-2">
            Protegé tu cuenta con un código de tu aplicación autenticadora
          </p>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-5">
          {phase === "loading" && (
            <div className="flex flex-col items-center gap-3 py-8 text-gray-400">
              <div className="w-8 h-8 border-2 border-white/20 border-t-brand-500 rounded-full animate-spin" />
              <p className="text-sm">Generando código QR...</p>
            </div>
          )}

          {phase === "error" && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {phase === "qr" && (
            <>
              <ol className="text-sm text-gray-300 space-y-2 list-decimal list-inside">
                <li>
                  Abrí tu app de autenticación (Google Authenticator, Authy, 1Password, etc.).
                </li>
                <li>Escaneá este código QR o ingresá la clave manualmente.</li>
                <li>Ingresá el código de 6 dígitos que genere la app.</li>
              </ol>

              <div className="flex justify-center py-2">
                {qr ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qr} alt="Código QR para configurar 2FA" className="w-56 h-56 rounded-xl bg-white p-3" />
                ) : null}
              </div>

              <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Clave manual (si no podés escanear):</p>
                <p className="font-mono text-sm text-gray-200 break-all select-all">{secret}</p>
              </div>

              <form onSubmit={handleEnable} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    Código de verificación
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="input w-full text-center tracking-widest"
                    placeholder="123456"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    autoFocus
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || code.trim().length < 6}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5" />
                  )}
                  {loading ? "Activando..." : "Activar 2FA"}
                </button>
              </form>
            </>
          )}

          {phase === "recovery" && (
            <>
              <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-3 rounded-lg text-sm">
                ¡2FA activado! Guardá estos códigos de recuperación: te servirán si perdés el acceso a
                tu app autenticadora. <strong>Cada código se usa una sola vez.</strong>
              </div>

              <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-2 font-mono text-sm text-gray-200">
                  {recoveryCodes.map((c) => (
                    <span key={c} className="text-center py-1 bg-neutral-900 rounded">
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={copyCodes}
                  className="flex-1 btn-ghost flex items-center justify-center gap-2 py-2 text-sm"
                >
                  {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copiado" : "Copiar"}
                </button>
                <button
                  type="button"
                  onClick={downloadCodes}
                  className="flex-1 btn-ghost flex items-center justify-center gap-2 py-2 text-sm"
                >
                  <Download className="w-4 h-4" />
                  Descargar
                </button>
              </div>

              <label className="flex items-start gap-2 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={savedAck}
                  onChange={(e) => setSavedAck(e.target.checked)}
                  className="mt-0.5 rounded border-gray-600 bg-gray-800"
                />
                Guardé mis códigos de recuperación en un lugar seguro.
              </label>

              <button
                type="button"
                onClick={finish}
                disabled={!savedAck}
                className="btn-primary w-full"
              >
                Continuar al panel
              </button>
            </>
          )}

          {phase !== "error" && phase !== "loading" && phase !== "recovery" && error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
