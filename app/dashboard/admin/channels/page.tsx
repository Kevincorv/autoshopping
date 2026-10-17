"use client";

import { useEffect, useState } from "react";
import { Download, Instagram, Facebook, ExternalLink, Package } from "lucide-react";

interface ChannelStatus {
  activeProducts: number;
  withImages: number;
  missingImages: number;
}

export default function AdminChannelsPage() {
  const [status, setStatus] = useState<ChannelStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetch("/api/products?limit=500&active=1")
      .then((r) => r.json())
      .then((data) => {
        const products = data.products || [];
        const withImages = products.filter((p: any) => p.images?.length > 0).length;
        setStatus({
          activeProducts: products.length,
          withImages,
          missingImages: products.length - withImages,
        });
      })
      .catch(() => setStatus({ activeProducts: 0, withImages: 0, missingImages: 0 }))
      .finally(() => setLoading(false));
  }, []);

  async function downloadFeed() {
    setDownloading(true);
    try {
      const res = await fetch("/api/admin/channels/catalog-feed");
      if (!res.ok) throw new Error("Error al generar");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `autoshopping-catalog-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("No se pudo descargar el feed");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Canales de venta</h1>
        <p className="text-sm text-neutral-400">Instagram Shop y Facebook Shop — exportá tu catálogo a Meta Commerce Manager</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4">
          <p className="text-xs text-neutral-400">Productos activos</p>
          <p className="text-2xl font-bold mt-1">{loading ? "…" : status?.activeProducts}</p>
        </div>
        <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4">
          <p className="text-xs text-neutral-400">Con imagen</p>
          <p className="text-2xl font-bold mt-1 text-emerald-400">{loading ? "…" : status?.withImages}</p>
        </div>
        <div className="bg-neutral-900 rounded-lg border border-neutral-800 p-4">
          <p className="text-xs text-neutral-400">Sin imagen (no se recomienda subir)</p>
          <p className="text-2xl font-bold mt-1 text-amber-400">{loading ? "…" : status?.missingImages}</p>
        </div>
      </div>

      <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-6 space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <Package className="w-5 h-5 text-red-400" /> Feed de catálogo (CSV para Meta)
        </h2>
        <p className="text-sm text-neutral-400">
          Descargá el feed con todos tus productos activos en el formato que Meta Commerce Manager acepta para crear
          el catálogo de Instagram Shop y Facebook Shop. El archivo incluye: id, título, descripción, disponibilidad,
          precio, link, imagen, marca y categoría.
        </p>
        <button onClick={downloadFeed} disabled={downloading} className="btn-primary flex items-center gap-2">
          <Download className="w-4 h-4" /> {downloading ? "Generando..." : "Descargar catálogo CSV"}
        </button>
      </div>

      <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-6 space-y-4">
        <h2 className="font-semibold">Cómo conectar con Meta (pasos manuales)</h2>
        <ol className="text-sm text-neutral-400 space-y-2 list-decimal list-inside">
          <li>Creá (o usá) tu cuenta de <strong className="text-neutral-200">Meta Business Suite</strong> asociada al negocio.</li>
          <li>Entrá a <strong className="text-neutral-200">commerce.facebook.com</strong> y creá un catálogo de productos.</li>
          <li>Elegí la opción <strong className="text-neutral-200">Subir archivo de productos</strong> (upload feed).</li>
          <li>Subí el CSV descargado desde acá y programá la actualización automática semanal (o subilo manualmente cada vez que cambies precios/stock).</li>
          <li>Con el catálogo listo, activá <strong className="text-neutral-200">Instagram Shop</strong> desde la app de Instagram (Configuración → Negocios → Tienda) y <strong className="text-neutral-200">Facebook Shop</strong> en tu página de Facebook.</li>
        </ol>
        <div className="flex gap-3 pt-2">
          <a href="https://commerce.facebook.com" target="_blank" rel="noopener noreferrer" className="btn-secondary flex items-center gap-2 text-sm">
            <Facebook className="w-4 h-4" /> Meta Commerce <ExternalLink className="w-3 h-3" />
          </a>
          <span className="btn-secondary flex items-center gap-2 text-sm opacity-60 cursor-not-allowed">
            <Instagram className="w-4 h-4" /> Instagram Shop (desde la app)
          </span>
        </div>
        <p className="text-xs text-neutral-500 border-t border-neutral-800 pt-3">
          Nota: la conexión automática vía API de Meta requiere una app de Facebook verificada y tokens de largo plazo.
          Por ahora el feed CSV es el método oficial soportado por Meta para catálogos estáticos.
        </p>
      </div>
    </div>
  );
}
