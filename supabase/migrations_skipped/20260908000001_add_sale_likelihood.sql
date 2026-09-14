-- Add likelihood_percent for "Hot" quotation tracking
ALTER TABLE public.omnis_quotations 
ADD COLUMN IF NOT EXISTS likelihood_percent INTEGER DEFAULT 0;
