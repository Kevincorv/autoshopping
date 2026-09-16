# Auditoría técnica — AUTOSHOPPING Paraguay
**v1.0 · 28 jul 2026 · Mavis**

> Documento de la **Fase 1**: análisis del estado actual, problemas encontrados, arquitectura propuesta y plan de implementación. **No se ha escrito/modificado código todavía**. Pendiente de aprobación de Kevin para comenzar la Fase 2.

---

## 0. Resumen ejecutivo (TL;DR)

| Aspecto | Estado actual | Veredicto |
|---|---|---|
| **Stack base** | Next.js 14 App Router + React 18 + TS + Tailwind | ✅ Aceptable, mantener |
| **Persistencia** | Doble capa: `data/db.json` (ACTIVA) + Prisma (INACTIVA) | 🔴 **Crítico** — Prisma está migrado pero el runtime ignora la DB |
| **Auth** | JWT + bcryptjs instalados, **cero rutas**, **cero UI** | 🔴 **Crítico** — no existe login ni registro |
| **Catálogo** | 30+ productos seed (JSON), categorías hardcodeadas | 🟡 Necesita migrarse a Prisma + admin CRUD |
| **Checkout** | Guest checkout funcional con WhatsApp, sin pagos reales | 🟡 Necesita integración de pagos |
| **Pagos** | No existe ningún gateway | 🔴 **Crítico** — bloquea venta real |
| **Panel admin** | Solo `/dashboard` (analytics), **no hay CRUD** | 🔴 **Crítico** — no se puede operar el negocio |
| **RBAC** | Modelo Prisma OK, **middleware no enforza** | 🔴 **Crítico** — cualquier endpoint es público |
| **Audit log** | Tabla existe, **nadie escribe en ella** | 🟡 Importante |
| **SEO** | Metadata básica, **no hay sitemap/robots/JSON-LD** | 🟡 Importante |
| **UX/UI** | Diseño JDM oscuro pulido, responsive, animado | ✅ Aceptable, refinar |
| **Tiempo real** | Socket.io configurado, eventos conectados | 🟡 Bien, pero subutilizado |
| **Tests** | 0 archivos de test | 🟡 Recomendable a partir de Fase 2 |

**Conclusión**: El proyecto tiene una base frontend **sólida y presentable** para demo, pero **no es un e-commerce operable** hoy. Para vender en serio faltan auth, admin, pagos, migrar la DB al Prisma ya configurado, y aplicar RBAC.

---

## 1. Diagnóstico por capa

### 1.1 Frontend

**Lo que está bien (no tocar):**
- Diseño dark mode JDM coherente, paleta `brand-50..950` (rojo/naranja) en `tailwind.config.ts` bien armada.
- Sistema de clases CSS (`.btn`, `.btn-primary`, `.card`, `.input`, `.skeleton`, `.shimmer`) en `app/globals.css` — limpio y reutilizable.
- Animaciones definidas (`pulse-slow`, `slide-in`, `fade-in`, `shimmer`).
- Responsive en `Header`, `Filters`, `ProductCard`, dashboard — cubre mobile.
- ErrorBoundary global, `loading.tsx`, `not-found.tsx`, `error.tsx` todos implementados.
- `useSocketEvents` actualiza stock en vivo en `ProductCard` y página de detalle — funciona y se ve pro.
- `SearchBar` con debounce 300ms + AbortController (en `components/SearchBar.tsx`).
- `formatPYG` usa `Intl.NumberFormat("es-PY", { currency: "PYG" })` — correcto.

**Problemas:**
| # | Severidad | Problema | Archivo |
|---|---|---|---|
| F-01 | 🟡 | Imágenes de productos son URLs de Unsplash hardcodeadas — se romperán en producción y son de gente genérica, no del producto real. | `lib/db.ts` líneas 39-43 y siguientes |
| F-02 | 🟡 | Imágenes usan `<img>` en vez de `next/image` (hay `eslint-disable` repetidos). Pierde optimización automática. | `ProductCard.tsx`, `products/[id]/page.tsx`, `page.tsx` |
| F-03 | 🟡 | `next.config.js` permite `remotePatterns: [{hostname: "**"}]` — abre la puerta a cualquier dominio. Debe restringirse a CDNs propios o Cloudinary/etc. | `next.config.js` línea 9-13 |
| F-04 | 🟡 | No hay `loading.tsx` por ruta (solo el global). Skeletons existen pero solo algunos los usan. | `app/*/page.tsx` |
| F-05 | 🟡 | Categorías y labels están hardcodeados en `app/api/categories/route.ts` (`CATEGORY_LABELS`, `CATEGORY_IMAGES`). Si querés una categoría nueva hay que tocar código. | `app/api/categories/route.ts` línea 7-21 |
| F-06 | 🟡 | Footer tiene redes sociales con `href="#"` — no apunta a nada real. | `components/Footer.tsx` línea 29-31 |
| F-07 | 🟠 | El contador "4.8★" en el hero de la home es un string hardcodeado, no se calcula de las reseñas reales (que ni siquiera existen). | `app/page.tsx` línea 81-83 |
| F-08 | 🟠 | El campo `customer.city` del checkout siempre es `"Asunción"` por default — debería ser select con los 17 departamentos de Paraguay. | `app/checkout/page.tsx` línea 28 |
| F-09 | 🟠 | Filtros solo filtran por 1 marca a la vez (no multi-select) y no por rango de precio visual (slider). | `components/Filters.tsx` |
| F-10 | 🟠 | No hay vista de comparación de productos. | — |
| F-11 | 🟠 | No hay búsqueda por vehículo (marca/modelo/año). | — |
| F-12 | 🟠 | Páginas de marca (`/brand/pioneer`, etc.) no existen — los links en `Filters` rompen. | — |
| F-13 | 🟡 | No hay Open Graph ni Twitter Cards reales (compartido en WhatsApp/Facebook no se ve bien). | `app/layout.tsx` línea 24-28 |
| F-14 | 🟡 | `lang="es"` en `<html>`, pero no hay soporte de guaraní (segundo idioma oficial de Paraguay). | `app/layout.tsx` línea 39 |
| F-15 | 🟢 | El `LiveStatus` solo muestra el estado de la conexión socket, no una notificación real cuando hay un nuevo pedido. | `components/LiveStatus.tsx` |

### 1.2 Backend (API Routes + Server)

**Estructura de endpoints actual:**
| Método | Ruta | Estado |
|---|---|---|
| GET | `/api/products` | ✅ Funciona, pero filtra en memoria (no escala a >10k productos) |
| GET | `/api/products/[id]` | ✅ Funciona |
| GET | `/api/search` | ✅ Funciona, pero igual filtra en memoria |
| GET | `/api/categories` | ⚠️ Categorías hardcodeadas |
| GET/POST | `/api/cart` | ✅ Funciona, pero sessionId es público y manipulable |
| GET/POST | `/api/wishlist` | ✅ Funciona, idem cart |
| GET/POST | `/api/orders` | ⚠️ POST valida poco, no descuenta stock atómicamente, no crea Customer en Prisma |
| GET | `/api/dashboard` | ✅ Funciona pero hace todo en memoria en cada request — costoso |

**Problemas críticos:**
| # | Severidad | Problema | Detalle |
|---|---|---|---|
| B-01 | 🔴 | **Doble capa de datos** | `app/api/*/route.ts` usa `import { db } from "@/lib/db"` (lee/escribe `data/db.json`). Pero ya tenés `prisma/schema.prisma` con 22 modelos, `lib/prisma.ts` configurado, migración aplicada, y un seed. **El runtime NUNCA consulta Prisma**. La DB Prisma existe pero está vacía (0 bytes). Hay que decidir cuál se queda y migrar todo a esa. |
| B-02 | 🔴 | **Cero autenticación real** | No existen `/api/auth/login`, `/api/auth/register`, `/api/auth/logout`, `/api/auth/me`. El middleware `lib/auth/middleware.ts` está escrito pero **nadie lo invoca**. Cualquiera puede ver/crear/modificar lo que sea. |
| B-03 | 🔴 | **RBAC no se enforce** | `requirePermission` solo chequea `payload.roleName === "admin"` y el `action` que recibe **nunca se usa**. Cualquier endpoint bajo `/api/products` o `/api/orders` es público. |
| B-04 | 🔴 | **Cero endpoints admin** | No existen `/api/admin/products` (POST/PUT/DELETE), `/api/admin/categories`, `/api/admin/users`, etc. No se puede gestionar el negocio desde la app. |
| B-05 | 🔴 | **Cero integración de pagos** | Los métodos en el checkout son solo labels (`cash`, `transfer`, `qr`). No hay gateway. El pedido se crea como "pending" sin verificar pago. |
| B-06 | 🟠 | **Stock no es transaccional** | En `app/api/orders/route.ts` el `db.updateStock()` se hace fuera de cualquier transacción. Dos pedidos concurrentes pueden vender más del stock. |
| B-07 | 🟠 | **Sin validación con Zod** | `zod` está en `package.json` pero **ningún endpoint lo usa**. Validación manual con `.slice()` y `.replace()` es frágil. |
| B-08 | 🟠 | **Sin rate limiting** | Un script puede crear 10.000 pedidos en un minuto. |
| B-09 | 🟠 | **Sin CSRF** | POST sin token anti-CSRF (en cookie httpOnly sin más). |
| B-10 | 🟠 | **Sin upload de imágenes** | No existe `/api/upload`. Los productos referencian URLs externas y nada más. |
| B-11 | 🟡 | **sessionId expuesto en URL** | Se pasa `?sessionId=...` en query string, queda en logs de servidor. |
| B-12 | 🟡 | **Sin paginación** | `GET /api/products` devuelve TODOS los productos. A 100+ items se cae. |
| B-13 | 🟡 | **Sin endpoint de healthcheck** | No hay `/api/health` para monitoring/uptime. |
| B-14 | 🟡 | **El `custom server` (Express+Socket.io) es innecesario** | Next.js 14 ya soporta WebSockets vía route handlers + un upgrade. Express se puede sacar. |
| B-15 | 🟡 | **Los IDs de pedido son predecibles** | `ORD-${Date.now().toString().slice(-6)}` — colisión fácil en picos. |

### 1.3 Base de datos

**El schema Prisma es BUENO.** Tiene 22 modelos y cubre ~80% de lo que pediste. **El problema es que nadie lo usa.**

Modelos que YA existen y son sólidos:
- `User` (con document, phone, whatsapp, email, passwordHash, roleId)
- `Role` + `Permission` (RBAC con tabla intermedia)
- `Customer` (separado de User — para guest + registrado, inteligente)
- `Address` (múltiples por user, con isDefault)
- `Category` (con parentId — jerárquica)
- `Brand` (con logo)
- `Product` (completo: sku, manufacturerCode, price, comparePrice, stock, minStock, isActive, isFeatured, isNew, rating, reviews, sold, metaTitle, metaDescription)
- `ProductImage` (múltiples, con isPrimary, sortOrder)
- `ProductSpec` (características dinámicas)
- `ProductTag` (búsqueda)
- `ProductCompatibility` (compatibilidad con vehículos) ← **ya está pensado**
- `CartItem` (con sessionId o userId — bien)
- `WishlistItem`
- `Order` (con subtotal, discount, shipping, total, paymentStatus, customerName/Phone/Email/Address/City, deliveryMethod, OrderStatusHistory)
- `OrderItem` (con snapshot de name/sku/price — bien)
- `OrderStatusHistory` (trazabilidad de cambios de estado)
- `Payment` (gateway, transactionId, amount, status, payload)
- `Coupon` (con type, value, minPurchase, maxUses, usedCount, startsAt, expiresAt)
- `AuditLog` (userId, action, resource, resourceId, details, ipAddress)
- `Setting` (key/value — para config global)
- `Notification`
- `Session` (para manejo de sesiones)

**Faltantes / a agregar (recomendado):**
- `ProductVideo` (URL de video del producto — para multitemedias).
- `CouponUsage` (mejor que `usedCount` en Coupon — permite ver QUÉ usuario lo usó).
- `Review` (modelo formal de reseñas; el `rating` y `reviews` en Product son contadores, no las reseñas en sí).
- `Vehicle` (catálogo de marca/modelo/año/motor para el buscador por vehículo) + `VehicleCompatibility` ya está como `ProductCompatibility`.
- `Shipment` (separar del Order — número de tracking, courier, eventos de envío).
- `WebhookEvent` (para idempotencia de webhooks de Bancard — crítico).
- `InventoryMovement` (kardex — entradas/salidas/ajustes de stock, no solo `minStock`).

**Decisión recomendada: mantener este schema y completarlo**, no rehacer.

### 1.4 Seguridad

| # | Severidad | Riesgo | Detalle |
|---|---|---|---|
| S-01 | 🔴 | **JWT_SECRET tiene default** `"change-me-in-production"` en `lib/auth/config.ts` — si no se setea `.env`, producción firma tokens con un secreto público. | `lib/auth/config.ts` línea 2 |
| S-02 | 🔴 | **Sin HTTPS forzado en prod** | No hay middleware `Strict-Transport-Security`. |
| S-03 | 🟠 | **CORS abierto a `*`** en Socket.io (`server.js` línea 32) | Aceptable en dev, peligroso en prod. |
| S-04 | 🟠 | **Contraseñas en texto plano en logs posibles** | El `seed.mts` deja `admin@autoshopping.com / admin123` hardcodeado. OK para seed, pero el admin debe cambiarlo. |
| S-05 | 🟠 | **Sin sanitización robusta** | Se quitan `<>` pero no se escapan otros XSS vectors. React ya escapa por defecto, pero la API devuelve `description` que después se mete en `dangerouslySetInnerHTML` (revisar). |
| S-06 | 🟡 | **Sin headers de seguridad** | Falta CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy. |
| S-07 | 🟡 | **Sin captcha en checkout/registro** | Vulnerable a bots creando pedidos falsos. |
| S-08 | 🟡 | **No hay protección contra IDOR** | `GET /api/products/[id]` no valida que el id sea del usuario. Aceptable para productos públicos, pero `Order`, `Address`, `Customer` deben filtrar por `userId`. |
| S-09 | 🟡 | **AuditLog nunca se escribe** | El modelo existe pero `lib/db.ts` (JSON) no lo toca y las rutas API tampoco. |

### 1.5 Performance / SEO

| # | Severidad | Detalle |
|---|---|---|
| P-01 | 🟠 | No hay `sitemap.xml`, `robots.txt`, ni `manifest.json`. |
| P-02 | 🟠 | No hay datos estructurados (Schema.org `Product`, `Offer`, `BreadcrumbList`). |
| P-03 | 🟠 | El dashboard recalcula TODAS las stats en cada request (sin caché). |
| P-04 | 🟡 | Faltan `<link rel="preconnect">` para CDNs de imagen. |
| P-05 | 🟡 | Faltan `meta` por página de producto (solo está en el layout raíz). |
| P-06 | 🟡 | No hay `next/image` — imágenes sin responsive sizes, sin lazy real, sin blur placeholder. |
| P-07 | 🟡 | `dynamic = "force-dynamic"` en TODAS las rutas API — incluso `/api/categories` que casi nunca cambia. |

---

## 2. Funcionalidades — qué falta vs lo que pediste

Mapeo pedido → estado:

| Pedido | Estado actual | Acción |
|---|---|---|
| Búsqueda y filtros | ✅ Básico | Agregar multi-select marca, slider de precio, búsqueda por tag/SKU |
| Detalle de producto | ✅ Básico | Agregar: galería con zoom, video, specs tab, compatibles tab, reviews |
| Carrito | ✅ Funcional | Bien, pero asociar a `userId` si está logueado (ya está en schema) |
| Checkout guest | ✅ Funcional | Agregar: departamento (17 de PY), método de envío seleccionable, RUC opcional |
| Pago online | ❌ No existe | Integrar Bancard (ver §3) + abstracción de gateway |
| WhatsApp pedido | ✅ Como fallback | Mantener como opción "transferencia/WhatsApp" |
| Registro/Login | ❌ No existe | Crear con NextAuth.js (Credentials + Google opcional) |
| Recuperar contraseña | ❌ No existe | Email con token (Resend) |
| Historial de pedidos | ❌ No existe | Página `/account/orders` |
| Favoritos | ✅ UI básica | Migrar de sessionId a userId cuando loguea |
| Categorías/subcategorías dinámicas | ⚠️ Hardcodeadas | CRUD admin + árbol jerárquico |
| Compatibilidad vehículo | ❌ Schema listo, UI no | Buscador "Mi auto" en home + tab "Compatibles" en PDP |
| Cupones | ❌ Schema listo, UI no | Input en checkout, validación server-side |
| RBAC | ⚠️ Schema listo, no enforza | Middleware real + páginas admin protegidas |
| Audit log | ❌ Schema listo, no escribe | Helper que registra cada acción admin |
| WhatsApp Business | ⚠️ Solo link `wa.me/` | Botón flotante + WhatsApp Business API con templates |
| SEO avanzado | ❌ No existe | Sitemap, JSON-LD, OG por producto, canonical |
| PWA | ❌ No existe | `next-pwa` o `@serwist/next` (Fase 3) |
| Multi-idioma (es/gn) | ❌ No existe | `next-intl` cuando haga falta |
| API móvil | ❌ No existe | Reutiliza `/api/*` cuando se necesite app |
| Multi-vendedor | ❌ No existe | Schema tendría que crecer (Fase 4) |
| CRM | ❌ No existe | Se puede hacer con Segmentos/Etiquetas en User (Fase 4) |
| Sistema de puntos | ❌ No existe | Tabla `LoyaltyPoint` + reglas (Fase 4) |

---

## 3. Pagos en Paraguay — opciones reales

| Pasarela | Tarjeta | QR | Tigo Money | Transferencia | Comision típica | Estado |
|---|---|---|---|---|---|---|
| **Bancard (vPOS)** | ✅ | ✅ (QR interoperable) | ✅ | ❌ | ~2.9% + Gs 3.500 (confirmar contrato) | El más usado en sitios medianos/grandes de PY |
| **Pagopar** | ✅ | ✅ | ✅ | ✅ | similar | Alternativa más "todo-en-uno" |
| **Tienda Pago** | ✅ | ✅ | ✅ | ❌ | similar | Otra opción |
| **Transferencia manual** | ❌ | ❌ | ❌ | ✅ | 0% | La que ya tenés — útil como fallback |

**Recomendación**: arrancar con **Bancard vPOS** (es el estándar de facto en Paraguay, usado por PedidosYa, Bolt, etc.) con una capa de abstracción para no quedar atado:

```ts
// lib/payments/types.ts
export interface PaymentProvider {
  createPaymentIntent(order: Order): Promise<{ intentId: string; redirectUrl?: string; qrData?: string }>;
  getStatus(intentId: string): Promise<"pending" | "approved" | "rejected" | "expired">;
  handleWebhook(payload: unknown, signature: string): Promise<WebhookEvent>;
  cancel(intentId: string): Promise<void>;
}
```

Implementaciones: `BancardProvider`, `TransferProvider` (manual), `QRProvider` (futuro). El Order/Payment en Prisma ya está modelado.

**Webhook crítico**: los webhooks de Bancard (IPN) deben tener un endpoint público que actualice el estado del pedido **idempotentemente** (por eso recomiendo `WebhookEvent` en la DB).

---

## 4. Arquitectura propuesta

### 4.1 Stack recomendado (cambios mínimos, máximo beneficio)

| Capa | Hoy | Propuesto | Razón |
|---|---|---|---|
| Framework | Next.js 14 (✅) | **Next.js 14.2 (mantener)** | Funciona, no rompas. Migrar a 15 solo si querés React 19. |
| DB dev | `data/db.json` | **Prisma + SQLite (ya configurado)** | Una sola fuente de verdad, queries reales, migraciones |
| DB prod | (n/a) | **PostgreSQL** (Neon / Supabase / Railway) | JSON no escala, SQLite no aguanta concurrencia. Postgres es el estándar. |
| Auth | JWT manual (sin usar) | **Auth.js (NextAuth v5) + Prisma adapter** | Credentials + OAuth listos, RBAC extensible, sin reinventar JWT |
| Validación | manual | **Zod en TODA la API** (ya está instalado) | Tipos + validación en un solo lugar |
| Estado | Zustand (✅) | **Zustand (mantener)** | Para carrito/wishlist/tema es ideal |
| Tiempo real | Socket.io custom server | **Socket.io (mantener)** o migrar a **SSE** si solo hay 1-2 eventos | Para el admin es OK Socket.io |
| Imágenes | URLs externas | **UploadThing** (rápido) o **Cloudinary** (PY-friendly) | Local en `public/uploads/` para MVP |
| Email | no | **Resend** (gratis hasta 100/día) | Templates React, sin SMTP |
| Pagos | no | **Bancard vPOS** + interfaz `PaymentProvider` | Único realista en PY |
| PWA | no | **@serwist/next** | Reemplazo mantenido de next-pwa |
| i18n | no | **next-intl** | Es + gn si querés llegar a más público |
| Testing | 0 | **Vitest** (unit) + **Playwright** (e2e) | Estándar moderno |
| Logging | console | **Pino** o **Winston** (después) | Para auditoría centralizada |
| Deploy | local | **Vercel** (ideal para Next) o **Hostinger** (PY, cPanel) | Vercel si querés CDN global + edge |

### 4.2 Estructura de carpetas objetivo

```
autoshopping/
├── app/
│   ├── (storefront)/              # rutas públicas, layout liviano
│   │   ├── page.tsx               # home
│   │   ├── products/
│   │   │   ├── page.tsx           # catálogo con filtros
│   │   │   └── [slug]/page.tsx    # PDP
│   │   ├── brands/[slug]/page.tsx
│   │   ├── categories/[slug]/page.tsx
│   │   ├── cart/page.tsx
│   │   ├── checkout/page.tsx
│   │   ├── checkout/success/page.tsx
│   │   ├── track/[orderNumber]/page.tsx
│   │   ├── search/page.tsx
│   │   └── account/
│   │       ├── page.tsx           # dashboard cliente
│   │       ├── orders/page.tsx
│   │       ├── addresses/page.tsx
│   │       ├── security/page.tsx
│   │       └── wishlist/page.tsx
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   └── reset-password/[token]/page.tsx
│   ├── admin/                     # layout admin, RBAC enforced
│   │   ├── page.tsx               # dashboard
│   │   ├── products/
│   │   ├── categories/
│   │   ├── brands/
│   │   ├── orders/
│   │   ├── customers/
│   │   ├── coupons/
│   │   ├── reports/
│   │   ├── users/
│   │   ├── roles/
│   │   ├── settings/
│   │   └── audit/page.tsx
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── auth/register/route.ts
│   │   ├── auth/forgot-password/route.ts
│   │   ├── products/route.ts
│   │   ├── products/[id]/route.ts
│   │   ├── categories/route.ts
│   │   ├── brands/route.ts
│   │   ├── cart/route.ts
│   │   ├── wishlist/route.ts
│   │   ├── orders/route.ts
│   │   ├── orders/[id]/route.ts
│   │   ├── payments/
│   │   │   ├── create/route.ts
│   │   │   └── status/[id]/route.ts
│   │   ├── upload/route.ts
│   │   ├── webhooks/
│   │   │   └── bancard/route.ts
│   │   ├── admin/                 # endpoints admin (protegidos)
│   │   │   ├── products/...
│   │   │   ├── orders/[id]/status/route.ts
│   │   │   └── ...
│   │   └── health/route.ts
│   ├── globals.css
│   ├── layout.tsx
│   ├── error.tsx
│   ├── not-found.tsx
│   └── sitemap.ts
├── components/
│   ├── ui/                        # Button, Card, Input, Modal, Toast, Skeleton, Tabs, Dialog, Drawer
│   ├── storefront/                # Hero, ProductCard, Filters, SearchBar, CartDrawer, etc.
│   ├── admin/                     # AdminSidebar, DataTable, ImageUploader, RichTextEditor
│   └── shared/                    # Header, Footer, WhatsAppButton
├── lib/
│   ├── auth/
│   │   ├── config.ts              # NextAuth config
│   │   ├── session.ts             # getServerSession helper
│   │   ├── rbac.ts                # hasPermission(user, resource, action)
│   │   └── password.ts
│   ├── db/
│   │   ├── prisma.ts              # singleton
│   │   └── repositories/          # ProductRepo, OrderRepo, UserRepo (encapsula queries)
│   ├── payments/
│   │   ├── types.ts
│   │   ├── index.ts               # factory
│   │   ├── bancard.ts
│   │   └── transfer.ts
│   ├── email/
│   │   ├── client.ts              # Resend
│   │   └── templates/
│   │       ├── order-confirmed.tsx
│   │       ├── order-shipped.tsx
│   │       └── password-reset.tsx
│   ├── validation/                # zod schemas
│   │   ├── product.ts
│   │   ├── order.ts
│   │   ├── user.ts
│   │   └── ...
│   ├── hooks/                     # useAuth, useCart, useDebounce, etc.
│   ├── utils/
│   ├── store.ts                   # Zustand (carrito, wishlist, ui)
│   └── socket.ts
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts                    # poblar roles, admin, categorías, marcas, productos demo
│   └── migrations/
├── public/
│   ├── uploads/                   # imágenes locales (MVP)
│   └── og/                        # imágenes OG por defecto
├── docs/
│   ├── audit/AUDIT-v1.md          # este doc
│   ├── architecture.md
│   ├── api.md
│   └── admin-manual.md
├── tests/
│   ├── unit/
│   └── e2e/
├── server.js                      # mantener mientras se use Socket.io en custom server
├── next.config.js
├── tailwind.config.ts
└── package.json
```

### 4.3 Modelo de datos — schema final propuesto

El schema actual cubre 80%. Lo que **agrego o ajusto**:

```prisma
// AGREGAR

model ProductVideo {
  id        String   @id @default(cuid())
  productId String
  product   Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  url       String
  thumbnail String?
  sortOrder Int      @default(0)
  createdAt DateTime @default(now())
}

model Review {
  id        String   @id @default(cuid())
  productId String
  product   Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  rating    Int      // 1..5
  title     String?
  body      String
  isApproved Boolean @default(false)
  createdAt DateTime @default(now())

  @@index([productId])
  @@index([userId])
}

// En User.agregar: reviews Review[]

model CouponUsage {
  id        String   @id @default(cuid())
  couponId  String
  coupon    Coupon   @relation(fields: [couponId], references: [id])
  userId    String?
  user      User?    @relation(fields: [userId], references: [id])
  orderId   String   @unique
  order     Order    @relation(fields: [orderId], references: [id])
  discount  Float
  createdAt DateTime @default(now())

  @@index([couponId])
  @@index([userId])
}

// En Coupon.agregar: usages CouponUsage[]
// En Order.agregar: couponUsage CouponUsage?
// En User.agregar: couponUsages CouponUsage[]

model Vehicle {
  id    String @id @default(cuid())
  make  String  // Toyota, Hyundai, etc.
  model String  // Corolla, Accent, etc.
  yearStart Int
  yearEnd   Int?
  engine    String?
  bodyStyle String?  // sedan, suv, pickup

  @@unique([make, model, yearStart, engine])
  @@index([make])
  @@index([model])
}

model Shipment {
  id          String   @id @default(cuid())
  orderId     String   @unique
  order       Order    @relation(fields: [orderId], references: [id])
  courier     String   // "AEX", "Mochila", "Retiro en local"
  tracking    String?
  status      String   @default("pending") // pending, in_transit, delivered, failed
  shippedAt   DateTime?
  deliveredAt DateTime?
  notes       String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  events      ShipmentEvent[]
}

model ShipmentEvent {
  id         String   @id @default(cuid())
  shipmentId String
  shipment   Shipment @relation(fields: [shipmentId], references: [id], onDelete: Cascade)
  status     String
  location   String?
  notes      String?
  occurredAt DateTime
  createdAt  DateTime @default(now())
}

model WebhookEvent {
  id          String   @id @default(cuid())
  provider    String   // "bancard"
  externalId  String   // id de Bancard, para idempotencia
  eventType   String
  payload     String   // JSON crudo
  processed   Boolean  @default(false)
  processedAt DateTime?
  error       String?
  createdAt   DateTime @default(now())

  @@unique([provider, externalId, eventType])
  @@index([processed])
}

model InventoryMovement {
  id         String   @id @default(cuid())
  productId  String
  product    Product  @relation(fields: [productId], references: [id])
  type       String   // "purchase" | "sale" | "adjustment" | "return"
  quantity   Int      // + entrada, - salida
  reason     String?
  userId     String?  // quién lo hizo
  user       User?    @relation(fields: [userId], references: [id])
  orderId    String?  // si fue por una venta
  createdAt  DateTime @default(now())

  @@index([productId])
  @@index([orderId])
}

// En Product.agregar: videos ProductVideo[], reviews Review[], inventoryMovements InventoryMovement[]
// En User.agregar: inventoryMovements InventoryMovement[]
// En Order.agregar: shipment Shipment?
```

### 4.4 Flujo de compra rediseñado

```
[1] Home / Catálogo / PDP
        │
        ▼
[2] Add to Cart (Zustand + sync server si user logged)
        │
        ▼
[3] /cart
        │  - revisa items
        │  - ingresa cupón (opcional)
        │  - elige método de envío
        ▼
[4] /checkout
        │  ┌─ Si logged: prellenar datos del user + direcciones guardadas
        │  └─ Si guest: completar nombre/doc/tel/email/dirección/departamento
        │
        │  Elige método de pago:
        │   - "Bancard" → /api/payments/create → redirect a vPOS
        │   - "Transferencia" → genera comprobante con datos bancarios + WhatsApp
        │   - "Contra entrega" (solo Asunción/Central) → orden pending
        ▼
[5a] Bancard vPOS: usuario paga → vuelve a /checkout/success?ref=...
[5b] Webhook Bancard → /api/webhooks/bancard → valida firma, idempotente (WebhookEvent),
     actualiza Payment + Order (status=paid), envía email + WhatsApp
[5c] Transferencia/Contra entrega: orden queda pending, admin confirma manualmente
        │
        ▼
[6] /checkout/success → muestra # pedido, link a /track/[orderNumber]
        │
        ▼
[7] Admin ve pedido nuevo en /admin/orders (Socket.io push en tiempo real)
     - cambia status: confirmed → preparing → shipped → delivered
     - genera shipment con tracking
     - cliente recibe email + puede ver estado en /track/[orderNumber]
```

### 4.5 Flujo administrativo (admin)

```
/admin (protegido: role in {admin, sales, stock_manager})
├── Dashboard (métricas en vivo, igual al actual)
├── Productos
│   ├── Listar (DataTable: search, sort, paginación, bulk actions)
│   ├── Crear / Editar (form con: nombre, marca, categoría, subcat, sku, manufacturerCode, descripción, shortDescription, galería de imágenes, video, specs dinámicos, compatibilidades, precio, comparePrice, stock, minStock, peso, isActive, isFeatured, isNew, metaTitle, metaDescription)
│   └── Eliminar (soft delete: isActive=false)
├── Categorías (árbol jerárquico, drag-and-drop sortOrder, imagen)
├── Marcas (CRUD con logo)
├── Pedidos
│   ├── Listar (filtros: status, fecha, búsqueda por #/cliente)
│   ├── Detalle (items, cliente, pagos, shipment, historial de status)
│   └── Cambiar estado (registra en OrderStatusHistory + audit)
├── Clientes
│   ├── Listar
│   ├── Detalle (historial, LTV, total de compras)
│   └── Notas internas
├── Cupones (CRUD + ver usos)
├── Reportes
│   ├── Ventas (por día/mes/año, por categoría, por marca)
│   ├── Productos más vendidos
│   ├── Stock bajo
│   ├── Métodos de pago preferidos
│   └── Clientes top
├── Usuarios
│   ├── Listar (con rol)
│   ├── Crear/Editar (asignar rol)
│   └── Permisos por rol
├── Roles & Permisos (matriz resource × action)
├── Configuración (whatsapp, company info, envío, métodos de pago activos)
└── Audit Log (búsqueda por usuario/acción/recurso/fecha)
```

---

## 5. Seguridad — checklist de hardening

| # | Control | Implementación |
|---|---|---|
| SEC-01 | HTTPS forzado | Middleware Next.js + `Strict-Transport-Security` header |
| SEC-02 | JWT_SECRET desde env, sin default | Eliminar fallback en `lib/auth/config.ts`; requerir `JWT_SECRET` ≥ 32 chars |
| SEC-03 | CSRF | NextAuth lo trae built-in para credentials; para custom POST usar token CSRF |
| SEC-04 | Rate limiting | Middleware Upstash Ratelimit o `@vercel/edge-rate-limit` en rutas sensibles (login, register, orders POST) |
| SEC-05 | Sanitización | DOMPurify para cualquier HTML que se renderice; Zod en TODA API |
| SEC-06 | Headers | CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy |
| SEC-07 | RBAC enforced | `lib/auth/rbac.ts` con `hasPermission(session, resource, action)` aplicado en `middleware.ts` y dentro de cada handler admin |
| SEC-08 | Audit log | Helper `audit({ userId, action, resource, resourceId, details, ip })` en cada endpoint admin |
| SEC-09 | Idempotencia en webhooks | Tabla `WebhookEvent` con unique(provider, externalId, eventType) |
| SEC-10 | Captcha | Cloudflare Turnstile en register, forgot-password, contacto |
| SEC-11 | Inputs tipados | Zod genera tipos TS; nunca `any` en handlers |
| SEC-12 | Imágenes | Validar MIME, tamaño máx, escanear con `clamav` o servicio (Cloudinary lo hace) |
| SEC-13 | Logs seguros | Nunca loggear password, JWT, números de tarjeta completos |

---

## 6. SEO / Performance — checklist

| # | Acción |
|---|---|
| SEO-01 | `app/sitemap.ts` dinámico con productos, categorías, marcas |
| SEO-02 | `app/robots.ts` |
| SEO-03 | Metadata por producto (`generateMetadata` en `app/products/[slug]/page.tsx`) |
| SEO-04 | JSON-LD `Product` + `Offer` + `BreadcrumbList` + `Organization` |
| SEO-05 | OG/Twitter cards por producto (imagen por defecto si no hay) |
| SEO-06 | Canonical URLs |
| SEO-07 | `next/image` everywhere (con sizes, priority en hero) |
| SEO-08 | Preconnect a CDN de imágenes |
| SEO-09 | Lazy load de componentes pesados (`next/dynamic`) |
| SEO-10 | Caché de queries frecuentes (Next.js `unstable_cache` o Redis) |
| SEO-11 | ISR (revalidate) en home y categorías |
| SEO-12 | Lighthouse > 90 en mobile |

---

## 7. Roadmap de implementación

### Fase 1 — MVP Operable (prioridad alta)
> Sin esto no se puede vender ni administrar el negocio.

1. **Migración de datos** — `lib/db.ts` (JSON) se reemplaza por repos Prisma. Seed que popula roles, admin, categorías (las que ya tenés + las del scope: multimedia, iluminación, estética, repuestos), marcas, 30+ productos reales, settings.
2. **Auth completo** — NextAuth.js v5 con CredentialsProvider, JWT strategy, páginas `/login`, `/register`, `/forgot-password`, `/reset-password/[token]`. Email via Resend.
3. **Páginas de cliente** — `/account` (perfil), `/account/orders`, `/account/addresses`, `/account/security`.
4. **Admin CRUD productos** — listar, crear, editar, eliminar (soft), galería de imágenes (UploadThing o local), specs, compatibilidades, tags, SEO fields.
5. **Admin CRUD categorías/marcas** — árbol jerárquico, drag-and-drop.
6. **Admin orders** — cambiar estado, ver detalle, contacto con cliente.
7. **Admin customers** — listar, ver historial.
8. **Admin settings** — company info, WhatsApp, shipping.
9. **RBAC enforced** — middleware + helper `hasPermission`.
10. **Audit log real** — escribir en cada acción admin.
11. **Validación Zod** en toda API.
12. **Image upload** funcionando.
13. **Paginación + búsqueda** con filtros mejorados.
14. **SEO básico** — sitemap, robots, JSON-LD, OG por producto.
15. **i18n opcional** — `next-intl` con es (gn si querés).
16. **Healthcheck** `/api/health`.
17. **Tests mínimos** — auth flow, order creation, payment flow.

**Resultado**: tienda operable, admin funcional, lista para recibir pagos.

### Fase 2 — Pagos reales + comunicación
1. Integración **Bancard vPOS** + capa `PaymentProvider`.
2. Webhook idempotente.
3. **Resend** para emails transaccionales (templates React).
4. **WhatsApp Business API** (con `whatsapp-cloud-api` o servicio como Wati/Twilio): confirmación de pedido, envío, recordatorio de carrito abandonado.
5. Cupones completos.
6. Reseñas de productos.
7. Reportes reales en admin (ventas por período, top, etc.).
8. Tracking de envío en `/track/[orderNumber]`.

**Resultado**: tienda que vende, cobra y comunica.

### Fase 3 — Crecimiento
1. Búsqueda por vehículo (catálogo `Vehicle` + UI).
2. PWA (instalable, offline cat, push).
3. Notificaciones push.
4. Blog automotriz (CMS simple con Prisma).
5. Comparador de productos.
6. SEO avanzado (contenido, link building interno).
7. Multi-currency (USD/ARS/BRL como display).
8. Multi-idioma es/gn.

### Fase 4 — Avanzado
1. CRM (segmentos, etiquetas, campañas).
2. Sistema de puntos.
3. Multi-vendedor (marketplace).
4. API móvil (token-based).
5. Integración Instagram/Facebook Shop.
6. Chat interno.
7. Reportes BI (Looker Studio / Metabase).

---

## 8. Decisiones que necesito de vos antes de tocar código

Estas son las preguntas que sí cambian la arquitectura. Responderlas antes de la Fase 1 me evita reescribir:

### D1 · Base de datos
**Recomendado: Prisma + PostgreSQL en Neon/Supabase (gratis para arrancar), SQLite en dev con Prisma.**
- (a) Mantener Prisma + SQLite para dev y migrar a Postgres en prod (mi recomendación).
- (b) Saltar a Postgres ya en dev (Docker local).
- (c) Otra opción (PlanetScale, MySQL, Supabase Postgres directo).

### D2 · Auth
**Recomendado: NextAuth.js (Auth.js v5) con Credentials + Prisma adapter.**
- (a) NextAuth Credentials (email + password) + opción Google/Facebook después (mi recomendación).
- (b) Clerk / Supabase Auth (terceros, menos control, más rápido de integrar).
- (c) Custom JWT con bcrypt (lo que ya tenés medio armado).

### D3 · Pagos
**Recomendado: Bancard vPOS + capa de abstracción.**
- (a) Bancard ya (mi recomendación — es el estándar PY).
- (b) Pagopar.
- (c) Solo transferencia/WhatsApp por ahora, Bancard más adelante.
- (d) Tienda Pago.

> Para (a/b/d) necesitás tener el contrato con el proveedor. **Si no lo tenés todavía**, arrancamos con (c) y dejamos la capa lista para enchufar cuando llegue.

### D4 · Deploy
**Recomendado: Vercel para Next.js + Neon/Supabase para Postgres + Cloudinary para imágenes.**
- (a) Vercel + Neon + Cloudinary (mi recomendación).
- (b) Hostinger cPanel / VPS paraguayo (vos manejás infra, más barato, más lento de deployar).
- (c) Railway / Render (alternativa a Vercel).
- (d) Tu propio VPS (DigitalOcean, Hetzner).

### D5 · Email
**Recomendado: Resend (gratis hasta 100/día, templates React).**
- (a) Resend (mi recomendación).
- (b) SMTP tradicional (cPanel, más lento de configurar).
- (c) No enviar emails todavía (todo por WhatsApp).

### D6 · Idioma
**Recomendado: solo español en MVP, agregar guaraní después si el mercado lo pide.**
- (a) Solo español (mi recomendación para MVP).
- (b) Español + guaraní desde el inicio.

### D7 · Imágenes
**Recomendado: UploadThing (rápido de integrar) o Cloudinary (más features).**
- (a) UploadThing.
- (b) Cloudinary.
- (c) Local en `public/uploads/` por ahora (más simple, después migrás).

### D8 · Stack a mantener vs cambiar
**Recomendado: mantener Next.js 14 + Zustand + Tailwind + Socket.io. Cambiar a Auth.js v5. Agregar Zod everywhere.**
- (a) Lo que recomiendo (mínima disrupción, máxima mejora).
- (b) Migrar a Next.js 15 + React 19 (más moderno, pero requiere re-test de todo).
- (c) Sacar Socket.io custom server y usar SSE (más simple, menos infra).

### D9 · Cronograma
**Recomendado: Fase 1 en 2-3 semanas full-time, luego iterar.**
- (a) Acepto tu estimación, arrancamos ya.
- (b) Tengo un deadline más ajustado — decime cuál.
- (c) Priorizo solo X cosas del scope (decime cuáles).

### D10 · Datos existentes
**Recomendado: importar los 30+ productos del JSON a Prisma con un script de migración, mantener imágenes por ahora (reemplazables).**
- (a) Importar todo lo que hay (mi recomendación).
- (b) Borrar y arrancar limpio con productos reales.
- (c) Mantener JSON como legacy durante la transición.

---

## 9. Riesgos identificados

| # | Riesgo | Mitigación |
|---|---|---|
| R-01 | Migrar a Prisma rompe el front actual | Hacerlo rama por rama; el contrato de `lib/api.ts` se mantiene idéntico |
| R-02 | Bancard rechaza el alta si no hay RC del comercio | Empezar con transferencia/WhatsApp, enchufar Bancard cuando esté el contrato |
| R-03 | Imágenes de Unsplash se rompen en prod | Reemplazar por upload propio en Fase 1 (paralelo al seed) |
| R-04 | Custom server con Socket.io complica el deploy en Vercel | Plan B: migrar a Server-Sent Events o Pusher/Ably para tiempo real |
| R-05 | `next.config.js` permite cualquier imagen remota | Restringir desde el día 1 de Fase 1 |
| R-06 | Sin tests, refactors romperán features | Vitest + Playwright en paralelo con el desarrollo |
| R-07 | Single-tenant hoy; multi-vendor requiere rediseño | Aceptar que es Fase 4, no anticipar |

---

## 10. Próximos pasos concretos

1. **Vos leés este doc y respondés las 10 decisiones de §8.**
2. Cuando estén claras, armo el **Plan de Implementación detallado** de la Fase 1 con tickets chicos (1-4h cada uno).
3. Recién ahí arranco a tocar código, **respetando lo que YA funciona** y migrando en pasos chicos verificables.

**Cero código se va a escribir hasta tu aprobación.**
