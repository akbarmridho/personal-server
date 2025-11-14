-- migrate:up

CREATE TYPE activity_type AS ENUM ('Restock', 'Refund', 'Sales', 'Adjustment');

CREATE TABLE product_categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES product_categories(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE product_variants (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    cost_price INTEGER NOT NULL CHECK (cost_price >= 0),
    sell_price INTEGER NOT NULL CHECK (sell_price >= 0),
    stock INTEGER DEFAULT 0 CHECK (stock >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE product_activities (
    id SERIAL PRIMARY KEY,
    transaction_id INTEGER REFERENCES transactions(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
    variant_id INTEGER REFERENCES product_variants(id) ON DELETE SET NULL,
    category_id INTEGER REFERENCES product_categories(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    variant_name TEXT NOT NULL,
    type activity_type NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity >= 1),
    unit_cost INTEGER NOT NULL CHECK (unit_cost >= 0),
    unit_revenue INTEGER NOT NULL CHECK (unit_revenue >= 0),
    cost_adjustment INTEGER DEFAULT 0,
    revenue_adjustment INTEGER DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_product_categories_updated_at BEFORE UPDATE ON product_categories
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_variants_updated_at BEFORE UPDATE ON product_variants
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION adjust_stock_on_activity()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.type IN ('Restock', 'Refund', 'Adjustment') THEN
        UPDATE product_variants SET stock = stock + NEW.quantity WHERE id = NEW.variant_id;
    ELSIF NEW.type = 'Sales' THEN
        UPDATE product_variants SET stock = stock - NEW.quantity WHERE id = NEW.variant_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER adjust_stock_after_activity AFTER INSERT ON product_activities
FOR EACH ROW EXECUTE FUNCTION adjust_stock_on_activity();

CREATE OR REPLACE FUNCTION adjust_stock_on_activity_update()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.type IN ('Restock', 'Refund', 'Adjustment') THEN
        UPDATE product_variants SET stock = stock - OLD.quantity WHERE id = OLD.variant_id;
    ELSIF OLD.type = 'Sales' THEN
        UPDATE product_variants SET stock = stock + OLD.quantity WHERE id = OLD.variant_id;
    END IF;
    
    IF NEW.type IN ('Restock', 'Refund', 'Adjustment') THEN
        UPDATE product_variants SET stock = stock + NEW.quantity WHERE id = NEW.variant_id;
    ELSIF NEW.type = 'Sales' THEN
        UPDATE product_variants SET stock = stock - NEW.quantity WHERE id = NEW.variant_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER adjust_stock_after_activity_update AFTER UPDATE ON product_activities
FOR EACH ROW EXECUTE FUNCTION adjust_stock_on_activity_update();

CREATE OR REPLACE FUNCTION adjust_stock_on_activity_delete()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.type IN ('Restock', 'Refund', 'Adjustment') THEN
        UPDATE product_variants SET stock = stock - OLD.quantity WHERE id = OLD.variant_id;
    ELSIF OLD.type = 'Sales' THEN
        UPDATE product_variants SET stock = stock + OLD.quantity WHERE id = OLD.variant_id;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER adjust_stock_after_activity_delete AFTER DELETE ON product_activities
FOR EACH ROW EXECUTE FUNCTION adjust_stock_on_activity_delete();

CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_variants_product ON product_variants(product_id);
CREATE INDEX idx_activities_transaction ON product_activities(transaction_id);
CREATE INDEX idx_activities_product ON product_activities(product_id);
CREATE INDEX idx_activities_variant ON product_activities(variant_id);
CREATE INDEX idx_activities_type ON product_activities(type);
CREATE INDEX idx_activities_created ON product_activities(created_at);

-- migrate:down

DROP TRIGGER IF EXISTS adjust_stock_after_activity_delete ON product_activities;
DROP TRIGGER IF EXISTS adjust_stock_after_activity_update ON product_activities;
DROP TRIGGER IF EXISTS adjust_stock_after_activity ON product_activities;
DROP TRIGGER IF EXISTS update_product_variants_updated_at ON product_variants;
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
DROP TRIGGER IF EXISTS update_product_categories_updated_at ON product_categories;
DROP FUNCTION IF EXISTS adjust_stock_on_activity_delete();
DROP FUNCTION IF EXISTS adjust_stock_on_activity_update();
DROP FUNCTION IF EXISTS adjust_stock_on_activity();
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP TABLE IF EXISTS product_activities;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS product_variants;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS product_categories;
DROP TYPE IF EXISTS activity_type;

