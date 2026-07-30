-- Add machine_running to ft_defect
ALTER TABLE ft_defect ADD COLUMN IF NOT EXISTS machine_running BOOLEAN DEFAULT TRUE;

-- Update existing records to have machine_running = TRUE
UPDATE ft_defect SET machine_running = TRUE WHERE machine_running IS NULL;
