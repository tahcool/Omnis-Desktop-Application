-- ================================================================
-- Fix: Allow authenticated users to read customers and products
-- Run this in the Supabase SQL Editor
-- ================================================================

-- ISSUE: When a user logs in (role = 'authenticated'), RLS blocks
-- reads on customers and products because only the 'anon' role
-- had SELECT access. These tables are read-only reference data,
-- so all authenticated users should be able to search them.

-- 1. Allow authenticated users to read all customers
CREATE POLICY "Authenticated users can read customers"
  ON customers
  FOR SELECT
  TO authenticated
  USING (true);

-- 2. Allow authenticated users to read all products
CREATE POLICY "Authenticated users can read products"
  ON products
  FOR SELECT
  TO authenticated
  USING (true);

-- 3. Allow authenticated users to read all fmb_reports (order tracking)
-- (Already works, but adding explicit policy for clarity)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'fmb_reports' 
    AND policyname = 'Authenticated users can read fmb_reports'
  ) THEN
    EXECUTE 'CREATE POLICY "Authenticated users can read fmb_reports"
      ON fmb_reports FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;
