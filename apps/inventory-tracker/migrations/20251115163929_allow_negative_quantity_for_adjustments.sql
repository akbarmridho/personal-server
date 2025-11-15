-- migrate:up

ALTER TABLE product_activities DROP CONSTRAINT IF EXISTS product_activities_quantity_check;

-- migrate:down

ALTER TABLE product_activities ADD CONSTRAINT product_activities_quantity_check CHECK (quantity >= 1);
