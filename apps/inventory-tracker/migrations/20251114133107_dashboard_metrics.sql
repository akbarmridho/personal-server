-- migrate:up

-- Custom RPC functions for dashboard analytics
-- CRITICAL: All functions handle Asia/Jakarta (GMT+7) timezone properly
-- ALL DATE RANGES ARE USER-SUPPLIED FOR MAXIMUM FLEXIBILITY

-- Function 1: Get dashboard metrics with user-supplied date ranges
-- CRITICAL: All date filtering uses Asia/Jakarta timezone with user-provided parameters
CREATE OR REPLACE FUNCTION get_dashboard_metrics(
    start_date DATE DEFAULT NULL,
    end_date DATE DEFAULT NULL,
    include_today BOOLEAN DEFAULT TRUE,
    include_month_to_date BOOLEAN DEFAULT TRUE
)
RETURNS JSON AS $$
DECLARE
    result JSON;
    jakarta_start_date TIMESTAMP WITH TIME ZONE;
    jakarta_end_date TIMESTAMP WITH TIME ZONE;
    jakarta_today DATE;
BEGIN
    -- CRITICAL: Convert user-provided dates to Asia/Jakarta timezone
    jakarta_today := (CURRENT_TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Jakarta')::DATE;
    
    -- Set default date range if not provided (last 30 days in Asia/Jakarta)
    IF start_date IS NULL THEN
        start_date := jakarta_today - INTERVAL '30 days';
    END IF;
    
    IF end_date IS NULL THEN
        end_date := jakarta_today;
    END IF;
    
    -- Convert to Asia/Jakarta timezone timestamps
    jakarta_start_date := start_date::TIMESTAMP AT TIME ZONE 'Asia/Jakarta';
    jakarta_end_date := (end_date + INTERVAL '1 day')::TIMESTAMP AT TIME ZONE 'Asia/Jakarta';
    
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
        'total_transactions', (
            SELECT COUNT(DISTINCT t.id)
            FROM transactions t
            -- CRITICAL: Use Asia/Jakarta timezone with user date range
            WHERE t.created_at AT TIME ZONE 'Asia/Jakarta' >= jakarta_start_date
            AND t.created_at AT TIME ZONE 'Asia/Jakarta' < jakarta_end_date
        ),
        'total_refunded_transactions', (
            SELECT COUNT(DISTINCT t.id)
            FROM transactions t
            JOIN product_activities pa ON t.id = pa.transaction_id
            -- CRITICAL: Use Asia/Jakarta timezone with user date range
            WHERE t.created_at AT TIME ZONE 'Asia/Jakarta' >= jakarta_start_date
            AND t.created_at AT TIME ZONE 'Asia/Jakarta' < jakarta_end_date
            AND pa.activity_type = 'refund'
        ),
        'total_sales', (
            SELECT COALESCE(SUM(
                CASE
                    WHEN pa.activity_type = 'sale' THEN pa.quantity * pa.unit_revenue
                    ELSE 0
                END
            ), 0)
            FROM product_activities pa
            -- CRITICAL: Use Asia/Jakarta timezone with user date range
            WHERE pa.created_at AT TIME ZONE 'Asia/Jakarta' >= jakarta_start_date
            AND pa.created_at AT TIME ZONE 'Asia/Jakarta' < jakarta_end_date
            AND pa.activity_type = 'sale'
        ),
        'total_refunded', (
            SELECT COALESCE(SUM(
                CASE
                    WHEN pa.activity_type = 'refund' THEN pa.quantity * pa.unit_revenue
                    ELSE 0
                END
            ), 0)
            FROM product_activities pa
            -- CRITICAL: Use Asia/Jakarta timezone with user date range
            WHERE pa.created_at AT TIME ZONE 'Asia/Jakarta' >= jakarta_start_date
            AND pa.created_at AT TIME ZONE 'Asia/Jakarta' < jakarta_end_date
            AND pa.activity_type = 'refund'
        ),
        'total_cost_of_sales', (
            SELECT COALESCE(SUM(
                CASE
                    WHEN pa.activity_type = 'sale' THEN pa.quantity * pa.unit_cost
                    ELSE 0
                END
            ), 0)
            FROM product_activities pa
            -- CRITICAL: Use Asia/Jakarta timezone with user date range
            WHERE pa.created_at AT TIME ZONE 'Asia/Jakarta' >= jakarta_start_date
            AND pa.created_at AT TIME ZONE 'Asia/Jakarta' < jakarta_end_date
            AND pa.activity_type = 'sale'
        ),
        'net_profit', (
            SELECT COALESCE(SUM(
                CASE
                    WHEN pa.activity_type = 'sale' THEN pa.quantity * pa.unit_revenue
                    WHEN pa.activity_type = 'refund' THEN -(pa.quantity * pa.unit_revenue)
                    ELSE 0
                END
            ), 0) - COALESCE(SUM(
                CASE
                    WHEN pa.activity_type = 'sale' THEN pa.quantity * pa.unit_cost
                    WHEN pa.activity_type = 'refund' THEN pa.quantity * pa.unit_cost
                    ELSE 0
                END
            ), 0)
            FROM product_activities pa
            -- CRITICAL: Use Asia/Jakarta timezone with user date range
            WHERE pa.created_at AT TIME ZONE 'Asia/Jakarta' >= jakarta_start_date
            AND pa.created_at AT TIME ZONE 'Asia/Jakarta' < jakarta_end_date
            AND pa.activity_type IN ('sale', 'refund')
        ),
        'total_sales_today', CASE
            WHEN include_today THEN (
                SELECT COALESCE(SUM(
                    CASE
                        WHEN pa.activity_type = 'sale' THEN pa.quantity * pa.unit_revenue
                        ELSE 0
                    END
                ), 0)
                FROM product_activities pa
                -- CRITICAL: Use Asia/Jakarta timezone for today's calculation
                WHERE (pa.created_at AT TIME ZONE 'Asia/Jakarta')::DATE = jakarta_today
                AND pa.activity_type = 'sale'
            )
            ELSE 0
        END,
        'total_sales_period', (
            SELECT COALESCE(SUM(
                CASE
                    WHEN pa.activity_type = 'sale' THEN pa.quantity * pa.unit_revenue
                    ELSE 0
                END
            ), 0)
            FROM product_activities pa
            -- CRITICAL: Use Asia/Jakarta timezone with user date range
            WHERE pa.created_at AT TIME ZONE 'Asia/Jakarta' >= jakarta_start_date
            AND pa.created_at AT TIME ZONE 'Asia/Jakarta' < jakarta_end_date
            AND pa.activity_type = 'sale'
        ),
        'query_start_date', start_date,
        'query_end_date', end_date,
        'timezone', 'Asia/Jakarta'
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function 2: Get sales trends for charts with user-supplied date range
-- CRITICAL: All date filtering uses Asia/Jakarta timezone with user-provided parameters
CREATE OR REPLACE FUNCTION get_sales_trends(
    start_date DATE,
    end_date DATE
)
RETURNS TABLE (
    date DATE,
    sales NUMERIC,
    transactions INTEGER
) AS $$
DECLARE
    jakarta_start_date TIMESTAMP WITH TIME ZONE;
    jakarta_end_date TIMESTAMP WITH TIME ZONE;
BEGIN
    -- CRITICAL: Convert user-provided dates to Asia/Jakarta timezone timestamps
    jakarta_start_date := start_date::TIMESTAMP AT TIME ZONE 'Asia/Jakarta';
    jakarta_end_date := (end_date + INTERVAL '1 day')::TIMESTAMP AT TIME ZONE 'Asia/Jakarta';
    
    RETURN QUERY
    SELECT
        -- CRITICAL: Group by Asia/Jakarta date
        DATE_TRUNC('day', pa.created_at AT TIME ZONE 'Asia/Jakarta')::DATE as date,
        COALESCE(SUM(
            CASE
                WHEN pa.activity_type = 'sale' THEN pa.quantity * pa.unit_revenue
                ELSE 0
            END
        ), 0) as sales,
        COUNT(DISTINCT t.id) as transactions
    FROM product_activities pa
    LEFT JOIN transactions t ON pa.transaction_id = t.id
    -- CRITICAL: Filter using Asia/Jakarta timezone with user date range
    WHERE pa.created_at AT TIME ZONE 'Asia/Jakarta' >= jakarta_start_date
    AND pa.created_at AT TIME ZONE 'Asia/Jakarta' < jakarta_end_date
    AND pa.activity_type = 'sale'
    GROUP BY DATE_TRUNC('day', pa.created_at AT TIME ZONE 'Asia/Jakarta')
    ORDER BY date;
END;
$$ LANGUAGE plpgsql;

-- Function 3: Get top products by sales with user-supplied date range
-- CRITICAL: Sales calculation uses Asia/Jakarta timezone with user-provided parameters
CREATE OR REPLACE FUNCTION get_top_products(
    start_date DATE,
    end_date DATE,
    limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
    product_id INTEGER,
    product_name TEXT,
    category_name TEXT,
    total_sales NUMERIC,
    total_quantity INTEGER,
    revenue NUMERIC
) AS $$
DECLARE
    jakarta_start_date TIMESTAMP WITH TIME ZONE;
    jakarta_end_date TIMESTAMP WITH TIME ZONE;
BEGIN
    -- CRITICAL: Convert user-provided dates to Asia/Jakarta timezone timestamps
    jakarta_start_date := start_date::TIMESTAMP AT TIME ZONE 'Asia/Jakarta';
    jakarta_end_date := (end_date + INTERVAL '1 day')::TIMESTAMP AT TIME ZONE 'Asia/Jakarta';
    
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
    -- CRITICAL: Use Asia/Jakarta timezone with user date range
    AND pa.created_at AT TIME ZONE 'Asia/Jakarta' >= jakarta_start_date
    AND pa.created_at AT TIME ZONE 'Asia/Jakarta' < jakarta_end_date
    GROUP BY p.id, p.name, pc.name
    ORDER BY revenue DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Function 4: Get category performance for pie charts with user-supplied date range
-- CRITICAL: Sales calculation uses Asia/Jakarta timezone with user-provided parameters
CREATE OR REPLACE FUNCTION get_category_performance(
    start_date DATE,
    end_date DATE
)
RETURNS TABLE (
    category_id INTEGER,
    category_name TEXT,
    total_sales NUMERIC,
    revenue NUMERIC,
    product_count INTEGER
) AS $$
DECLARE
    jakarta_start_date TIMESTAMP WITH TIME ZONE;
    jakarta_end_date TIMESTAMP WITH TIME ZONE;
BEGIN
    -- CRITICAL: Convert user-provided dates to Asia/Jakarta timezone timestamps
    jakarta_start_date := start_date::TIMESTAMP AT TIME ZONE 'Asia/Jakarta';
    jakarta_end_date := (end_date + INTERVAL '1 day')::TIMESTAMP AT TIME ZONE 'Asia/Jakarta';
    
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
    -- CRITICAL: Use Asia/Jakarta timezone with user date range
    AND (pa.created_at AT TIME ZONE 'Asia/Jakarta' >= jakarta_start_date
         AND pa.created_at AT TIME ZONE 'Asia/Jakarta' < jakarta_end_date
         OR pa.created_at IS NULL)
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

-- Function 6: Get financial analytics for charts with user-supplied date range
-- CRITICAL: All date filtering uses Asia/Jakarta timezone with user-provided parameters
CREATE OR REPLACE FUNCTION get_financial_analytics(
    start_date DATE,
    end_date DATE
)
RETURNS TABLE (
    date DATE,
    revenue NUMERIC,
    cost NUMERIC,
    profit NUMERIC,
    transactions INTEGER
) AS $$
DECLARE
    jakarta_start_date TIMESTAMP WITH TIME ZONE;
    jakarta_end_date TIMESTAMP WITH TIME ZONE;
BEGIN
    -- CRITICAL: Convert user-provided dates to Asia/Jakarta timezone timestamps
    jakarta_start_date := start_date::TIMESTAMP AT TIME ZONE 'Asia/Jakarta';
    jakarta_end_date := (end_date + INTERVAL '1 day')::TIMESTAMP AT TIME ZONE 'Asia/Jakarta';
    
    RETURN QUERY
    SELECT
        -- CRITICAL: Group by Asia/Jakarta date
        DATE_TRUNC('day', pa.created_at AT TIME ZONE 'Asia/Jakarta')::DATE as date,
        COALESCE(SUM(
            CASE
                WHEN pa.activity_type = 'sale' THEN pa.quantity * pa.unit_revenue
                WHEN pa.activity_type = 'refund' THEN -(pa.quantity * pa.unit_revenue)
                ELSE 0
            END
        ), 0) as revenue,
        COALESCE(SUM(
            CASE
                WHEN pa.activity_type = 'sale' THEN pa.quantity * pa.unit_cost
                WHEN pa.activity_type = 'refund' THEN pa.quantity * pa.unit_cost
                ELSE 0
            END
        ), 0) as cost,
        COALESCE(SUM(
            CASE
                WHEN pa.activity_type = 'sale' THEN pa.quantity * pa.unit_revenue - pa.quantity * pa.unit_cost
                WHEN pa.activity_type = 'refund' THEN -(pa.quantity * pa.unit_revenue) - pa.quantity * pa.unit_cost
                ELSE 0
            END
        ), 0) as profit,
        COUNT(DISTINCT t.id) as transactions
    FROM product_activities pa
    LEFT JOIN transactions t ON pa.transaction_id = t.id
    -- CRITICAL: Filter using Asia/Jakarta timezone with user date range
    WHERE pa.created_at AT TIME ZONE 'Asia/Jakarta' >= jakarta_start_date
    AND pa.created_at AT TIME ZONE 'Asia/Jakarta' < jakarta_end_date
    AND pa.activity_type IN ('sale', 'refund')
    GROUP BY DATE_TRUNC('day', pa.created_at AT TIME ZONE 'Asia/Jakarta')
    ORDER BY date;
END;
$$ LANGUAGE plpgsql;

-- migrate:down

-- Drop the custom functions with their new signatures
DROP FUNCTION IF EXISTS get_dashboard_metrics(DATE, DATE, BOOLEAN, BOOLEAN);
DROP FUNCTION IF EXISTS get_sales_trends(DATE, DATE);
DROP FUNCTION IF EXISTS get_top_products(DATE, DATE, INTEGER);
DROP FUNCTION IF EXISTS get_category_performance(DATE, DATE);
DROP FUNCTION IF EXISTS get_low_stock_alerts(INTEGER);
DROP FUNCTION IF EXISTS get_financial_analytics(DATE, DATE);