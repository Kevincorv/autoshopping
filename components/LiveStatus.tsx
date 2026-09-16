"use client";

import { useSocketStatus } from "@/lib/socket";
import { Wifi, WifiOff } from "lucide-react";

export function LiveStatus() {
  const connected = useSocketStatus();
  return (
    <div
      className="fixed bottom-4 right-4 z-50 hidden md:flex items-center gap-2 card px-3 py-1.5 text-xs"
      title={connected ? "Conectado en tiempo real" : "Reconectando…"}
    >
      {connected ? (
        <>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <Wifi className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-emerald-300">EN VIVO</span>
        </>
      ) : (
        <>
          <WifiOff className="w-3.5 h-3.5 text-rose-400" />
          <span className="text-rose-300">Sin conexión</span>
        </>
      )}
    </div>
  );
}
