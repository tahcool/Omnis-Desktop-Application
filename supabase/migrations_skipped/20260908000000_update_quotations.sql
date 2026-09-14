ALTER TABLE omnis_quotations ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE omnis_quotations ADD COLUMN IF NOT EXISTS custom_next_follow_up_date DATE;
