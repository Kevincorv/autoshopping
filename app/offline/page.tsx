import Link from "next/link";
import { WifiOff } from "lucide-react";

export const metadata = {
  title: "Sin conexión | AutoShopping",
  robots: { index: false },
};

export default function OfflinePage() {
  return (
    <div className="max-w-md mx-auto px-4 py-24 text-center">
      <WifiOff className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
      <h1 className="text-xl font-bold">Estás sin conexión</h1>
      <p className="text-sm text-neutral-400 mt-2">
        No pudimos cargar esta página. Revisá tu conexión a internet e intentá de nuevo.
      </p>
      <Link href="/" className="btn-primary inline-flex mt-6">Reintentar</Link>
    </div>
  );
}
