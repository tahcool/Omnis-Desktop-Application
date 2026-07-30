-- =============================================================
-- Migration: Add visit_type to cdv_logs
-- Run this in Supabase SQL Editor
-- =============================================================

-- Add visit_type column to track PSV, CDV, FCDV
ALTER TABLE cdv_logs
ADD COLUMN IF NOT EXISTS visit_type TEXT NOT NULL DEFAULT 'CDV';

-- Comment explaining the column usage
COMMENT ON COLUMN cdv_logs.visit_type IS 'Tracks the type of visit (PSV, CDV, FCDV)';
