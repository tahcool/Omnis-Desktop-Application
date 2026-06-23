-- Run this entirely in the Supabase SQL Editor

ALTER TABLE public.omnis_quote_lifecycle 
ADD COLUMN IF NOT EXISTS is_hot_lead boolean DEFAULT false;
