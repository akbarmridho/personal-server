-- migrate:up

-- Create a view that includes total stock calculation for server-side sorting
-- This view enables server-side aggregation and sorting by total stock
CREATE OR REPLACE VIEW products_with_total_stock AS
SELECT
    p.id,
    p.category_id,
    p.name,
    p.description,
    p.created_at,
    p.updated_at,
    pc.name as category_name,
    pc.description as category_description,
    pc.created_at as category_created_at,
    pc.updated_at as category_updated_at,
    COALESCE(SUM(pv.stock), 0) as total_stock
FROM products p
LEFT JOIN product_categories pc ON p.category_id = pc.id
LEFT JOIN product_variants pv ON p.id = pv.product_id
GROUP BY
    p.id, p.category_id, p.name, p.description, p.created_at, p.updated_at,
    pc.name, pc.description, pc.created_at, pc.updated_at;

-- Grant permissions to the view
GRANT SELECT ON products_with_total_stock TO anon_user;

-- migrate:down

-- Drop the view
DROP VIEW IF EXISTS products_with_total_stock;