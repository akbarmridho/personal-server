# Database Seeding Script

This directory contains scripts for generating mock data for the School Uniform Inventory Tracker.

## Overview

The `seed-database.ts` script uses [@faker-js/faker](https://fakerjs.dev/) to generate realistic mock data for a school uniform inventory system. It creates:

- **6 Categories**: Baju Seragam SD, SMP, SMA, Celana & Rok, Topi, Aksesoris
- **15+ Products**: Various school uniform items across all categories
- **50+ Variants**: Different sizes and colors for each product
- **50-100 Transactions**: Historical sales, restocks, refunds, and adjustments
- **200-500 Activities**: Individual product activities linked to transactions

## Features

### Realistic School Uniform Data

- Indonesian product names and descriptions
- Appropriate pricing for school uniform market
- Realistic stock levels
- Historical transaction data over 6 months

### Business Logic

- Automatic stock management through database triggers
- Proper foreign key relationships
- Realistic pricing variations (discounts, adjustments)
- Multiple activity types (Sales, Restock, Refund, Adjustment)

### Time-based Data

- Transactions spread over the last 6 months
- Realistic date distributions
- Proper timezone handling (Asia/Jakarta)

## Prerequisites

1. **Database Setup**: Ensure your PostgreSQL database is running and migrations have been applied
2. **Environment Variables**: Set up your `.env` file with database credentials
3. **Dependencies**: Install all project dependencies with `pnpm install`

## Environment Variables

Make sure your `.env` file contains:

```env
# Database Configuration (for seeding script)
DATABASE_URL=postgresql://postgres:postgres@postgres_main:5432/inventory?sslmode=disable

# Frontend API Configuration
VITE_API_URL=http://localhost:3000/api
```

## Usage

### Basic Seeding

```bash
# Seed the database with mock data
pnpm run seed
```

### Reset and Reseed

```bash
# Clear existing data and reseed
pnpm run seed:reset
```

### Programmatic Usage

```typescript
import { seedDatabase } from './scripts/seed-database.ts';

// Seed with custom options
await seedDatabase();
```

## Script Details

### Data Structure

The script generates data following the school uniform business model:

#### Categories

1. **Baju Seragam SD** - Elementary school uniforms (grades 1-6)
2. **Baju Seragam SMP** - Middle school uniforms (grades 7-9)
3. **Baju Seragam SMA** - High school uniforms (grades 10-12)
4. **Celana & Rok Seragam** - Pants and skirts for all levels
5. **Topi Seragam** - School caps for all levels
6. **Aksesoris Seragam** - Accessories like ties and name tags

#### Products per Category

- **Shirts**: White and colored variants in multiple sizes
- **Bottoms**: Pants and skirts in navy colors
- **Accessories**: Ties, name tags, caps

#### Pricing Strategy

- **Cost Prices**: 25,000 - 65,000 IDR depending on category
- **Sell Prices**: 35,000 - 85,000 IDR with realistic margins
- **Variations**: Discounts on sales, cost adjustments for inventory

#### Stock Levels

- **High-volume items**: 50-200 units (accessories, popular sizes)
- **Medium-volume items**: 25-120 units (pants, skirts)
- **Specialty items**: 10-60 units (specific sizes, premium items)

### Transaction Types

1. **Sales** (60%): Regular sales with potential discounts
2. **Restock** (25%): Inventory replenishment
3. **Refund** (10%): Returns and exchanges
4. **Adjustment** (5%): Stock corrections and write-offs

### Date Distribution

- Transactions spread over 6 months
- Higher activity during back-to-school periods
- Realistic daily/weekly patterns

## Customization

### Modifying Data

Edit the `SCHOOL_UNIFORM_DATA` object in `seed-database.ts` to:

- Add new categories
- Modify product names and descriptions
- Adjust pricing ranges
- Change stock levels

### Adding New Activity Types

Extend the `activityTypes` array and modify the business logic in `seedTransactionsAndActivities()`.

### Adjusting Date Ranges

Modify the `getRandomDateInLastMonths()` function or the `numTransactions` range.

## Troubleshooting

### Common Issues

1. **Database Connection Error**

   ```
   Error: connect ECONNREFUSED 127.0.0.1:54321
   ```

   **Solution**: Ensure your database is running and credentials are correct

2. **Permission Denied**

   ```
   Error: new row for relation "product_categories" violates check constraint
   ```

   **Solution**: Check your database schema and constraints

3. **Foreign Key Violation**

   ```
   Error: insert or update on table "products" violates foreign key constraint
   ```

   **Solution**: Ensure categories are created before products

### Debug Mode

Add console.log statements or use TypeScript debugging to trace execution:

```bash
# Run with Node.js inspector
node --inspect-brk node_modules/tsx/dist/cli.js scripts/seed-database.ts
```

## Performance

- **Execution Time**: 30-60 seconds depending on data volume
- **Memory Usage**: ~50-100MB during execution
- **Database Impact**: Creates ~500-1000 rows across all tables

## Integration

This seeding script is designed to work with:

- **PostgreSQL** database with the provided schema
- **Supabase** PostgREST API
- **TanStack Query** for frontend data fetching
- **Day.js** for timezone-aware date handling

## Next Steps

After seeding, you can:

1. Start the development server: `pnpm dev`
2. Explore the dashboard analytics
3. Test CRUD operations on categories and products
4. Verify activity history and transaction grouping
5. Check low stock alerts and financial reports

The mock data provides a realistic foundation for testing all application features and user workflows.
