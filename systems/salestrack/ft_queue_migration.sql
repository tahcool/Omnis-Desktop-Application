-- FT Defect Queue Migration
-- Run this in Supabase SQL Editor to enable the FT Defect Queue feature.
-- Adds ft_defect_logged, ft_defect_name, ft_defect_logged_at columns
-- to psv_logs and cdv_logs tables.

-- ── psv_logs ─────────────────────────────────────────────────────────────────
ALTER TABLE psv_logs
    ADD COLUMN IF NOT EXISTS ft_defect_logged     boolean   DEFAULT false,
    ADD COLUMN IF NOT EXISTS ft_defect_name       text,
    ADD COLUMN IF NOT EXISTS ft_defect_logged_at  timestamptz;

-- ── cdv_logs ─────────────────────────────────────────────────────────────────
ALTER TABLE cdv_logs
    ADD COLUMN IF NOT EXISTS ft_defect_logged     boolean   DEFAULT false,
    ADD COLUMN IF NOT EXISTS ft_defect_name       text,
    ADD COLUMN IF NOT EXISTS ft_defect_logged_at  timestamptz;

-- ── Index for fast pending query ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_psv_ft_queue  ON psv_logs  (action_required, ft_defect_logged);
CREATE INDEX IF NOT EXISTS idx_cdv_ft_queue  ON cdv_logs  (action_required, ft_defect_logged);
