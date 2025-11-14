# Inventory Tracker - Business Requirements & User Flow

## Executive Summary

An inventory management system designed to help businesses track products, manage stock levels, monitor sales activities, and analyze inventory performance. The system provides real-time visibility into inventory status and supports efficient business operations.

## Dashboard Overview

The application consists of **4 main sections** accessible through a sidebar navigation:

1. **Analytics Dashboard** - Overview and key metrics
2. **Category Management** - Product categorization
3. **Product Management** - Core inventory management
4. **Activity History** - Transaction and stock movement tracking

---

## 1. Analytics Dashboard

### Purpose

Provide a high-level overview of inventory health and business performance at a glance.

### Key Components

#### Metrics Cards

- **Total Products**: Count of all active products
- **Total Categories**: Number of product categories
- **Low Stock Alerts**: Products running low on inventory
- **Total Transactions**: Number of transactions this month
- **Total Refunded Transactions**: Number of refunded transactions
- **Total Sales**: Total revenue from sales this month
- **Total Refunded**: Total amount refunded this month
- **Net Profit**: Total profit after deducting costs and refunds

#### Visual Analytics

- **Sales Trend Chart**: Sales performance with date filter presets (daily, weekly, monthly, custom date range)
- **Top Selling Products**: Best performing products by revenue
- **Category Performance**: Sales breakdown by product category
- **Low Stock Product**: Quick list of product low stock.

---

## 2. Category Management

### Purpose

Organize products into logical categories for better inventory organization and reporting.

### Page Structure

#### Category Table View

- **Columns**: Category Name, Description, Product Count, Created Date, Actions
- **Actions**: Edit Category, Delete Category (only if the product count is 0).
- **Features**: Search, Sort, Pagination

#### Category Form Modal

- **Fields**:
  - Category Name (required)
  - Description (optional)
- **Actions**: Save Category, Cancel
- **Validation**: Prevent duplicate names, required field validation

### Business Rules

- Categories cannot be deleted if they contain products
- Category names must be unique
- Products can be reassigned to different categories

---

## 3. Product Management

### Purpose

Core inventory management functionality for products and their variants.

### Page Structure

#### Product Table View

- **Columns**:
  - Product Name, Category, Total Stock Value
  - Variant Details (expandable rows showing all variants)
  - Individual variant stock levels
  - Total stock across all variants
  - Actions (Edit, Delete, Add Stock)

#### Advanced Features

- **Search**: Find products by name, category, or variant
- **Filters**: Filter by category, stock level, price range
- **Sort**: Sort by name, stock level, value, creation date
- **Pagination**: Handle large product catalogs efficiently

#### Product Form Modal

- **Product Information**:
  - Product Name (required)
  - Category Selection (required)
  - Description (optional)

- **Variants Section**:
  - Add/Remove variants dynamically
  - For each variant:
    - Variant Name (required)
    - Description (optional)
    - Cost Price (required)
    - Selling Price (required)
    - Initial Stock (optional)

### Business Rules

- Products must belong to a category
- Each product must have at least one variant
- Variant names must be unique within a product
- Stock cannot be updated directly (must use activity forms)
- Deleting a product removes all its variants and activity history

---

## 4. Activity History

### Purpose

Track all inventory movements and transactions for audit and analysis purposes.

### Page Structure

#### Activity Table View

- **Columns**:
  - Date/Time
  - Product Name
  - Variant Name
  - Activity Type (Restock, Sales, Refund, Adjustment)
  - Quantity
  - Unit Cost/Revenue
  - Total Value
  - Transaction ID (grouping indicator)
  - Notes
  - Actions

#### Transaction Grouping

- **Visual Indicators**: Related activities grouped by transaction ID
- **Expandable Groups**: Click to expand/collapse transaction details
- **Group Summary**: Show total value and item count per transaction

#### Sidebar Activity Forms

##### Add Transaction/Sales Form

- **Transaction Details**:
  - Transaction Notes (optional)
  - Date (defaults to current)

- **Line Items**:
  - Product Selection
  - Variant Selection
  - Quantity
  - Unit Price (auto-calculated from variant price)
  - Manual Price Override (optional)
  - Adjustment Calculation (if manual price differs from default)

##### Refund Form

- **Reference Selection**: Choose original transaction or activity to refund
- **Refund Details**:
  - Products to refund
  - Quantities
  - Reason/Notes
- **Auto-calculation**: Calculate refund amount based on original prices

##### Stock Adjustment Form

- **Adjustment Details**:
  - Product and Variant Selection
  - Adjustment Type (Restock, Adjustment)
  - Quantity Change
  - Reason/Notes
- **Cost Impact**: Show financial impact of adjustment

### Business Rules

- All stock changes must be recorded as activities
- Sales reduce stock, restocks increase stock
- Refunds reverse previous sales transactions
- Adjustments can be positive (increase) or negative (decrease)
- Transaction grouping helps track related activities
- Activities cannot be deleted (audit trail requirement)

---

## User Workflows

### Daily Operations

#### 1. Receiving New Inventory

1. Navigate to Product Management
2. Find existing product or create new product
3. Use "Add Stock" action or go to Activity History
4. Record restock activity with quantities and costs
5. System automatically updates stock levels

#### 2. Processing Sales

1. Navigate to Activity History
2. Use "Add Transaction" form
3. Select products and variants sold
4. Enter quantities (system calculates totals)
5. Optionally override prices for discounts/promotions
6. Save transaction (system reduces stock automatically)

#### 3. Handling Returns/Refunds

1. Navigate to Activity History
2. Use "Refund" form
3. Reference original transaction
4. Select items and quantities to refund
5. Add reason for refund
6. Save refund (system increases stock automatically)

#### 4. Stock Adjustments

1. Navigate to Product Management
2. Use "Add Stock" action for individual products
3. Or use Activity History for bulk adjustments
4. Record reason for adjustment
5. System updates stock and financial records

### Management Tasks

#### 1. Category Organization

1. Create new categories as needed
2. Assign products to appropriate categories
3. Update category descriptions for clarity

#### 2. Product Maintenance

1. Add new products with variants
2. Update product information and pricing
3. Archive discontinued products
4. Monitor low stock alerts

#### 3. Business Analysis

1. Review Analytics Dashboard daily
2. Analyze sales trends and top products
3. Identify slow-moving inventory
4. Plan restocking based on sales data

## Other

1. Only one user so no need for authentication and role or permissions. Auth is handled at API gateway level.
2. The UI is in Indonesia language since the user don't know English and not tech savvy.
3. **CRITICAL: Timezone Configuration** - The user is located in GMT+7 (Asia/Jakarta) timezone. All time-based calculations, date filters, sales analytics, and dashboard metrics MUST be calculated based on Asia/Jakarta timezone, NOT UTC. This includes:
   - Daily/weekly/monthly sales reports
   - Transaction date filtering
   - Dashboard metrics calculations
   - Chart date ranges
   - Low stock alerts based on date thresholds
   - Any date comparisons or aggregations

   **Failure to implement proper timezone handling will result in incorrect business metrics and financial calculations.**
