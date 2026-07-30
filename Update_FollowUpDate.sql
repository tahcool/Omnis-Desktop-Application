-- =============================================================
-- Migration: Add follow_up_date to cdv_logs and psv_logs
-- Run this in Supabase SQL Editor
-- =============================================================

-- Add follow_up_date column to cdv_logs
ALTER TABLE cdv_logs
ADD COLUMN IF NOT EXISTS follow_up_date DATE;

-- Comment explaining the column usage
COMMENT ON COLUMN cdv_logs.follow_up_date IS 'Optional follow-up date for visits requiring action';


-- Add follow_up_date column to psv_logs
ALTER TABLE psv_logs
ADD COLUMN IF NOT EXISTS follow_up_date DATE;

-- Comment explaining the column usage
COMMENT ON COLUMN psv_logs.follow_up_date IS 'Optional follow-up date for visits requiring action';
