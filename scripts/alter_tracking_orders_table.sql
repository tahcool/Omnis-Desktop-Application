-- Alter the omnis_tracking_orders table to add linking and tracking columns
ALTER TABLE public.omnis_tracking_orders 
ADD COLUMN IF NOT EXISTS linked_sale_name TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS order_date DATE,
ADD COLUMN IF NOT EXISTS committed_lead_time TEXT,
ADD COLUMN IF NOT EXISTS revised_handover DATE,
ADD COLUMN IF NOT EXISTS actual_handover DATE,
ADD COLUMN IF NOT EXISTS brand TEXT,
ADD COLUMN IF NOT EXISTS model TEXT;

-- Refresh schema cache if needed
NOTIFY pgrst, 'reload schema';
