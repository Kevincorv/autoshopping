import Link from "next/link";

export default function NotFound() {
  return (
    <div className="max-w-xl mx-auto px-4 py-20 text-center">
      <p className="text-6xl font-extrabold text-brand-500">404</p>
      <h1 className="text-2xl font-extrabold mt-3">Página no encontrada</h1>
      <p className="text-sm text-neutral-400 mt-2">La ruta que buscás no existe.</p>
      <Link href="/" className="btn-primary inline-flex mt-6">
        Volver al inicio
      </Link>
    </div>
  );
}
