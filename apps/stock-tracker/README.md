# Stock Tracker

## Entities

### Product Category

Attribute:

- Name
- Description

### Product

- Name
- Description

### Product Variant

- Name
- Description
- Modal
- Sell Price
- Stock

### Product History

- ProductID
- VariantVariantID
- Type (Restock, Refund, Sales, Adj)
- Qty (plus if stock, minus if sales)
- Cost Total
- Revenue Total
- Notes

Cost total and revenue total is by default the modal/harga jual times quantity.

## Actions

- Add Product (and Edit Product). Incude prices and modal, but not stock.
- Add Activity. Modal for adding stock, adjustment, and sales.

There are no hard delete. Just soft delete.

## Dashboard

- total modal, total penjualan, total keuntungan with various product filter and time filter.
- which product is on low stock or predicted to be low stock.
- produk penjualan terbanyak.
