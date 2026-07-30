-- Migration: Add frappe_name column to ft_service_plan for backfill deduplication
-- Required for the Fleetrack backfill to upsert service plans without duplicate key errors.
-- The backfill uses frappe_name as the unique conflict target.

ALTER TABLE public.ft_service_plan
  ADD COLUMN IF NOT EXISTS frappe_name TEXT;

-- Create unique index only if column was just added (will skip if already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'ft_service_plan'
      AND indexname = 'ft_service_plan_frappe_name_key'
  ) THEN
    CREATE UNIQUE INDEX ft_service_plan_frappe_name_key
      ON public.ft_service_plan (frappe_name)
      WHERE frappe_name IS NOT NULL;
  END IF;
END;
$$;
