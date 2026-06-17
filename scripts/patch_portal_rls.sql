-- ═══════════════════════════════════════════════════════════════════════════
-- PATCH: Add write policies to portal tables
-- The main app uses sb_secret_ key which should bypass RLS, but some
-- Supabase SDK versions need explicit policies. Run this in SQL editor:
-- https://supabase.com/dashboard/project/pfqaeewmlwfayxbgmuaq/sql/new
-- ═══════════════════════════════════════════════════════════════════════════

-- ── ft_customer_portal_accounts ────────────────────────────────────────────
-- Admins write via service_role (main.js IPC). No customer writes needed here.

CREATE POLICY "portal_accounts_insert"
  ON public.ft_customer_portal_accounts
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "portal_accounts_update"
  ON public.ft_customer_portal_accounts
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "portal_accounts_delete"
  ON public.ft_customer_portal_accounts
  FOR DELETE
  USING (true);


-- ── ft_portal_machine_assignments ──────────────────────────────────────────
-- Admin assigns machines. Customers only read.

CREATE POLICY "portal_assignments_insert"
  ON public.ft_portal_machine_assignments
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "portal_assignments_delete"
  ON public.ft_portal_machine_assignments
  FOR DELETE
  USING (true);


-- ── ft_portal_defect_reports ───────────────────────────────────────────────
-- The INSERT policy already exists from the initial SQL.
-- Add an UPDATE policy for admin status changes.

CREATE POLICY "portal_reports_update"
  ON public.ft_portal_defect_reports
  FOR UPDATE
  USING (true)
  WITH CHECK (true);


-- ── ft_portal_impersonation_log ────────────────────────────────────────────
CREATE POLICY "portal_impersonate_log_insert"
  ON public.ft_portal_impersonation_log
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "portal_impersonate_log_select"
  ON public.ft_portal_impersonation_log
  FOR SELECT
  USING (true);


-- ── VERIFY ─────────────────────────────────────────────────────────────────
SELECT schemaname, tablename, policyname, cmd
FROM pg_policies
WHERE tablename LIKE 'ft_portal%'
   OR tablename = 'ft_customer_portal_accounts'
ORDER BY tablename, cmd;
