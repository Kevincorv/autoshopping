"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("App error", error);
  }, [error]);
  return (
    <div className="max-w-xl mx-auto px-4 py-20 text-center">
      <h1 className="text-2xl font-extrabold mb-2">Algo salió mal</h1>
      <p className="text-sm text-neutral-400 mb-4">{error.message || "Error inesperado"}</p>
      <div className="flex gap-2 justify-center">
        <button onClick={reset} className="btn-primary">Reintentar</button>
        <Link href="/" className="btn-ghost">Inicio</Link>
      </div>
    </div>
  );
}
