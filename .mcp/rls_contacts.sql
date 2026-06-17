ALTER TABLE public.company_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY anon_read ON public.company_contacts FOR SELECT USING (true);
CREATE POLICY service_all ON public.company_contacts FOR ALL TO service_role USING (true) WITH CHECK (true);

SELECT policyname, cmd FROM pg_policies WHERE tablename = 'company_contacts';
