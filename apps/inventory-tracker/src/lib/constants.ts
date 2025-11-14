export const APP_NAME = "Inventory Tracker";

export const ROUTES = {
  DASHBOARD: "/",
  CATEGORIES: "/categories",
  PRODUCTS: "/products",
  ACTIVITIES: "/activities",
} as const;

export const ACTIVITY_TYPES = {
  RESTOCK: "Restock",
  SALES: "Sales",
  REFUND: "Refund",
  ADJUSTMENT: "Adjustment",
} as const;

export const ACTIVITY_TYPE_LABELS = {
  Restock: "Restock",
  Sales: "Penjualan",
  Refund: "Refund",
  Adjustment: "Penyesuaian",
} as const;

export const DATE_FILTERS = {
  DAILY: "daily",
  WEEKLY: "weekly",
  MONTHLY: "monthly",
  CUSTOM: "custom",
} as const;

export const DATE_FILTER_LABELS = {
  daily: "Harian",
  weekly: "Mingguan",
  monthly: "Bulanan",
  custom: "Kustom",
} as const;

export const LOW_STOCK_THRESHOLD = 10;

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
} as const;
