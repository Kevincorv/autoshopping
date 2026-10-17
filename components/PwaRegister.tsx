"use client";

import { useEffect, useState } from "react";
import { Bell, BellRing } from "lucide-react";
import { useAuth } from "@/lib/auth/store";
import { useUI } from "@/lib/store";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export function PwaRegister() {
  const user = useAuth((s) => s.user);
  const showToast = useUI((s) => s.showToast);
  const [subscribed, setSubscribed] = useState(false);
  const [supported, setSupported] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    setReady(true);
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      return;
    }
    setSupported(true);
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setSubscribed(!!sub))
      .catch(() => {});
  }, []);

  async function toggle() {
    if (!supported || busy) return;
    setBusy(true);
    try {
      if (subscribed) {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
          await fetch("/api/push/unsubscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          });
          await sub.unsubscribe();
        }
        setSubscribed(false);
        showToast("Notificaciones desactivadas", "info");
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        showToast("No autorizaste las notificaciones", "error");
        return;
      }

      const res = await fetch("/api/push/public-key");
      const { publicKey } = await res.json();
      if (!publicKey) {
        showToast("Las notificaciones push no están configuradas todavía", "error");
        return;
      }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const json = sub.toJSON();
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          p256dh: json.keys?.p256dh,
          auth: json.keys?.auth,
        }),
      });
      setSubscribed(true);
      showToast("¡Notificaciones activadas!", "success");
    } catch {
      showToast("No se pudo activar las notificaciones", "error");
    } finally {
      setBusy(false);
    }
  }

  if (!ready || !supported) return null;

  return (
    <button
      onClick={toggle}
      disabled={busy}
      title={subscribed ? "Desactivar notificaciones" : "Activar notificaciones"}
      aria-label={subscribed ? "Desactivar notificaciones" : "Activar notificaciones"}
      className={`p-2 rounded-lg transition-colors ${
        subscribed ? "text-emerald-400 hover:bg-neutral-800" : "text-neutral-400 hover:text-white hover:bg-neutral-800"
      }`}
    >
      {subscribed ? <BellRing className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
    </button>
  );
}
