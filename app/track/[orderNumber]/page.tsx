"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Package, Truck, CheckCircle2, Clock, XCircle, MapPin, ArrowLeft } from "lucide-react";
import { formatPYG } from "@/lib/utils";

interface TrackData {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string | null;
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  courier: string | null;
  trackingNumber: string | null;
  createdAt: string;
  deliveredAt: string | null;
  customerName: string;
  items: { productName: string; quantity: number }[];
  history: { status: string; notes: string | null; createdAt: string }[];
}

const STEPS = [
  { key: "pending", label: "Recibido", icon: Clock },
  { key: "confirmed", label: "Confirmado", icon: CheckCircle2 },
  { key: "preparing", label: "En preparación", icon: Package },
  { key: "shipped", label: "En camino", icon: Truck },
  { key: "delivered", label: "Entregado", icon: MapPin },
];

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  preparing: "En preparación",
  shipped: "En camino",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

export default function TrackPage({ params }: { params: { orderNumber: string } }) {
  const orderNumber = params.orderNumber;
  const [data, setData] = useState<TrackData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetch(`/api/track/${encodeURIComponent(orderNumber)}`)
      .then(async (r) => {
        const d = await r.json();
        if (!alive) return;
        if (!r.ok) setError(d.error || "Pedido no encontrado");
        else setData(d.order);
      })
      .catch(() => alive && setError("Error de conexión"))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [orderNumber]);

  const stepIndex = data ? STEPS.findIndex((s) => s.key === data.status) : -1;
  const cancelled = data?.status === "cancelled";

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <Link href="/products" className="text-sm text-neutral-400 hover:text-brand-400 flex items-center gap-1 mb-6">
        <ArrowLeft className="w-4 h-4" /> Volver a la tienda
      </Link>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-extrabold">Seguimiento de pedido</h1>
            <p className="text-brand-400 font-mono font-bold">{decodeURIComponent(orderNumber).toUpperCase()}</p>
          </div>
          {data && (
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
              cancelled ? "bg-red-500/15 text-red-400" : data.status === "delivered" ? "bg-emerald-500/15 text-emerald-400" : "bg-brand-500/15 text-brand-400"
            }`}>
              {STATUS_LABEL[data.status] || data.status}
            </span>
          )}
        </div>

        {loading && <p className="text-neutral-400 text-sm">Consultando tu pedido…</p>}
        {error && <p className="text-red-400 text-sm">{error}</p>}

        {data && (
          <>
            {cancelled ? (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
                <XCircle className="w-5 h-5" /> Este pedido fue cancelado.
              </div>
            ) : (
              <div className="flex items-center justify-between mb-8">
                {STEPS.map((s, i) => {
                  const Icon = s.icon;
                  const done = i <= stepIndex;
                  const active = i === stepIndex;
                  return (
                    <div key={s.key} className="flex flex-col items-center flex-1 last:flex-none">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        done ? "bg-emerald-500 text-white" : "bg-neutral-800 text-neutral-500"
                      } ${active ? "ring-2 ring-brand-500 ring-offset-2 ring-offset-neutral-900" : ""}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className={`text-[11px] mt-1.5 text-center ${done ? "text-emerald-400" : "text-neutral-500"}`}>{s.label}</span>
                      {i < STEPS.length - 1 && (
                        <div className={`h-0.5 w-full mt-[-20px] mb-5 mx-1 ${i < stepIndex ? "bg-emerald-500" : "bg-neutral-800"}`} />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {(data.courier || data.trackingNumber) && (
              <div className="bg-neutral-800/50 border border-neutral-800 rounded-lg p-4 mb-6 text-sm">
                {data.courier && <p><span className="text-neutral-400">Transportista:</span> <strong>{data.courier}</strong></p>}
                {data.trackingNumber && (
                  <p><span className="text-neutral-400">N.º de seguimiento:</span> <code className="text-brand-400">{data.trackingNumber}</code></p>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm mb-6">
              <div><p className="text-neutral-500 text-xs">Cliente</p><p className="font-medium">{data.customerName}</p></div>
              <div><p className="text-neutral-500 text-xs">Creado</p><p className="font-medium">{new Date(data.createdAt).toLocaleDateString("es-PY")}</p></div>
              <div><p className="text-neutral-500 text-xs">Pago</p><p className="font-medium capitalize">{data.paymentStatus}</p></div>
              <div><p className="text-neutral-500 text-xs">Total</p><p className="font-medium text-brand-400">{formatPYG(data.total)}</p></div>
            </div>

            <h3 className="font-semibold text-sm mb-2">Productos</h3>
            <ul className="space-y-1 text-sm mb-6">
              {data.items.map((it, idx) => (
                <li key={idx} className="flex justify-between">
                  <span className="text-neutral-300">{it.productName} <span className="text-neutral-500">×{it.quantity}</span></span>
                </li>
              ))}
            </ul>

            {data.discount > 0 && (
              <p className="text-sm text-emerald-400 mb-2">Descuento aplicado: -{formatPYG(data.discount)}</p>
            )}

            <h3 className="font-semibold text-sm mb-2">Historial</h3>
            <ul className="space-y-2">
              {data.history.map((h, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <span className="w-2 h-2 rounded-full bg-brand-500 mt-1.5 shrink-0" />
                  <div>
                    <p className="text-neutral-200">{STATUS_LABEL[h.status] || h.status}</p>
                    {h.notes && <p className="text-neutral-500 text-xs">{h.notes}</p>}
                    <p className="text-neutral-600 text-xs">{new Date(h.createdAt).toLocaleString("es-PY")}</p>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
