"use client";

import { useCart, useWishlist, useUI } from "@/lib/store";
import { Heart } from "lucide-react";
import { useState, useEffect } from "react";

export function WishlistButton({ productId, size = "md" }: { productId: string; size?: "sm" | "md" }) {
  const has = useWishlist((s) => s.ids.includes(productId));
  const toggle = useWishlist((s) => s.toggle);
  const showToast = useUI((s) => s.showToast);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const cls = size === "sm" ? "w-4 h-4" : "w-5 h-5";
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
          toggle(productId);
          showToast(has ? "Eliminado de favoritos" : "Agregado a favoritos", "success");
        } catch (err) {
          console.error(err);
        }
      }}
      aria-label={has ? "Quitar de favoritos" : "Agregar a favoritos"}
      className="p-2 rounded-full hover:bg-neutral-800/70 transition"
    >
      <Heart
        className={`${cls} transition ${mounted && has ? "fill-rose-500 text-rose-500" : "text-neutral-400"}`}
      />
    </button>
  );
}
