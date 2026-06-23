-- SQL script to create omnis_whatsapp_logs table
CREATE TABLE IF NOT EXISTS omnis_whatsapp_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    quote_name TEXT,
    sales_person TEXT,
    to_number TEXT,
    message TEXT,
    status TEXT DEFAULT 'sent',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
