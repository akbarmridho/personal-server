// Database table types based on migrations

export type ActivityType = "Restock" | "Refund" | "Sales" | "Adjustment";

export interface ProductCategory {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  product_count?: number;
}

export interface Product {
  id: number;
  category_id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductVariant {
  id: number;
  product_id: number;
  name: string;
  description: string | null;
  cost_price: number;
  sell_price: number;
  stock: number;
  min_stock_level?: number;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: number;
  notes: string | null;
  created_at: string;
}

export interface ProductActivity {
  id: number;
  transaction_id: number | null;
  product_id: number | null;
  variant_id: number | null;
  category_id: number | null;
  product_name: string;
  variant_name: string;
  type: ActivityType;
  quantity: number;
  unit_cost: number;
  unit_revenue: number;
  cost_adjustment: number;
  revenue_adjustment: number;
  notes: string | null;
  created_at: string;
}

// Extended types with relations (matches products_with_total_stock view)
export interface ProductWithRelations extends Product {
  category_name?: string;
  category_description?: string | null;
  category_created_at?: string;
  category_updated_at?: string;
  product_variants?: ProductVariant[];
  total_stock: number;
}

export interface ProductActivityWithRelations extends ProductActivity {
  transactions?: Transaction;
}

// Form data types for create/update operations
export interface CreateProductCategory {
  name: string;
  description?: string;
}

export interface UpdateProductCategory {
  name?: string;
  description?: string;
}

export interface CreateProduct {
  category_id: number;
  name: string;
  description?: string;
}

export interface UpdateProduct {
  category_id?: number;
  name?: string;
  description?: string;
}

export interface CreateProductVariant {
  product_id: number;
  name: string;
  description?: string;
  cost_price: number;
  sell_price: number;
  stock?: number;
  min_stock_level?: number;
}

export interface UpdateProductVariant {
  name?: string;
  description?: string;
  cost_price?: number;
  sell_price?: number;
  min_stock_level?: number;
}

export interface CreateTransaction {
  notes?: string;
}

export interface CreateProductActivity {
  transaction_id?: number;
  product_id?: number;
  variant_id?: number;
  category_id?: number;
  product_name: string;
  variant_name: string;
  type: ActivityType;
  quantity: number;
  unit_cost: number;
  unit_revenue: number;
  cost_adjustment?: number;
  revenue_adjustment?: number;
  notes?: string;
}
