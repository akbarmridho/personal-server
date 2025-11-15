-- migrate:up

-- Create trigger function to update category_id in product_activities
-- when a product's category changes
CREATE OR REPLACE FUNCTION update_activity_category_on_product_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only proceed if category_id actually changed
    IF OLD.category_id IS DISTINCT FROM NEW.category_id THEN
        -- Update all historical activities for this product
        UPDATE product_activities
        SET category_id = NEW.category_id
        WHERE product_id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER update_activity_category_trigger
AFTER UPDATE ON products
FOR EACH ROW
WHEN (OLD.category_id IS DISTINCT FROM NEW.category_id)
EXECUTE FUNCTION update_activity_category_on_product_change();

-- Add index for better performance on category_id queries
CREATE INDEX IF NOT EXISTS idx_activities_category ON product_activities(category_id);

-- migrate:down

-- Drop trigger
DROP TRIGGER IF EXISTS update_activity_category_trigger ON products;

-- Drop function
DROP FUNCTION IF EXISTS update_activity_category_on_product_change();

-- Note: We keep the index as it might be useful for queries