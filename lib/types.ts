export interface Product {
  id: string;
  name: string;
  slug: string;
  brand: string;
  category: string;
  categoryName?: string;
  price: number;
  comparePrice?: number;
  currency: string;
  stock: number;
  sku: string;
  manufacturerCode?: string;
  description: string;
  shortDescription: string;
  images: string[];
  tags?: string[];
  specs?: { name: string; value: string }[];
  rating: number;
  reviews: number;
  featured: boolean;
  isNew: boolean;
  weight?: number;
  createdAt: string;
  sold: number;
}

export interface CartItem {
  productId: string;
  quantity: number;
  addedAt: string;
  product?: {
    name: string;
    price: number;
    comparePrice?: number;
    stock: number;
    slug: string;
    image: string | null;
  };
}

export interface Order {
  id: string;
  orderNumber: string;
  items: {
    productId: string;
    productName: string;
    productSku: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  status: string;
  paymentMethod?: string;
  paymentStatus?: string;
  customer: { name: string; email: string; phone: string; address: string; city?: string };
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  customerCity: string;
  notes?: string;
  createdAt: string;
}

export interface SalesComparison {
  today: number;
  yesterday: number;
  changeToday: number;
  week: number;
  lastWeek: number;
  changeWeek: number;
  month: number;
  lastMonth: number;
  changeMonth: number;
  total: number;
}

export interface OrderStatusBreakdown {
  pending: number;
  confirmed: number;
  preparing: number;
  shipped: number;
  delivered: number;
  cancelled: number;
}

export interface CustomerMetrics {
  total: number;
  newThisMonth: number;
  frequent: number;
  guestCheckouts: number;
  averagePurchase: number;
}

export interface ProductMetrics {
  total: number;
  active: number;
  outOfStock: number;
  lowStock: number;
  topProducts: { productId: string; name: string; sold: number; revenue: number }[];
}

export interface InventoryMetrics {
  totalValue: number;
  totalUnits: number;
  highRotation: { id: string; name: string; sold: number; stock: number }[];
  noMovement: { id: string; name: string; stock: number; updatedAt: string }[];
}

export interface ActivityItem {
  id: string;
  type: "order" | "product" | "stock" | "payment" | "status" | "user";
  description: string;
  userName: string;
  createdAt: string;
}

export interface AlertItem {
  id: string;
  type: "danger" | "warning" | "info" | "success";
  message: string;
  count?: number;
  link?: string;
}

export interface DashboardStats {
  salesToday: number;
  salesWeek: number;
  salesMonth: number;
  salesComparison: SalesComparison;
  ordersToday: number;
  ordersWeek: number;
  ordersMonth: number;
  ordersByStatus: OrderStatusBreakdown;
  totalProducts: number;
  totalCustomers: number;
  customerMetrics: CustomerMetrics;
  productMetrics: ProductMetrics;
  inventoryMetrics: InventoryMetrics;
  topProducts: { productId: string; name: string; sold: number; revenue: number }[];
  lowStock: { id: string; name: string; stock: number; sku: string }[];
  recentOrders: Order[];
  salesByDay: { date: string; total: number }[];
  salesByWeek: { week: string; total: number }[];
  salesByMonth: { month: string; total: number }[];
  categorySales: { name: string; sold: number; revenue: number }[];
  brandSales: { name: string; sold: number; revenue: number }[];
  customerGrowth: { month: string; count: number }[];
  recentActivity: ActivityItem[];
  alerts: AlertItem[];
  averageTicket: number;
}

export interface SearchResult {
  products: Product[];
  total: number;
  query: string;
  took: number;
}
