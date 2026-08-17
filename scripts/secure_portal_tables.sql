-- ==============================================================================
-- FIX: Secure Fleetrack Customer Portal Tables (OPTIMIZED & IDEMPOTENT)
-- Run this in your Supabase SQL Editor to fix the "RLS Disabled" and 
-- "Sensitive Columns Exposed" critical security warnings.
-- Includes the Performance Fix for "Auth RLS Initialization Plan"
-- ==============================================================================

-- 1. Enable RLS on all portal tables so the database is locked by default
ALTER TABLE public.ft_portal_fuel_logs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ft_portal_hmr_logs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ft_portal_customer_machines   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ft_portal_operators           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ft_portal_operator_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ft_portal_breakdown_reports   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ft_portal_rentals             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ft_mca                        ENABLE ROW LEVEL SECURITY;

-- 2. Drop the dangerous "USING (true)" policies that were making things public
DO $$ 
BEGIN
  -- Drop dangerous policies on portal accounts
  DROP POLICY IF EXISTS "portal_accounts_insert" ON public.ft_customer_portal_accounts;
  DROP POLICY IF EXISTS "portal_accounts_update" ON public.ft_customer_portal_accounts;
  DROP POLICY IF EXISTS "portal_accounts_delete" ON public.ft_customer_portal_accounts;
  
  -- Drop dangerous policies on machine assignments
  DROP POLICY IF EXISTS "portal_assignments_insert" ON public.ft_portal_machine_assignments;
  DROP POLICY IF EXISTS "portal_assignments_delete" ON public.ft_portal_machine_assignments;
  
  -- Drop dangerous policies on impersonation log
  DROP POLICY IF EXISTS "portal_impersonate_log_insert" ON public.ft_portal_impersonation_log;
  DROP POLICY IF EXISTS "portal_impersonate_log_select" ON public.ft_portal_impersonation_log;
  
  -- Drop dangerous policies on defect reports
  DROP POLICY IF EXISTS "portal_reports_update" ON public.ft_portal_defect_reports;
END $$;

-- 3. Create SECURE and OPTIMIZED policies based on the user's authenticated Supabase token
-- Note the use of `(SELECT auth.uid())` instead of just `auth.uid()`. This fixes the 
-- "Auth RLS Initialization Plan" performance warning.

-- FUEL LOGS
DROP POLICY IF EXISTS "portal_fuel_logs_secure_access" ON public.ft_portal_fuel_logs;
CREATE POLICY "portal_fuel_logs_secure_access" ON public.ft_portal_fuel_logs FOR ALL TO authenticated
USING ( portal_account_id IN (SELECT id FROM public.ft_customer_portal_accounts WHERE auth_user_id = (SELECT auth.uid()) AND is_active = true) );

-- HMR LOGS
DROP POLICY IF EXISTS "portal_hmr_logs_secure_access" ON public.ft_portal_hmr_logs;
CREATE POLICY "portal_hmr_logs_secure_access" ON public.ft_portal_hmr_logs FOR ALL TO authenticated
USING ( portal_account_id IN (SELECT id FROM public.ft_customer_portal_accounts WHERE auth_user_id = (SELECT auth.uid()) AND is_active = true) );

-- CUSTOMER MACHINES
DROP POLICY IF EXISTS "portal_customer_machines_secure_access" ON public.ft_portal_customer_machines;
CREATE POLICY "portal_customer_machines_secure_access" ON public.ft_portal_customer_machines FOR ALL TO authenticated
USING ( portal_account_id IN (SELECT id FROM public.ft_customer_portal_accounts WHERE auth_user_id = (SELECT auth.uid()) AND is_active = true) );

-- OPERATORS
DROP POLICY IF EXISTS "portal_operators_secure_access" ON public.ft_portal_operators;
CREATE POLICY "portal_operators_secure_access" ON public.ft_portal_operators FOR ALL TO authenticated
USING ( portal_account_id IN (SELECT id FROM public.ft_customer_portal_accounts WHERE auth_user_id = (SELECT auth.uid()) AND is_active = true) );

-- OPERATOR ASSIGNMENTS
DROP POLICY IF EXISTS "portal_operator_assignments_secure_access" ON public.ft_portal_operator_assignments;
CREATE POLICY "portal_operator_assignments_secure_access" ON public.ft_portal_operator_assignments FOR ALL TO authenticated
USING ( portal_account_id IN (SELECT id FROM public.ft_customer_portal_accounts WHERE auth_user_id = (SELECT auth.uid()) AND is_active = true) );

-- BREAKDOWN REPORTS
DROP POLICY IF EXISTS "portal_breakdowns_secure_access" ON public.ft_portal_breakdown_reports;
CREATE POLICY "portal_breakdowns_secure_access" ON public.ft_portal_breakdown_reports FOR ALL TO authenticated
USING ( portal_account_id IN (SELECT id FROM public.ft_customer_portal_accounts WHERE auth_user_id = (SELECT auth.uid()) AND is_active = true) );

-- RENTALS
DROP POLICY IF EXISTS "portal_rentals_secure_access" ON public.ft_portal_rentals;
CREATE POLICY "portal_rentals_secure_access" ON public.ft_portal_rentals FOR ALL TO authenticated
USING ( portal_account_id IN (SELECT id FROM public.ft_customer_portal_accounts WHERE auth_user_id = (SELECT auth.uid()) AND is_active = true) );


-- 4. Fix performance warnings on existing tables
-- Recreate the policy for ft_customer_portal_accounts with the optimized syntax
DROP POLICY IF EXISTS "portal_account_self_read" ON public.ft_customer_portal_accounts;
CREATE POLICY "portal_account_self_read" ON public.ft_customer_portal_accounts FOR SELECT TO authenticated
USING ( auth_user_id = (SELECT auth.uid()) AND is_active = true );

-- Recreate the policy for ft_portal_machine_assignments with the optimized syntax
DROP POLICY IF EXISTS "portal_assignments_self_read" ON public.ft_portal_machine_assignments;
CREATE POLICY "portal_assignments_self_read" ON public.ft_portal_machine_assignments FOR SELECT TO authenticated
USING ( portal_account_id IN (SELECT id FROM public.ft_customer_portal_accounts WHERE auth_user_id = (SELECT auth.uid()) AND is_active = true) );

-- Recreate the policy for ft_portal_defect_reports with the optimized syntax
DROP POLICY IF EXISTS "portal_reports_self_read" ON public.ft_portal_defect_reports;
CREATE POLICY "portal_reports_self_read" ON public.ft_portal_defect_reports FOR SELECT TO authenticated
USING ( portal_account_id IN (SELECT id FROM public.ft_customer_portal_accounts WHERE auth_user_id = (SELECT auth.uid()) AND is_active = true) );

DROP POLICY IF EXISTS "portal_reports_self_insert" ON public.ft_portal_defect_reports;
CREATE POLICY "portal_reports_self_insert" ON public.ft_portal_defect_reports FOR INSERT TO authenticated
WITH CHECK ( portal_account_id IN (SELECT id FROM public.ft_customer_portal_accounts WHERE auth_user_id = (SELECT auth.uid()) AND is_active = true) );
