-- Migration: Add location and defects columns to ft_service_plan
-- Required to migrate the Field Service Planning completely away from Frappe.

ALTER TABLE public.ft_service_plan
  ADD COLUMN IF NOT EXISTS location TEXT,
  ADD COLUMN IF NOT EXISTS defects TEXT,
  ADD COLUMN IF NOT EXISTS name TEXT; -- Ensure there's a name column for UI consistency

-- Optional index for faster location-based queries
CREATE INDEX IF NOT EXISTS idx_ft_service_plan_location ON public.ft_service_plan(location);
