-- JRV Child Tables — run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public."frappe_ft_jrv_description" (
  "name" text PRIMARY KEY,
  "parent" text,
  "idx" bigint,
  "basic_description" text
);
ALTER TABLE public."frappe_ft_jrv_description" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON public."frappe_ft_jrv_description" FOR ALL TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public."frappe_ft_jrv_detailed_description" (
  "name" text PRIMARY KEY,
  "parent" text,
  "idx" bigint,
  "description" text,
  "type" text
);
ALTER TABLE public."frappe_ft_jrv_detailed_description" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON public."frappe_ft_jrv_detailed_description" FOR ALL TO authenticated USING (true);
