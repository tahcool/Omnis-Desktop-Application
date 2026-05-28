-- Run this once in the Supabase SQL Editor
-- https://supabase.com/dashboard/project/pfqaeewmlwfayxbgmuaq/sql

CREATE TABLE IF NOT EXISTS public.ft_portal_impersonation_log (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_name     text,
  customer_name  text,
  customer_email text NOT NULL,
  reason         text NOT NULL,
  portal_url     text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- Only service role can read/write (RLS denies all normal users)
ALTER TABLE public.ft_portal_impersonation_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deny_all" ON public.ft_portal_impersonation_log FOR ALL USING (false);
