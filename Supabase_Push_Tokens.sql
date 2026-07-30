CREATE TABLE IF NOT EXISTS public.user_push_tokens (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    expo_push_token TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
