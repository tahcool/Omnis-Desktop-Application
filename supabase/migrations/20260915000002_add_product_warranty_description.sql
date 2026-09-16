-- Add warranty and description columns to products table
-- (description may already exist from manual addition, so IF NOT EXISTS)

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'products' AND column_name = 'description'
    ) THEN
        ALTER TABLE products ADD COLUMN description TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'products' AND column_name = 'warranty'
    ) THEN
        ALTER TABLE products ADD COLUMN warranty TEXT;
    END IF;
END $$;
