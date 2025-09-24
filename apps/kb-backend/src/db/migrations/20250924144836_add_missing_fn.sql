-- migrate:up
CREATE OR REPLACE FUNCTION count_documents_by_collection()
RETURNS jsonb
LANGUAGE plpgsql
PARALLEL SAFE
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_object_agg(c.name, COALESCE(counts.cnt, 0))
  INTO result
  FROM collections c
  LEFT JOIN (
    SELECT
      d.collection_id,
      count(d.id) as cnt
    FROM documents d
    GROUP BY d.collection_id
  ) AS counts ON c.id = counts.collection_id;

  RETURN COALESCE(result, '{}'::jsonb);
END;
$$;

-- Renamed from get_documents_by_source_id
-- Adapted to use collection_id and columns from the 'documents' table.
-- Removed user access logic as the corresponding table does not exist in the schema.
CREATE OR REPLACE FUNCTION get_documents_by_collection_id(
  collection_id_input bigint,
  metadata_filters jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (
  id bigint,
  title text,
  metadata jsonb,
  updated_at timestamptz
)
LANGUAGE plpgsql
PARALLEL SAFE
AS $$
BEGIN
  RETURN QUERY
    SELECT
      doc.id,
      doc.title,
      doc.metadata,
      doc.updated_at
    FROM
      documents doc
    WHERE
      doc.collection_id = collection_id_input
      AND (
        metadata_filters = '{}'::jsonb
        OR
        -- Re-using the robust metadata filtering logic from the original function
        (SELECT bool_and(
          CASE
            -- Handle boolean/string type mismatch
            WHEN jsonb_typeof(doc.metadata->key) = 'boolean' AND jsonb_typeof(value) = 'string' THEN
              CASE
                 WHEN (value#>>'{}'= 'true' AND (doc.metadata->key)::boolean = true) OR
                      (value#>>'{}'= 'false' AND (doc.metadata->key)::boolean = false) THEN true
                ELSE false
              END
            -- Handle string/boolean type mismatch
            WHEN jsonb_typeof(doc.metadata->key) = 'string' AND jsonb_typeof(value) = 'boolean' THEN
              CASE
                 WHEN ((doc.metadata->>key) = 'true' AND value::boolean = true) OR
                      ((doc.metadata->>key) = 'false' AND value::boolean = false) THEN true
                ELSE false
              END
            -- Handle array values in filter
            WHEN jsonb_typeof(value) = 'array' THEN
              (doc.metadata->key IS NOT NULL AND
                (
                 -- If metadata value is scalar, check if it matches any element in the filter array
                 (jsonb_typeof(doc.metadata->key) != 'array' AND
                  doc.metadata->>key = ANY(ARRAY(SELECT jsonb_array_elements_text(value))))
                 OR
                 -- If metadata value is array, check if there's any overlap
                 (jsonb_typeof(doc.metadata->key) = 'array' AND
                  doc.metadata->key ?| ARRAY(SELECT jsonb_array_elements_text(value)))
               )
              )
            -- Standard containment for same types
            ELSE
              doc.metadata->key IS NOT NULL AND doc.metadata->key @> value
          END
        ) FROM jsonb_each(metadata_filters))
      );
END;
$$;

-- Renamed from upsert_document_with_access
-- Adapted to the provided schema:
-- 1. Uses collection_id and title as the business key for the upsert operation.
-- 2. Removes all user access control logic.
-- 3. Removes fields not present in the 'documents' table (e.g., source_*, last_updated_source_user_id).
CREATE OR REPLACE FUNCTION upsert_document(
  -- Document parameters based on the schema
  collection_id_input BIGINT,
  title_input TEXT,
  content_input TEXT,
  summary_input TEXT,
  summary_embedding_input VECTOR(1024),
  -- Optional parameters
  hierarchy_path_input TEXT DEFAULT NULL,
  metadata_input JSONB DEFAULT NULL,
  -- Return values
  OUT document_id BIGINT,
  OUT is_new BOOLEAN
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_existing_doc_id BIGINT;
BEGIN
  -- Check if a document with the same collection_id and title already exists.
  SELECT d.id INTO v_existing_doc_id
  FROM documents d
  WHERE d.collection_id = collection_id_input
    AND d.title = title_input
  LIMIT 1;

  IF v_existing_doc_id IS NOT NULL THEN
    -- === UPDATE PATH ===
    is_new := FALSE;
    document_id := v_existing_doc_id;

    -- Update the existing document record.
    -- The 'updated_at' field is handled automatically by the trigger.
    UPDATE documents
    SET
      content = content_input,
      summary = summary_input,
      summary_embedding = summary_embedding_input,
      hierarchy_path = hierarchy_path_input,
      metadata = metadata_input
    WHERE id = v_existing_doc_id;

    -- Delete existing chunks to be recreated by the application layer.
    DELETE FROM document_chunks dc
    WHERE dc.document_id = v_existing_doc_id;

  ELSE
    -- === INSERT PATH ===
    is_new := TRUE;

    -- Insert a new document record.
    -- 'created_at' and 'updated_at' have default values.
    INSERT INTO documents (
      collection_id,
      title,
      content,
      summary,
      summary_embedding,
      hierarchy_path,
      metadata
    ) VALUES (
      collection_id_input,
      title_input,
      content_input,
      summary_input,
      summary_embedding_input,
      hierarchy_path_input,
      metadata_input
    )
    RETURNING id INTO document_id;

  END IF;
END;
$$;

-- migrate:down

