-- Add cohabitants column to omnis_patients
ALTER TABLE public.omnis_patients ADD COLUMN IF NOT EXISTS cohabitants TEXT;
