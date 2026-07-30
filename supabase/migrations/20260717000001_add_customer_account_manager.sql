-- Add account_manager and last_visit_date to customers
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS account_manager TEXT,
ADD COLUMN IF NOT EXISTS last_visit_date DATE;
