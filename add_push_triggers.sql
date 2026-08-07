-- 1. Sales Entries (frappe_group_sales)
CREATE OR REPLACE FUNCTION trg_notify_sales_entry()
RETURNS trigger AS $$
BEGIN
  PERFORM notify_push(
    'New Sales Entry',
    COALESCE(NEW.customer, 'A new customer') || ' - ' || COALESCE(NEW.model, 'Item'),
    jsonb_build_object('screen', 'Sales Entries', 'record_id', NEW.name)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sales_entry_notify ON public.frappe_group_sales;
CREATE TRIGGER trg_sales_entry_notify
  AFTER INSERT ON public.frappe_group_sales
  FOR EACH ROW
  EXECUTE FUNCTION trg_notify_sales_entry();

-- 2. Aftersales (aftersales_handover)
CREATE OR REPLACE FUNCTION trg_notify_aftersales()
RETURNS trigger AS $$
BEGIN
  PERFORM notify_push(
    'New Aftersales Record',
    'Aftersales for Order ' || COALESCE(NEW.order_id, 'Unknown'),
    jsonb_build_object('screen', 'After Sales', 'record_id', NEW.id::text)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_aftersales_notify ON public.aftersales_handover;
CREATE TRIGGER trg_aftersales_notify
  AFTER INSERT ON public.aftersales_handover
  FOR EACH ROW
  EXECUTE FUNCTION trg_notify_aftersales();

-- 3. Defects (ft_defect)
CREATE OR REPLACE FUNCTION trg_notify_defect()
RETURNS trigger AS $$
BEGIN
  PERFORM notify_push(
    'New Defect Added',
    '[' || COALESCE(NEW.machine, 'Unknown SN') || '] - ' || COALESCE(NEW.description, 'New defect added'),
    jsonb_build_object('screen', 'Defects', 'record_id', NEW.name)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_defect_notify ON public.ft_defect;
CREATE TRIGGER trg_defect_notify
  AFTER INSERT ON public.ft_defect
  FOR EACH ROW
  EXECUTE FUNCTION trg_notify_defect();

-- 4. Breakdowns (ft_breakdown_log)
CREATE OR REPLACE FUNCTION trg_notify_breakdown()
RETURNS trigger AS $$
BEGIN
  PERFORM notify_push(
    'New Breakdown Reported',
    '[' || COALESCE(NEW.machine, 'Unknown SN') || '] - ' || COALESCE(NEW.description, 'New breakdown reported'),
    jsonb_build_object('screen', 'Breakdown', 'record_id', NEW.name)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_breakdown_notify ON public.ft_breakdown_log;
CREATE TRIGGER trg_breakdown_notify
  AFTER INSERT ON public.ft_breakdown_log
  FOR EACH ROW
  EXECUTE FUNCTION trg_notify_breakdown();
