-- Add division column to support Powerstar Trucks division
-- Default is 'fleetrack' for all existing data. Powerstar data will be inserted as 'powerstar'.

ALTER TABLE ft_customer
  ADD COLUMN IF NOT EXISTS division TEXT DEFAULT 'fleetrack';

ALTER TABLE ft_machine
  ADD COLUMN IF NOT EXISTS division TEXT DEFAULT 'fleetrack';

ALTER TABLE public.ft_breakdown_logs
  ADD COLUMN IF NOT EXISTS division TEXT DEFAULT 'fleetrack';

-- Create indexes for division filtering
CREATE INDEX IF NOT EXISTS idx_ft_customer_division ON ft_customer(division);
CREATE INDEX IF NOT EXISTS idx_ft_machine_division ON ft_machine(division);
CREATE INDEX IF NOT EXISTS idx_ft_breakdown_logs_division ON public.ft_breakdown_logs(division);
