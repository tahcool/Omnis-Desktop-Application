-- Frappe → Supabase: Auto-generated CREATE TABLE statements
-- Generated: 2026-06-08T12:30:07.351Z
-- Run this entire file in the Supabase SQL Editor before running 3_import.js
-- Tables are prefixed with "frappe_" to keep them separate from existing tables.

CREATE TABLE IF NOT EXISTS public."frappe_custom_docperm" (
  "name" text PRIMARY KEY,
  "parent" text,
  "role" text,
  "if_owner" bigint,
  "permlevel" bigint,
  "select" bigint,
  "read" bigint,
  "write" bigint,
  "create" bigint,
  "delete" bigint,
  "submit" bigint,
  "cancel" bigint,
  "amend" bigint,
  "report" bigint,
  "export" bigint,
  "import" bigint,
  "set_user_permissions" bigint,
  "share" bigint,
  "print" bigint,
  "email" bigint
);
ALTER TABLE public."frappe_custom_docperm" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON public."frappe_custom_docperm" FOR ALL TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public."frappe_field_service_report" (
  "name" text PRIMARY KEY,
  "machine" text,
  "engine_make" text,
  "customer" text,
  "machine_type" text,
  "machine_model" text,
  "current_hmr" bigint,
  "engine_srn" text,
  "customer_ref" text,
  "fleet_no" text,
  "total_running_hours" bigint,
  "inspecting_technician" text,
  "date_of_inspection" text,
  "site_of_inspection" text,
  "job_no" text,
  "labour_hours" text,
  "standing_time" text,
  "traveling_time" text,
  "mileage" text,
  "time_arrived" text,
  "time_departed" text,
  "vehicle" text
);
ALTER TABLE public."frappe_field_service_report" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON public."frappe_field_service_report" FOR ALL TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public."frappe_ft_alert" (
  "name" text PRIMARY KEY,
  "date_issued" date,
  "alert_type" text,
  "status" text,
  "machine" text,
  "customer" text,
  "oem" text,
  "model" text,
  "type" text,
  "fleetrack_managed" text,
  "on_last_hmr" double precision,
  "days_since_last_hmr" bigint,
  "on_service_type" bigint,
  "quote_no" text,
  "desc" text
);
ALTER TABLE public."frappe_ft_alert" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON public."frappe_ft_alert" FOR ALL TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public."frappe_ft_bd_category" (
  "name" text PRIMARY KEY,
  "category" text
);
ALTER TABLE public."frappe_ft_bd_category" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON public."frappe_ft_bd_category" FOR ALL TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public."frappe_ft_customer" (
  "name" text PRIMARY KEY,
  "customer_name" text,
  "contact_person_1" text,
  "management_email" text,
  "mobile_1" text,
  "contact_person_2" text,
  "technical_email" text,
  "mobile_2" text,
  "on_fleetrack" text,
  "whatsapp_group_id" text,
  "udbr_acronyms_sent" bigint
);
ALTER TABLE public."frappe_ft_customer" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON public."frappe_ft_customer" FOR ALL TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public."frappe_ft_defect_category" (
  "name" text PRIMARY KEY,
  "category" text
);
ALTER TABLE public."frappe_ft_defect_category" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON public."frappe_ft_defect_category" FOR ALL TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public."frappe_ft_defect_description" (
  "name" text PRIMARY KEY,
  "defect_description" text
);
ALTER TABLE public."frappe_ft_defect_description" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON public."frappe_ft_defect_description" FOR ALL TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public."frappe_ft_field_service_plan" (
  "name" text PRIMARY KEY,
  "customer" text,
  "machine" text,
  "description" text,
  "location" text,
  "technician" text,
  "defects" text,
  "warranty_status" text,
  "scheduled_date" date,
  "status" text
);
ALTER TABLE public."frappe_ft_field_service_plan" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON public."frappe_ft_field_service_plan" FOR ALL TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public."frappe_ft_get_component" (
  "name" text PRIMARY KEY,
  "component_name" text
);
ALTER TABLE public."frappe_ft_get_component" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON public."frappe_ft_get_component" FOR ALL TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public."frappe_ft_image_gallery" (
  "name" text PRIMARY KEY,
  "reference_doctype" text,
  "reference_name" text,
  "caption" text,
  "image" text
);
ALTER TABLE public."frappe_ft_image_gallery" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON public."frappe_ft_image_gallery" FOR ALL TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public."frappe_ft_inspection_checklist_template" (
  "name" text PRIMARY KEY,
  "template_name" text
);
ALTER TABLE public."frappe_ft_inspection_checklist_template" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON public."frappe_ft_inspection_checklist_template" FOR ALL TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public."frappe_ft_job_card" (
  "name" text PRIMARY KEY,
  "customer_name" text,
  "machine_make" text,
  "fleet_number" text,
  "operator" text,
  "site__location" text,
  "model" text,
  "hmr" text,
  "last_service" text,
  "evo_job_number" text,
  "vin_number" text,
  "esn" text,
  "job_description" text,
  "sign" text,
  "causes_of_failure" text,
  "remedy__details_of_workdone" text,
  "additional_defects_found" text,
  "technician" text,
  "vehicle_registration" text,
  "customer_comments" text,
  "signature" text
);
ALTER TABLE public."frappe_ft_job_card" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON public."frappe_ft_job_card" FOR ALL TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public."frappe_ft_jrv" (
  "name" text PRIMARY KEY,
  "machine" text,
  "engine_make" text,
  "machine_type" text,
  "machine_model" text,
  "customer" text,
  "customer_ref" text,
  "engine_srn" text,
  "fleet_no" text,
  "current_hmr" double precision,
  "location" text,
  "hours_to_service" double precision,
  "machine_location" text,
  "contact_person" text,
  "date_issued" date,
  "phone_no" text,
  "status" text,
  "date" date,
  "job_no" text,
  "date_invoiced" date,
  "days_running" bigint,
  "invoice_no" text,
  "value" double precision,
  "nature" text,
  "date_quote_sent" date,
  "responsibility" text,
  "days_on_current_stage" bigint,
  "machine_data_plate" text,
  "engine_data_plate" text,
  "amended_from" text,
  "lost_reason" text,
  "workflow_state" text
);
ALTER TABLE public."frappe_ft_jrv" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON public."frappe_ft_jrv" FOR ALL TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public."frappe_ft_location" (
  "name" text PRIMARY KEY,
  "location" text,
  "country" text
);
ALTER TABLE public."frappe_ft_location" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON public."frappe_ft_location" FOR ALL TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public."frappe_ft_machine_component" (
  "name" text PRIMARY KEY,
  "machine" text,
  "image" text,
  "component_group" text,
  "component_name" text,
  "part_no" text,
  "make" text
);
ALTER TABLE public."frappe_ft_machine_component" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON public."frappe_ft_machine_component" FOR ALL TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public."frappe_ft_machine_condition_assessment" (
  "name" text PRIMARY KEY,
  "machine" text,
  "machine_type" text,
  "machine_model" text,
  "customer" text,
  "customer_ref" text,
  "fleet_no" text,
  "engine_srn" text,
  "engine_make" text,
  "current_hmr" bigint,
  "total_running_hours" bigint,
  "inspecting_technician" text,
  "job_no" text,
  "date_of_inspection" date,
  "site_of_inspection" text,
  "general_comments" text
);
ALTER TABLE public."frappe_ft_machine_condition_assessment" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON public."frappe_ft_machine_condition_assessment" FOR ALL TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public."frappe_ft_machine_failure" (
  "name" text PRIMARY KEY,
  "machine" text,
  "engine_make" text,
  "customer" text,
  "machine_type" text,
  "machine_model" text,
  "current_hmr" bigint,
  "engine_srn" text,
  "customer_ref" text,
  "fleet_no" text,
  "total_running_hours" bigint,
  "inspecting_technician" text,
  "date_of_inspection" date,
  "site_of_inspection" text,
  "job_no" text,
  "machine_sn" text
);
ALTER TABLE public."frappe_ft_machine_failure" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON public."frappe_ft_machine_failure" FOR ALL TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public."frappe_ft_machine_model" (
  "name" text PRIMARY KEY,
  "oem" text,
  "si_hours" bigint,
  "model_name" text,
  "fuel_consumption" bigint,
  "fuel_consumption_class" text
);
ALTER TABLE public."frappe_ft_machine_model" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON public."frappe_ft_machine_model" FOR ALL TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public."frappe_ft_machine_named_component" (
  "name" text PRIMARY KEY,
  "machine" text,
  "part" text,
  "specific_description" text,
  "make" text,
  "part_no" text,
  "size" text
);
ALTER TABLE public."frappe_ft_machine_named_component" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON public."frappe_ft_machine_named_component" FOR ALL TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public."frappe_ft_machine_oem" (
  "name" text PRIMARY KEY,
  "oem" text
);
ALTER TABLE public."frappe_ft_machine_oem" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON public."frappe_ft_machine_oem" FOR ALL TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public."frappe_ft_machine_service_guide" (
  "name" text PRIMARY KEY,
  "label" text,
  "sg_name" text,
  "model" text,
  "make" text
);
ALTER TABLE public."frappe_ft_machine_service_guide" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON public."frappe_ft_machine_service_guide" FOR ALL TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public."frappe_ft_machine_service_item" (
  "name" text PRIMARY KEY,
  "service_item" text
);
ALTER TABLE public."frappe_ft_machine_service_item" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON public."frappe_ft_machine_service_item" FOR ALL TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public."frappe_ft_machine_supplier" (
  "name" text PRIMARY KEY,
  "supplier_name" text
);
ALTER TABLE public."frappe_ft_machine_supplier" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON public."frappe_ft_machine_supplier" FOR ALL TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public."frappe_ft_machine_type" (
  "name" text PRIMARY KEY,
  "type_name" text
);
ALTER TABLE public."frappe_ft_machine_type" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON public."frappe_ft_machine_type" FOR ALL TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public."frappe_ft_machine_welcome_report" (
  "name" text PRIMARY KEY,
  "sn" text,
  "machine" text,
  "customer" text
);
ALTER TABLE public."frappe_ft_machine_welcome_report" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON public."frappe_ft_machine_welcome_report" FOR ALL TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public."frappe_ft_maintenance_warning_report" (
  "name" text PRIMARY KEY,
  "mwr_mode" text,
  "customer" text,
  "machine" text,
  "machine_model" text,
  "machine_type" text,
  "engine_make" text,
  "total_running_hours" bigint,
  "customer_ref" text,
  "engine_srn" text,
  "fleet_no" text,
  "current_hmr" double precision,
  "warranty_violation" bigint,
  "advisory" bigint,
  "overdue_maintenance" bigint,
  "other" bigint,
  "major_defects" bigint,
  "site_where_applicable" text,
  "date_of_issue" date,
  "warning_message" text,
  "description" text,
  "date_resolved" date
);
ALTER TABLE public."frappe_ft_maintenance_warning_report" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON public."frappe_ft_maintenance_warning_report" FOR ALL TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public."frappe_ft_monthly_report" (
  "name" text PRIMARY KEY,
  "customer" text,
  "date_from" date,
  "date_to" date,
  "utilization_graph" text
);
ALTER TABLE public."frappe_ft_monthly_report" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON public."frappe_ft_monthly_report" FOR ALL TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public."frappe_ft_region" (
  "name" text PRIMARY KEY,
  "region_name" text
);
ALTER TABLE public."frappe_ft_region" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON public."frappe_ft_region" FOR ALL TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public."frappe_ft_sec_component" (
  "name" text PRIMARY KEY,
  "component_name" text,
  "part_number" text
);
ALTER TABLE public."frappe_ft_sec_component" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON public."frappe_ft_sec_component" FOR ALL TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public."frappe_ft_sec_repair" (
  "name" text PRIMARY KEY,
  "component" text,
  "part_number" text,
  "ted_status" text,
  "on_hold" bigint,
  "ted" text,
  "location" text,
  "date" date,
  "tech_assigned" text,
  "parts_eta" text,
  "description" text,
  "status" text,
  "outwork_eta" text,
  "job_number" text,
  "end_date" text,
  "inventory_transfer" text,
  "item_reference" text,
  "machine_model" text,
  "customer" text
);
ALTER TABLE public."frappe_ft_sec_repair" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON public."frappe_ft_sec_repair" FOR ALL TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public."frappe_ft_service_bulletin" (
  "name" text PRIMARY KEY,
  "date_issued" date,
  "issued_by" text,
  "oem" text,
  "subject" text,
  "outline" text,
  "implementation_procedure" text
);
ALTER TABLE public."frappe_ft_service_bulletin" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON public."frappe_ft_service_bulletin" FOR ALL TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public."frappe_ft_technician_efficiency_report" (
  "name" text PRIMARY KEY,
  "date_from" date,
  "date_to" date
);
ALTER TABLE public."frappe_ft_technician_efficiency_report" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON public."frappe_ft_technician_efficiency_report" FOR ALL TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public."frappe_ft_technician_hour_log" (
  "name" text PRIMARY KEY,
  "technician" text,
  "date" date,
  "productive" double precision,
  "travel" double precision,
  "admin" bigint,
  "house_keeping" bigint,
  "non_productive" bigint
);
ALTER TABLE public."frappe_ft_technician_hour_log" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON public."frappe_ft_technician_hour_log" FOR ALL TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public."frappe_ft_telematics_device" (
  "name" text PRIMARY KEY,
  "make_and_model" text
);
ALTER TABLE public."frappe_ft_telematics_device" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON public."frappe_ft_telematics_device" FOR ALL TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public."frappe_ft_telematics_parameter" (
  "name" text PRIMARY KEY,
  "parameter" text
);
ALTER TABLE public."frappe_ft_telematics_parameter" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON public."frappe_ft_telematics_parameter" FOR ALL TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public."frappe_ft_tyre_size" (
  "name" text PRIMARY KEY,
  "size" text
);
ALTER TABLE public."frappe_ft_tyre_size" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON public."frappe_ft_tyre_size" FOR ALL TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public."frappe_ft_warranty_claim" (
  "name" text PRIMARY KEY,
  "date" date,
  "machine_srn" text,
  "customer" text,
  "model" text,
  "oem" text,
  "type" text,
  "job_no" text,
  "description" text,
  "status" text,
  "date_of_submission" date,
  "parts_eta" text,
  "approval_status" text,
  "oem_system_no" text,
  "tracking_number" text,
  "parts" text,
  "notes" text,
  "warranty_oem" text,
  "date_resolved" date
);
ALTER TABLE public."frappe_ft_warranty_claim" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON public."frappe_ft_warranty_claim" FOR ALL TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public."frappe_ft_weekly_maintenance_warning_report" (
  "name" text PRIMARY KEY,
  "mwr_mode" text,
  "customer" text,
  "machine" text,
  "machine_model" text,
  "machine_type" text,
  "engine_make" text,
  "total_running_hours" bigint,
  "customer_ref" text,
  "engine_srn" text,
  "fleet_no" text,
  "current_hmr" bigint,
  "warranty_violation" bigint,
  "advisory" bigint,
  "overdue_maintenance" bigint,
  "other" bigint,
  "major_defects" bigint,
  "site_where_applicable" text,
  "date_of_issue" date,
  "warning_message" text,
  "description" text,
  "date_resolved" text
);
ALTER TABLE public."frappe_ft_weekly_maintenance_warning_report" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON public."frappe_ft_weekly_maintenance_warning_report" FOR ALL TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public."frappe_number_card" (
  "name" text PRIMARY KEY,
  "is_standard" bigint,
  "module" text,
  "label" text,
  "type" text,
  "report_name" text,
  "method" text,
  "function" text,
  "aggregate_function_based_on" text,
  "document_type" text,
  "parent_document_type" text,
  "report_field" text,
  "report_function" text,
  "is_public" bigint,
  "filters_config" text,
  "show_percentage_stats" bigint,
  "stats_time_interval" text,
  "filters_json" text,
  "dynamic_filters_json" text,
  "color" text
);
ALTER TABLE public."frappe_number_card" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON public."frappe_number_card" FOR ALL TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public."frappe_onboarding_step" (
  "name" text PRIMARY KEY,
  "title" text,
  "is_complete" bigint,
  "is_skipped" bigint,
  "description" text,
  "intro_video_url" text,
  "action" text,
  "action_label" text,
  "reference_document" text,
  "show_full_form" bigint,
  "show_form_tour" bigint,
  "form_tour" text,
  "is_single" bigint,
  "reference_report" text,
  "report_reference_doctype" text,
  "report_type" text,
  "report_description" text,
  "path" text,
  "callback_title" text,
  "callback_message" text,
  "validate_action" bigint,
  "field" text,
  "value_to_validate" text,
  "video_url" text
);
ALTER TABLE public."frappe_onboarding_step" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON public."frappe_onboarding_step" FOR ALL TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public."frappe_scheduled_job_type" (
  "name" text PRIMARY KEY,
  "stopped" bigint,
  "method" text,
  "server_script" text,
  "frequency" text,
  "cron_format" text,
  "create_log" bigint,
  "last_execution" text
);
ALTER TABLE public."frappe_scheduled_job_type" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON public."frappe_scheduled_job_type" FOR ALL TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public."frappe_sec_item" (
  "name" text PRIMARY KEY,
  "component_name" text,
  "ref" text,
  "location" text,
  "customer" text,
  "part_no" text,
  "machine_model" text,
  "oem" text
);
ALTER TABLE public."frappe_sec_item" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON public."frappe_sec_item" FOR ALL TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public."frappe_sec_repair_log_entry" (
  "name" text PRIMARY KEY,
  "on_hold" bigint,
  "ted_status" text,
  "technician_assigned" text,
  "sec_item_no" text,
  "customer" text,
  "machine_model" text,
  "machine_oem" text,
  "location" text,
  "description" text,
  "date_logged" date,
  "day_since_logged" bigint,
  "parts_eta" text,
  "ted" text,
  "status" text,
  "end_date" date,
  "job_number" text,
  "outwork_eta" text,
  "red" text
);
ALTER TABLE public."frappe_sec_repair_log_entry" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON public."frappe_sec_repair_log_entry" FOR ALL TO authenticated USING (true);

