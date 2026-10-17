export interface EmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
  template?: string;
}

export interface EmailResult {
  sent: boolean;
  mode: "resend" | "log" | "skipped";
  error?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function sendEmail(input: EmailInput): Promise<EmailResult> {
  try {
    if (!input.to || !EMAIL_RE.test(input.to) || input.to === "—") {
      return { sent: false, mode: "skipped", error: " destinatario inválido" };
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.log(`[email:log] ${input.template || "custom"} → to=${input.to} subject="${input.subject}"`);
      return { sent: false, mode: "log" };
    }

    const from = process.env.EMAIL_FROM || "AutoShopping <onboarding@resend.dev>";
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("Resend error", res.status, detail);
      return { sent: false, mode: "resend", error: `Resend ${res.status}` };
    }
    return { sent: true, mode: "resend" };
  } catch (e: any) {
    console.error("sendEmail error", e?.message || e);
    return { sent: false, mode: "log", error: e?.message };
  }
}

function shell(title: string, bodyHtml: string, footer = "AutoShopping — San Ignacio, Misiones, Paraguay"): string {
  return `<!doctype html><html><body style="margin:0;background:#0f0f10;padding:24px;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:560px;margin:0 auto;background:#17171a;border:1px solid #2a2a2e;border-radius:12px;overflow:hidden;">
    <div style="background:#111113;padding:16px 24px;border-bottom:1px solid #2a2a2e;">
      <span style="color:#fff;font-size:18px;font-weight:bold;">Auto<span style="color:#ef4444;">Shopping</span></span>
    </div>
    <div style="padding:24px;color:#d4d4d8;">
      <h2 style="margin:0 0 12px;color:#fff;font-size:18px;">${title}</h2>
      ${bodyHtml}
    </div>
    <div style="padding:12px 24px;border-top:1px solid #2a2a2e;color:#71717a;font-size:12px;">${footer}</div>
  </div>
</body></html>`;
}

export function orderCreatedEmail(opts: {
  to: string;
  customerName: string;
  orderNumber: string;
  total: number;
  paymentMethod?: string | null;
  trackingUrl: string;
}) {
  const total = `Gs. ${Math.round(opts.total).toLocaleString("es-PY")}`;
  return {
    to: opts.to,
    template: "order.created",
    subject: `Pedido ${opts.orderNumber} recibido — AutoShopping`,
    text: `Hola ${opts.customerName}, recibimos tu pedido ${opts.orderNumber} por ${total}. Seguilo en ${opts.trackingUrl}`,
    html: shell(
      "¡Recibimos tu pedido!",
      `<p>Hola <strong>${opts.customerName}</strong>,</p>
       <p>Tu pedido <strong>${opts.orderNumber}</strong> fue registrado por <strong>${total}</strong>.</p>
       ${opts.paymentMethod ? `<p>Método de pago: ${opts.paymentMethod}.</p>` : ""}
       <p><a href="${opts.trackingUrl}" style="background:#ef4444;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;display:inline-block;">Seguir mi pedido</a></p>`
    ),
  };
}

export function orderStatusEmail(opts: {
  to: string;
  customerName: string;
  orderNumber: string;
  status: string;
  courier?: string | null;
  trackingNumber?: string | null;
  trackingUrl: string;
}) {
  const statusLabels: Record<string, string> = {
    confirmed: "confirmado",
    preparing: "en preparación",
    shipped: "en camino",
    delivered: "entregado",
    cancelled: "cancelado",
    pending: "pendiente",
  };
  const label = statusLabels[opts.status] || opts.status;
  return {
    to: opts.to,
    template: "order.status",
    subject: `Pedido ${opts.orderNumber}: ${label} — AutoShopping`,
    text: `Hola ${opts.customerName}, tu pedido ${opts.orderNumber} está ${label}.${opts.trackingNumber ? ` Tracking: ${opts.trackingNumber}` : ""}`,
    html: shell(
      `Tu pedido está <span style="color:#ef4444;">${label}</span>`,
      `<p>Hola <strong>${opts.customerName}</strong>,</p>
       <p>Tu pedido <strong>${opts.orderNumber}</strong> está <strong>${label}</strong>.</p>
       ${opts.courier ? `<p>Transportista: ${opts.courier}.</p>` : ""}
       ${opts.trackingNumber ? `<p>N.º de seguimiento: <code style="color:#ef4444;">${opts.trackingNumber}</code></p>` : ""}
       <p><a href="${opts.trackingUrl}" style="background:#ef4444;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;display:inline-block;">Ver estado del pedido</a></p>`
    ),
  };
}

export function passwordChangedEmail(opts: { to: string; name: string }) {
  return {
    to: opts.to,
    template: "auth.password.changed",
    subject: "Tu contraseña fue cambiada — AutoShopping",
    text: `Hola ${opts.name}, tu contraseña de AutoShopping fue cambiada. Si no fuiste vos, contactanos de inmediato.`,
    html: shell(
      "Contraseña actualizada",
      `<p>Hola <strong>${opts.name}</strong>,</p>
       <p>Tu contraseña fue cambiada correctamente.</p>
       <p style="color:#a1a1aa;">Si no realizaste este cambio, contactanos de inmediato respondiendo a este email.</p>`
    ),
  };
}
