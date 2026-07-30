-- quotation_items schema
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'quotation_items' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Sample rows
SELECT * FROM public.quotation_items LIMIT 3;
