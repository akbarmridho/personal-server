import { z } from "zod/v3";

// Category validation schemas
export const categorySchema = z.object({
  name: z
    .string()
    .min(1, "Nama kategori wajib diisi")
    .max(255, "Nama terlalu panjang"),
  description: z.string().optional(),
});

export const updateCategorySchema = z.object({
  name: z
    .string()
    .min(1, "Nama kategori wajib diisi")
    .max(255, "Nama terlalu panjang")
    .optional(),
  description: z.string().optional(),
});

// Product validation schemas
export const productSchema = z.object({
  name: z
    .string()
    .min(1, "Nama produk wajib diisi")
    .max(255, "Nama terlalu panjang"),
  category_id: z.number().int().positive("Kategori wajib dipilih"),
  description: z.string().optional(),
});

export const updateProductSchema = z.object({
  name: z
    .string()
    .min(1, "Nama produk wajib diisi")
    .max(255, "Nama terlalu panjang")
    .optional(),
  category_id: z.number().int().positive("Kategori wajib dipilih").optional(),
  description: z.string().optional(),
});

// Product variant validation schemas
export const variantSchema = z.object({
  id: z.number().int().positive().optional(), // Include ID for existing variants
  name: z
    .string()
    .min(1, "Nama varian wajib diisi")
    .max(255, "Nama terlalu panjang"),
  description: z.string().optional(),
  cost_price: z.number().int().min(0, "Harga modal tidak boleh negatif"),
  sell_price: z.number().int().min(0, "Harga jual tidak boleh negatif"),
  stock: z.number().int().min(0, "Stok tidak boleh negatif").optional(),
});

export const updateVariantSchema = z.object({
  name: z
    .string()
    .min(1, "Nama varian wajib diisi")
    .max(255, "Nama terlalu panjang")
    .optional(),
  description: z.string().optional(),
  cost_price: z
    .number()
    .int()
    .min(0, "Harga modal tidak boleh negatif")
    .optional(),
  sell_price: z
    .number()
    .int()
    .min(0, "Harga jual tidak boleh negatif")
    .optional(),
});

// Product with variants validation schema
export const productWithVariantsSchema = z.object({
  name: z
    .string()
    .min(1, "Nama produk wajib diisi")
    .max(255, "Nama terlalu panjang"),
  category_id: z.number().int().positive("Kategori wajib dipilih"),
  description: z.string().optional(),
  variants: z
    .array(variantSchema)
    .min(1, "Minimal satu varian diperlukan")
    .refine(
      (variants) => {
        const names = variants.map((v) => v.name.toLowerCase());
        return names.length === new Set(names).size;
      },
      { message: "Nama varian harus unik" },
    ),
});

// Transaction validation schema
export const transactionSchema = z.object({
  notes: z.string().optional(),
});

// Activity validation schemas
const activityTypeEnum = z.enum([
  "Restock",
  "Refund",
  "Sales",
  "Adjustment",
] as const);

export const activitySchema = z.object({
  transaction_id: z.number().int().positive().optional(),
  product_id: z.number().int().positive().optional(),
  variant_id: z.number().int().positive().optional(),
  category_id: z.number().int().positive().optional(),
  product_name: z.string().min(1, "Nama produk wajib diisi"),
  variant_name: z.string().min(1, "Nama varian wajib diisi"),
  type: activityTypeEnum,
  quantity: z.number().int().min(1, "Kuantitas minimal 1"),
  unit_cost: z.number().int().min(0, "Harga modal tidak boleh negatif"),
  unit_revenue: z.number().int().min(0, "Harga jual tidak boleh negatif"),
  cost_adjustment: z.number().int().default(0),
  revenue_adjustment: z.number().int().default(0),
  notes: z.string().optional(),
});

// Activity form schemas for different types
export const restockActivitySchema = z.object({
  variant_id: z.number().int().positive("Varian wajib dipilih"),
  quantity: z.number().int().min(1, "Kuantitas minimal 1"),
  unit_cost: z.number().int().min(0, "Harga modal tidak boleh negatif"),
  notes: z.string().optional(),
});

export const salesActivitySchema = z.object({
  variant_id: z.number().int().positive("Varian wajib dipilih"),
  quantity: z.number().int().min(1, "Kuantitas minimal 1"),
  unit_revenue: z.number().int().min(0, "Harga jual tidak boleh negatif"),
  unit_cost: z.number().int().min(0, "Harga modal tidak boleh negatif"),
  notes: z.string().optional(),
});

export const adjustmentActivitySchema = z.object({
  variant_id: z.number().int().positive("Varian wajib dipilih"),
  quantity: z.number().int().min(1, "Kuantitas minimal 1"),
  unit_cost: z.number().int().min(0, "Harga modal tidak boleh negatif"),
  notes: z.string().optional(),
});

// Transaction with activities schema
export const transactionWithActivitiesSchema = z.object({
  notes: z.string().optional(),
  activities: z
    .array(
      z.object({
        variant_id: z.number().int().positive("Varian wajib dipilih"),
        quantity: z.number().int().min(1, "Kuantitas minimal 1"),
        unit_cost: z.number().int().min(0, "Harga modal tidak boleh negatif"),
        unit_revenue: z.number().int().min(0, "Harga jual tidak boleh negatif"),
        revenue_adjustment: z.number().int().default(0),
      }),
    )
    .min(1, "Minimal satu item diperlukan"),
});

// Refund schema
export const refundSchema = z.object({
  original_activity_id: z
    .number()
    .int()
    .positive("Aktivitas asli wajib dipilih"),
  quantity: z.number().int().min(1, "Kuantitas minimal 1"),
  notes: z.string().min(1, "Alasan refund wajib diisi"),
});

// Type exports
export type CategoryFormData = z.infer<typeof categorySchema>;
export type UpdateCategoryFormData = z.infer<typeof updateCategorySchema>;
export type ProductFormData = z.infer<typeof productSchema>;
export type UpdateProductFormData = z.infer<typeof updateProductSchema>;
export type VariantFormData = z.infer<typeof variantSchema>;
export type UpdateVariantFormData = z.infer<typeof updateVariantSchema>;
export type ProductWithVariantsFormData = z.infer<
  typeof productWithVariantsSchema
>;
export type TransactionFormData = z.infer<typeof transactionSchema>;
export type ActivityFormData = z.infer<typeof activitySchema>;
export type RestockActivityFormData = z.infer<typeof restockActivitySchema>;
export type SalesActivityFormData = z.infer<typeof salesActivitySchema>;
export type AdjustmentActivityFormData = z.infer<
  typeof adjustmentActivitySchema
>;
export type TransactionWithActivitiesFormData = z.infer<
  typeof transactionWithActivitiesSchema
>;
export type RefundFormData = z.infer<typeof refundSchema>;
