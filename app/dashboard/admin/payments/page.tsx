"use client";

import { useEffect, useState } from "react";
import { CreditCard, Wallet, Smartphone, QrCode, Banknote, RefreshCw } from "lucide-react";

const ICON_MAP: Record<string, any> = {
  card: CreditCard,
  wallet: Wallet,
  mobile: Smartphone,
  qr: QrCode,
  cash: Banknote,
};

export default function AdminPayments() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function load() {
    setLoading(true);
    setError("");
    fetch("/api/payment/providers")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setError("Error al cargar métodos de pago"))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Configuración de Pagos</h1>
        <button onClick={load} disabled={loading} className="btn-ghost text-sm flex items-center gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Actualizar
        </button>
      </div>

      {data?.commerceData && (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5 mb-6">
          <h2 className="font-semibold text-white mb-3">Proveedor: PagoPar</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-400">Comercio</p>
              <p className="text-white font-medium">{data.commerceData.commerce || "—"}</p>
            </div>
            <div>
              <p className="text-gray-400">Entorno</p>
              <p className="text-white font-medium">{data.commerceData.environment || "—"}</p>
            </div>
            <div>
              <p className="text-gray-400">Comisión</p>
              <p className="text-white font-medium">{data.commission ? `${data.commission}%` : "—"}</p>
            </div>
            <div>
              <p className="text-gray-400">Tarjetas</p>
              <p className={`font-medium ${data.commerceData.hasCard ? "text-emerald-400" : "text-red-400"}`}>
                {data.commerceData.hasCard ? "Habilitado" : "No disponible"}
              </p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm mb-6">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-neutral-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-800 bg-neutral-900/50">
              <th className="text-left px-4 py-3 text-gray-400 font-medium">Método</th>
              <th className="text-right px-4 py-3 text-gray-400 font-medium">Comisión</th>
              <th className="text-right px-4 py-3 text-gray-400 font-medium">Monto mínimo</th>
              <th className="text-right px-4 py-3 text-gray-400 font-medium">Tipo</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-neutral-800/50">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <td key={j} className="px-4 py-4">
                      <div className="h-4 bg-neutral-800 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : !data?.methods?.length ? (
              <tr>
                <td colSpan={4} className="px-4 py-12 text-center text-gray-500">
                  No hay métodos de pago disponibles. Configurá tus credenciales de PagoPar en el archivo .env
                </td>
              </tr>
            ) : (
              data.methods.map((m: any) => {
                const Icon = ICON_MAP[m.icon] || Banknote;
                return (
                  <tr key={m.name} className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5 text-gray-400" />
                        <span className="text-white font-medium">{m.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-300">{m.commission}%</td>
                    <td className="px-4 py-3 text-right text-gray-300">
                      Gs. {m.minAmount?.toLocaleString("es-PY") || "0"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        m.type === "Diferenciado" ? "bg-brand-500/10 text-brand-400" : "bg-neutral-800 text-gray-300"
                      }`}>
                        {m.type}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5 mt-6">
        <h2 className="font-semibold text-white mb-3">Credenciales</h2>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">PAGOPAR_PUBLIC_KEY</span>
            <code className="text-gray-300 bg-neutral-800 px-2 py-0.5 rounded text-xs">
              {process.env.NEXT_PUBLIC_PAGOPAR_PUBLIC_KEY ? "✅ Configurada" : "❌ Pendiente"}
            </code>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">PAGOPAR_PRIVATE_TOKEN</span>
            <code className="text-gray-300 bg-neutral-800 px-2 py-0.5 rounded text-xs">
              {typeof window !== "undefined" ? "🔒 No expuesta al frontend" : "—"}
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}
