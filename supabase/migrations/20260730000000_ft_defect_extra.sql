-- Add missing Frappe fields to ft_defect

ALTER TABLE public.ft_defect
  ADD COLUMN IF NOT EXISTS ted_status TEXT,
  ADD COLUMN IF NOT EXISTS quotation_sent_date DATE,
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS parts_eta DATE,
  ADD COLUMN IF NOT EXISTS solution TEXT,
  ADD COLUMN IF NOT EXISTS red DATE;
