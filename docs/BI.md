# Reportes BI — Metabase y Looker Studio

AutoShopping se conecta a **MySQL (TiDB Cloud)**. Para análisis avanzado (dashboards, embudos, cohortes) se recomienda un tool de BI externo apuntando a la misma base, o el export CSV del admin.

## Opción A — Metabase (self-hosted, recomendado)

1. Corré Metabase local o en un servidor (Docker):

```bash
docker run -d -p 3001:30080 --name metabase metabase/metabase
```

2. En Metabase: **Admin → Databases → Add database → MySQL**.

3. Datos de conexión (los mismos que el `.env` de la app):

| Campo | Valor |
|---|---|
| Host | `gateway01.us-east-1.prod.aws.tidbcloud.com` |
| Puerto | `4000` |
| Database | `autoshopping` |
| Username | (el usuario de la BD TiDB) |
| Password | (la contraseña de la BD) |
| SSL | Sí (accept strict) |

> En Metabase, para TiDB/TiCloud con TLS puede ser necesario agregar `?sslaccept=strict` en las opciones avanzadas o usar el parámetro de SSL del conector MySQL.

4. Tablas útiles para dashboards:
   - `Order` / `OrderItem` — ventas, ticket promedio, productos top
   - `Product` — catálogo, stock, rating
   - `Customer` / `CustomerTag` — segmentos CRM
   - `LoyaltyPoint` — movimientos de fidelidad
   - `Review` — satisfacción
   - `Vendor` / `OrderItem.vendorId` — comisiones marketplace
   - `Coupon` / `Order.couponId` — efectividad de cupones
   - `AuditLog` — trazabilidad de acciones admin

5. Ejemplos de métricas (SQL):
   - Ticket promedio: `SELECT AVG(total) FROM Order WHERE status != 'cancelled'`
   - Top 10 productos: `SELECT productName, SUM(quantity) q FROM OrderItem GROUP BY productName ORDER BY q DESC LIMIT 10`
   - Ventas por día: `SELECT DATE(createdAt), SUM(total) FROM Order GROUP BY DATE(createdAt)`

## Opción B — Looker Studio (Google, gratis)

1. Abrí [lookerstudio.google.com](https://lookerstudio.google.com) → **Crear → Fuente de datos**.
2. Elegí el conector **MySQL** (vía partner connector o BigQuery export si preferís un pipeline).
3. Usá los mismos datos de conexión que arriba.
4. Armate dashboards con las tablas listadas.

> Looker Studio no siempre soporta TLS estricto de TiDB en el conector MySQL nativo. Si falla, exportá CSV desde `/api/reports/export` o usá Metabase + Google Sheets connector.

## Export CSV rápido (sin BI)

Desde el admin: **Reportes → Exportar CSV** o vía API:

```
GET /api/reports/export?type=orders&days=90
GET /api/reports/export?type=products
GET /api/reports/export?type=customers
GET /api/reports/export?type=sales&days=30
```

Requiere sesión ERP (admin/vendedor/caja/almacén).

## Seguridad

- **Nunca** compartas las credenciales de la BD con herramientas externas no confiables.
- Preferí usuarios de BD con permisos de solo lectura (`SELECT`) para el BI.
- El dashboard admin interno (`/dashboard`) ya cubre las métricas operativas diarias; el BI es para análisis profundo.
