-- migrate:up

-- RPC function for atomic product creation with initial stock
CREATE OR REPLACE FUNCTION create_product_with_initial_stock(
  p_category_id INTEGER,
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_variants JSONB DEFAULT NULL
)
RETURNS TABLE(
  product_id INTEGER,
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  new_product_id INTEGER;
  new_variant_id INTEGER;
  variant_record JSONB;
  initial_stock_transaction_id INTEGER;
  variant_count INTEGER;
BEGIN
  -- Validate inputs
  IF p_category_id IS NULL OR p_name IS NULL OR trim(p_name) = '' THEN
    RETURN QUERY SELECT NULL, FALSE, 'Kategori dan nama produk wajib diisi';
    RETURN;
  END IF;
  
  IF p_variants IS NULL OR jsonb_array_length(p_variants) = 0 THEN
    RETURN QUERY SELECT NULL, FALSE, 'Minimal satu varian diperlukan';
    RETURN;
  END IF;
  
  -- Check category exists
  IF NOT EXISTS (SELECT 1 FROM product_categories WHERE id = p_category_id) THEN
    RETURN QUERY SELECT NULL, FALSE, 'Kategori tidak ditemukan';
    RETURN;
  END IF;
  
  -- Validate variant data
  variant_count := jsonb_array_length(p_variants);
  FOR variant_record IN SELECT * FROM jsonb_array_elements(p_variants)
  LOOP
    IF variant_record->>'name' IS NULL OR trim(variant_record->>'name') = '' THEN
      RETURN QUERY SELECT NULL, FALSE, 'Nama varian wajib diisi';
      RETURN;
    END IF;
    
    IF (variant_record->>'cost_price')::INTEGER < 0 THEN
      RETURN QUERY SELECT NULL, FALSE, 'Harga modal tidak boleh negatif';
      RETURN;
    END IF;
    
    IF (variant_record->>'sell_price')::INTEGER < 0 THEN
      RETURN QUERY SELECT NULL, FALSE, 'Harga jual tidak boleh negatif';
      RETURN;
    END IF;
    
    IF (variant_record->>'stock')::INTEGER < 0 THEN
      RETURN QUERY SELECT NULL, FALSE, 'Stok awal tidak boleh negatif';
      RETURN;
    END IF;
  END LOOP;
  
  -- Create product
  INSERT INTO products (category_id, name, description)
  VALUES (p_category_id, p_name, p_description)
  RETURNING id INTO new_product_id;
  
  -- Create transaction for initial stock (only if needed)
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_variants) 
    WHERE (value->>'stock')::INTEGER > 0
  ) THEN
    INSERT INTO transactions (notes)
    VALUES ('Stok Awal')
    RETURNING id INTO initial_stock_transaction_id;
  END IF;
  
  -- Create variants and initial stock activities
  FOR variant_record IN SELECT * FROM jsonb_array_elements(p_variants)
  LOOP
    -- Create variant with stock = 0
    INSERT INTO product_variants (
      product_id, name, description, cost_price, sell_price, stock
    )
    VALUES (
      new_product_id,
      variant_record->>'name',
      variant_record->>'description',
      (variant_record->>'cost_price')::INTEGER,
      (variant_record->>'sell_price')::INTEGER,
      0
    )
    RETURNING id INTO new_variant_id;
    
    -- Create initial stock activity if stock > 0
    IF (variant_record->>'stock')::INTEGER > 0 THEN
      INSERT INTO product_activities (
        transaction_id, product_id, variant_id, category_id,
        product_name, variant_name, type, quantity, unit_cost, unit_revenue, notes
      )
      VALUES (
        initial_stock_transaction_id,
        new_product_id,
        new_variant_id,
        p_category_id,
        p_name,
        variant_record->>'name',
        'Restock',
        (variant_record->>'stock')::INTEGER,
        (variant_record->>'cost_price')::INTEGER,
        0,
        'Stok awal'
      );
    END IF;
  END LOOP;
  
  RETURN QUERY SELECT new_product_id, TRUE, 'Produk berhasil dibuat';
  
EXCEPTION
  WHEN OTHERS THEN
    -- Rollback happens automatically
    RETURN QUERY SELECT NULL, FALSE, SQLERRM;
END;
$$;

-- Simplified RPC function for updating product and variants
-- This function only syncs product info and variants without touching stock
CREATE OR REPLACE FUNCTION sync_product_variants(
  p_product_id INTEGER,
  p_name TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_category_id INTEGER DEFAULT NULL,
  p_variants JSONB DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  variant_record JSONB;
  existing_variant RECORD;
  new_variant_id INTEGER;
  input_variant_ids INTEGER[];
  input_variant_names TEXT[];
BEGIN
  -- Validate product exists
  IF NOT EXISTS (SELECT 1 FROM products WHERE id = p_product_id) THEN
    RETURN QUERY SELECT FALSE, 'Produk tidak ditemukan';
    RETURN;
  END IF;
  
  -- Update product info if provided
  IF p_name IS NOT NULL OR p_description IS NOT NULL OR p_category_id IS NOT NULL THEN
    UPDATE products SET
      name = COALESCE(p_name, name),
      description = COALESCE(p_description, description),
      category_id = COALESCE(p_category_id, category_id),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = p_product_id;
  END IF;
  
  -- Handle variant synchronization if provided
  IF p_variants IS NOT NULL THEN
    -- Validate that p_variants is valid JSON
    BEGIN
      PERFORM jsonb_array_length(p_variants);
    EXCEPTION WHEN OTHERS THEN
      RETURN QUERY SELECT FALSE, 'Format data varian tidak valid: ' || SQLERRM;
      RETURN;
    END;
    
    -- Collect input variant IDs
    SELECT ARRAY_AGG((v->>'id')::INTEGER) INTO input_variant_ids
    FROM jsonb_array_elements(p_variants) AS v
    WHERE v->>'id' IS NOT NULL AND v->>'id' != '';
    
    -- Collect input variant names
    SELECT ARRAY_AGG(v->>'name') INTO input_variant_names
    FROM jsonb_array_elements(p_variants) AS v
    WHERE v->>'name' IS NOT NULL;
    
    -- Step 1: Update existing variants by ID
    FOR existing_variant IN
      SELECT * FROM product_variants
      WHERE product_id = p_product_id
    LOOP
      -- Check if this variant exists in input by ID
      IF existing_variant.id = ANY(input_variant_ids) THEN
        -- Variant exists in both - update it
        SELECT v INTO variant_record
        FROM jsonb_array_elements(p_variants) AS v
        WHERE (v->>'id')::INTEGER = existing_variant.id;
        
        -- Update variant info (excluding stock)
        UPDATE product_variants SET
          name = COALESCE(variant_record->>'name', name),
          description = COALESCE(variant_record->>'description', description),
          cost_price = COALESCE((variant_record->>'cost_price')::INTEGER, cost_price),
          sell_price = COALESCE((variant_record->>'sell_price')::INTEGER, sell_price),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = existing_variant.id;
      ELSE
        -- Variant exists in DB but not in input - delete it
        DELETE FROM product_variants WHERE id = existing_variant.id;
      END IF;
    END LOOP;
    
    -- Step 2: Create new variants (those without ID)
    FOR variant_record IN SELECT * FROM jsonb_array_elements(p_variants)
    LOOP
      -- Skip if this variant has an ID (already handled in step 1)
      IF variant_record->>'id' IS NOT NULL AND variant_record->>'id' != '' THEN
        CONTINUE;
      END IF;
      
      -- Validate new variant
      IF variant_record->>'name' IS NULL OR trim(variant_record->>'name') = '' THEN
        RETURN QUERY SELECT FALSE, 'Nama varian wajib diisi';
        RETURN;
      END IF;
      
      IF (variant_record->>'cost_price')::INTEGER < 0 THEN
        RETURN QUERY SELECT FALSE, 'Harga modal tidak boleh negatif';
        RETURN;
      END IF;
      
      IF (variant_record->>'sell_price')::INTEGER < 0 THEN
        RETURN QUERY SELECT FALSE, 'Harga jual tidak boleh negatif';
        RETURN;
      END IF;
      
      -- Create new variant with stock = 0
      INSERT INTO product_variants (
        product_id, name, description, cost_price, sell_price, stock
      )
      VALUES (
        p_product_id,
        variant_record->>'name',
        variant_record->>'description',
        (variant_record->>'cost_price')::INTEGER,
        (variant_record->>'sell_price')::INTEGER,
        0
      )
      RETURNING id INTO new_variant_id;
    END LOOP;
  END IF;
  
  RETURN QUERY SELECT TRUE, 'Produk dan varian berhasil disinkronisasi';
  
EXCEPTION
  WHEN OTHERS THEN
    -- Rollback happens automatically
    RETURN QUERY SELECT FALSE, SQLERRM;
END;
$$;

-- migrate:down

DROP FUNCTION IF EXISTS sync_product_variants(INTEGER, TEXT, TEXT, INTEGER, JSONB);
DROP FUNCTION IF EXISTS create_product_with_initial_stock(INTEGER, TEXT, TEXT, JSONB);