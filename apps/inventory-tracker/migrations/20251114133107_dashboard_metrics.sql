-- migrate:up

-- Custom RPC functions for dashboard analytics

-- Function 1: Get dashboard metrics (total products, categories, low stock, inventory value)
CREATE OR REPLACE FUNCTION get_dashboard_metrics()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_products', (
            SELECT COUNT(DISTINCT p.id)
            FROM products p
            WHERE p.deleted_at IS NULL
        ),
        'total_categories', (
            SELECT COUNT(*)
            FROM product_categories
            WHERE deleted_at IS NULL
        ),
        'low_stock_items', (
            SELECT COUNT(DISTINCT pv.id)
            FROM product_variants pv
            JOIN products p ON pv.product_id = p.id
            WHERE pv.stock <= COALESCE(pv.min_stock_level, 10)
            AND p.deleted_at IS NULL
            AND pv.deleted_at IS NULL
        ),
        'total_inventory_value', (
            SELECT COALESCE(SUM(pv.stock * pv.cost_price), 0)
            FROM product_variants pv
            JOIN products p ON pv.product_id = p.id
            WHERE p.deleted_at IS NULL
            AND pv.deleted_at IS NULL
        ),
        'total_sales_today', (
            SELECT COALESCE(SUM(
                CASE 
                    WHEN pa.activity_type = 'sale' THEN pa.quantity * pa.unit_revenue
                    ELSE 0
                END
            ), 0)
            FROM product_activities pa
            WHERE DATE(pa.created_at) = CURRENT_DATE
            AND pa.activity_type = 'sale'
        ),
        'total_sales_month', (
            SELECT COALESCE(SUM(
                CASE 
                    WHEN pa.activity_type = 'sale' THEN pa.quantity * pa.unit_revenue
                    ELSE 0
                END
            ), 0)
            FROM product_activities pa
            WHERE pa.created_at >= date_trunc('month', CURRENT_DATE)
            AND pa.activity_type = 'sale'
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function 2: Get sales trends for charts
CREATE OR REPLACE FUNCTION get_sales_trends(period TEXT DEFAULT 'week')
RETURNS TABLE (
    date DATE,
    sales NUMERIC,
    transactions INTEGER
) AS $$
BEGIN
    IF period = 'week' THEN
        RETURN QUERY
        SELECT 
            DATE_TRUNC('day', pa.created_at)::DATE as date,
            COALESCE(SUM(
                CASE 
                    WHEN pa.activity_type = 'sale' THEN pa.quantity * pa.unit_revenue
                    ELSE 0
                END
            ), 0) as sales,
            COUNT(DISTINCT t.id) as transactions
        FROM product_activities pa
        LEFT JOIN transactions t ON pa.transaction_id = t.id
        WHERE pa.created_at >= CURRENT_DATE - INTERVAL '7 days'
        AND pa.activity_type = 'sale'
        GROUP BY DATE_TRUNC('day', pa.created_at)
        ORDER BY date;
    ELSIF period = 'month' THEN
        RETURN QUERY
        SELECT 
            DATE_TRUNC('day', pa.created_at)::DATE as date,
            COALESCE(SUM(
                CASE 
                    WHEN pa.activity_type = 'sale' THEN pa.quantity * pa.unit_revenue
                    ELSE 0
                END
            ), 0) as sales,
            COUNT(DISTINCT t.id) as transactions
        FROM product_activities pa
        LEFT JOIN transactions t ON pa.transaction_id = t.id
        WHERE pa.created_at >= CURRENT_DATE - INTERVAL '30 days'
        AND pa.activity_type = 'sale'
        GROUP BY DATE_TRUNC('day', pa.created_at)
        ORDER BY date;
    ELSE
        -- Default to week
        RETURN QUERY
        SELECT 
            DATE_TRUNC('day', pa.created_at)::DATE as date,
            COALESCE(SUM(
                CASE 
                    WHEN pa.activity_type = 'sale' THEN pa.quantity * pa.unit_revenue
                    ELSE 0
                END
            ), 0) as sales,
            COUNT(DISTINCT t.id) as transactions
        FROM product_activities pa
        LEFT JOIN transactions t ON pa.transaction_id = t.id
        WHERE pa.created_at >= CURRENT_DATE - INTERVAL '7 days'
        AND pa.activity_type = 'sale'
        GROUP BY DATE_TRUNC('day', pa.created_at)
        ORDER BY date;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function 3: Get top products by sales
CREATE OR REPLACE FUNCTION get_top_products(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
    product_id INTEGER,
    product_name TEXT,
    category_name TEXT,
    total_sales NUMERIC,
    total_quantity INTEGER,
    revenue NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as product_id,
        p.name as product_name,
        pc.name as category_name,
        COALESCE(SUM(
            CASE 
                WHEN pa.activity_type = 'sale' THEN pa.quantity
                ELSE 0
            END
        ), 0) as total_sales,
        COALESCE(SUM(
            CASE 
                WHEN pa.activity_type = 'sale' THEN pa.quantity
                ELSE 0
            END
        ), 0)::INTEGER as total_quantity,
        COALESCE(SUM(
            CASE 
                WHEN pa.activity_type = 'sale' THEN pa.quantity * pa.unit_revenue
                ELSE 0
            END
        ), 0) as revenue
    FROM products p
    LEFT JOIN product_categories pc ON p.category_id = pc.id
    LEFT JOIN product_variants pv ON p.id = pv.product_id
    LEFT JOIN product_activities pa ON pv.id = pa.variant_id
    WHERE p.deleted_at IS NULL
    AND pc.deleted_at IS NULL
    AND pv.deleted_at IS NULL
    AND pa.created_at >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY p.id, p.name, pc.name
    ORDER BY revenue DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function 4: Get category performance for pie charts
CREATE OR REPLACE FUNCTION get_category_performance()
RETURNS TABLE (
    category_id INTEGER,
    category_name TEXT,
    total_sales NUMERIC,
    revenue NUMERIC,
    product_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pc.id as category_id,
        pc.name as category_name,
        COALESCE(SUM(
            CASE 
                WHEN pa.activity_type = 'sale' THEN pa.quantity
                ELSE 0
            END
        ), 0) as total_sales,
        COALESCE(SUM(
            CASE 
                WHEN pa.activity_type = 'sale' THEN pa.quantity * pa.unit_revenue
                ELSE 0
            END
        ), 0) as revenue,
        COUNT(DISTINCT p.id) as product_count
    FROM product_categories pc
    LEFT JOIN products p ON pc.id = p.category_id
    LEFT JOIN product_variants pv ON p.id = pv.product_id
    LEFT JOIN product_activities pa ON pv.id = pa.variant_id
    WHERE pc.deleted_at IS NULL
    AND p.deleted_at IS NULL
    AND pv.deleted_at IS NULL
    AND (pa.created_at >= CURRENT_DATE - INTERVAL '30 days' OR pa.created_at IS NULL)
    GROUP BY pc.id, pc.name
    ORDER BY revenue DESC;
END;
$$ LANGUAGE plpgsql;

-- Function 5: Get low stock alerts
CREATE OR REPLACE FUNCTION get_low_stock_alerts(threshold INTEGER DEFAULT 10)
RETURNS TABLE (
    variant_id INTEGER,
    product_name TEXT,
    variant_name TEXT,
    current_stock INTEGER,
    min_stock_level INTEGER,
    category_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pv.id as variant_id,
        p.name as product_name,
        pv.name as variant_name,
        pv.stock as current_stock,
        COALESCE(pv.min_stock_level, threshold) as min_stock_level,
        pc.name as category_name
    FROM product_variants pv
    JOIN products p ON pv.product_id = p.id
    LEFT JOIN product_categories pc ON p.category_id = pc.id
    WHERE pv.stock <= COALESCE(pv.min_stock_level, threshold)
    AND p.deleted_at IS NULL
    AND pv.deleted_at IS NULL
    AND pc.deleted_at IS NULL
    ORDER BY pv.stock ASC;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions to authenticated users (adjust as needed)
GRANT EXECUTE ON FUNCTION get_dashboard_metrics() TO authenticated;
GRANT EXECUTE ON FUNCTION get_sales_trends(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_top_products(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_category_performance() TO authenticated;
GRANT EXECUTE ON FUNCTION get_low_stock_alerts(INTEGER) TO authenticated;

-- migrate:down

-- Drop the custom functions
DROP FUNCTION IF EXISTS get_dashboard_metrics();
DROP FUNCTION IF EXISTS get_sales_trends(TEXT);
DROP FUNCTION IF EXISTS get_top_products(INTEGER);
DROP FUNCTION IF EXISTS get_category_performance();
DROP FUNCTION IF EXISTS get_low_stock_alerts(INTEGER);