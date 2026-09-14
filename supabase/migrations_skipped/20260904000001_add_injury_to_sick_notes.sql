ALTER TABLE omnis_sick_notes
ADD COLUMN time_in TIME,
ADD COLUMN time_out TIME,
ADD COLUMN diagnosis_category VARCHAR(100),
ADD COLUMN work_status VARCHAR(50),
ADD COLUMN review_date DATE,
ADD COLUMN referred_to VARCHAR(255);
