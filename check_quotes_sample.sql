SELECT name, customer_name, transaction_date, grand_total, status, company, custom_sales_person, territory, currency, valid_till, title
FROM public.quotations 
ORDER BY transaction_date DESC NULLS LAST
LIMIT 5;
