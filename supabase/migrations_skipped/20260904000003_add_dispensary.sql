-- Create the junction table to link consultations with inventory
CREATE TABLE IF NOT EXISTS omnis_dispensary (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    consultation_id UUID NOT NULL REFERENCES omnis_consultations(id) ON DELETE CASCADE,
    inventory_id UUID NOT NULL REFERENCES omnis_inventory(id) ON DELETE RESTRICT,
    quantity_dispensed INT NOT NULL CHECK (quantity_dispensed > 0),
    dispensed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS for dispensary
ALTER TABLE omnis_dispensary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for admins" ON omnis_dispensary
    FOR ALL
    USING (is_admin());

-- Create a function to auto-deduct inventory stock
CREATE OR REPLACE FUNCTION deduct_inventory_stock()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE omnis_inventory
    SET quantity = quantity - NEW.quantity_dispensed,
        updated_at = timezone('utc'::text, now())
    WHERE id = NEW.inventory_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_deduct_inventory ON omnis_dispensary;
CREATE TRIGGER trigger_deduct_inventory
AFTER INSERT ON omnis_dispensary
FOR EACH ROW EXECUTE FUNCTION deduct_inventory_stock();
