// API response types for RPC functions

export interface DashboardMetrics {
  total_products: number;
  total_categories: number;
  low_stock_items: number;
  total_transactions: number;
  total_refunded_transactions: number;
  total_sales: number;
  total_refunded: number;
  total_cost_of_sales: number;
  net_profit: number;
  total_sales_today: number;
  total_sales_period: number;
  query_start_date: string;
  query_end_date: string;
  timezone: string;
}

export interface SalesTrend {
  date: string;
  sales: number;
  transactions: number;
}

export interface TopProduct {
  product_id: number;
  product_name: string;
  category_name: string;
  total_sales: number;
  total_quantity: number;
  revenue: number;
}

export interface CategoryPerformance {
  category_id: number;
  category_name: string;
  total_sales: number;
  revenue: number;
  product_count: number;
}

export interface LowStockAlert {
  variant_id: number;
  product_name: string;
  variant_name: string;
  current_stock: number;
  min_stock_level: number;
  category_name: string;
}

export interface FinancialAnalytics {
  date: string;
  revenue: number;
  cost: number;
  profit: number;
  transactions: number;
}

// PostgREST error response
export interface PostgRESTError {
  message: string;
  details: string | null;
  hint: string | null;
  code: string;
}
