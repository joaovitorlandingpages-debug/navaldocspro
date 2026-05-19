-- Create automation state table
CREATE TABLE IF NOT EXISTS public.process_automation_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    process_id UUID NOT NULL REFERENCES public.processes(id) ON DELETE CASCADE,
    checklist_status JSONB DEFAULT '[]'::jsonb,
    data_completeness JSONB DEFAULT '{}'::jsonb,
    pending_items TEXT[] DEFAULT '{}',
    is_ready_for_generation BOOLEAN DEFAULT false,
    next_suggested_steps TEXT[] DEFAULT '{}',
    last_analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create automation logs
CREATE TABLE IF NOT EXISTS public.automation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    process_id UUID REFERENCES public.processes(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- 'ocr_complete', 'requirement_validated', 'rule_triggered', 'status_changed'
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add automation rules to process types
ALTER TABLE public.process_types 
ADD COLUMN IF NOT EXISTS automation_rules JSONB DEFAULT '[]'::jsonb;

-- Add extracted_data to documents for OCR mapping
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS extracted_data JSONB DEFAULT '{}'::jsonb;

-- Enable RLS
ALTER TABLE public.process_automation_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view automation state for their company"
ON public.process_automation_state
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.processes p
        JOIN public.profiles prof ON prof.company_id = p.company_id
        WHERE p.id = process_automation_state.process_id
        AND prof.id = auth.uid()
    )
);

CREATE POLICY "Users can view automation logs for their company"
ON public.automation_logs
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.processes p
        JOIN public.profiles prof ON prof.company_id = p.company_id
        WHERE p.id = automation_logs.process_id
        AND prof.id = auth.uid()
    )
);

-- Trigger for updated_at
CREATE TRIGGER update_process_automation_state_updated_at
BEFORE UPDATE ON public.process_automation_state
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
