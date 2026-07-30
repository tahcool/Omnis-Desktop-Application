-- ================================================================
-- Migration: Add user_profiles and customer_enquiries tables
-- Run this in the Supabase SQL Editor
-- ================================================================

-- 1. user_profiles: Stores name/salesperson info for each auth user
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT,
  salesperson_name TEXT,  -- Maps to Frappe Sales Person for reference
  company TEXT,           -- e.g. 'Machinery Exchange' or 'Industrial Exchange'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can only read/update their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Allow service role to insert (for seeding)
CREATE POLICY "Service role can insert profiles" ON user_profiles
  FOR INSERT WITH CHECK (true);


-- 2. customer_enquiries: Stores customer enquiries submitted from the tablet app
CREATE TABLE IF NOT EXISTS customer_enquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by UUID REFERENCES auth.users(id),
  customer_name TEXT NOT NULL,
  request_details TEXT NOT NULL,
  estimated_value NUMERIC DEFAULT 0,
  items JSONB DEFAULT '[]',
  status TEXT DEFAULT 'Open',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE customer_enquiries ENABLE ROW LEVEL SECURITY;

-- Users can read their own enquiries; service role can read all
CREATE POLICY "Users can view own enquiries" ON customer_enquiries
  FOR SELECT USING (auth.uid() = submitted_by);

CREATE POLICY "Users can insert enquiries" ON customer_enquiries
  FOR INSERT WITH CHECK (auth.uid() = submitted_by);

CREATE POLICY "Users can update own enquiries" ON customer_enquiries
  FOR UPDATE USING (auth.uid() = submitted_by);


-- ================================================================
-- Seed user_profiles from existing auth.users
-- Run this AFTER the table is created
-- ================================================================
INSERT INTO user_profiles (id, full_name, email)
SELECT 
  id,
  COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)),
  email
FROM auth.users
ON CONFLICT (id) DO NOTHING;
