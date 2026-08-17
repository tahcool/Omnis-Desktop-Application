-- ==============================================================================
-- STEP 2: Generate RLS Performance Optimizations
-- ==============================================================================
-- Run this query in your Supabase SQL Editor. 
-- It will find all Row Level Security policies that use the un-optimized 
-- `auth.uid()` call and generate `ALTER POLICY` statements to wrap them in 
-- `(select auth.uid())`, making your database queries much faster.

SELECT
  'ALTER POLICY "' || policyname || '" ON public.' || tablename || 
  CASE 
    WHEN qual IS NOT NULL THEN ' USING (' || replace(qual::text, 'auth.uid()', '(select auth.uid())') || ')' 
    ELSE '' 
  END ||
  CASE 
    WHEN with_check IS NOT NULL THEN ' WITH CHECK (' || replace(with_check::text, 'auth.uid()', '(select auth.uid())') || ')' 
    ELSE '' 
  END ||
  ';' AS generated_rls_query
FROM pg_policies
WHERE schemaname = 'public'
  AND (qual::text LIKE '%auth.uid()%' OR with_check::text LIKE '%auth.uid()%')
  AND (qual::text NOT LIKE '%(select auth.uid())%' AND with_check::text NOT LIKE '%(select auth.uid())%');
