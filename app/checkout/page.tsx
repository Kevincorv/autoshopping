"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useCart, useUI } from "@/lib/store";
import { useAuth } from "@/lib/auth/store";
import { formatPYG } from "@/lib/utils";
import { WHATSAPP_NUMBER } from "@/lib/constants";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Skeleton } from "@/components/Skeleton";
import { Check, CreditCard, Banknote, Smartphone, ArrowLeft, ArrowRight, MessageCircle, QrCode, Wallet, User, MapPin, ClipboardCheck, Package } from "lucide-react";
import type { Product } from "@/lib/types";

const STEPS = [
  { id: 0, label: "Datos", icon: User },
  { id: 1, label: "Entrega", icon: MapPin },
  { id: 2, label: "Pago", icon: CreditCard },
  { id: 3, label: "Confirmar", icon: ClipboardCheck },
];

function CheckoutInner() {
  const items = useCart((s) => s.items);
  const clear = useCart((s) => s.clear);
  const showToast = useUI((s) => s.showToast);
  const user = useAuth((s) => s.user);
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [form, setForm] = useState({
    name: "",
    lastname: "",
    email: "",
    phone: "",
    department: "Central",
    city: "Asunción",
    address: "",
    reference: "",
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
          if (methods.length > 0) setForm((f) => ({ ...f, payment: methods[0].name }));
        }
      })
      .catch((e) => console.error(e))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (user) {
      setForm((f) => ({
        ...f,
        name: f.name || user.name || "",
        lastname: f.lastname || user.lastname || "",
        email: f.email || user.email || "",
        phone: f.phone || user.phone || "",
      }));
    }
  }, [user]);

  const map = new Map(products.map((p) => [p.id, p]));
  const subtotal = items.reduce((s, i) => {
    const p = map.get(i.productId);
    return s + (p ? p.price * i.quantity : 0);
  }, 0);
  const shipping = subtotal > 0 ? (subtotal > 2000000 ? 0 : 50000) : 0;
  const total = subtotal + shipping;

  const nextStep = () => {
    if (step === 0 && (!form.name.trim() || !form.email.trim())) {
      showToast("Completá nombre y email", "error");
      return;
    }
    if (step === 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      showToast("Email inválido", "error");
      return;
    }
    if (step === 1 && !form.address.trim()) {
      showToast("Completá la dirección", "error");
      return;
    }
    setStep((s) => Math.min(s + 1, 3));
  };

  const prevStep = () => setStep((s) => Math.max(s - 1, 0));

  const submit = async () => {
    if (items.length === 0) return;
    setSubmitting(true);
    try {
      const r = await api.createOrder({
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity, name: map.get(i.productId)?.name })),
        customer: {
          name: `${form.name} ${form.lastname}`.trim(),
          email: form.email,
          phone: form.phone,
          address: `${form.address}, ${form.city}, ${form.department}${form.reference ? ` (${form.reference})` : ""}`,
        },
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
    const orderNum = done.length <= 8 ? `AS-${done.slice(0, 6).toUpperCase().padStart(6, "0")}` : `AS-${done.slice(-6).toUpperCase().padStart(6, "0")}`;
    const productList = items
      .map((it) => {
        const p = map.get(it.productId);
        return `• ${p?.name || "Producto"} x${it.quantity} - ${formatPYG((p?.price || 0) * it.quantity)}`;
      })
      .join("\n");

    const whatsappMessage = encodeURIComponent(
      `Hola, quiero realizar un pedido.\n\nPedido #${orderNum}\n\nProductos:\n${productList}\n\nCliente:\n${form.name} ${form.lastname}\n${form.email}\n${form.phone}\n\nDirección:\n${form.address}, ${form.city}\n\nTotal:\n${formatPYG(total)}`
    );

    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="card p-8">
          <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-400 mx-auto mb-4 flex items-center justify-center">
            <Check className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold">¡Pedido confirmado!</h1>
          <p className="text-lg text-brand-400 font-mono font-bold mt-2">{orderNum}</p>
          <p className="text-sm text-neutral-400 mt-2">Te enviamos un email con los detalles.</p>
          <div className="mt-6 space-y-3">
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center gap-2 w-full"
            >
              <MessageCircle className="w-5 h-5" />
              Confirmar por WhatsApp
            </a>
            <div className="flex gap-2">
              <Link href="/products" className="btn-ghost flex-1">Seguir comprando</Link>
              <Link href="/dashboard" className="btn-ghost flex-1">Ver pedidos</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0 && !loading) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <Package className="w-12 h-12 text-neutral-600 mx-auto mb-3" />
        <h1 className="text-2xl font-bold">No hay productos en el carrito</h1>
        <Link href="/products" className="btn-primary inline-flex mt-4">Explorar productos</Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <Link href="/cart" className="text-sm text-neutral-400 hover:text-brand-400 flex items-center gap-1 mb-4">
        <ArrowLeft className="w-4 h-4" /> Volver al carrito
      </Link>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            const isActive = i === step;
            const isDone = i < step;
            return (
              <div key={s.id} className="flex items-center">
                <div className={`flex flex-col items-center gap-1 ${i < STEPS.length - 1 ? "flex-1" : ""}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isDone ? "bg-emerald-500 text-white" : isActive ? "bg-brand-500 text-white" : "bg-neutral-800 text-neutral-500"
                  }`}>
                    {isDone ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <span className={`text-xs font-medium ${isActive ? "text-brand-400" : isDone ? "text-emerald-400" : "text-neutral-500"}`}>{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`h-0.5 w-12 sm:w-20 mx-2 mt-[-16px] transition-colors duration-300 ${i < step ? "bg-emerald-500" : "bg-neutral-800"}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-4">
          {/* Step 0: Datos */}
          {step === 0 && (
            <div className="card p-5 animate-fade-in">
              <h3 className="font-semibold mb-4 flex items-center gap-2"><User className="w-4 h-4 text-brand-400" /> Datos de contacto</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-neutral-400 mb-1 block">Nombre *</label>
                  <input className="input px-3" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-neutral-400 mb-1 block">Apellido</label>
                  <input className="input px-3" value={form.lastname} onChange={(e) => setForm((f) => ({ ...f, lastname: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-neutral-400 mb-1 block">Email *</label>
                  <input type="email" className="input px-3" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-neutral-400 mb-1 block">Teléfono</label>
                  <input className="input px-3" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="0981 123 456" />
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Entrega */}
          {step === 1 && (
            <div className="card p-5 animate-fade-in">
              <h3 className="font-semibold mb-4 flex items-center gap-2"><MapPin className="w-4 h-4 text-brand-400" /> Dirección de entrega</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-neutral-400 mb-1 block">Departamento</label>
                  <select className="input px-3" value={form.department} onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}>
                    {["Central", "Alto Paraná", "Amambay", "Boquerón", "Caaguazú", "Caazapá", "Canindeyú", "Concepción", "Cordillera", "Guairá", "Itapúa", "Misiones", "Ñeembucú", "Paraguarí", "Presidente Hayes", "San Pedro"].map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-neutral-400 mb-1 block">Ciudad *</label>
                  <input className="input px-3" required value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs text-neutral-400 mb-1 block">Dirección *</label>
                  <input className="input px-3" required placeholder="Av. España 1234 c/ Brasil" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs text-neutral-400 mb-1 block">Referencia</label>
                  <input className="input px-3" placeholder="Casa color verde, al lado del farmacity" value={form.reference} onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))} />
                </div>
              </div>
              {subtotal > 0 && subtotal <= 2000000 && (
                <p className="mt-3 text-xs text-neutral-500">Envío gratis para compras mayores a Gs. 2.000.000</p>
              )}
            </div>
          )}

          {/* Step 2: Pago */}
          {step === 2 && (
            <div className="card p-5 animate-fade-in">
              <h3 className="font-semibold mb-4 flex items-center gap-2"><CreditCard className="w-4 h-4 text-brand-400" /> Método de pago</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {paymentMethods.map((m: any) => {
                  const Icon = m.icon === "card" ? CreditCard : m.icon === "wallet" ? Wallet : m.icon === "mobile" ? Smartphone : m.icon === "qr" ? QrCode : Banknote;
                  const shortName = m.name.replace("Bancard - ", "").replace(" - Tarjetas de crédito", " (TC/TD)").replace("Pago Express", "Pago Express (QR)").replace("Billetera Personal", "Personal Pay").replace("Pago Móvil", "Pago Móvil");
                  return (
                    <label key={m.name} className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition ${form.payment === m.name ? "border-brand-500 bg-brand-500/10" : "border-neutral-800 hover:border-neutral-700"}`}>
                      <input type="radio" name="payment" value={m.name} checked={form.payment === m.name} onChange={(e) => setForm((f) => ({ ...f, payment: e.target.value }))} className="sr-only" />
                      <Icon className="w-5 h-5 shrink-0" />
                      <div>
                        <span className="text-sm font-medium">{shortName}</span>
                        {m.minAmount > 0 && <p className="text-[10px] text-gray-500">Mín. Gs. {m.minAmount.toLocaleString("es-PY")}</p>}
                      </div>
                    </label>
                  );
                })}
              </div>
              <textarea className="input px-3 mt-3" rows={2} placeholder="Notas para el envío (opcional)" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
          )}

          {/* Step 3: Confirmar */}
          {step === 3 && (
            <div className="card p-5 animate-fade-in">
              <h3 className="font-semibold mb-4 flex items-center gap-2"><ClipboardCheck className="w-4 h-4 text-brand-400" /> Resumen del pedido</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-neutral-400">Cliente</span><span className="text-neutral-200">{form.name} {form.lastname}</span></div>
                <div className="flex justify-between"><span className="text-neutral-400">Email</span><span className="text-neutral-200">{form.email}</span></div>
                <div className="flex justify-between"><span className="text-neutral-400">Teléfono</span><span className="text-neutral-200">{form.phone || "—"}</span></div>
                <div className="flex justify-between"><span className="text-neutral-400">Entrega</span><span className="text-neutral-200">{form.address}, {form.city}, {form.department}</span></div>
                {form.reference && <div className="flex justify-between"><span className="text-neutral-400">Referencia</span><span className="text-neutral-200">{form.reference}</span></div>}
                <div className="flex justify-between"><span className="text-neutral-400">Pago</span><span className="text-neutral-200">{form.payment}</span></div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
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
                      {p.images?.[0] ? <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" /> : null}
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
            <div className="flex justify-between text-neutral-400"><span>Subtotal</span><span>{formatPYG(subtotal)}</span></div>
            <div className="flex justify-between text-neutral-400"><span>Envío</span><span>{shipping === 0 ? "Gratis" : formatPYG(shipping)}</span></div>
            <div className="flex justify-between font-bold text-base pt-2"><span>Total</span><span className="text-brand-400">{formatPYG(total)}</span></div>
          </div>

          <div className="flex gap-2 mt-4">
            {step > 0 && (
              <button type="button" onClick={prevStep} className="btn-ghost flex-1 flex items-center justify-center gap-1">
                <ArrowLeft className="w-4 h-4" /> Atrás
              </button>
            )}
            {step < 3 ? (
              <button type="button" onClick={nextStep} className="btn-primary flex-1 flex items-center justify-center gap-1">
                Siguiente <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button type="button" onClick={submit} disabled={submitting} className="btn-primary flex-1">
                {submitting ? "Procesando…" : "Confirmar pedido"}
              </button>
            )}
          </div>
        </aside>
      </div>
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
