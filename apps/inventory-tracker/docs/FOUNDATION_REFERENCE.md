# Foundation Reference Guide

Quick reference for the foundational setup completed in Task 2.

## Available Components

### shadcn/ui Components

```tsx
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table } from "@/components/ui/table";
import { Dialog } from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Tabs } from "@/components/ui/tabs";
import { Chart } from "@/components/ui/chart";
import { Label } from "@/components/ui/label";
```

### Layout Components

```tsx
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
```

## Available Hooks

### Data Management Hooks

```tsx
import { useCategories } from "@/hooks/useCategories";
import { useProducts } from "@/hooks/useProducts";
import { useActivities } from "@/hooks/useActivities";
import { useAnalytics } from "@/hooks/useAnalytics";
```

### Usage Example

```tsx
function MyComponent() {
  const { categories, isLoading, createCategory } = useCategories();
  
  const handleCreate = async () => {
    await createCategory({ name: "Elektronik", description: "Produk elektronik" });
  };
  
  return <div>...</div>;
}
```

## Utilities

### Date Utilities (Asia/Jakarta Timezone)

```tsx
import {
  formatDate,           // "25 Jan 2024"
  formatDateTime,       // "25 Jan 2024 14:30"
  formatRelativeTime,   // "2 jam yang lalu"
  isToday,             // boolean
  getCurrentDateJakarta,
  toJakartaTime,
  getStartOfDayJakarta,
  getEndOfDayJakarta,
  formatCurrency,      // "Rp 150.000"
  formatNumber,        // "1.234.567"
} from "@/lib/date-utils";
```

### Constants

```tsx
import {
  APP_NAME,
  ROUTES,
  ACTIVITY_TYPES,
  ACTIVITY_TYPE_LABELS,
  DATE_FILTERS,
  DATE_FILTER_LABELS,
  LOW_STOCK_THRESHOLD,
  PAGINATION,
} from "@/lib/constants";
```

### Theme Context

```tsx
import { useTheme } from "@/contexts/ThemeContext";

function MyComponent() {
  const { theme, setTheme } = useTheme();
  
  return (
    <button onClick={() => setTheme("dark")}>
      Switch to Dark Mode
    </button>
  );
}
```

## Routing

### Navigation

```tsx
import { Link } from "@tanstack/react-router";

<Link to="/categories">Kategori</Link>
<Link to="/products">Produk</Link>
<Link to="/activities">Aktivitas</Link>
```

### Route Definitions

All routes use `createFileRoute`:

```tsx
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/your-route")({
  component: YourComponent,
});

function YourComponent() {
  return <div>Your content</div>;
}
```

## API Integration

### Using API Directly

```tsx
import { categoriesAPI, productsAPI, activitiesAPI, analyticsAPI } from "@/lib/api";

// List categories
const categories = await categoriesAPI.list();

// Create category
const newCategory = await categoriesAPI.create({
  name: "Elektronik",
  description: "Produk elektronik"
});
```

### Using with TanStack Query Hooks

```tsx
function MyComponent() {
  const { 
    categories,      // data
    isLoading,       // loading state
    error,           // error state
    createCategory,  // mutation function
    isCreating       // mutation loading state
  } = useCategories();
  
  return <div>...</div>;
}
```

## Validation

### Using Zod Schemas

```tsx
import { categorySchema, productSchema, activitySchema } from "@/lib/validations";

// Validate data
const result = categorySchema.safeParse({
  name: "Elektronik",
  description: "Produk elektronik"
});

if (result.success) {
  // Data is valid
  console.log(result.data);
} else {
  // Show errors
  console.log(result.error.errors);
}
```

## Styling

### Tailwind CSS Classes

All shadcn/ui components use Tailwind CSS. Common patterns:

```tsx
<div className="flex items-center gap-4">
  <Button variant="default" size="sm">Simpan</Button>
  <Button variant="outline" size="sm">Batal</Button>
</div>

<Card className="p-6">
  <h2 className="text-2xl font-bold mb-4">Title</h2>
  <p className="text-muted-foreground">Description</p>
</Card>
```

### Responsive Design

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Mobile: 1 column, Tablet: 2 columns, Desktop: 3 columns */}
</div>

<div className="hidden lg:block">
  {/* Only visible on desktop */}
</div>

<div className="lg:hidden">
  {/* Only visible on mobile/tablet */}
</div>
```

## Development Commands

```bash
# Start dev server
pnpm dev

# Build for production
pnpm build

# Type check
pnpm exec tsc --noEmit

# Run tests
pnpm test
```

## Important Notes

1. **Timezone**: All date operations use Asia/Jakarta (GMT+7) timezone
2. **Language**: All user-facing text is in Indonesian
3. **Currency**: Indonesian Rupiah (IDR) formatting
4. **Stock Management**: Stock cannot be updated directly, only through activities
5. **Route Tree**: Auto-generated by Vite plugin, don't edit `routeTree.gen.ts`
