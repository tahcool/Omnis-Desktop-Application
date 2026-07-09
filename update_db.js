const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://pfqaeewmlwfayxbgmuaq.supabase.co', process.env.SUPABASE_SERVICE_KEY);

async function updateDB() {
    // 1. Create newsletters table if missing
    const createNewsletters = `
        CREATE TABLE IF NOT EXISTS newsletters (
            id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            subject             TEXT NOT NULL,
            sender_email        TEXT DEFAULT 'marketing@ieg.co.zw',
            blocks              JSONB DEFAULT '[]'::jsonb,
            html_content        TEXT,
            whatsapp_content    TEXT,
            channels            JSONB DEFAULT '["email"]'::jsonb,
            status              TEXT NOT NULL DEFAULT 'Draft',
            total_audience      INTEGER DEFAULT 0,
            successful_sends    INTEGER DEFAULT 0,
            created_by          TEXT,
            sent_at             TIMESTAMP WITH TIME ZONE,
            created_at          TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL,
            updated_at          TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc', now()) NOT NULL
        );
        
        ALTER TABLE newsletters ENABLE ROW LEVEL SECURITY;
        
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_policies WHERE policyname = 'Allow full access to authenticated users on newsletters'
            ) THEN
                CREATE POLICY "Allow full access to authenticated users on newsletters" ON newsletters FOR ALL USING (true) WITH CHECK (true);
            END IF;
        END
        $$;
    `;
    
    // 2. Add columns if table already exists
    const alterNewsletters = `
        ALTER TABLE newsletters 
        ADD COLUMN IF NOT EXISTS whatsapp_content TEXT,
        ADD COLUMN IF NOT EXISTS channels JSONB DEFAULT '["email"]'::jsonb;
    `;

    // 3. Add columns to customers
    const alterCustomers = `
        ALTER TABLE customers 
        ADD COLUMN IF NOT EXISTS email TEXT,
        ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;
    `;

    // Execute queries
    let { data, error } = await supabase.rpc('exec_sql', { sql_query: createNewsletters });
    console.log("Create Newsletters:", error || "Success");

    ({ data, error } = await supabase.rpc('exec_sql', { sql_query: alterNewsletters }));
    console.log("Alter Newsletters:", error || "Success");

    ({ data, error } = await supabase.rpc('exec_sql', { sql_query: alterCustomers }));
    console.log("Alter Customers:", error || "Success");
}

updateDB();
