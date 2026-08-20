import "./globals.css";
import type { Metadata } from "next";
import { Providers } from "./providers";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CartDrawer } from "@/components/CartDrawer";
import { Toast } from "@/components/Toast";
import { WhatsAppButton } from "@/components/WhatsAppButton";

export const metadata: Metadata = {
  manifest: "/manifest.json",
  title: "AUTOSHOPPING — Carpitas, Multimedias, Suntek, Vonixx y Sparco en San Ignacio Misiones",
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png",
  },
  description:
    "Tienda online de accesorios automotrices en San Ignacio Misiones, Paraguay. Carpitas, multimedias, Suntek PPF y window tint, detailing Vonixx, indumentaria y accesorios Sparco. Envíos a todo el país.",
  keywords: [
    "autoshopping",
    "san ignacio misiones",
    "carpitas paraguay",
    "multimedias",
    "suntek ppf",
    "vonixx detailing",
    "sparco racing",
    "accesorios autos paraguay",
  ],
  openGraph: {
    title: "AUTOSHOPPING — San Ignacio Misiones",
    description: "Carpitas, Multimedias, Suntek, Vonixx y Sparco",
    type: "website",
  },
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
  ],
  width: "device-width",
  initialScale: 1,
};

const THEME_SCRIPT = `(function(){try{var s=localStorage.getItem("as_ui");var t=s?JSON.parse(s).state&&JSON.parse(s).state.theme:null;if(!t)t=matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";var h=document.documentElement;h.classList.add(t);h.style.colorScheme=t}catch(e){document.documentElement.classList.add("dark")}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-screen flex flex-col">
        <Providers>
          <Header />
          <main className="flex-1 pb-80">{children}</main>
          <Footer />
          <CartDrawer />
          <Toast />
          <WhatsAppButton />
        </Providers>
      </body>
    </html>
  );
}
