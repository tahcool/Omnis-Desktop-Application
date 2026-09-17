-- Add company column to fmb_reports for order tracking company assignment
ALTER TABLE public.fmb_reports ADD COLUMN IF NOT EXISTS company TEXT;

-- Create index for company filtering
CREATE INDEX IF NOT EXISTS idx_fmb_reports_company ON fmb_reports(company);
