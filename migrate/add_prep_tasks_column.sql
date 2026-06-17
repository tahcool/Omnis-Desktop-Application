-- Run this in your Supabase SQL Editor
-- This adds a JSONB column to store the interactive Prep Tasks for the Delivery Calendar

ALTER TABLE public."frappe_fmb_report_machine" 
ADD COLUMN IF NOT EXISTS "prep_tasks" JSONB DEFAULT '{"pdi":false,"grease":false,"manual":false,"custom":[]}';

ALTER TABLE public."frappe_fmb_report_machine" 
ADD COLUMN IF NOT EXISTS "training_date" DATE;

ALTER TABLE public."frappe_fmb_report_machine"
ADD COLUMN IF NOT EXISTS "people_trained" TEXT;
