ALTER TABLE stock_inventory
ADD COLUMN IF NOT EXISTS is_preowned BOOLEAN DEFAULT false;
