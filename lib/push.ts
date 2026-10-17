import webpush from "web-push";
import { prisma } from "./prisma";

let configured = false;

function ensureConfigured(): boolean {
  if (configured) return true;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  try {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || "mailto:hola@autoshopping.com.py",
      publicKey,
      privateKey
    );
    configured = true;
    return true;
  } catch {
    return false;
  }
}

export function isPushConfigured(): boolean {
  return ensureConfigured();
}

export function getVapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY || null;
}

export async function sendPushToAll(payload: { title: string; body: string; url?: string }) {
  if (!ensureConfigured()) {
    return { sent: 0, error: "Push no configurado (faltan VAPID keys)" };
  }

  const subs = await prisma.pushSubscription.findMany();
  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || "/",
  });

  let sent = 0;
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body
        );
        sent++;
      } catch (e: any) {
        if (e?.statusCode === 404 || e?.statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        }
      }
    })
  );

  return { sent, total: subs.length };
}
