export const WHATSAPP_NUMBER = "595985231090";
export const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER}`;
export const WHATSAPP_DEFAULT_MESSAGE = "Hola, quiero consultar sobre un producto de AutoShopping";

export const AUTH_ROLES_ADMIN = ["admin"] as const;
export const AUTH_ROLES_STOCK = ["admin", "stock_manager"] as const;
export const AUTH_ROLES_CASH = ["admin", "accountant"] as const;
export const AUTH_ROLES_SALES_READ = ["admin", "sales", "accountant"] as const;
export const AUTH_ROLES_SALES_WRITE = ["admin", "sales"] as const;
export const AUTH_ROLES_CUSTOMERS = ["admin", "sales", "accountant"] as const;
export const AUTH_ROLES_ERP = ["admin", "sales", "stock_manager", "accountant"] as const;
export const AUTH_ROLES_RETURNS = ["admin", "sales", "stock_manager", "accountant"] as const;
