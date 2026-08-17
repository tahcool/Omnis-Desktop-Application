-- ==============================================================================
-- STEP 3 & 4: Database Telemetry & Diagnostics
-- ==============================================================================
-- These queries will help us find what is slowing down your database.
-- Run them one by one in your SQL Editor!

-- ------------------------------------------------------------------------------
-- Query A: Top 10 Slowest Queries
-- (This shows us exactly which operations from your app take the longest)
-- ------------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

SELECT
  calls,
  round(total_exec_time::numeric, 2) as total_time_ms,
  round(mean_exec_time::numeric, 2) as average_time_ms,
  query
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%' 
  AND query NOT LIKE '%BEGIN%' 
  AND query NOT LIKE '%COMMIT%'
ORDER BY total_exec_time DESC
LIMIT 10;

-- ------------------------------------------------------------------------------
-- Query B: Find Unused Indexes
-- (Indexes that take up space and slow down writes, but are never used for reading)
-- ------------------------------------------------------------------------------
SELECT
  schemaname || '.' || relname AS table_name,
  indexrelname AS index_name,
  idx_scan AS number_of_times_used,
  pg_size_pretty(pg_relation_size(i.indexrelid)) AS index_size
FROM pg_stat_user_indexes ui
JOIN pg_index i ON ui.indexrelid = i.indexrelid
WHERE NOT indisunique       -- Don't delete unique constraints!
  AND idx_scan < 50         -- Rarely used
  AND schemaname = 'public'
ORDER BY pg_relation_size(i.indexrelid) DESC
LIMIT 20;
