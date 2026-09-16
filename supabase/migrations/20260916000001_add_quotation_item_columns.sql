-- Add missing columns to omnis_quotation_items: item_name, description, custom_lead_time
-- These are needed by the quotation creation form

ALTER TABLE public.omnis_quotation_items
    ADD COLUMN IF NOT EXISTS item_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS custom_lead_time VARCHAR(255);
