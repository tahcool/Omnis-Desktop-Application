-- ==============================================================================
-- STEP 1b: Apply Missing Foreign Key Indexes
-- ==============================================================================
-- Copy this entire file and run it in your Supabase SQL Editor.
-- This will build the missing indexes in the background (concurrently) 
-- without locking your tables or affecting users.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_payment_deals ON payment_deals (order_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_order_machines ON order_machines (order_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_order_contacts ON order_contacts (order_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_machine_ft_service_report ON ft_service_report (machine_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_machine_ft_service_plan ON ft_service_plan (machine_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stock_stock_potential_cust ON stock_potential_customers (stock_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cdv_cdv_attachments ON cdv_attachments (cdv_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_brand_products ON products (brand_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_item_group_products ON products (item_group_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_listings ON listings (user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_parent_ft_job_card_item ON ft_job_card_item (parent);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_parent_ft_breakdown_machine ON ft_breakdown_machine (parent);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_parent_quotation_items ON quotation_items (parent);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_operator_ft_portal_breakdown_ ON ft_portal_breakdown_reports (operator_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_operator_ft_portal_rentals ON ft_portal_rentals (operator_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_linked_training_ft_operator_certific ON ft_operator_certificates (linked_training_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patient_omnis_sick_notes ON omnis_sick_notes (patient_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patient_omnis_consultations ON omnis_consultations (patient_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_consultation_omnis_dispensations ON omnis_dispensations (consultation_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_omnis_dispensations ON omnis_dispensations (inventory_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_patient_omnis_appointments ON omnis_appointments (patient_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_submitted_by_customer_enquiries ON customer_enquiries (submitted_by);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_schedule_cdv_logs ON cdv_logs (schedule_id);
