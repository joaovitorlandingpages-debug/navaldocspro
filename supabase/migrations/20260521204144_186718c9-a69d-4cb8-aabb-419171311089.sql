-- Create backups table
CREATE TABLE IF NOT EXISTS public.backups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('automatic', 'manual')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    file_url TEXT,
    size_bytes BIGINT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- Create security_alerts table
CREATE TABLE IF NOT EXISTS public.security_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'login_attempt', 'unauthorized_access', 'suspicious_upload', etc.
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    resolved BOOLEAN DEFAULT false,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Soft delete support
ALTER TABLE public.documents ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.processes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.uploaded_files ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Enable RLS
ALTER TABLE public.backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_alerts ENABLE ROW LEVEL SECURITY;

-- Policies for backups
CREATE POLICY "Users can view their company backups" 
ON public.backups FOR SELECT 
USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create their company backups" 
ON public.backups FOR INSERT 
WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- Policies for security_alerts
CREATE POLICY "Users can view their company security alerts" 
ON public.security_alerts FOR SELECT 
USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- Trigger for versioning on document updates
CREATE OR REPLACE FUNCTION public.create_document_version()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.content IS DISTINCT FROM NEW.content OR OLD.metadata IS DISTINCT FROM NEW.metadata) THEN
        INSERT INTO public.document_versions (document_id, version_number, file_url, created_by, change_summary)
        VALUES (
            NEW.id,
            (SELECT COALESCE(MAX(version_number), 0) + 1 FROM public.document_versions WHERE document_id = NEW.id),
            NEW.file_url,
            auth.uid(),
            'Automatic version update'
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_create_document_version ON public.documents;
CREATE TRIGGER trigger_create_document_version
AFTER UPDATE ON public.documents
FOR EACH ROW EXECUTE FUNCTION public.create_document_version();

-- Audit log function update (if needed)
CREATE OR REPLACE FUNCTION public.log_security_event(
    p_company_id UUID,
    p_action TEXT,
    p_entity_type TEXT,
    p_entity_id UUID,
    p_severity TEXT DEFAULT 'low',
    p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS VOID AS $$
BEGIN
    INSERT INTO public.audit_logs (company_id, user_id, action, entity_type, entity_id, new_data)
    VALUES (p_company_id, auth.uid(), p_action, p_entity_type, p_entity_id, p_metadata);
    
    IF p_severity IN ('medium', 'high', 'critical') THEN
        INSERT INTO public.security_alerts (company_id, type, severity, description, metadata)
        VALUES (p_company_id, p_action, p_severity, p_action || ' on ' || p_entity_type, p_metadata);
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
