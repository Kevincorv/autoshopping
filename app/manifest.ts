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
      { src: "/icon.png", sizes: "any", type: "image/png", purpose: "any" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png", purpose: "any" },
    ],
  };
}
