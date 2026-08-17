-- ==============================================================================
-- STEP 1: Generate Missing Foreign Key Indexes
-- ==============================================================================
-- Run this query in your Supabase SQL Editor. 
-- It will output a list of `CREATE INDEX CONCURRENTLY` statements.
-- Copy the results, paste them back into the editor, and run them!

SELECT
  'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_' || 
  replace(replace(a.attname, '_id', ''), 'id', '') || '_' || 
  substring(conrelid::regclass::text from 1 for 20) || 
  ' ON ' || conrelid::regclass || ' (' || a.attname || ');' AS generated_index_query
FROM pg_constraint c
JOIN pg_class cl ON cl.oid = c.conrelid
JOIN pg_namespace n ON n.oid = cl.relnamespace
JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
WHERE c.contype = 'f'
  AND n.nspname = 'public'
  AND NOT EXISTS (
    SELECT 1 FROM pg_index i
    WHERE i.indrelid = c.conrelid AND a.attnum = ANY(i.indkey)
  );
