# Task 5: Activity History Implementation

## Objective

Implement comprehensive activity history tracking with transaction grouping and three types of activity forms.

## Requirements

### Activity Components

Create activity-specific components:

- `src/components/activities/ActivityTable.tsx` - Grouped transaction table
- `src/components/activities/TransactionGroup.tsx` - Expandable transaction groups
- `src/components/activities/ActivityForms.tsx` - Sidebar forms container
- `src/components/activities/TransactionForm.tsx` - Add sales/restock transactions
- `src/components/activities/RefundForm.tsx` - Handle refunds
- `src/components/activities/AdjustmentForm.tsx` - Stock adjustments
- `src/components/forms/TextAreaField.tsx` - Notes and descriptions

### Activity Page

Implement `src/routes/activities.tsx`:

- Transaction grouping with visual indicators
- Expandable/collapsible transaction details
- Group summary showing total value and item count
- Sidebar forms for different activity types
- Date/time sorting and filtering
- Activity search functionality
- Mobile-responsive layout

### Transaction Form

Add Transaction/Sales form with:

- Transaction Notes (optional)
- Date selection (defaults to current Asia/Jakarta time)
- Line Items section:
  - Product Selection dropdown
  - Variant Selection dropdown
  - Quantity input
  - Unit Price (auto-calculated from variant price)
  - Manual Price Override (optional)
  - Adjustment calculation display

### Refund Form

Handle refunds with:

- Reference transaction selection
- Original transaction display
- Products to refund selection
- Quantities and reasons/notes
- Auto-calculation of refund amounts
- Integration with stock restoration

### Stock Adjustment Form

Implement adjustments with:

- Product and Variant Selection
- Adjustment Type selection (Restock, Adjustment)
- Quantity change input
- Reason/Notes field
- Cost impact calculation display

### Business Rules Implementation

- All stock changes recorded as activities
- Sales reduce stock, restocks increase stock
- Refunds reverse previous sales
- Activities cannot be deleted (audit trail)
- Transaction grouping for related activities
- Asia/Jakarta timezone handling for all dates

### API Integration

- Create activities using PostgREST API
- Transaction grouping and management
- Real-time stock updates via triggers
- Activity history retrieval with pagination
- Error handling and validation

## Deliverables

- Complete activity history page
- Three types of activity forms
- Transaction grouping and expansion
- Real-time stock tracking
- Audit trail preservation

## Success Criteria

- Users can record sales, restocks, and adjustments
- Transaction grouping works correctly
- Forms handle all business rules
- Stock updates happen automatically
- All dates in Asia/Jakarta timezone
