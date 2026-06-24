-- Run this in your Supabase SQL Editor if you haven't already added the logo_url column

ALTER TABLE stock_company_mappings
ADD COLUMN IF NOT EXISTS logo_url TEXT;
