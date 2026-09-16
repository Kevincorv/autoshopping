"use client";

import { useEffect, useState } from "react";
import { Save, Store, Phone, Mail, Globe, CreditCard, Truck, Receipt, MessageCircle, Image } from "lucide-react";

const SETTINGS_KEYS = [
  "store_name", "store_logo", "store_email", "store_phone", "store_address",
  "whatsapp_number", "whatsapp_message", "facebook_url", "instagram_url",
  "shipping_cost", "tax_rate", "currency",
  "store_ruc", "ticket_footer", "low_stock_threshold", "min_purchase", "business_hours", "invoice_prefix",
];

const SETTINGS_LABELS: Record<string, string> = {
  store_name: "Nombre de la tienda",
  store_logo: "URL del logo",
  store_email: "Email de contacto",
  store_phone: "Teléfono",
  store_address: "Dirección",
  whatsapp_number: "Número de WhatsApp",
  whatsapp_message: "Mensaje predeterminado",
  facebook_url: "Facebook URL",
  instagram_url: "Instagram URL",
  shipping_cost: "Costo de envío (Gs.)",
  tax_rate: "Tasa de impuesto (%)",
  currency: "Moneda",
  store_ruc: "RUC / matrícula",
  ticket_footer: "Pie de ticket / comprobante",
  low_stock_threshold: "Umbral de stock bajo (por defecto)",
  min_purchase: "Compra mínima (Gs.)",
  business_hours: "Horario de atención",
  invoice_prefix: "Prefijo de facturación (ej: 001-001-)",
};

const SETTINGS_ICONS: Record<string, any> = {
  store_name: Store,
  store_logo: Image,
  store_email: Mail,
  store_phone: Phone,
  store_address: Globe,
  whatsapp_number: MessageCircle,
  whatsapp_message: MessageCircle,
  facebook_url: Globe,
  instagram_url: Globe,
  shipping_cost: Truck,
  tax_rate: Receipt,
  currency: CreditCard,
};

export default function AdminSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        const map: Record<string, string> = {};
        (data.settings || []).forEach((s: any) => { map[s.key] = s.value; });
        setSettings(map);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const updateSetting = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const saveAll = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      if (!res.ok) throw new Error();
      setMessage({ type: "success", text: "Configuración guardada correctamente" });
    } catch {
      setMessage({ type: "error", text: "Error al guardar configuración" });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-neutral-800 rounded animate-pulse" />
        <div className="grid md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 bg-neutral-800/50 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const groups = [
    { label: "Información General", keys: ["store_name", "store_logo", "store_email", "store_phone", "store_address"] },
    { label: "WhatsApp", keys: ["whatsapp_number", "whatsapp_message"] },
    { label: "Redes Sociales", keys: ["facebook_url", "instagram_url"] },
    { label: "Operaciones", keys: ["shipping_cost", "tax_rate", "currency", "low_stock_threshold", "min_purchase"] },
    { label: "Facturación y aviso legal", keys: ["store_ruc", "invoice_prefix", "ticket_footer"] },
    { label: "Atención", keys: ["business_hours"] },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Configuración</h1>
          <p className="text-sm text-neutral-500 mt-1">Administración del sistema</p>
        </div>
        <button
          onClick={saveAll}
          disabled={saving}
          className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>

      {message && (
        <div className={`px-4 py-3 rounded-xl text-sm mb-6 ${
          message.type === "success"
            ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
            : "bg-rose-500/10 border border-rose-500/20 text-rose-400"
        }`}>
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        {groups.map((group) => (
          <div key={group.label} className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-xl p-5">
            <h3 className="font-semibold text-white mb-4">{group.label}</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {group.keys.map((key) => {
                const Icon = SETTINGS_ICONS[key] || Store;
                return (
                  <div key={key}>
                    <label className="block text-sm text-neutral-400 mb-1.5">{SETTINGS_LABELS[key] || key}</label>
                    <div className="relative">
                      <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
                      <input
                        type="text"
                        value={settings[key] || ""}
                        onChange={(e) => updateSetting(key, e.target.value)}
                        className="input pl-9 w-full text-sm"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
