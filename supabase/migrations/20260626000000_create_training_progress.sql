CREATE TABLE IF NOT EXISTS public.training_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email TEXT NOT NULL,
    course_id TEXT NOT NULL,
    course_title TEXT NOT NULL,
    score INTEGER NOT NULL DEFAULT 0,
    total_questions INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'completed',
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RLS Policies
ALTER TABLE public.training_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all read access to training_progress" 
ON public.training_progress FOR SELECT 
USING (true);

CREATE POLICY "Allow all insert access to training_progress" 
ON public.training_progress FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow all update access to training_progress" 
ON public.training_progress FOR UPDATE 
USING (true);

CREATE POLICY "Allow all delete access to training_progress" 
ON public.training_progress FOR DELETE 
USING (true);
