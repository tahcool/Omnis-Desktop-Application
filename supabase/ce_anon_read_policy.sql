-- ============================================================
-- Step 1: Allow the desktop (unauthenticated anon) to READ all
--         customer_enquiries so the Salestrack CE list works.
-- Run this in the Supabase SQL Editor.
-- ============================================================

-- 1a. Drop if exists to avoid duplicate error on re-run
DROP POLICY IF EXISTS "Anon can read all enquiries" ON customer_enquiries;

-- 1b. Allow anon role to select all rows
CREATE POLICY "Anon can read all enquiries"
  ON customer_enquiries
  FOR SELECT
  TO anon
  USING (true);

-- ============================================================
-- Step 2: Add columns that the tablet writes but the original
--         migration didn't include. Safe to run multiple times.
-- ============================================================

ALTER TABLE customer_enquiries
  ADD COLUMN IF NOT EXISTS sales_rep_name  TEXT,
  ADD COLUMN IF NOT EXISTS target_company  TEXT,
  ADD COLUMN IF NOT EXISTS company         TEXT,
  ADD COLUMN IF NOT EXISTS frappe_ref      TEXT,        -- for imported Frappe CEs
  ADD COLUMN IF NOT EXISTS source          TEXT DEFAULT 'tablet'; -- 'tablet' | 'frappe'

-- ============================================================
-- Step 3: Back-fill source column for existing rows
-- ============================================================
UPDATE customer_enquiries
  SET source = 'tablet'
  WHERE source IS NULL;

-- ============================================================
-- Done. Verify with:
--   SELECT id, customer_name, sales_rep_name, status, source
--   FROM customer_enquiries LIMIT 10;
-- ============================================================
