-- Add default value for module if it doesn't have one
ALTER TABLE public.activity_logs 
ALTER COLUMN module SET DEFAULT 'system';

-- Ensure action has a default just in case
ALTER TABLE public.activity_logs 
ALTER COLUMN action SET DEFAULT 'unspecified_action';

-- Ensure metadata is always an object
ALTER TABLE public.activity_logs 
ALTER COLUMN metadata SET DEFAULT '{}'::jsonb;

-- Just in case resource columns are missing or not defined as they should be
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_logs' AND column_name = 'resource_type') THEN
        ALTER TABLE public.activity_logs ADD COLUMN resource_type TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_logs' AND column_name = 'resource_id') THEN
        ALTER TABLE public.activity_logs ADD COLUMN resource_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_logs' AND column_name = 'description') THEN
        ALTER TABLE public.activity_logs ADD COLUMN description TEXT;
    END IF;
END $$;
