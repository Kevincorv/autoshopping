import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AutoShopping — Repuestos y accesorios automotrices",
    short_name: "AutoShopping",
    description:
      "Tienda de repuestos y accesorios automotrices en San Ignacio, Misiones, Paraguay. Buscá por vehículo y comprá online.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#dc2626",
    orientation: "portrait-primary",
    lang: "es-PY",
    categories: ["shopping", "automotive"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
