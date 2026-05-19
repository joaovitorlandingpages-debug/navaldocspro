-- 1. Batch Processing Support (using existing ocr_jobs or enhancing documents)
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS batch_id UUID;
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS batch_status TEXT DEFAULT 'pending' CHECK (batch_status IN ('pending', 'processing', 'completed', 'failed'));

-- 2. Favorites & Recent Access Tracking
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT now();
-- is_favorite already exists in some tables, ensuring it's everywhere needed
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='documents' AND column_name='is_favorite') THEN
        ALTER TABLE public.documents ADD COLUMN is_favorite BOOLEAN DEFAULT false;
    END IF;
END $$;

ALTER TABLE public.processes ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT now();
ALTER TABLE public.processes ADD COLUMN IF NOT EXISTS title TEXT; -- Adding title for better UX

-- 3. Multi-Assignee Support for Processes
CREATE TABLE IF NOT EXISTS public.process_assignees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    process_id UUID REFERENCES public.processes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'assignee',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(process_id, user_id)
);

ALTER TABLE public.process_assignees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View assignees" ON public.process_assignees FOR SELECT USING (true);
CREATE POLICY "Manage assignees" ON public.process_assignees FOR ALL USING (auth.uid() IN (SELECT user_id FROM public.process_assignees WHERE process_id = public.process_assignees.process_id));

-- 4. Enterprise Audit Logs (using activity_logs if it exists)
-- Assuming activity_logs is the main one
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS source_ip TEXT;
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general';

-- 5. Demo Environment Flags
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_demo_user BOOLEAN DEFAULT false;

-- 6. Performance Indexes (Fixed column names)
CREATE INDEX IF NOT EXISTS idx_documents_type_gin ON public.documents USING gin (document_type gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_processes_protocol_gin ON public.processes USING gin (protocol_number gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_documents_batch_id ON public.documents(batch_id);
CREATE INDEX IF NOT EXISTS idx_documents_last_accessed ON public.documents(last_accessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_processes_last_accessed ON public.processes(last_accessed_at DESC);
