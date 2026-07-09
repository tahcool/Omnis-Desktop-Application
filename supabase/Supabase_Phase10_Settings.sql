-- Supabase_Phase10_Settings.sql
-- Create table for storing global app settings like Email CC Recipients

CREATE TABLE IF NOT EXISTS omnis_app_settings (
  setting_key text PRIMARY KEY,
  setting_value jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS (Row Level Security)
ALTER TABLE omnis_app_settings ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users
CREATE POLICY "Allow authenticated read on omnis_app_settings"
  ON omnis_app_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow write access to authenticated users
CREATE POLICY "Allow authenticated write on omnis_app_settings"
  ON omnis_app_settings
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create a generic trigger to auto-update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Attach trigger to omnis_app_settings
DROP TRIGGER IF EXISTS trg_omnis_app_settings_updated_at ON omnis_app_settings;
CREATE TRIGGER trg_omnis_app_settings_updated_at
  BEFORE UPDATE ON omnis_app_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
