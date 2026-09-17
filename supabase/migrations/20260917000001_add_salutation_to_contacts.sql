-- Migration: Add salutation column to omnis_customer_contacts
-- Stores salutation (Mr, Mrs, Dr, etc.) per contact.
-- Users can also create custom salutations stored as free-text.

ALTER TABLE public.omnis_customer_contacts ADD COLUMN IF NOT EXISTS salutation TEXT;
