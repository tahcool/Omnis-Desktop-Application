-- Add RLS policies for stock_inventory table
-- Allow authenticated users to read stock_inventory
DROP POLICY IF EXISTS "Authenticated users can read stock_inventory" ON stock_inventory;
CREATE POLICY "Authenticated users can read stock_inventory"
  ON stock_inventory FOR SELECT TO authenticated USING (true);

-- Allow anon users to read stock_inventory (for Electron desktop which uses anon key)
DROP POLICY IF EXISTS "Anon users can read stock_inventory" ON stock_inventory;
CREATE POLICY "Anon users can read stock_inventory"
  ON stock_inventory FOR SELECT TO anon USING (true);

-- Allow authenticated users to insert/update stock_inventory
DROP POLICY IF EXISTS "Authenticated users can modify stock_inventory" ON stock_inventory;
CREATE POLICY "Authenticated users can modify stock_inventory"
  ON stock_inventory FOR ALL TO authenticated USING (true);

-- Allow anon users to insert/update stock_inventory (Electron desktop app)
DROP POLICY IF EXISTS "Anon users can modify stock_inventory" ON stock_inventory;
CREATE POLICY "Anon users can modify stock_inventory"
  ON stock_inventory FOR ALL TO anon USING (true);

-- Also add policies for stock_potential_customers
DROP POLICY IF EXISTS "Authenticated users can read stock_potential_customers" ON stock_potential_customers;
CREATE POLICY "Authenticated users can read stock_potential_customers"
  ON stock_potential_customers FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Anon users can read stock_potential_customers" ON stock_potential_customers;
CREATE POLICY "Anon users can read stock_potential_customers"
  ON stock_potential_customers FOR SELECT TO anon USING (true);
