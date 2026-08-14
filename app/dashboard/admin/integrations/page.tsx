"use client";

import { useEffect, useState } from "react";
import { Plug, MessageCircle, Shield, Truck, Wifi, Save, CheckCircle2 } from "lucide-react";
import { useUI } from "@/lib/store";

const INTEGRATIONS = [
  {
    key: "whatsapp", name: "WhatsApp Business", desc: "Enviar confirmaciones de venta y recordatorios de cobranza por WhatsApp.",
    icon: MessageCircle, color: "text-emerald-400 bg-emerald-500/15", fields: [
      { key: "whatsapp.number", label: "Número de negocio (con código país, ej: +595981234567)", placeholder: "+595..." },
      { key: "whatsapp.token", label: "Token de API (opcional)", placeholder: "••••", type: "password" },
    ],
  },
  {
    key: "defensaConsumidor", name: "SEPRELAD / Defensa del Consumidor", desc: "Cliente frecuente: repuestos n° 3.677 áreas técnicas habilitadas por la DINAC... Configuración de cumplimiento normativo.",
    icon: Shield, color: "text-sky-400 bg-sky-500/15", fields: [
      { key: "seprelad.license", label: "N° de licencia / matrícula", placeholder: "Ej: D-4871" },
      { key: "seprelad.entity", label: "Entidad reguladora", placeholder: "SEPRELAD / DINAC / Municipalidad" },
    ],
  },
  {
    key: "delivery", name: "Delivery y envíos", desc: "Integración con servicios de mensajería local (Uber, Bolt, Moto Express).",
    icon: Truck, color: "text-amber-400 bg-amber-500/15", fields: [
      { key: "delivery.provider", label: "Proveedor de envíos", placeholder: "Uber / Bolt / Otro" },
      { key: "delivery.cost", label: "Tarifa base de envío (Gs)", placeholder: "ej: 25000" },
    ],
  },
  {
    key: "ecommerce", name: "E-commerce / Catálogo público", desc: "Los productos activos se muestran en la tienda online. Sincronización de stock automática.",
    icon: Wifi, color: "text-brand-400 bg-brand-500/15", fields: [
      { key: "ecommerce.enabled", label: "Tienda online habilitada", placeholder: "si / no" },
      { key: "ecommerce.storeUrl", label: "URL de la tienda", placeholder: "https://..." },
    ],
  },
];

export default function IntegrationsPage() {
  const ui = useUI();
  const [values, setValues] = useState<Record<string, string>>({});
  const [testing, setTesting] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const r = await fetch("/api/settings");
    const d = await r.json();
    const v: Record<string, string> = {};
    (d.settings || []).forEach((s: { key: string; value: string }) => { v[s.key] = s.value; });
    setValues(v);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    try {
      const r = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: values }),
      });
      if (!r.ok) { ui.showToast("Error al guardar", "error"); return; }
      ui.showToast("Integraciones guardadas", "success");
    } finally { setSaving(false); }
  };

  const test = (key: string) => {
    setTesting(key);
    setTimeout(() => {
      setTesting(null);
      ui.showToast("Conexión simulada exitosa (integración configurable)", "success");
    }, 1200);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Integraciones</h1>
          <p className="text-sm text-neutral-500 mt-1">Conexiones con servicios externos (WhatsApp, envíos, e-commerce)</p>
        </div>
        <button onClick={save} disabled={saving} className="btn-primary text-sm py-2 flex items-center gap-2"><Save className="w-4 h-4" /> {saving ? "Guardando..." : "Guardar todo"}</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {INTEGRATIONS.map((item) => {
          const key = values[`${item.key}.enabled`] || "si";
          return (
            <div key={item.key} className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-xl p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${item.color}`}><item.icon className="w-5 h-5" /></div>
                  <div>
                    <h3 className="font-semibold">{item.name}</h3>
                    <p className="text-xs text-neutral-500 max-w-md">{item.desc}</p>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${key === "si" ? "bg-emerald-500/10 text-emerald-400" : "bg-neutral-800 text-neutral-500"}`}>
                  <Plug className="w-3 h-3" /> {key === "si" ? "Habilitada" : "Deshabilitada"}
                </span>
              </div>
              <div className="space-y-3">
                {item.fields.map((f) => (
                  <div key={f.key}>
                    <label className="block text-xs text-neutral-400 mb-1">{f.label}</label>
                    <input type={f.type || "text"} className="input py-2 text-sm w-full" placeholder={f.placeholder} value={values[f.key] || ""}
                      onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} />
                  </div>
                ))}
                <label className="flex items-center gap-2 text-xs text-neutral-400 cursor-pointer">
                  <input type="checkbox" checked={key === "si"} onChange={(e) => setValues({ ...values, [`${item.key}.enabled`]: e.target.checked ? "si" : "no" })} className="rounded border-neutral-700 bg-neutral-800" />
                  Habilitar esta integración
                </label>
                <div className="flex justify-end">
                  <button onClick={() => test(item.key)} disabled={testing === item.key} className="btn-ghost text-xs py-2 flex items-center gap-1.5">
                    {testing === item.key ? <span className="w-3 h-3 border-2 border-neutral-600 border-t-brand-400 rounded-full animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    {testing === item.key ? "Probando..." : "Probar conexión"}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 text-xs text-neutral-500">
        Las integraciones se guardan en la configuración del sistema. Para conexiones reales (WhatsApp Cloud API, pasarelas de pago),
        se requiere configurar las claves en el servidor. Consultá la documentación de cada proveedor.
      </div>
    </div>
  );
}