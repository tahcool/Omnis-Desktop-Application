-- Fix decimal column types — run this in Supabase SQL Editor

-- frappe_ft_technician_hour_log
ALTER TABLE public."frappe_ft_technician_hour_log" ALTER COLUMN "productive" TYPE double precision USING "productive"::double precision;
ALTER TABLE public."frappe_ft_technician_hour_log" ALTER COLUMN "travel" TYPE double precision USING "travel"::double precision;
ALTER TABLE public."frappe_ft_technician_hour_log" ALTER COLUMN "admin" TYPE double precision USING "admin"::double precision;
ALTER TABLE public."frappe_ft_technician_hour_log" ALTER COLUMN "house_keeping" TYPE double precision USING "house_keeping"::double precision;
ALTER TABLE public."frappe_ft_technician_hour_log" ALTER COLUMN "non_productive" TYPE double precision USING "non_productive"::double precision;

-- frappe_ft_alert
ALTER TABLE public."frappe_ft_alert" ALTER COLUMN "on_last_hmr" TYPE double precision USING "on_last_hmr"::double precision;
ALTER TABLE public."frappe_ft_alert" ALTER COLUMN "on_service_type" TYPE double precision USING "on_service_type"::double precision;
ALTER TABLE public."frappe_ft_alert" ALTER COLUMN "days_since_last_hmr" TYPE double precision USING "days_since_last_hmr"::double precision;

-- frappe_ft_machine_model
ALTER TABLE public."frappe_ft_machine_model" ALTER COLUMN "si_hours" TYPE double precision USING "si_hours"::double precision;
ALTER TABLE public."frappe_ft_machine_model" ALTER COLUMN "fuel_consumption" TYPE double precision USING "fuel_consumption"::double precision;
