-- ==============================================================================
-- FIX: PostgreSQL "Function Search Path Mutable" Warnings
-- Run this in your Supabase SQL Editor.
-- This locks all of your custom functions to the 'public' schema, neutralizing 
-- search-path injection attacks. This will NOT affect your app's functionality.
-- ==============================================================================

-- Core utility functions
ALTER FUNCTION public.is_admin SET search_path = public;
ALTER FUNCTION public.handle_new_user_access SET search_path = public;

-- Timestamp update triggers
ALTER FUNCTION public.update_modified_column SET search_path = public;
ALTER FUNCTION public.update_updated_at_column SET search_path = public;
ALTER FUNCTION public.ft_set_updated_at SET search_path = public;
ALTER FUNCTION public.ft_mca_set_updated_at SET search_path = public;
ALTER FUNCTION public.update_email_config_timestamp SET search_path = public;
ALTER FUNCTION public.update_ft_technicians_updated_at SET search_path = public;
ALTER FUNCTION public.update_ft_technician_hour_log_updated_at SET search_path = public;

-- Before insert triggers
ALTER FUNCTION public.ft_defect_before_insert SET search_path = public;

-- Notification and Push triggers
ALTER FUNCTION public.notify_push SET search_path = public;
ALTER FUNCTION public.trg_notify_sales_entry SET search_path = public;
ALTER FUNCTION public.trg_notify_aftersales SET search_path = public;
ALTER FUNCTION public.trg_notify_defect SET search_path = public;
ALTER FUNCTION public.trg_notify_breakdown SET search_path = public;
ALTER FUNCTION public.trg_notify_new_stock SET search_path = public;
ALTER FUNCTION public.trg_notify_order_changed SET search_path = public;
ALTER FUNCTION public.trg_notify_quotation_ready SET search_path = public;
