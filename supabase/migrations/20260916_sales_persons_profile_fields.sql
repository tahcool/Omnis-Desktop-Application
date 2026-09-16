-- Add job_title and phone_number to omnis_sales_persons
-- These fields are used in quotation PDF signature blocks

ALTER TABLE public.omnis_sales_persons
  ADD COLUMN IF NOT EXISTS job_title TEXT,
  ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Seed known values
UPDATE public.omnis_sales_persons SET job_title = 'National Equipment Sales Manager', phone_number = '+263 772 294 246' WHERE name = 'Antony Dube';

-- Default everyone else to "Sales Representative" if they don't have a title
UPDATE public.omnis_sales_persons SET job_title = 'Sales Representative' WHERE job_title IS NULL;
