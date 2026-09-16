"use client";

import { useEffect, useState } from "react";
import { Bell, BellRing, Send, CheckCheck, X, AlertTriangle, TrendingUp, Package, Truck } from "lucide-react";
import { useUI } from "@/lib/store";

interface NotifRow { id: string; type: string; title: string; message: string; isRead: boolean; link?: string | null; createdAt: string; }
interface UserRow { id: string; name: string; lastname: string; email: string; }

export default function NotificationsPage() {
  const ui = useUI();
  const [notifications, setNotifications] = useState<NotifRow[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [showSend, setShowSend] = useState(false);
  const [form, setForm] = useState({ userId: "", type: "info", title: "", message: "", link: "" });
  const [sending, setSending] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/notifications");
      const d = await r.json();
      setNotifications(d.notifications || []);
      setUnread(d.unread || 0);
    } catch { /* noop */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (showSend && users.length === 0) {
      fetch("/api/users").then((r) => r.json()).then((d) => setUsers(d.users || [])).catch(() => {});
    }
  }, [showSend, users.length]);

  const markAll = async () => {
    for (const n of notifications.filter((x) => !x.isRead)) {
      await fetch(`/api/notifications/${n.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isRead: true }) });
    }
    load();
  };

  const markOne = async (n: NotifRow) => {
    await fetch(`/api/notifications/${n.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isRead: true }) });
    load();
  };

  const send = async () => {
    if (!form.userId || !form.title.trim() || !form.message.trim()) { ui.showToast("Destinatario, título y mensaje obligatorios", "error"); return; }
    setSending(true);
    try {
      const r = await fetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const d = await r.json();
      if (!r.ok) { ui.showToast(d.error || "Error", "error"); return; }
      ui.showToast("Notificación enviada", "success");
      setShowSend(false);
      setForm({ userId: "", type: "info", title: "", message: "", link: "" });
      load();
    } finally { setSending(false); }
  };

  const iconFor = (t: string) => {
    switch (t) {
      case "stock": return <Package className="w-4 h-4 text-amber-400" />;
      case "venta": return <TrendingUp className="w-4 h-4 text-emerald-400" />;
      case "compra": return <Truck className="w-4 h-4 text-sky-400" />;
      case "alert": return <AlertTriangle className="w-4 h-4 text-rose-400" />;
      default: return <Bell className="w-4 h-4 text-brand-400" />;
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Notificaciones</h1>
          <p className="text-sm text-neutral-500 mt-1">{unread > 0 ? `${unread} sin leer` : "Todas leídas"}</p>
        </div>
        <div className="flex gap-2">
          {unread > 0 && (
            <button onClick={markAll} className="btn-ghost text-sm py-2 flex items-center gap-2"><CheckCheck className="w-4 h-4" /> Marcar todas leídas</button>
          )}
          <button onClick={() => setShowSend(!showSend)} className="btn-primary text-sm py-2 flex items-center gap-2">
            {showSend ? <X className="w-4 h-4" /> : <Send className="w-4 h-4" />} {showSend ? "Cancelar" : "Enviar aviso"}
          </button>
        </div>
      </div>

      {showSend && (
        <div className="bg-gradient-to-br from-neutral-900 to-neutral-950 border border-neutral-800 rounded-xl p-5 mb-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2"><Send className="w-4 h-4 text-brand-400" /> Enviar notificación</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Destinatario *</label>
              <select className="input py-2 text-sm" value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })}>
                <option value="">Seleccionar usuario...</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name} {u.lastname} ({u.email})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-neutral-400 mb-1">Tipo</label>
              <select className="input py-2 text-sm" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="info">Información</option>
                <option value="stock">Stock</option>
                <option value="venta">Venta</option>
                <option value="compra">Compra</option>
                <option value="alert">Alerta</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-neutral-400 mb-1">Título *</label>
              <input className="input py-2 text-sm" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-neutral-400 mb-1">Mensaje *</label>
              <textarea rows={2} className="input py-2 text-sm resize-none" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs text-neutral-400 mb-1">Enlace (opcional)</label>
              <input className="input py-2 text-sm" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="/dashboard/admin/products" />
            </div>
          </div>
          <div className="flex justify-end mt-4">
            <button onClick={send} disabled={sending} className="btn-primary text-sm px-5 py-2 flex items-center gap-2"><Send className="w-4 h-4" /> {sending ? "Enviando..." : "Enviar"}</button>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-neutral-800 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 bg-neutral-900/60 border-b border-neutral-800 text-sm font-semibold">
          <BellRing className="w-4 h-4 text-brand-400" /> Todas ({notifications.length})
        </div>
        <div className="max-h-[60vh] overflow-auto">
          {loading ? (
            <div className="p-4 space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 bg-neutral-800/60 rounded-lg animate-pulse" />)}</div>
          ) : notifications.length === 0 ? (
            <div className="p-12 text-center text-sm text-neutral-500">
              <Bell className="w-10 h-10 mx-auto mb-3 text-neutral-700" />
              No hay notificaciones. Las alertas de stock bajo, pedidos y ventas aparecerán acá.
            </div>
          ) : notifications.map((n) => (
            <div key={n.id} onClick={() => !n.isRead && markOne(n)}
              className={`flex items-start gap-3 px-4 py-3.5 border-b border-neutral-800/50 cursor-pointer transition-colors ${n.isRead ? "" : "bg-brand-500/5 hover:bg-brand-500/10"}`}>
              <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${n.isRead ? "bg-neutral-800" : "bg-brand-500/15"}`}>{iconFor(n.type)}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-semibold ${n.isRead ? "text-neutral-300" : "text-white"}`}>{n.title}</p>
                  {!n.isRead && <span className="w-2 h-2 rounded-full bg-brand-400 shrink-0" />}
                </div>
                <p className="text-sm text-neutral-400">{n.message}</p>
                <p className="text-[10px] text-neutral-500 mt-1">{new Date(n.createdAt).toLocaleString("es-PY")}{n.link ? ` · ${n.link}` : ""}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}