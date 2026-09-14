-- Make ft_machine the primary source of truth for the Machine Register.
-- Add any fields used by the register render that may be missing.

ALTER TABLE ft_machine
  ADD COLUMN IF NOT EXISTS machine_status   TEXT,
  ADD COLUMN IF NOT EXISTS working_status   TEXT,
  ADD COLUMN IF NOT EXISTS modified         TIMESTAMPTZ;

-- Ensure indexes exist for the most-filtered columns
CREATE INDEX IF NOT EXISTS idx_ft_machine_customer         ON ft_machine (customer);
CREATE INDEX IF NOT EXISTS idx_ft_machine_region           ON ft_machine (region);
CREATE INDEX IF NOT EXISTS idx_ft_machine_fleetrack        ON ft_machine (fleetrack_managed);
CREATE INDEX IF NOT EXISTS idx_ft_machine_warranty_status  ON ft_machine (warranty_status);
CREATE INDEX IF NOT EXISTS idx_ft_machine_modified         ON ft_machine (modified);

-- Ensure the Frappe sync also writes machine_status, working_status, modified
-- (The JS sync function already passes all non-layout fields so these will be populated
--  on the next sync from Frappe.)
