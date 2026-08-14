"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useCart, useUI } from "@/lib/store";
import { formatPYG } from "@/lib/utils";
import { WHATSAPP_NUMBER } from "@/lib/constants";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Skeleton } from "@/components/Skeleton";
import { Check, CreditCard, Banknote, Smartphone, ArrowLeft, MessageCircle, QrCode, Wallet } from "lucide-react";
import type { Product } from "@/lib/types";

function CheckoutInner() {
  const items = useCart((s) => s.items);
  const clear = useCart((s) => s.clear);
  const showToast = useUI((s) => s.showToast);
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "Asunción",
    payment: "cash",
    notes: "",
  });

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([
      api.getProducts({}),
      fetch("/api/payment/providers").then((r) => r.json()),
    ])
      .then(([prods, payData]) => {
        if (alive) {
          setProducts(prods.products || []);
          const methods = payData.methods || [];
          setPaymentMethods(methods);
          if (methods.length > 0) {
            setForm((f) => ({ ...f, payment: methods[0].name }));
          }
        }
      })
      .catch((e) => console.error(e))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const map = new Map(products.map((p) => [p.id, p]));
  const subtotal = items.reduce((s, i) => {
    const p = map.get(i.productId);
    return s + (p ? p.price * i.quantity : 0);
  }, 0);
  const shipping = subtotal > 0 ? (subtotal > 2000000 ? 0 : 50000) : 0;
  const total = subtotal + shipping;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;
    if (!form.name.trim() || !form.email.trim() || !form.address.trim()) {
      showToast("Completá los campos requeridos", "error");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      showToast("Email inválido", "error");
      return;
    }
    setSubmitting(true);
    try {
      const r = await api.createOrder({
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity, name: map.get(i.productId)?.name })),
        customer: { name: form.name, email: form.email, phone: form.phone, address: `${form.address} - ${form.city}` },
        paymentMethod: form.payment,
        notes: form.notes,
      });
      setDone(r.order.id);
      clear();
      showToast("¡Pedido confirmado!", "success");
    } catch (e: any) {
      console.error(e);
      showToast(e?.message || "Error al procesar el pedido", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    const productList = items
      .map((it) => {
        const p = map.get(it.productId);
        return `* ${p?.name || "Producto"} x${it.quantity} - ${formatPYG((p?.price || 0) * it.quantity)}`;
      })
      .join("\n");

    const whatsappMessage = encodeURIComponent(
      `Hola, quiero realizar un pedido.\n\nPedido #${done}\n\nProductos:\n${productList}\n\nCliente:\n${form.name}\n\nTotal:\n${formatPYG(total)}`
    );

    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="card p-8">
          <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-400 mx-auto mb-4 flex items-center justify-center">
            <Check className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold">¡Pedido confirmado!</h1>
          <p className="text-sm text-neutral-400 mt-2">
            Tu número de pedido es <span className="text-brand-400 font-mono">{done}</span>
          </p>
          <p className="text-sm text-neutral-400 mt-1">Te enviamos un email con los detalles. ¡Gracias por tu compra!</p>
          <div className="mt-6 space-y-3">
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary flex items-center justify-center gap-2 w-full"
            >
              <MessageCircle className="w-5 h-5" />
              Confirmar pedido por WhatsApp
            </a>
            <div className="flex gap-2">
              <Link href="/products" className="btn-ghost flex-1">
                Seguir comprando
              </Link>
              <Link href="/dashboard" className="btn-ghost flex-1">
                Ver pedidos
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0 && !loading) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">No hay productos en el carrito</h1>
        <Link href="/products" className="btn-primary inline-flex mt-4">
          Explorar productos
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <Link href="/cart" className="text-sm text-neutral-400 hover:text-brand-400 flex items-center gap-1 mb-4">
        <ArrowLeft className="w-4 h-4" /> Volver al carrito
      </Link>
      <h1 className="text-2xl md:text-3xl font-extrabold mb-6">Checkout</h1>

      <form onSubmit={submit} className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="font-semibold mb-4">Datos de contacto</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-neutral-400 mb-1 block">Nombre completo *</label>
                <input
                  className="input px-3"
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs text-neutral-400 mb-1 block">Email *</label>
                <input
                  type="email"
                  className="input px-3"
                  required
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs text-neutral-400 mb-1 block">Teléfono</label>
                <input
                  className="input px-3"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs text-neutral-400 mb-1 block">Ciudad</label>
                <input
                  className="input px-3"
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-neutral-400 mb-1 block">Dirección de envío *</label>
                <input
                  className="input px-3"
                  required
                  placeholder="Av. España 1234 c/ Brasil"
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="font-semibold mb-4">Método de pago</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {paymentMethods.map((m: any) => {
                const Icon = m.icon === "card" ? CreditCard
                  : m.icon === "wallet" ? Wallet
                  : m.icon === "mobile" ? Smartphone
                  : m.icon === "qr" ? QrCode
                  : Banknote;
                const shortName = m.name
                  .replace("Bancard - ", "")
                  .replace(" - Tarjetas de crédito", " (TC/TD)")
                  .replace("Pago Express", "Pago Express (QR)")
                  .replace("Billetera Personal", "Personal Pay")
                  .replace("Pago Móvil", "Pago Móvil");
                return (
                  <label
                    key={m.name}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition ${
                      form.payment === m.name ? "border-brand-500 bg-brand-500/10" : "border-neutral-800 hover:border-neutral-700"
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value={m.name}
                      checked={form.payment === m.name}
                      onChange={(e) => setForm((f) => ({ ...f, payment: e.target.value }))}
                      className="sr-only"
                    />
                    <Icon className="w-5 h-5 shrink-0" />
                    <div>
                      <span className="text-sm font-medium">{shortName}</span>
                      {m.minAmount > 0 && (
                        <p className="text-[10px] text-gray-500">Mín. Gs. {m.minAmount.toLocaleString("es-PY")}</p>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
            <textarea
              className="input px-3 mt-3"
              rows={2}
              placeholder="Notas para el envío (opcional)"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
        </div>

        <aside className="card p-5 h-fit sticky top-20">
          <h3 className="font-semibold mb-4">Tu pedido</h3>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <ul className="space-y-2 max-h-64 overflow-y-auto scrollbar-thin">
              {items.map((it) => {
                const p = map.get(it.productId);
                if (!p) return null;
                return (
                  <li key={it.productId} className="flex items-center gap-2 text-sm">
                    <div className="w-12 h-12 rounded-md overflow-hidden bg-neutral-800 shrink-0">
                      {p.images?.[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                      ) : null}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate">{p.name}</p>
                      <p className="text-xs text-neutral-500">x{it.quantity}</p>
                    </div>
                    <p className="text-sm font-semibold">{formatPYG(p.price * it.quantity)}</p>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="border-t border-neutral-800 mt-3 pt-3 space-y-1 text-sm">
            <div className="flex justify-between text-neutral-400">
              <span>Subtotal</span>
              <span>{formatPYG(subtotal)}</span>
            </div>
            <div className="flex justify-between text-neutral-400">
              <span>Envío</span>
              <span>{shipping === 0 ? "Gratis" : formatPYG(shipping)}</span>
            </div>
            <div className="flex justify-between font-bold text-base pt-2">
              <span>Total</span>
              <span className="text-brand-400">{formatPYG(total)}</span>
            </div>
          </div>
          <button type="submit" disabled={submitting || loading} className="btn-primary w-full mt-4">
            {submitting ? "Procesando…" : "Confirmar pedido"}
          </button>
        </aside>
      </form>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <ErrorBoundary>
      <CheckoutInner />
    </ErrorBoundary>
  );
}
