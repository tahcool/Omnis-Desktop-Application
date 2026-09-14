-- Add salesperson_follow_up_date to omnis_quotations
ALTER TABLE omnis_quotations ADD COLUMN IF NOT EXISTS salesperson_follow_up_date DATE;
