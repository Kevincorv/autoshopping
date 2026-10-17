# AutoShopping API v1 (móvil)

La app móvil (o cualquier cliente externo) usa la API versionada bajo `/api/v1`.

## Autenticación

Las rutas de pedidos y perfil requieren autenticación. Se acepta:

- **Cookie de sesión** (mismo JWT que el web), o
- **Bearer token**: `Authorization: Bearer <token JWT>`

El JWT se obtiene del login normal (`POST /api/auth/login` → el servidor setea cookie; el cliente móvil puede extraer el token o reutilizar la cookie). Si necesitás el token crudo para una app nativa, se puede exponer en el body del login en una futura iteración.

## Endpoints

### `GET /api/v1` (público)
Info de la API. Con sesión válida, devuelve el usuario autenticado.

### `GET /api/v1/products` (público)
Catálogo con filtros.

| Query | Descripción |
|---|---|
| `q` | Búsqueda por nombre, SKU o marca |
| `category` | Slug de categoría |
| `brand` | Slug de marca |
| `limit` | Máx. 100 (default 24) |
| `offset` | Paginación |

### `GET /api/v1/orders` (auth)
Pedidos del usuario (o todos, si el rol es ERP).

### `POST /api/v1/orders` (auth)
Crear pedido. Body:

```json
{
  "items": [{ "productId": "clx...", "quantity": 2 }],
  "customer": {
    "name": "Nombre Apellido",
    "email": "cliente@email.com",
    "phone": "0981...",
    "address": "Calle 1, Ciudad",
    "city": "Asunción"
  },
  "paymentMethod": "transferencia",
  "paymentReference": "123456",
  "couponCode": "VERANO10",
  "pointsToRedeem": 100
}
```

Respuesta: `{ "order": {...}, "orderNumber": "ORD-..." }`.

### `GET /api/v1/me` (auth)
Perfil + balance de puntos de fidelidad.

## Errores

Todos los endpoints devuelven JSON: `{ "error": "mensaje" }` con el código HTTP correspondiente (400 datos inválidos, 401 sin sesión, 404 no encontrado, 409 conflicto de stock/cupón, 429 rate limit, 500 error interno).

## Notas

- Moneda: guaraníes (Gs., PYG).
- Idioma de mensajes: español.
- Rate limit en creación de pedidos: 10/min por IP.
