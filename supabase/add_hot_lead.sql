-- Add is_hot_lead boolean column
ALTER TABLE customer_enquiries
  ADD COLUMN IF NOT EXISTS is_hot_lead BOOLEAN DEFAULT false;
