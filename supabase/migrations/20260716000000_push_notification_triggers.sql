-- ================================================================
-- Migration: Push Notification Triggers
-- Project: https://pfqaeewmlwfayxbgmuaq.supabase.co
-- Requires: pg_net extension + send-push-notification edge function
-- ================================================================

-- Enable pg_net for HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ----------------------------------------------------------------
-- Helper: call the edge function with a push payload
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION notify_push(p_title TEXT, p_body TEXT, p_data JSONB DEFAULT '{}')
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
DECLARE
  v_service_key TEXT;
BEGIN
  SELECT decrypted_secret INTO v_service_key
  FROM vault.decrypted_secrets
  WHERE name = 'service_role_key'
  LIMIT 1;

  PERFORM net.http_post(
    url     := 'https://pfqaeewmlwfayxbgmuaq.supabase.co/functions/v1/send-push-notification',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || COALESCE(v_service_key, '')
    ),
    body    := jsonb_build_object(
      'title', p_title,
      'body',  p_body,
      'data',  p_data
    )
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_push failed: %', SQLERRM;
END;
$fn$;

-- ----------------------------------------------------------------
-- Trigger 1: New stock/machine added to fmb_report_machines
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_notify_new_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
BEGIN
  PERFORM notify_push(
    'New Stock Added',
    COALESCE(NEW.machine, 'A new machine') || ' has been added'
      || CASE WHEN NEW.brand IS NOT NULL THEN ' (' || NEW.brand || ')' ELSE '' END,
    jsonb_build_object('screen', 'Order Tracking', 'machine_id', NEW.machine_id)
  );
  RETURN NEW;
END;
$fn$;

DO $wrap$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fmb_report_machines') THEN
    DROP TRIGGER IF EXISTS trg_new_stock_notify ON fmb_report_machines;
    CREATE TRIGGER trg_new_stock_notify
      AFTER INSERT ON fmb_report_machines
      FOR EACH ROW
      EXECUTE FUNCTION trg_notify_new_stock();
  END IF;
END;
$wrap$;

-- ----------------------------------------------------------------
-- Trigger 2: Machine status or handover date changed
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_notify_order_changed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
BEGIN
  IF (OLD.status IS DISTINCT FROM NEW.status)
     OR (OLD.target_handover IS DISTINCT FROM NEW.target_handover)
     OR (OLD.revised_handover IS DISTINCT FROM NEW.revised_handover)
     OR (OLD.actual_handover IS DISTINCT FROM NEW.actual_handover)
  THEN
    PERFORM notify_push(
      'Order Updated',
      COALESCE(NEW.machine, 'An order') || ' has been updated'
        || CASE WHEN OLD.status IS DISTINCT FROM NEW.status
                THEN ' — Status: ' || COALESCE(NEW.status, 'Unknown')
                ELSE '' END,
      jsonb_build_object('screen', 'Order Tracking', 'machine_id', NEW.machine_id)
    );
  END IF;
  RETURN NEW;
END;
$fn$;

DO $wrap$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fmb_report_machines') THEN
    DROP TRIGGER IF EXISTS trg_order_changed_notify ON fmb_report_machines;
    CREATE TRIGGER trg_order_changed_notify
      AFTER UPDATE ON fmb_report_machines
      FOR EACH ROW
      EXECUTE FUNCTION trg_notify_order_changed();
  END IF;
END;
$wrap$;

-- ----------------------------------------------------------------
-- Trigger 3: Enquiry status changed to 'Quoted'
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_notify_quotation_ready()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'Quoted' THEN
    PERFORM notify_push(
      'Quotation Ready',
      'A quotation has been prepared: ' || COALESCE(LEFT(NEW.request_details, 60), 'your enquiry'),
      jsonb_build_object('screen', 'Customer Enquiries', 'enquiry_id', NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$fn$;

DO $wrap$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer_enquiries') THEN
    DROP TRIGGER IF EXISTS trg_quotation_notify ON customer_enquiries;
    CREATE TRIGGER trg_quotation_notify
      AFTER UPDATE ON customer_enquiries
      FOR EACH ROW
      EXECUTE FUNCTION trg_notify_quotation_ready();
  END IF;
END;
$wrap$;