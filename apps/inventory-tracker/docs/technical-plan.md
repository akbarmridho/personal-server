# Inventory Tracker - Technical Implementation Plan

## Tech Stack Overview

### Frontend Stack

- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **Routing**: TanStack Router (SPA, client-side routing)
- **Forms**: React Hook Form + Zod validation
- **State Management**: TanStack Query for server state + React Context for UI state
- **Charts/Analytics**: Recharts v2 with shadcn chart components
- **Icons**: Lucide React (included with shadcn)
- **Date Handling**: dayjs
- **HTTP Client**: Fetch API or Axios

### Backend Integration

- **API**: PostgREST (based on provided database schema)
- **Database**: PostgreSQL
- **Authentication**: Handled at API gateway level (not implemented in frontend)
- **API Proxy**: Reserve `/api` endpoint for backend proxy to PostgREST

### Development Tools

- **Package Manager**: pnpm
- **Linting**: BiomeJS (exclusively, no ESLint/Prettier)
- **Type Checking**: TypeScript strict mode
- **UI Components**: shadcn/ui component library

## Application Architecture

### Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── ui/              # shadcn/ui base components
│   ├── forms/           # Form-specific components
│   ├── charts/          # Chart components
│   └── layout/          # Layout components
├── routes/              # TanStack Router routes
│   ├── __root.tsx       # Root layout with sidebar
│   ├── _index.tsx       # Analytics Dashboard
│   ├── categories/      # Category Management
│   ├── products/        # Product Management
│   └── activities/      # Activity History
├── hooks/               # Custom React hooks
│   ├── useCategories.ts
│   ├── useProducts.ts
│   ├── useActivities.ts
│   └── useAnalytics.ts
├── lib/                 # Utility libraries
│   ├── api.ts           # API client configuration
│   ├── utils.ts         # Utility functions
│   ├── validations.ts   # Zod schemas
│   └── constants.ts     # Application constants
├── types/               # TypeScript type definitions
│   ├── database.ts      # Database types
│   ├── api.ts           # API response types
│   └── forms.ts         # Form data types
├── contexts/            # React Context providers
│   └── ThemeContext.tsx
└── styles/              # Global styles
    └── globals.css
```

### Core Components Architecture

#### 1. Layout Components

- **AppLayout**: Main application layout with sidebar navigation
- **Sidebar**: Navigation menu with 4 main sections
- **Header**: Top bar with user info and actions
- **MobileMenu**: Collapsible mobile navigation

#### 2. Dashboard Components

- **MetricsCards**: Display key metrics (Total Products, Categories, Low Stock, Financial Summary)
- **SalesTrendChart**: Line/area chart with date filter presets (daily, weekly, monthly, custom range)
- **TopProductsChart**: Bar chart using shadcn chart components with Recharts v2
- **CategoryPerformanceChart**: Pie/donut chart using shadcn chart components with Recharts v2
- **LowStockList**: Table/list of products with low stock
- **FinancialChart**: Profit/loss analysis chart with revenue vs cost breakdown

#### 3. Category Management Components

- **CategoryTable**: Data table with search, sort, pagination
- **CategoryForm**: Modal form for create/edit categories
- **CategoryActions**: Edit/Delete action buttons

#### 4. Product Management Components

- **ProductTable**: Expandable table showing products and variants
- **ProductForm**: Modal form for product creation/editing
- **VariantManager**: Dynamic variant addition/removal
- **StockActions**: Add Stock, Edit, Delete buttons

#### 5. Activity History Components

- **ActivityTable**: Grouped transaction table
- **TransactionGroup**: Expandable transaction groups
- **ActivityForms**: Sidebar forms for different activity types
  - **TransactionForm**: Add sales/restock transactions
  - **RefundForm**: Handle refunds
  - **AdjustmentForm**: Stock adjustments

#### 6. Form Components

- **FormField**: Wrapper for form inputs with validation
- **SelectField**: Product/variant selection
- **NumberField**: Quantity and price inputs
- **TextAreaField**: Notes and descriptions

### Data Flow Architecture

#### 1. API Integration Layer

```typescript
// lib/api.ts
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const api = {
  // Categories
  categories: {
    list: () => fetch(`${API_BASE}/product_categories`),
    create: (data) => fetch(`${API_BASE}/product_categories`, { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => fetch(`${API_BASE}/product_categories?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id) => fetch(`${API_BASE}/product_categories?id=eq.${id}`, { method: 'DELETE' }),
  },
  
  // Products
  products: {
    list: () => fetch(`${API_BASE}/products?select=*,product_categories(*),product_variants(*)`),
    create: (data) => fetch(`${API_BASE}/products`, { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => fetch(`${API_BASE}/products?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id) => fetch(`${API_BASE}/products?id=eq.${id}`, { method: 'DELETE' }),
  },
  
  // Activities
  activities: {
    list: () => fetch(`${API_BASE}/product_activities?select=*,transactions(*)&order=created_at.desc`),
    create: (data) => fetch(`${API_BASE}/product_activities`, { method: 'POST', body: JSON.stringify(data) }),
  },
  
  // Analytics
  analytics: {
    metrics: () => fetch(`${API_BASE}/rpc/get_dashboard_metrics`),
    salesTrends: (startDate?: string, endDate?: string) =>
      fetch(`${API_BASE}/rpc/get_sales_trends?start_date=${startDate || ''}&end_date=${endDate || ''}`),
    financialAnalytics: (startDate?: string, endDate?: string) =>
      fetch(`${API_BASE}/rpc/get_financial_analytics?start_date=${startDate || ''}&end_date=${endDate || ''}`),
    topProducts: () => fetch(`${API_BASE}/rpc/get_top_products`),
  }
};
```

#### 2. Custom Hooks Pattern

```typescript
// hooks/useProducts.ts
export const useProducts = () => {
  const queryClient = useQueryClient();
  
  const productsQuery = useQuery({
    queryKey: ['products'],
    queryFn: api.products.list,
  });
  
  const createProduct = useMutation({
    mutationFn: api.products.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });
  
  return {
    products: productsQuery.data || [],
    isLoading: productsQuery.isLoading,
    createProduct: createProduct.mutate,
    isCreating: createProduct.isPending,
  };
};
```

#### 3. Form Validation Schema

```typescript
// lib/validations.ts
import { z } from 'zod';

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
    cost_price: z.number().min(0, 'Harga beli harus positif'),
    sell_price: z.number().min(0, 'Harga jual harus positif'),
    stock: z.number().min(0, 'Stok harus positif').optional(),
  })).min(1, 'Minimal satu varian diperlukan'),
});

export const activitySchema = z.object({
  transaction_id: z.number().optional(),
  notes: z.string().optional(),
  items: z.array(z.object({
    variant_id: z.number().min(1),
    quantity: z.number().min(1, 'Kuantitas minimal 1'),
    unit_cost: z.number().min(0),
    unit_revenue: z.number().min(0),
  })).min(1, 'Minimal satu item diperlukan'),
});

#### 4. Date Utilities with dayjs (CRITICAL: Asia/Jakarta Timezone)
```typescript
// lib/date-utils.ts
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import localizedFormat from 'dayjs/plugin/localizedFormat';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import 'dayjs/locale/id';

dayjs.extend(relativeTime);
dayjs.extend(localizedFormat);
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.locale('id');
dayjs.tz.setDefault('Asia/Jakarta'); // CRITICAL: Set default timezone

export const formatDate = (date: string | Date) => {
  return dayjs(date).tz('Asia/Jakarta').format('DD MMM YYYY');
};

export const formatDateTime = (date: string | Date) => {
  return dayjs(date).tz('Asia/Jakarta').format('DD MMM YYYY HH:mm');
};

export const formatRelativeTime = (date: string | Date) => {
  return dayjs(date).tz('Asia/Jakarta').fromNow();
};

export const isToday = (date: string | Date) => {
  return dayjs(date).tz('Asia/Jakarta').isSame(dayjs().tz('Asia/Jakarta'), 'day');
};

// CRITICAL: Get current date in Asia/Jakarta timezone for calculations
export const getCurrentDateJakarta = () => {
  return dayjs().tz('Asia/Jakarta');
};

// CRITICAL: Convert UTC date to Asia/Jakarta for comparisons
export const toJakartaTime = (date: string | Date) => {
  return dayjs(date).tz('Asia/Jakarta');
};

// CRITICAL: Get start/end of day in Asia/Jakarta timezone
export const getStartOfDayJakarta = (date?: string | Date) => {
  const targetDate = date ? dayjs(date).tz('Asia/Jakarta') : dayjs().tz('Asia/Jakarta');
  return targetDate.startOf('day');
};

export const getEndOfDayJakarta = (date?: string | Date) => {
  const targetDate = date ? dayjs(date).tz('Asia/Jakarta') : dayjs().tz('Asia/Jakarta');
  return targetDate.endOf('day');
};
```

## Implementation Strategy

### Phase 1: Foundation Setup

1. **Configure shadcn/ui components**
   - Install required components: Button, Input, Select, Table, Dialog, Form, Card, Badge, Alert, Tabs
   - Set up Tailwind configuration for mobile responsiveness
   - Configure Indonesian language support

2. **Set up TanStack Router**
   - Configure route structure for 4 main sections
   - Implement root layout with sidebar navigation
   - Set up protected routes (if needed)

3. **API Integration Layer**
   - Configure PostgREST client
   - Set up TanStack Query for data fetching
   - Implement error handling and loading states

### Phase 2: Core Features Implementation

1. **Category Management**
   - Category table with CRUD operations
   - Form validation and error handling
   - Search and pagination functionality

2. **Product Management**
   - Product table with expandable variant rows
   - Dynamic variant management
   - Stock level indicators and alerts

3. **Activity History**
   - Transaction grouping and expansion
   - Three types of activity forms (Transaction, Refund, Adjustment)
   - Real-time stock updates

### Phase 3: Analytics Dashboard

1. **Metrics Cards**
   - Real-time data from database queries
   - Responsive grid layout for mobile

2. **Charts and Visualizations**
   - Sales trend analysis using shadcn chart components with Recharts v2
   - Top products performance using shadcn chart components with Recharts v2
   - Category breakdown charts using shadcn chart components with Recharts v2

3. **Chart Implementation with shadcn**

```typescript
// components/charts/SalesTrendChart.tsx
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import dayjs from 'dayjs';

interface SalesData {
  date: string;
  sales: number;
}

interface SalesTrendChartProps {
  data: SalesData[];
  onDateFilterChange: (startDate: string, endDate: string) => void;
}

export function SalesTrendChart({ data, onDateFilterChange }: SalesTrendChartProps) {
  const [selectedFilter, setSelectedFilter] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('weekly');

  const handleFilterChange = (filter: 'daily' | 'weekly' | 'monthly' | 'custom') => {
    setSelectedFilter(filter);
    
    // CRITICAL: Use Asia/Jakarta timezone for all date calculations
    const endDate = dayjs().tz('Asia/Jakarta');
    let startDate: dayjs.Dayjs;
    
    switch (filter) {
      case 'daily':
        startDate = endDate.subtract(1, 'day');
        break;
      case 'weekly':
        startDate = endDate.subtract(7, 'days');
        break;
      case 'monthly':
        startDate = endDate.subtract(30, 'days');
        break;
      case 'custom':
        // For custom, you would open a date picker dialog
        return;
    }
    
    // CRITICAL: Send dates in Asia/Jakarta timezone to backend
    onDateFilterChange(startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD'));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tren Penjualan</CardTitle>
        <CardDescription>Analisis penjualan dengan filter waktu</CardDescription>
        <div className="flex gap-2 mt-4">
          <Button
            variant={selectedFilter === 'daily' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFilterChange('daily')}
          >
            Harian
          </Button>
          <Button
            variant={selectedFilter === 'weekly' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFilterChange('weekly')}
          >
            Mingguan
          </Button>
          <Button
            variant={selectedFilter === 'monthly' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFilterChange('monthly')}
          >
            Bulanan
          </Button>
          <Button
            variant={selectedFilter === 'custom' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleFilterChange('custom')}
          >
            Kustom
          </Button>
        </div>
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

```typescript
// components/charts/FinancialChart.tsx
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface FinancialData {
  date: string;
  revenue: number;
  cost: number;
  profit: number;
  transactions: number;
}

interface FinancialChartProps {
  data: FinancialData[];
}

export function FinancialChart({ data }: FinancialChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Analisis Keuangan</CardTitle>
        <CardDescription>Pendapatan, biaya, dan keuntungan harian</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />
            <Bar yAxisId="left" dataKey="revenue" fill="#8884d8" name="Pendapatan" />
            <Bar yAxisId="left" dataKey="cost" fill="#82ca9d" name="Biaya" />
            <Line yAxisId="right" type="monotone" dataKey="profit" stroke="#ff7300" strokeWidth={2} name="Keuntungan" />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
```

3. **Low Stock Alerts**
   - Configurable threshold system
   - Visual indicators and notifications

### Phase 4: Mobile Optimization & Polish

1. **Responsive Design**
   - Mobile-first approach
   - Touch-friendly interactions
   - Collapsible sidebar for mobile

2. **Performance Optimization**
   - Code splitting by routes
   - Image optimization
   - Bundle size optimization

3. **User Experience**
   - Loading states and skeletons
   - Error boundaries
   - Toast notifications for actions

## Mobile-First Design Approach

### Responsive Breakpoints

- **Mobile**: 320px - 768px
- **Tablet**: 768px - 1024px
- **Desktop**: 1024px+

### Mobile-Specific Features

1. **Navigation**
   - Hamburger menu for sidebar
   - Bottom navigation for main sections (optional)
   - Swipe gestures for table interactions

2. **Forms**
   - Touch-friendly input fields
   - Mobile-optimized date/time pickers
   - Simplified form layouts

3. **Tables**
   - Horizontal scrolling for wide tables
   - Card view for mobile display
   - Expandable rows with touch targets

4. **Charts**
   - Responsive chart sizing
   - Touch-friendly interactions
   - Simplified legends for small screens

## Indonesian Language Implementation

### Translation Strategy

```typescript
// contexts/LanguageContext.tsx
const translations = {
  id: {
    // Navigation
    dashboard: 'Dashboard',
    categories: 'Kategori',
    products: 'Produk',
    activities: 'Aktivitas',
    
    // Common
    save: 'Simpan',
    cancel: 'Batal',
    edit: 'Edit',
    delete: 'Hapus',
    add: 'Tambah',
    search: 'Cari',
    
    // Forms
    name: 'Nama',
    description: 'Deskripsi',
    category: 'Kategori',
    price: 'Harga',
    stock: 'Stok',
    
    // Messages
    saved: 'Berhasil disimpan',
    deleted: 'Berhasil dihapus',
    error: 'Terjadi kesalahan',
  }
};
```

### Implementation

- Use React Context for language state
- Wrap all text content with translation function
- All content exclusively in Indonesian language

## Database Integration Details

### PostgREST Configuration

The application will leverage the existing database schema with these key features:

1. **Automatic Stock Management**
   - Database triggers handle stock updates
   - Frontend only needs to create activity records
   - Real-time stock consistency

2. **Transaction Grouping**
   - Use `transactions` table to group related activities
   - Support for complex refund scenarios
   - Audit trail preservation

3. **Data Validation**
   - Leverage database constraints
   - Frontend validation with Zod
   - Server-side validation through PostgREST

### Key API Endpoints

```
GET    /product_categories          # List categories
POST   /product_categories          # Create category
PATCH  /product_categories?id=eq.X  # Update category
DELETE /product_categories?id=eq.X  # Delete category

GET    /products?select=*,product_categories(*),product_variants(*)  # List products
POST   /products                    # Create product
PATCH  /products?id=eq.X            # Update product
DELETE /products?id=eq.X            # Delete product

GET    /product_activities?select=*,transactions(*)&order=created_at.desc  # List activities
POST   /product_activities          # Create activity
POST   /transactions               # Create transaction group

# Analytics endpoints (custom functions)
GET    /rpc/get_dashboard_metrics
GET    /rpc/get_sales_trends?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
GET    /rpc/get_financial_analytics?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD
GET    /rpc/get_top_products?limit=10
```

## Performance Considerations

### 1. Data Fetching Strategy

- **TanStack Query** for intelligent caching
- **Pagination** for large datasets
- **Infinite scrolling** for activity history
- **Optimistic updates** for better UX

### 2. Bundle Optimization

- **Route-based code splitting**
- **Dynamic imports** for heavy components (charts)
- **Tree shaking** for unused code
- **Asset optimization** with Vite

### 3. Mobile Performance

- **Lazy loading** for images and charts
- **Reduced animations** on mobile
- **Touch event optimization**
- **Offline capability** (future enhancement)

## Security Considerations

### 1. Frontend Security

- **Input sanitization** with Zod validation
- **XSS prevention** through proper escaping
- **CSRF protection** (handled by API gateway)
- **Secure storage** for sensitive data

### 2. API Security

- **Rate limiting** (API gateway level)
- **Input validation** (PostgREST level)
- **Audit logging** (database triggers)
- **Access control** (API gateway)

## Deployment Strategy

### 1. Build Process

```bash
# Build for production
pnpm build

# Deploy using Vite Preview (for VM deployment)
pnpm preview --host 0.0.0.0 --port 4173

# Type checking
pnpm type-check

# Linting with BiomeJS
pnpm biome check
pnpm biome format --write
```

### 2. Environment Configuration

```typescript
// .env.production
VITE_API_URL=https://yourdomain.com/api
VITE_APP_VERSION=1.0.0
VITE_ENABLE_ANALYTICS=true
```

### 3. VM Deployment Process

1. **Build the application**

   ```bash
   pnpm build
   ```

2. **Deploy to VM using Vite Preview**

   ```bash
   # Start preview server on VM
   pnpm preview --host 0.0.0.0 --port 4173
   ```

3. **Configure reverse proxy (nginx/Apache)**
   - Point domain to the preview server port
   - Set up SSL certificates
   - Configure proper caching headers

4. **Process management**
   - Use PM2 or systemd to keep the preview server running
   - Set up auto-restart on server reboot
   - Monitor application logs
