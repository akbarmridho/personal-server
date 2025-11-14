# PostgREST API Client Usage Guide

## Overview

This API client provides a type-safe wrapper around PostgREST endpoints with proper TypeScript types and error handling.

## Configuration

Set the API base URL in your `.env` file:

```env
VITE_API_URL=http://localhost:3000/api
```

## Basic Usage

```typescript
import { api } from '@/lib/api';

// All API calls return properly typed responses
const categories = await api.categories.list();
const products = await api.products.list();
```

## API Modules

### Categories API

```typescript
// List all categories
const categories = await api.categories.list();

// Get single category
const category = await api.categories.getById(1);

// Create category
const newCategory = await api.categories.create({
  name: 'Elektronik',
  description: 'Produk elektronik',
});

// Update category
const updated = await api.categories.update(1, {
  name: 'Elektronik Updated',
});

// Delete category
await api.categories.delete(1);
```

### Products API

```typescript
// List all products with relations
const products = await api.products.list();
// Returns: ProductWithRelations[] (includes categories and variants)

// Get single product with relations
const product = await api.products.getById(1);

// Create product
const newProduct = await api.products.create({
  name: 'Laptop',
  category_id: 1,
  description: 'Laptop gaming',
});

// Update product
const updated = await api.products.update(1, {
  name: 'Laptop Updated',
});

// Delete product (cascades to variants and activities)
await api.products.delete(1);
```

### Variants API

```typescript
// List all variants
const variants = await api.variants.list();

// List variants for specific product
const productVariants = await api.variants.list(1);

// Get single variant
const variant = await api.variants.getById(1);

// Create variant
const newVariant = await api.variants.create({
  product_id: 1,
  name: 'Merah',
  cost_price: 100000,
  sell_price: 150000,
  stock: 10,
});

// Update variant (stock cannot be updated directly)
const updated = await api.variants.update(1, {
  name: 'Merah Muda',
  cost_price: 110000,
  sell_price: 160000,
});

// Delete variant
await api.variants.delete(1);
```

### Transactions API

```typescript
// List all transactions
const transactions = await api.transactions.list();

// Get single transaction
const transaction = await api.transactions.getById(1);

// Create transaction
const newTransaction = await api.transactions.create({
  notes: 'Penjualan hari ini',
});
```

### Activities API

```typescript
// List all activities with transaction relations
const activities = await api.activities.list();

// Get single activity
const activity = await api.activities.getById(1);

// Create single activity
const newActivity = await api.activities.create({
  transaction_id: 1,
  product_id: 1,
  variant_id: 1,
  category_id: 1,
  product_name: 'Laptop',
  variant_name: 'Merah',
  type: 'Sales',
  quantity: 2,
  unit_cost: 100000,
  unit_revenue: 150000,
  notes: 'Penjualan ke customer A',
});

// Create multiple activities (batch)
const activities = await api.activities.createBatch([
  {
    transaction_id: 1,
    product_id: 1,
    variant_id: 1,
    category_id: 1,
    product_name: 'Laptop',
    variant_name: 'Merah',
    type: 'Sales',
    quantity: 2,
    unit_cost: 100000,
    unit_revenue: 150000,
  },
  {
    transaction_id: 1,
    product_id: 2,
    variant_id: 3,
    category_id: 1,
    product_name: 'Mouse',
    variant_name: 'Hitam',
    type: 'Sales',
    quantity: 1,
    unit_cost: 50000,
    unit_revenue: 75000,
  },
]);
```

### Analytics API

All analytics functions require date ranges in `YYYY-MM-DD` format and handle Asia/Jakarta timezone automatically.

```typescript
// Get dashboard metrics
const metrics = await api.analytics.getDashboardMetrics(
  '2024-01-01', // start_date
  '2024-01-31', // end_date
  true, // include_today
  true, // include_month_to_date
);
// Returns: DashboardMetrics

// Get sales trends
const trends = await api.analytics.getSalesTrends(
  '2024-01-01',
  '2024-01-31',
);
// Returns: SalesTrend[]

// Get top products
const topProducts = await api.analytics.getTopProducts(
  '2024-01-01',
  '2024-01-31',
  10, // limit
);
// Returns: TopProduct[]

// Get category performance
const categoryPerf = await api.analytics.getCategoryPerformance(
  '2024-01-01',
  '2024-01-31',
);
// Returns: CategoryPerformance[]

// Get low stock alerts
const lowStock = await api.analytics.getLowStockAlerts(10); // threshold
// Returns: LowStockAlert[]

// Get financial analytics
const financial = await api.analytics.getFinancialAnalytics(
  '2024-01-01',
  '2024-01-31',
);
// Returns: FinancialAnalytics[]
```

## Error Handling

All API calls throw `APIError` on failure:

```typescript
import { api, APIError } from '@/lib/api';

try {
  const category = await api.categories.getById(999);
} catch (error) {
  if (error instanceof APIError) {
    console.error('Status:', error.status);
    console.error('Message:', error.message);
    console.error('Details:', error.details);
  }
}
```

## Integration with TanStack Query

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// Query example
const { data: categories, isLoading } = useQuery({
  queryKey: ['categories'],
  queryFn: api.categories.list,
});

// Mutation example
const queryClient = useQueryClient();
const createCategory = useMutation({
  mutationFn: api.categories.create,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['categories'] });
  },
});

// Usage
createCategory.mutate({
  name: 'Kategori Baru',
  description: 'Deskripsi',
});
```

## Validation

Use Zod schemas from `@/lib/validations.ts`:

```typescript
import { categorySchema } from '@/lib/validations';

const result = categorySchema.safeParse({
  name: 'Elektronik',
  description: 'Produk elektronik',
});

if (result.success) {
  await api.categories.create(result.data);
} else {
  console.error(result.error.errors);
}
```

## Activity Types

The system supports 4 activity types:

- `Restock`: Increase stock (restocking inventory)
- `Sales`: Decrease stock (selling products)
- `Refund`: Increase stock (returning sold items)
- `Adjustment`: Increase stock (manual adjustments)

## Important Notes

1. **Stock Management**: Stock cannot be updated directly on variants. All stock changes must go through the activities API.

2. **Timezone**: All date parameters are handled in Asia/Jakarta timezone (GMT+7) by the backend RPC functions.

3. **Cascading Deletes**: 
   - Deleting a product cascades to its variants and activities
   - Deleting a transaction cascades to its activities
   - Categories cannot be deleted if they have products

4. **Batch Operations**: Use `createBatch` for creating multiple activities in a single transaction.

5. **Relations**: Products and activities automatically include related data when using `list()` or `getById()`.
