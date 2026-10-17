export type RoleSlug = "admin" | "sales" | "stock_manager" | "accountant" | "customer";

export const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  sales: "Vendedor",
  stock_manager: "Almacén",
  accountant: "Caja",
  customer: "Cliente",
};

export function roleLabel(role: string | null | undefined): string {
  if (!role) return "—";
  return ROLE_LABELS[role] || role;
}

const ALL_PERMISSIONS = [
  "dashboard.read",
  "products.read",
  "products.write",
  "products.delete",
  "products.cost",
  "categories.read",
  "categories.write",
  "brands.read",
  "brands.write",
  "inventory.read",
  "inventory.write",
  "purchases.read",
  "purchases.write",
  "suppliers.read",
  "suppliers.write",
  "sales.read",
  "sales.write",
  "sales.void",
  "orders.read",
  "orders.write",
  "customers.read",
  "customers.write",
  "returns.read",
  "returns.write",
  "cash.read",
  "cash.write",
  "receivables.read",
  "receivables.write",
  "reports.read",
  "reports.profit",
  "users.read",
  "users.write",
  "roles.write",
  "settings.write",
  "audit.read",
  "notifications.read",
  "notifications.write",
] as const;

export type Permission = (typeof ALL_PERMISSIONS)[number];

const MATRIX: Record<RoleSlug, Permission[]> = {
  admin: [...ALL_PERMISSIONS],
  sales: [
    "dashboard.read",
    "products.read",
    "categories.read",
    "brands.read",
    "sales.read",
    "sales.write",
    "orders.read",
    "orders.write",
    "customers.read",
    "customers.write",
    "returns.read",
    "returns.write",
    "notifications.read",
  ],
  stock_manager: [
    "dashboard.read",
    "products.read",
    "products.write",
    "products.cost",
    "categories.read",
    "categories.write",
    "brands.read",
    "brands.write",
    "inventory.read",
    "inventory.write",
    "purchases.read",
    "purchases.write",
    "suppliers.read",
    "suppliers.write",
    "orders.read",
    "returns.read",
    "notifications.read",
  ],
  accountant: [
    "dashboard.read",
    "products.read",
    "categories.read",
    "brands.read",
    "sales.read",
    "sales.write",
    "sales.void",
    "orders.read",
    "customers.read",
    "customers.write",
    "returns.read",
    "cash.read",
    "cash.write",
    "receivables.read",
    "receivables.write",
    "notifications.read",
  ],
  customer: ["notifications.read"],
};

export type SensitiveField = "inventoryValue" | "profit" | "cashBalance" | "productCost" | "receivables";

const SENSITIVE: Record<SensitiveField, RoleSlug[]> = {
  inventoryValue: ["admin", "stock_manager"],
  profit: ["admin"],
  cashBalance: ["admin", "accountant"],
  productCost: ["admin", "stock_manager"],
  receivables: ["admin", "accountant"],
};

export const ERP_ROLES: RoleSlug[] = ["admin", "sales", "stock_manager", "accountant"];

export function isErpRole(role: string | null | undefined): boolean {
  return ERP_ROLES.includes((role || "") as RoleSlug);
}

export function can(role: string | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  const perms = MATRIX[role as RoleSlug];
  if (!perms) return false;
  return perms.includes(permission);
}

export function canAny(role: string | null | undefined, permissions: Permission[]): boolean {
  return permissions.some((p) => can(role, p));
}

export function canView(role: string | null | undefined, field: SensitiveField): boolean {
  if (!role) return false;
  return SENSITIVE[field].includes(role as RoleSlug);
}

export function permissionsFor(role: string | null | undefined): Permission[] {
  if (!role) return [];
  return MATRIX[role as RoleSlug] || [];
}
