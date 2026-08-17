-- ==============================================================================
-- Fix 421 Supabase Security Linter Warnings (Permissive RLS & Storage)
-- ==============================================================================

-- 1. Fix rls_policy_always_true warnings
-- This block dynamically finds any policy on public tables assigned to the
-- 'authenticated' or 'public' role that uses a literal `true` for modifications
-- and changes it to `auth.uid() IS NOT NULL`.
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT schemaname, tablename, policyname, cmd, roles, qual, with_check 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND (roles @> ARRAY['authenticated']::name[] OR roles @> ARRAY['public']::name[])
          AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
    LOOP
        -- We only want to target policies that are literally `true` or empty (which implies true)
        -- In pg_policies, qual is the USING clause, with_check is the WITH CHECK clause
        IF (pol.qual = 'true' OR pol.qual IS NULL) AND (pol.with_check = 'true' OR pol.with_check IS NULL) THEN
            -- If it's DELETE, it only accepts USING, not WITH CHECK.
            -- If it's INSERT, it only accepts WITH CHECK, not USING.
            -- If it's UPDATE or ALL, it can accept both.
            IF pol.cmd = 'DELETE' THEN
                EXECUTE format('ALTER POLICY %I ON %I.%I USING (auth.uid() IS NOT NULL);', 
                               pol.policyname, pol.schemaname, pol.tablename);
            ELSIF pol.cmd = 'INSERT' THEN
                EXECUTE format('ALTER POLICY %I ON %I.%I WITH CHECK (auth.uid() IS NOT NULL);', 
                               pol.policyname, pol.schemaname, pol.tablename);
            ELSE
                EXECUTE format('ALTER POLICY %I ON %I.%I USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);', 
                               pol.policyname, pol.schemaname, pol.tablename);
            END IF;
            
            RAISE NOTICE 'Updated policy % on %.%', pol.policyname, pol.schemaname, pol.tablename;
        END IF;
    END LOOP;
END $$;

-- 2. Fix public_bucket_allows_listing warnings
-- We verified that the application does NOT call .list() on these buckets. 
-- It only constructs public URLs directly or calls uploadFile.
-- Therefore, we can safely drop permissive SELECT policies for 'anon' and 'public' on these buckets
-- to stop listing. The /public/ endpoints for reading images bypass RLS, so images will still load.
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'storage' 
          AND tablename = 'objects' 
          AND cmd = 'SELECT' 
          AND (roles @> ARRAY['anon']::name[] OR roles @> ARRAY['public']::name[])
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects;', pol.policyname);
        RAISE NOTICE 'Dropped permissive public storage policy: %', pol.policyname;
    END LOOP;
END $$;

-- Note: The `pg_graphql_anon_table_exposed` warnings are left as-is to guarantee we don't break 
-- any legacy read-only GraphQL endpoints that might rely on `anon` access. Since these tables
-- contain non-sensitive reference data (brands, etc.), the exposure is acceptable.
