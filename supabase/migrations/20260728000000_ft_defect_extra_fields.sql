-- Migration: Add technician, reported_by, hmr_at_defect to ft_defect
-- These are additive-only (NULLable) — all existing rows remain valid.

ALTER TABLE ft_defect
  ADD COLUMN IF NOT EXISTS technician     TEXT,
  ADD COLUMN IF NOT EXISTS reported_by    TEXT,
  ADD COLUMN IF NOT EXISTS hmr_at_defect  INTEGER;

-- Index for technician lookups
CREATE INDEX IF NOT EXISTS idx_ft_defect_technician ON ft_defect (technician);
