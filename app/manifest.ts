import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AutoShopping — Repuestos y accesorios automotrices",
    short_name: "AutoShopping",
    description:
      "Tienda online de accesorios, equipamiento y productos automotrices en San Ignacio, Misiones, Paraguay. Marcas originales, stock real y envíos a todo el país.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#ff3b1f",
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
