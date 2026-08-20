"use client";

import { useEffect, useRef, useState, Fragment } from "react";
import Link from "next/link";
import Image from "next/image";
import { Facebook, Instagram, Mail, Phone, MapPin, MessageCircle } from "lucide-react";
import { WHATSAPP_LINK } from "@/lib/constants";
import { useAuth } from "@/lib/auth/store";

export function Footer() {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { user } = useAuth();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setShow(entry.isIntersecting),
      { threshold: 0 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const footerClass = show
    ? "fixed bottom-0 left-0 right-0 z-40 border-t border-neutral-800 bg-neutral-950 transition-opacity duration-500 opacity-100"
    : "fixed bottom-0 left-0 right-0 z-40 border-t border-neutral-800 bg-neutral-950 transition-opacity duration-500 opacity-0 pointer-events-none";

  if (mounted && user) return null;

  return (
    <Fragment>
      <div ref={sentinelRef} className="h-px" />
      <footer className={footerClass}>
      <div className="max-w-7xl mx-auto px-4 py-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        <div className="sm:col-span-2 lg:col-span-1">
          <div className="mb-3">
            <Image
              src="/logoautoshopping.png"
              alt="AUTOSHOPPING"
              width={140}
              height={42}
              className="h-9 w-auto mb-2 rounded-sm"
            />
            <p className="text-[10px] text-neutral-400 flex items-center gap-1">
              <MapPin className="w-2.5 h-2.5" /> San Ignacio Misiones, Paraguay
            </p>
          </div>
          <p className="text-sm text-neutral-400 max-w-md">
            Tu tienda especializada en accesorios automotrices en San Ignacio Misiones. Trabajamos las mejores
            marcas: <span className="text-neutral-200">Suntek</span> 🇺🇸, <span className="text-neutral-200">Vonixx</span>,{" "}
            <span className="text-neutral-200">Sparco</span>, <span className="text-neutral-200">Pioneer</span> y{" "}
            <span className="text-neutral-200">Sony</span>. Envíos a todo Paraguay.
          </p>
          <div className="flex items-center gap-3 mt-4">
            <a href="#" aria-label="Facebook" className="p-2 rounded-md hover:bg-neutral-800 text-neutral-400"><Facebook className="w-4 h-4" /></a>
            <a href="https://www.instagram.com/autoshoppingsi/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="p-2 rounded-md hover:bg-neutral-800 text-neutral-400"><Instagram className="w-4 h-4" /></a>
            <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="p-2 rounded-md hover:bg-neutral-800 text-neutral-400"><MessageCircle className="w-4 h-4" /></a>
          </div>
        </div>
        <div>
          <h4 className="text-sm font-semibold mb-3">Contacto</h4>
          <ul className="space-y-2 text-sm text-neutral-400">
            <li className="flex items-center gap-2"><Phone className="w-4 h-4" /> +595 985 231 090</li>
            <li className="flex items-center gap-2"><MessageCircle className="w-4 h-4" /> +595 985 231 090</li>
            <li className="flex items-center gap-2"><Mail className="w-4 h-4" /> hola@autoshopping.com.py</li>
            <li className="flex items-start gap-2"><MapPin className="w-4 h-4 mt-0.5 shrink-0" /> San Ignacio Misiones, Paraguay</li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold mb-3">Horarios</h4>
          <ul className="space-y-2 text-sm text-neutral-400">
            <li>Lun — Vie: 8:00 – 18:00</li>
            <li>Sáb: 8:00 – 12:00</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-neutral-800 py-4 text-center text-xs text-neutral-500">
<p>© {new Date().getFullYear()} AUTOSHOPPING — San Ignacio, Misiones, Paraguay.</p>
        {/* Desarrollado por KRC Technologies - Software · Web · Digital Solutions
        <p className="mt-1" style={{ fontSize: 12, opacity: 0.6 }}>
          <a href="https://www.instagram.com/krctechs/" target="_blank" rel="noopener noreferrer" className="hover:text-neutral-300 transition-colors">Desarrollado por KRC Technologies - Software · Web · Digital Solutions</a>
        </p> */}
      </div>
    </footer>
    </Fragment>
  );
}
