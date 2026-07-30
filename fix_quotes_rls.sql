ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read quotation_items" ON public.quotation_items;

CREATE POLICY "Authenticated can read quotation_items"
  ON public.quotation_items FOR SELECT
  TO authenticated
  USING (true);

GRANT SELECT ON public.quotation_items TO authenticated;

SELECT tablename, policyname FROM pg_policies WHERE tablename = 'quotation_items';
