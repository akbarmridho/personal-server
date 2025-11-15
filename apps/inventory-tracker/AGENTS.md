# Inventory Tracker - AI Agent Development Guide

Essential guidance for AI agents working on the Inventory Tracker project.

## Project Overview

Business inventory management system for Indonesian business owners with:

- **Language**: All UI text in Indonesian
- **Timezone**: **CRITICAL** - All date/time operations use Asia/Jakarta (GMT+7)
- **Currency**: Indonesian Rupiah (IDR)
- **Deployment**: Single-user system with API gateway authentication

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui (use shadcn MCP when available)
- **Routing**: TanStack Router
- **State**: TanStack Query + React Context
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts v2 + shadcn chart components
- **Date**: dayjs with Asia/Jakarta timezone
- **Backend**: PostgREST API + PostgreSQL
- **Package Manager**: pnpm
- **Linting**: BiomeJS (exclusively)

## Project Structure

```
src/
├── components/           # UI components
│   ├── ui/              # shadcn/ui base components
│   ├── forms/           # Form components
│   ├── charts/          # Chart components
│   ├── layout/          # Layout components
│   ├── categories/      # Category components
│   ├── products/        # Product components
│   ├── activities/      # Activity components
│   └── dashboard/       # Dashboard components
├── routes/              # TanStack Router routes
├── hooks/               # Custom React hooks
├── lib/                 # Utility libraries
├── types/               # TypeScript types
├── contexts/            # React Context providers
└── styles/              # Global styles
```

## Application Sections

1. **Analytics Dashboard** - Overview and metrics
2. **Category Management** - Product categorization
3. **Product Management** - Core inventory management
4. **Activity History** - Transaction tracking

## Database Schema

### Core Tables

- **product_categories**: Product categorization (can't delete if containing products)
- **products**: Core product info (must belong to category, can have variants)
- **product_variants**: Product variants with pricing/stock (auto-managed via triggers)
- **transactions**: Groups related activities for sales tracking
- **product_activities**: Records all inventory movements (Restock, Sales, Refund, Adjustment)

### Critical Features

1. **Automatic Stock Management**: Database triggers handle all stock updates
2. **Asia/Jakarta Timezone**: All date/time calculations use Asia/Jakarta
3. **Audit Trail**: All activities recorded permanently, cannot be deleted

## API Integration

### PostgREST Endpoints

```typescript
// Categories
GET/POST/PATCH/DELETE /product_categories

// Products with variants
GET /products?select=*,product_categories(*),product_variants(*)
POST/PATCH/DELETE /products

// Activities and transactions
GET /product_activities?select=*,transactions(*)&order=created_at.desc
POST /product_activities
POST /transactions

// Analytics (RPC functions)
GET /rpc/get_dashboard_metrics
GET /rpc/get_sales_trends?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
GET /rpc/get_financial_analytics?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
GET /rpc/get_top_products?limit=10
GET /rpc/get_category_performance?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
GET /rpc/get_low_stock_alerts?threshold=10
```

### Server-Side Data Handling (CRITICAL)

All sorting, filtering, and pagination MUST be server-side via PostgREST parameters:

```typescript
// ✅ CORRECT: Server-side operations
const fetchProducts = async (page, pageSize, sort, filter) => {
  const params = new URLSearchParams({
    select: '*,product_categories(*),product_variants(*)',
    order: sort, // 'name.asc' or 'created_at.desc'
    limit: pageSize.toString(),
    offset: ((page - 1) * pageSize).toString(),
  });
  
  if (filter) params.append('name', `ilike.*${filter}*`);
  
  return fetch(`${API_BASE}/products?${params}`).then(r => r.json());
};

// ❌ WRONG: Client-side sorting/filtering/pagination
// Never fetch all data and process in frontend
```

#### PostgREST Parameters

- **Sorting**: `?order=column.asc` or `?order=column.desc`
- **Filtering**: `?column=eq.value` or `?column=ilike.*value*`
- **Pagination**: `?limit=10&offset=20`
- **Nested Selection**: `?select=*,related_table(*)`

#### TanStack Query Pattern

```typescript
export const useProducts = (page = 1, pageSize = 10, sort = 'name.asc', filter = '') => {
  return useQuery({
    queryKey: ['products', page, pageSize, sort, filter],
    queryFn: () => fetchProducts(page, pageSize, sort, filter),
    staleTime: 30000,
  });
};
```

## Component Development

### shadcn MCP Components (PREFERRED)

Always use shadcn MCP instead of creating custom components:

```bash
npx shadcn@latest add button input select table dialog form card badge alert tabs label
```

#### Component Workflow

1. Check if component exists in shadcn/ui registry using MCP
2. Add component using shadcn MCP
3. Only create custom components when absolutely necessary
4. Follow shadcn patterns for any custom components

#### Custom Hooks Pattern

```typescript
export const useCategories = () => {
  const queryClient = useQueryClient();
  
  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: api.categories.list,
  });
  
  const createCategory = useMutation({
    mutationFn: api.categories.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Kategori berhasil ditambahkan');
    },
  });
  
  return {
    categories: categoriesQuery.data || [],
    isLoading: categoriesQuery.isLoading,
    createCategory: createCategory.mutate,
    isCreating: createCategory.isPending,
  };
};
```

### Form Validation with Zod

```typescript
export const categorySchema = z.object({
  name: z.string().min(1, 'Nama kategori wajib diisi'),
  description: z.string().optional(),
});

export const productSchema = z.object({
  name: z.string().min(1, 'Nama produk wajib diisi'),
  category_id: z.number().min(1, 'Kategori wajib dipilih'),
  description: z.string().optional(),
  variants: z.array(z.object({
    name: z.string().min(1, 'Nama varian wajib diisi'),
    description: z.string().optional(),
    cost_price: z.number().min(0, 'Harga Modal harus positif'),
    sell_price: z.number().min(0, 'Harga jual harus positif'),
    stock: z.number().min(0, 'Stok harus positif').optional(),
  })).min(1, 'Minimal satu varian diperlukan'),
});
```

## Critical Development Rules

### 1. Timezone Handling (CRITICAL)

```typescript
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import 'dayjs/locale/id';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale('id');
dayjs.tz.setDefault('Asia/Jakarta'); // CRITICAL

export const formatDate = (date) => dayjs(date).tz('Asia/Jakarta').format('DD MMM YYYY');
export const getCurrentDateJakarta = () => dayjs().tz('Asia/Jakarta');
```

### 2. Indonesian Language

All UI text must be in Indonesian throughout the application.

### 3. Stock Management

Stock can ONLY be changed through activities:

```typescript
// ✅ CORRECT: Create activity record
const activity = {
  type: 'Restock',
  variant_id: 1,
  quantity: 50,
  unit_cost: 10000,
  unit_revenue: 0,
};
// Database trigger automatically updates stock

// ❌ WRONG: Never update stock directly
// UPDATE product_variants SET stock = 100
```

### 4. Component Structure

Follow established patterns with Card, Dialog, and Form components.

### 5. Server-Side Data Operations (CRITICAL)

All sorting, filtering, pagination must be server-side (see API Integration section).

## Routing with TanStack Router

```typescript
// routes/categories.tsx
import { createFileRoute } from "@tanstack/react-router";
import { CategoryTable } from "@/components/categories/CategoryTable";

export const Route = createFileRoute("/categories")({
  component: () => <CategoryTable />,
});
```

## Responsive Design

- **Mobile**: 320px - 768px
- **Tablet**: 768px - 1024px
- **Desktop**: 1024px+

```tsx
// Grid layouts
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

// Conditional visibility
<div className="hidden lg:block">Desktop only</div>
<div className="lg:hidden">Mobile/Tablet only</div>
```

## Chart Implementation

Use shadcn chart components with Recharts:

```typescript
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function SalesTrendChart({ data }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tren Penjualan</CardTitle>
        <CardDescription>Analisis penjualan harian</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="sales" stroke="#8884d8" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
```

## Development Commands

```bash
pnpm exec tsc --noEmit  # Type checking (use this to test instead of pnpm dev)
pnpm dev              # Start development server
pnpm build            # Build for production
pnpm migrate          # Database migrations
pnpm seed             # Seed database
pnpm lint             # Run Biome linter
pnpm lint:fix         # Run Biome linter and fix issues
pnpm format           # Check code formatting with Biome
pnpm format:write     # Format code with Biome
pnpm check            # Run Biome check (lint + format)
```

## Common Pitfalls to Avoid

1. **Timezone Issues**: Never use UTC dates for user-facing features
2. **Direct Stock Updates**: Never update stock directly, always use activities
3. **English Text**: All UI text must be in Indonesian
4. **Client-Side Data Operations**: NEVER implement sorting, filtering, or pagination in frontend
5. **Custom Components**: Always use shadcn MCP components instead of custom implementations
6. **Missing Error Handling**: Always handle loading and error states
7. **Ignoring Responsive Design**: Test on mobile devices
8. **Breaking Database Constraints**: Validate data before API calls
9. **Missing Audit Trail**: Don't provide delete functionality for activities

## Testing Guidelines

1. **Test Timezone Handling**: Verify all date calculations use Asia/Jakarta
2. **Test Stock Management**: Ensure stock updates work through activities
3. **Test Indonesian Language**: Verify all text is in Indonesian
4. **Test Responsive Design**: Test on mobile, tablet, and desktop
5. **Test Error States**: Verify proper error handling and user feedback

## Performance & Security

- Use TanStack Query for intelligent caching
- Server-side pagination only
- Route-based code splitting
- Dynamic imports for heavy components
- Zod schemas for form validation
- Proper input escaping for XSS prevention
- PostgREST permissions for API security

## Deployment

- Use `pnpm build` for production
- Use `pnpm preview` for VM deployment
- Configure `VITE_API_URL` for production
- Use PM2 or systemd for process management

## Getting Help

1. Check `docs/FOUNDATION_REFERENCE.md` for component usage
2. Review `docs/business-requirements.md` for feature details
3. Consult `docs/technical-plan.md` for implementation details
4. Examine migration files for database structure
5. Follow existing patterns as templates

Remember: This is a business-critical application for a non-technical user in Indonesia. Prioritize usability, reliability, and proper timezone handling above all else.
