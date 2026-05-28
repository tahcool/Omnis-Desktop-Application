-- ==============================================================================
-- PHASE 6: MACHINE LIBRARY → SUPABASE STORAGE
-- Adds library_supabase_urls JSONB column to ft_machine and creates the
-- machine-library storage bucket with full public read access.
-- Run this in Supabase SQL Editor before using the library sync feature.
-- ==============================================================================

-- 1. Add JSONB column to store Supabase Storage URLs for all 14 library fields.
--    This column is separate from the Frappe-path columns so syncMachinesToSupabase
--    never overwrites Supabase Storage URLs when it runs.
ALTER TABLE public.ft_machine
  ADD COLUMN IF NOT EXISTS library_supabase_urls JSONB DEFAULT '{}';

-- 2. Index on library_supabase_urls for fast presence checks
CREATE INDEX IF NOT EXISTS idx_ft_machine_lib_sb_urls
  ON public.ft_machine USING GIN (library_supabase_urls);

-- 3. Create the machine-library storage bucket (public = anyone can read files)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'machine-library',
  'machine-library',
  true,
  52428800,  -- 50 MB per file limit
  ARRAY[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip',
    'application/octet-stream',
    'text/plain'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- 4. Storage policies for machine-library bucket
--    Public read (anyone can view/download library files)
CREATE POLICY "machine-library public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'machine-library');

--    Allow insert (uploading files)
CREATE POLICY "machine-library allow insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'machine-library');

--    Allow update (re-uploading / replacing)
CREATE POLICY "machine-library allow update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'machine-library');

--    Allow delete (removing old files)
CREATE POLICY "machine-library allow delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'machine-library');

-- ==============================================================================
-- VERIFICATION
-- ==============================================================================
-- SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_name = 'ft_machine' AND column_name = 'library_supabase_urls';
-- SELECT id, name, public FROM storage.buckets WHERE id = 'machine-library';
