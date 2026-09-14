-- Add contact details columns to customers table
-- These are used by the Fleetrack Add Machine Add New Customer form
-- and are safe for Salestrack to read as well

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS phone        TEXT,
  ADD COLUMN IF NOT EXISTS email_id     TEXT,
  ADD COLUMN IF NOT EXISTS address      TEXT;
