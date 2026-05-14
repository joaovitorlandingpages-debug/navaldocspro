-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Document Templates table
CREATE TABLE public.document_templates (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    process_type TEXT,
    description TEXT,
    template_file_url TEXT,
    fields_config JSONB DEFAULT '[]'::jsonb,
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Document Fields configuration
CREATE TABLE public.document_fields (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    template_id UUID REFERENCES public.document_templates(id) ON DELETE CASCADE,
    field_name TEXT NOT NULL,
    field_label TEXT NOT NULL,
    field_type TEXT NOT NULL DEFAULT 'text', -- text, date, number, etc.
    source_type TEXT NOT NULL DEFAULT 'manual', -- manual, customer, vessel, company, process
    source_field TEXT, -- e.g., 'full_name' from customer
    required BOOLEAN DEFAULT false,
    position_x FLOAT,
    position_y FLOAT,
    page_number INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Generated Documents table
CREATE TABLE public.generated_documents (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    process_id UUID REFERENCES public.processes(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    vessel_id UUID REFERENCES public.vessels(id) ON DELETE SET NULL,
    template_id UUID REFERENCES public.document_templates(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    generated_file_url TEXT,
    status TEXT NOT NULL DEFAULT 'draft', -- draft, completed, signed
    generated_by UUID REFERENCES auth.users(id),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.generated_documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for document_templates
CREATE POLICY "Users can view templates from their company or global"
ON public.document_templates FOR SELECT
USING (company_id IS NULL OR company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
));

CREATE POLICY "Admins can manage their company templates"
ON public.document_templates FOR ALL
USING (company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'owner')
));

-- RLS Policies for document_fields
CREATE POLICY "Users can view fields for accessible templates"
ON public.document_fields FOR SELECT
USING (template_id IN (
    SELECT id FROM public.document_templates
));

CREATE POLICY "Admins can manage fields for their company templates"
ON public.document_fields FOR ALL
USING (template_id IN (
    SELECT id FROM public.document_templates WHERE company_id IN (
        SELECT company_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'owner')
    )
));

-- RLS Policies for generated_documents
CREATE POLICY "Users can view documents from their company"
ON public.generated_documents FOR SELECT
USING (company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
));

CREATE POLICY "Users can manage documents from their company"
ON public.generated_documents FOR ALL
USING (company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
));

-- Storage Buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('document-templates', 'document-templates', false)
ON CONFLICT (id) DO NOTHING;

-- Ensure generated-documents bucket exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('generated-documents', 'generated-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for document-templates
CREATE POLICY "Templates are accessible by company members"
ON storage.objects FOR SELECT
USING (bucket_id = 'document-templates' AND (storage.foldername(name))[1] IN (
    SELECT company_id::text FROM public.profiles WHERE id = auth.uid()
));

CREATE POLICY "Admins can upload templates"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'document-templates' AND (storage.foldername(name))[1] IN (
    SELECT company_id::text FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager', 'owner')
));

-- Storage Policies for generated-documents
CREATE POLICY "Generated documents are accessible by company members"
ON storage.objects FOR SELECT
USING (bucket_id = 'generated-documents' AND (storage.foldername(name))[1] IN (
    SELECT company_id::text FROM public.profiles WHERE id = auth.uid()
));

CREATE POLICY "Users can upload generated documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'generated-documents' AND (storage.foldername(name))[1] IN (
    SELECT company_id::text FROM public.profiles WHERE id = auth.uid()
));

-- Triggers for updated_at
CREATE TRIGGER update_document_templates_updated_at
    BEFORE UPDATE ON public.document_templates
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_generated_documents_updated_at
    BEFORE UPDATE ON public.generated_documents
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
