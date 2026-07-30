-- Migration: Add is_payment_terms to omnis_tracking_orders
-- Required for full Supabase cutover of Order Tracking (removing Frappe + fmb_reports dependency)

ALTER TABLE public.omnis_tracking_orders
    ADD COLUMN IF NOT EXISTS is_payment_terms BOOLEAN DEFAULT FALSE;

-- Migrate existing payment terms flags from fmb_reports into omnis_tracking_orders
-- Match on linked_sale_name (omnis_tracking_orders) = frappe_id (fmb_reports)
UPDATE public.omnis_tracking_orders ot
SET is_payment_terms = TRUE
FROM public.fmb_reports fr
WHERE fr.frappe_id = ot.linked_sale_name
  AND (fr.is_payment_terms = TRUE OR fr.is_payment_terms::text = 'true');

NOTIFY pgrst, 'reload schema';
