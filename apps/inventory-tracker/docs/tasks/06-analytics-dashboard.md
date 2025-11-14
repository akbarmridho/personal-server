# Task 6: Analytics Dashboard Implementation

## Objective

Implement comprehensive analytics dashboard with metrics cards, charts, and real-time data visualization.

## Requirements

### Dashboard Components

Create analytics-specific components:

- `src/components/dashboard/MetricsCards.tsx` - Key metrics display grid
- `src/components/dashboard/SalesTrendChart.tsx` - Line/area chart with date filters
- `src/components/dashboard/TopProductsChart.tsx` - Bar chart for best performers
- `src/components/dashboard/CategoryPerformanceChart.tsx` - Pie/donut chart
- `src/components/dashboard/LowStockList.tsx` - Low stock alerts table
- `src/components/dashboard/FinancialChart.tsx` - Profit/loss analysis chart

### Dashboard Page

Implement `src/routes/index.tsx`:

- Metrics cards grid layout (responsive)
- Sales trend chart with date filter presets (daily, weekly, monthly, custom)
- Top selling products visualization
- Category performance breakdown
- Low stock alerts section
- Financial analytics charts
- Mobile-responsive design

### Metrics Cards Implementation

Display key business metrics:

- Total Products (active count)
- Total Categories (active count)
- Low Stock Alerts (configurable threshold)
- Total Transactions (current month)
- Total Refunded Transactions (current month)
- Total Sales (current month revenue)
- Total Refunded (current month refunds)
- Net Profit (sales minus costs and refunds)
- Today's Sales (Asia/Jakarta timezone)
- Period Sales (user-selected range)

### Chart Implementations

Using shadcn chart components with Recharts v2:

**Sales Trend Chart:**

- Line/area chart with date filter buttons
- Daily, weekly, monthly, custom date range presets
- Asia/Jakarta timezone date handling
- Responsive design for mobile

**Top Products Chart:**

- Horizontal bar chart showing best performers
- Revenue-based ranking
- Product name and category display
- Interactive tooltips

**Category Performance Chart:**

- Pie/donut chart showing sales by category
- Revenue and quantity breakdown
- Legend with category names
- Responsive sizing

**Financial Chart:**

- Composed chart with bars and lines
- Revenue, cost, and profit visualization
- Transaction count overlay
- Asia/Jakarta timezone date grouping

### Date Filter System

Implement date filtering with:

- Preset buttons: Harian, Mingguan, Bulanan, Kustom
- Asia/Jakarta timezone calculations
- Custom date range picker
- Real-time chart updates
- Filter state persistence

### Low Stock Alerts

Create low stock monitoring:

- Configurable threshold system
- Visual indicators (red badges, alerts)
- Product name, variant, current stock, min level
- Quick action buttons (restock, edit)
- Real-time updates

### API Integration

- Dashboard metrics via `get_dashboard_metrics` RPC
- Sales trends via `get_sales_trends` RPC
- Top products via `get_top_products` RPC
- Category performance via `get_category_performance` RPC
- Low stock alerts via `get_low_stock_alerts` RPC
- Financial analytics via `get_financial_analytics` RPC
- Asia/Jakarta timezone date parameters
- Real-time data updates

### Custom Hooks

Create analytics-specific hooks:

- `src/hooks/useAnalytics.ts` - Dashboard metrics and data
- `src/hooks/useSalesTrends.ts` - Chart data and filtering
- `src/hooks/useLowStock.ts` - Low stock monitoring

### Mobile Optimization

- Responsive chart sizing
- Touch-friendly interactions
- Collapsible sections for mobile
- Simplified legends for small screens
- Swipe gestures for chart navigation

## Deliverables

- Complete analytics dashboard
- Six different chart types
- Real-time metrics cards
- Date filtering system
- Low stock alerts
- Mobile-responsive design

## Success Criteria

- All metrics display correctly with real data
- Charts render properly on desktop and mobile
- Date filters work with Asia/Jakarta timezone
- Low stock alerts update in real-time
- Dashboard loads quickly and performs well
- All interface text in Indonesian language
