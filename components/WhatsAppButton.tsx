"use client";

import { MessageCircle, X } from "lucide-react";
import { useState } from "react";
import { WHATSAPP_NUMBER, WHATSAPP_DEFAULT_MESSAGE } from "@/lib/constants";

export function WhatsAppButton() {
  const [open, setOpen] = useState(false);

  function openWhatsApp(msg?: string) {
    const text = encodeURIComponent(msg || WHATSAPP_DEFAULT_MESSAGE);
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${text}`, "_blank");
    setOpen(false);
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl p-4 w-72 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">AutoShopping</p>
                <p className="text-xs text-gray-400">Respuesta rápida</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-2">
            <p className="text-xs text-gray-400 mb-2">¿En qué podemos ayudarte?</p>
            <button
              onClick={() => openWhatsApp("Hola, quiero consultar sobre un producto")}
              className="w-full text-left text-sm px-3 py-2 rounded-lg hover:bg-neutral-800 text-gray-300 transition-colors"
            >
              Consultar producto
            </button>
            <button
              onClick={() => openWhatsApp("Hola, quiero saber el estado de mi pedido")}
              className="w-full text-left text-sm px-3 py-2 rounded-lg hover:bg-neutral-800 text-gray-300 transition-colors"
            >
              Estado de mi pedido
            </button>
            <button
              onClick={() => openWhatsApp("Hola, necesito ayuda con una compra")}
              className="w-full text-left text-sm px-3 py-2 rounded-lg hover:bg-neutral-800 text-gray-300 transition-colors"
            >
              Ayuda con compra
            </button>
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center text-sm mt-2 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors"
            >
              Chatear ahora
            </a>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen(!open)}
        className="w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95"
        aria-label="WhatsApp"
      >
        <MessageCircle className="w-7 h-7" />
      </button>
    </div>
  );
}
