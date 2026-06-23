-- Create the stock_contracts table
CREATE TABLE IF NOT EXISTS stock_contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contract_name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE stock_contracts ENABLE ROW LEVEL SECURITY;

-- Create policy for public access (or change to authenticated users based on auth setup)
CREATE POLICY "Allow all actions for stock_contracts" ON stock_contracts FOR ALL USING (true);

-- Add contract_name column to stock_inventory if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_inventory' AND column_name = 'contract_name') THEN
        ALTER TABLE stock_inventory ADD COLUMN contract_name VARCHAR(255);
    END IF;
END $$;
