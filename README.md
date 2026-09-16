# JDM Shop Paraguay — E-commerce de Accesorios Automotrices

Plataforma e-commerce full-stack inspirada en JDM Shop Paraguay, construida con foco en estabilidad, rendimiento y actualizaciones en tiempo real.

## Stack

- **Frontend**: Next.js 14 (App Router) + React 18 + TypeScript + Tailwind CSS
- **Estado**: Zustand (con persistencia en localStorage)
- **Backend**: Next.js API Routes + Express (custom server) + Socket.io
- **Base de datos**: Capa de abstracción `lib/db.ts` (por defecto archivo JSON en `data/db.json`; interfaz lista para reemplazar con MySQL/MariaDB usando el mismo shape)
- **Tiempo real**: WebSockets (Socket.io) — eventos `product:updated`, `order:new`
- **Iconos**: lucide-react

## Características clave

- 🔎 Búsqueda en tiempo real letra por letra con debounce 300ms, AbortController, y manejo de estado seguro
- 🛒 Carrito dinámico (Zustand persistido) sincronizado con backend
- ❤️ Wishlist
- 📊 Dashboard con ventas del día/semana/mes, top productos, stock bajo, últimos pedidos
- 🟢 Indicador "EN VIVO" + actualización en tiempo real vía Socket.io
- 🌗 Modo oscuro/claro
- 📱 Responsive (móvil + PC)
- 💀 Skeleton loaders (sin pantallas en negro)
- 🛡️ ErrorBoundary global, manejo robusto de errores en API y frontend
- ✅ Validación de inputs (cantidades, email, sanitización de query)
- 🔄 Reintento automático de Socket.io

## Cómo arrancar

```bash
# 1. Instalar dependencias
npm install

# 2. Modo desarrollo (con Socket.io)
npm run dev

# 3. Abrir en el navegador
# http://localhost:3000
```

## Estructura

```
autoshopping/
├── server.js                    # Servidor custom (Next + Socket.io)
├── app/                         # App Router (páginas + API)
│   ├── api/                     # Rutas API REST
│   ├── products/[id]/           # Detalle de producto
│   ├── dashboard/               # Dashboard tiempo real
│   ├── cart/ wishlist/ checkout/
│   └── page.tsx                 # Home
├── components/                  # Componentes UI
├── lib/
│   ├── db.ts                    # Capa DB (JSON; reemplazar por MySQL)
│   ├── store.ts                 # Zustand (cart, wishlist, ui)
│   ├── socket.ts                # Cliente Socket.io
│   ├── api.ts                   # Fetch helpers con timeout/AbortController
│   ├── types.ts
│   └── utils.ts
└── data/db.json                 # DB JSON (se crea al iniciar)
```

## Endpoints API

| Método | Ruta                       | Descripción                          |
|--------|----------------------------|--------------------------------------|
| GET    | `/api/products`            | Listar (filtros: `category, brand, min, max, q, sort`) |
| GET    | `/api/products/:id`        | Detalle + productos relacionados     |
| GET    | `/api/search?q=`           | Búsqueda optimizada                  |
| GET    | `/api/categories`          | Categorías con conteo                |
| GET    | `/api/cart?sessionId=`     | Carrito por sesión                   |
| POST   | `/api/cart`                | Guardar carrito                      |
| GET    | `/api/wishlist?sessionId=` | Wishlist por sesión                  |
| POST   | `/api/wishlist`            | Guardar wishlist                     |
| GET    | `/api/orders`              | Listar pedidos                       |
| POST   | `/api/orders`              | Crear pedido (descuenta stock)       |
| GET    | `/api/dashboard`           | Métricas agregadas                   |

## Eventos Socket.io

- `product:updated` — cambio de stock o precio
- `order:new` — nuevo pedido (se refleja en el dashboard)
- `ping` — heartbeat

## Migrar a MySQL

La capa `lib/db.ts` está aislada. Reemplazá las funciones (`getProducts`, `getProduct`, `search`, `updateStock`, `addOrder`, etc.) por queries MySQL usando `mysql2` o `prisma` manteniendo la misma firma. El resto del código no requiere cambios.

## Build producción

```bash
npm run build
npm start
```

## Notas

- Las imágenes de productos vienen de Unsplash. Para producción reemplazar por CDN propio.
- El store del navegador persiste carrito y wishlist. Cada sesión tiene un `sessionId` único para sincronizar con el backend.
- Todas las peticiones tienen `AbortController` y timeout de 15s para evitar cuelgues.
