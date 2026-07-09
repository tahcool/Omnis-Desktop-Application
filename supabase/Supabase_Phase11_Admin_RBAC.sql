-- Phase 11: Admin RBAC & System Access

CREATE TABLE IF NOT EXISTS public.user_system_access (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  is_admin boolean DEFAULT false,
  systems jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_system_access ENABLE ROW LEVEL SECURITY;

-- Helper function to check if current user is admin without triggering RLS recursion
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
DECLARE
  status boolean;
BEGIN
  SELECT is_admin INTO status FROM public.user_system_access WHERE user_id = auth.uid();
  RETURN COALESCE(status, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policy: Admins can do everything
DROP POLICY IF EXISTS "Admins have full access to user_system_access" ON public.user_system_access;
CREATE POLICY "Admins have full access to user_system_access"
  ON public.user_system_access
  FOR ALL
  USING ( public.is_admin() );

-- Policy: Users can read their own row
DROP POLICY IF EXISTS "Users can read their own access level" ON public.user_system_access;
CREATE POLICY "Users can read their own access level"
  ON public.user_system_access
  FOR SELECT
  USING (user_id = auth.uid());

-- Service role bypasses RLS naturally, so Electron's IPC creating users/updating access via service_key will just work.

-- Trigger to create row on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user_access()
RETURNS trigger AS $$
BEGIN
  -- We'll default gh05t to admin
  IF NEW.email = 'gh05t@omnis.local' THEN
    INSERT INTO public.user_system_access (user_id, is_admin, systems)
    VALUES (NEW.id, true, '["fleetrack", "salestrack", "powertrack", "engtrack", "spe", "medicals"]'::jsonb);
  ELSE
    INSERT INTO public.user_system_access (user_id, is_admin, systems)
    VALUES (NEW.id, false, '[]'::jsonb);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_access ON auth.users;
CREATE TRIGGER on_auth_user_created_access
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_access();
