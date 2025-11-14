# Task 1: PostgREST API Client Wrapper with TypeScript Types

## Objective

Create a comprehensive PostgREST API client wrapper with proper TypeScript types based on the database migrations.

## Requirements

### Database Schema Analysis

Based on the migrations, implement types and API client for:

- `product_categories` table
- `products` table  
- `product_variants` table
- `transactions` table
- `product_activities` table
- Custom RPC functions: `get_dashboard_metrics`, `get_sales_trends`, `get_top_products`, `get_category_performance`, `get_low_stock_alerts`, `get_financial_analytics`

### API Client Implementation

Create `src/lib/api.ts` with:

- PostgREST client configuration
- CRUD operations for all tables
- RPC function calls for analytics
- Error handling and response parsing
- Asia/Jakarta timezone handling for date parameters

### TypeScript Types

Create `src/types/database.ts` with:

- Interface definitions for all database tables
- Type definitions for RPC function responses
- Form data types for create/update operations
- Activity type enum ('Restock', 'Refund', 'Sales', 'Adjustment')

### Key Features

- Support for PostgREST query parameters (select, filter, order, etc.)
- Automatic handling of relationships (JOINs)
- Proper TypeScript typing for all API responses
- Integration with TanStack Query
- Indonesian language error messages

## Deliverables

- `src/lib/api.ts` - API client implementation
- `src/types/database.ts` - TypeScript type definitions
- `src/types/api.ts` - API response types
- `src/lib/validations.ts` - Zod validation schemas

## Success Criteria

- All database operations properly typed
- API client handles all CRUD operations
- RPC functions callable with proper TypeScript types
- Integration ready for TanStack Query hooks
