import type {
  CategoryPerformance,
  DashboardMetrics,
  FinancialAnalytics,
  LowStockAlert,
  PaginatedResponse,
  PostgRESTError,
  QueryParams,
  SalesTrend,
  TopProduct,
} from "@/types/api";
import type {
  CreateProduct,
  CreateProductActivity,
  CreateProductCategory,
  CreateProductVariant,
  CreateTransaction,
  Product,
  ProductActivity,
  ProductActivityWithRelations,
  ProductCategory,
  ProductVariant,
  ProductWithRelations,
  Transaction,
  UpdateProduct,
  UpdateProductCategory,
  UpdateProductVariant,
} from "@/types/database";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: string,
  ) {
    super(message);
    this.name = "APIError";
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error: PostgRESTError = await response.json().catch(() => ({
      message: "Terjadi kesalahan pada server",
      details: null,
      hint: null,
      code: "UNKNOWN",
    }));

    throw new APIError(
      error.message || "Terjadi kesalahan pada server",
      response.status,
      error.details || undefined,
    );
  }

  const text = await response.text();
  return text ? JSON.parse(text) : (null as T);
}

// Categories API
export const categoriesAPI = {
  list: async (
    params?: QueryParams,
  ): Promise<PaginatedResponse<ProductCategory>> => {
    const searchParams = new URLSearchParams();

    // Add select with product count and ordering
    searchParams.set("select", "*,products(count)");

    // Add sorting
    if (params?.sort) {
      searchParams.set(
        "order",
        `${params.sort.column}.${params.sort.direction}`,
      );
    } else {
      searchParams.set("order", "name.asc");
    }

    // Add filtering
    if (params?.filter?.search) {
      searchParams.set("name", `ilike.*${params.filter.search}*`);
    }

    // Add pagination
    const pageSize = params?.pageSize || 10;
    const page = params?.page || 1;
    searchParams.set("limit", String(pageSize));
    searchParams.set("offset", String((page - 1) * pageSize));

    // Add count for pagination info
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Prefer: "count=exact",
    };

    const response = await fetch(
      `${API_BASE}/product_categories?${searchParams}`,
      {
        headers,
      },
    );

    const data = await handleResponse<ProductCategory[]>(response);
    const contentRange = response.headers.get("content-range");
    const totalCount = parseInt(contentRange?.split("/")[1] || "0", 10);

    return {
      data,
      totalCount,
      currentPage: page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
    };
  },

  getById: async (id: number): Promise<ProductCategory> => {
    const response = await fetch(`${API_BASE}/product_categories?id=eq.${id}`, {
      headers: { "Content-Type": "application/json" },
    });
    const data = await handleResponse<ProductCategory[]>(response);
    if (!data.length) throw new APIError("Kategori tidak ditemukan", 404);
    return data[0];
  },

  create: async (data: CreateProductCategory): Promise<ProductCategory> => {
    const response = await fetch(`${API_BASE}/product_categories`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(data),
    });
    const result = await handleResponse<ProductCategory[]>(response);
    return result[0];
  },

  update: async (
    id: number,
    data: UpdateProductCategory,
  ): Promise<ProductCategory> => {
    const response = await fetch(`${API_BASE}/product_categories?id=eq.${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(data),
    });
    const result = await handleResponse<ProductCategory[]>(response);
    return result[0];
  },

  delete: async (id: number): Promise<void> => {
    const response = await fetch(`${API_BASE}/product_categories?id=eq.${id}`, {
      method: "DELETE",
    });
    await handleResponse<void>(response);
  },
};

// Products API
export const productsAPI = {
  list: async (
    params?: QueryParams,
  ): Promise<PaginatedResponse<ProductWithRelations>> => {
    const searchParams = new URLSearchParams();

    // Add select with relations
    searchParams.set("select", "*,product_categories(*),product_variants(*)");

    // Add sorting
    if (params?.sort) {
      searchParams.set(
        "order",
        `${params.sort.column}.${params.sort.direction}`,
      );
    } else {
      searchParams.set("order", "name.asc");
    }

    // Add filtering
    if (params?.filter?.search) {
      // Search across product name and category name
      searchParams.set(
        "or",
        `(name.ilike.*${params.filter.search}*,product_categories.name.ilike.*${params.filter.search}*)`,
      );
    }

    if (params?.filter?.categoryIds && params.filter.categoryIds.length > 0) {
      searchParams.set(
        "category_id",
        `in.(${params.filter.categoryIds.join(",")})`,
      );
    }

    // Stock level filtering
    if (params?.filter?.stockLevel) {
      switch (params.filter.stockLevel) {
        case "out":
          searchParams.set("product_variants.stock", "eq.0");
          break;
        case "low":
          searchParams.set("product_variants.stock", "lt.10");
          searchParams.set("product_variants.stock", "gt.0");
          break;
        case "normal":
          searchParams.set("product_variants.stock", "gte.10");
          break;
      }
    }

    // Price range filtering
    if (params?.filter?.priceRange) {
      if (params.filter.priceRange.min) {
        searchParams.set(
          "product_variants.sell_price",
          `gte.${params.filter.priceRange.min}`,
        );
      }
      if (params.filter.priceRange.max) {
        searchParams.set(
          "product_variants.sell_price",
          `lte.${params.filter.priceRange.max}`,
        );
      }
    }

    // Add pagination
    const pageSize = params?.pageSize || 10;
    const page = params?.page || 1;
    searchParams.set("limit", String(pageSize));
    searchParams.set("offset", String((page - 1) * pageSize));

    // Add count for pagination info
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Prefer: "count=exact",
    };

    const response = await fetch(`${API_BASE}/products?${searchParams}`, {
      headers,
    });

    const data = await handleResponse<ProductWithRelations[]>(response);
    const totalCount = parseInt(
      response.headers.get("content-range")?.split("/")[1] || "0",
      10,
    );

    return {
      data,
      totalCount,
      currentPage: page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
    };
  },

  getById: async (id: number): Promise<ProductWithRelations> => {
    const response = await fetch(
      `${API_BASE}/products?id=eq.${id}&select=*,product_categories(*),product_variants(*)`,
      {
        headers: { "Content-Type": "application/json" },
      },
    );
    const data = await handleResponse<ProductWithRelations[]>(response);
    if (!data.length) throw new APIError("Produk tidak ditemukan", 404);
    return data[0];
  },

  create: async (data: CreateProduct): Promise<Product> => {
    const response = await fetch(`${API_BASE}/products`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(data),
    });
    const result = await handleResponse<Product[]>(response);
    return result[0];
  },

  update: async (id: number, data: UpdateProduct): Promise<Product> => {
    const response = await fetch(`${API_BASE}/products?id=eq.${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(data),
    });
    const result = await handleResponse<Product[]>(response);
    return result[0];
  },

  delete: async (id: number): Promise<void> => {
    const response = await fetch(`${API_BASE}/products?id=eq.${id}`, {
      method: "DELETE",
    });
    await handleResponse<void>(response);
  },
};

// Product Variants API
export const variantsAPI = {
  list: async (productId?: number): Promise<ProductVariant[]> => {
    const url = productId
      ? `${API_BASE}/product_variants?product_id=eq.${productId}&order=name.asc`
      : `${API_BASE}/product_variants?order=name.asc`;
    const response = await fetch(url, {
      headers: { "Content-Type": "application/json" },
    });
    return handleResponse<ProductVariant[]>(response);
  },

  getById: async (id: number): Promise<ProductVariant> => {
    const response = await fetch(`${API_BASE}/product_variants?id=eq.${id}`, {
      headers: { "Content-Type": "application/json" },
    });
    const data = await handleResponse<ProductVariant[]>(response);
    if (!data.length) throw new APIError("Varian tidak ditemukan", 404);
    return data[0];
  },

  create: async (data: CreateProductVariant): Promise<ProductVariant> => {
    const response = await fetch(`${API_BASE}/product_variants`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(data),
    });
    const result = await handleResponse<ProductVariant[]>(response);
    return result[0];
  },

  update: async (
    id: number,
    data: UpdateProductVariant,
  ): Promise<ProductVariant> => {
    const response = await fetch(`${API_BASE}/product_variants?id=eq.${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(data),
    });
    const result = await handleResponse<ProductVariant[]>(response);
    return result[0];
  },

  delete: async (id: number): Promise<void> => {
    const response = await fetch(`${API_BASE}/product_variants?id=eq.${id}`, {
      method: "DELETE",
    });
    await handleResponse<void>(response);
  },
};

// Transactions API
export const transactionsAPI = {
  list: async (): Promise<Transaction[]> => {
    const response = await fetch(
      `${API_BASE}/transactions?order=created_at.desc`,
      {
        headers: { "Content-Type": "application/json" },
      },
    );
    return handleResponse<Transaction[]>(response);
  },

  getById: async (id: number): Promise<Transaction> => {
    const response = await fetch(`${API_BASE}/transactions?id=eq.${id}`, {
      headers: { "Content-Type": "application/json" },
    });
    const data = await handleResponse<Transaction[]>(response);
    if (!data.length) throw new APIError("Transaksi tidak ditemukan", 404);
    return data[0];
  },

  create: async (data: CreateTransaction): Promise<Transaction> => {
    const response = await fetch(`${API_BASE}/transactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(data),
    });
    const result = await handleResponse<Transaction[]>(response);
    return result[0];
  },
};

// Product Activities API
export const activitiesAPI = {
  list: async (
    params?: QueryParams,
  ): Promise<PaginatedResponse<ProductActivityWithRelations>> => {
    const searchParams = new URLSearchParams();

    // Add select with relations
    searchParams.set("select", "*,transactions(*)");

    // Add sorting
    if (params?.sort) {
      searchParams.set(
        "order",
        `${params.sort.column}.${params.sort.direction}`,
      );
    } else {
      searchParams.set("order", "created_at.desc");
    }

    // Add filtering
    if (params?.filter?.search) {
      // Search across product name and variant name
      searchParams.set(
        "or",
        `(product_name.ilike.*${params.filter.search}*,variant_name.ilike.*${params.filter.search}*)`,
      );
    }

    if (
      params?.filter?.activityTypes &&
      params.filter.activityTypes.length > 0
    ) {
      searchParams.set("type", `in.(${params.filter.activityTypes.join(",")})`);
    }

    // Date range filtering
    if (params?.filter?.dateRange) {
      searchParams.set("created_at", `gte.${params.filter.dateRange.start}`);
      searchParams.set("created_at", `lte.${params.filter.dateRange.end}`);
    }

    // Add pagination
    const pageSize = params?.pageSize || 20;
    const page = params?.page || 1;
    searchParams.set("limit", String(pageSize));
    searchParams.set("offset", String((page - 1) * pageSize));

    // Add count for pagination info
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Prefer: "count=exact",
    };

    const response = await fetch(
      `${API_BASE}/product_activities?${searchParams}`,
      {
        headers,
      },
    );

    const data = await handleResponse<ProductActivityWithRelations[]>(response);
    const totalCount = parseInt(
      response.headers.get("content-range")?.split("/")[1] || "0",
      10,
    );

    return {
      data,
      totalCount,
      currentPage: page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
    };
  },

  getById: async (id: number): Promise<ProductActivityWithRelations> => {
    const response = await fetch(
      `${API_BASE}/product_activities?id=eq.${id}&select=*,transactions(*)`,
      {
        headers: { "Content-Type": "application/json" },
      },
    );
    const data = await handleResponse<ProductActivityWithRelations[]>(response);
    if (!data.length) throw new APIError("Aktivitas tidak ditemukan", 404);
    return data[0];
  },

  create: async (data: CreateProductActivity): Promise<ProductActivity> => {
    const response = await fetch(`${API_BASE}/product_activities`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(data),
    });
    const result = await handleResponse<ProductActivity[]>(response);
    return result[0];
  },

  createBatch: async (
    activities: CreateProductActivity[],
  ): Promise<ProductActivity[]> => {
    const response = await fetch(`${API_BASE}/product_activities`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify(activities),
    });
    return handleResponse<ProductActivity[]>(response);
  },
};

// Analytics RPC Functions
export const analyticsAPI = {
  getDashboardMetrics: async (
    startDate?: string,
    endDate?: string,
    includeToday = true,
    includeMonthToDate = true,
  ): Promise<DashboardMetrics> => {
    const params = new URLSearchParams();
    if (startDate) params.append("start_date", startDate);
    if (endDate) params.append("end_date", endDate);
    params.append("include_today", String(includeToday));
    params.append("include_month_to_date", String(includeMonthToDate));

    const response = await fetch(
      `${API_BASE}/rpc/get_dashboard_metrics?${params}`,
      {
        headers: { "Content-Type": "application/json" },
      },
    );
    return handleResponse<DashboardMetrics>(response);
  },

  getSalesTrends: async (
    startDate: string,
    endDate: string,
  ): Promise<SalesTrend[]> => {
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate,
    });
    const response = await fetch(`${API_BASE}/rpc/get_sales_trends?${params}`, {
      headers: { "Content-Type": "application/json" },
    });
    return handleResponse<SalesTrend[]>(response);
  },

  getTopProducts: async (
    startDate: string,
    endDate: string,
    limit = 10,
  ): Promise<TopProduct[]> => {
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate,
      limit_count: String(limit),
    });
    const response = await fetch(`${API_BASE}/rpc/get_top_products?${params}`, {
      headers: { "Content-Type": "application/json" },
    });
    return handleResponse<TopProduct[]>(response);
  },

  getCategoryPerformance: async (
    startDate: string,
    endDate: string,
  ): Promise<CategoryPerformance[]> => {
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate,
    });
    const response = await fetch(
      `${API_BASE}/rpc/get_category_performance?${params}`,
      {
        headers: { "Content-Type": "application/json" },
      },
    );
    return handleResponse<CategoryPerformance[]>(response);
  },

  getLowStockAlerts: async (threshold = 10): Promise<LowStockAlert[]> => {
    const params = new URLSearchParams({ threshold: String(threshold) });
    const response = await fetch(
      `${API_BASE}/rpc/get_low_stock_alerts?${params}`,
      {
        headers: { "Content-Type": "application/json" },
      },
    );
    return handleResponse<LowStockAlert[]>(response);
  },

  getFinancialAnalytics: async (
    startDate: string,
    endDate: string,
  ): Promise<FinancialAnalytics[]> => {
    const params = new URLSearchParams({
      start_date: startDate,
      end_date: endDate,
    });
    const response = await fetch(
      `${API_BASE}/rpc/get_financial_analytics?${params}`,
      {
        headers: { "Content-Type": "application/json" },
      },
    );
    return handleResponse<FinancialAnalytics[]>(response);
  },
};

// Export unified API object
export const api = {
  categories: categoriesAPI,
  products: productsAPI,
  variants: variantsAPI,
  transactions: transactionsAPI,
  activities: activitiesAPI,
  analytics: analyticsAPI,
};

export { APIError };
