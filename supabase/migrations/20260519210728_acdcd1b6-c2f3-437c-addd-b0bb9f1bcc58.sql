-- Expandir document_templates com metadados enterprise
ALTER TABLE public.document_templates 
ADD COLUMN IF NOT EXISTS version_number INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS source_origin TEXT DEFAULT 'fonte_oficial', -- 'fonte_oficial', 'modelo_interno', 'validado_engenheiro', 'modelo_regional'
ADD COLUMN IF NOT EXISTS validation_status TEXT DEFAULT 'ativo', -- 'rascunho', 'em_validacao', 'validado', 'ativo', 'desativado', 'substituido'
ADD COLUMN IF NOT EXISTS region_tag TEXT, -- Para variações regionais futuras (Capitanias específicas)
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Tabela para rastrear importações em massa
CREATE TABLE IF NOT EXISTS public.document_library_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id),
    import_type TEXT NOT NULL, -- 'json', 'csv'
    status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    total_items INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    error_log JSONB DEFAULT '[]'::jsonb,
    raw_payload JSONB,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Garantir RLS
ALTER TABLE public.document_library_imports ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Admin Master full access to imports" ON public.document_library_imports 
FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_master'));

-- Trigger para atualizar timestamps em templates
CREATE OR REPLACE FUNCTION public.update_document_template_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_update_doc_template_time ON public.document_templates;
CREATE TRIGGER tr_update_doc_template_time
BEFORE UPDATE ON public.document_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_document_template_timestamp();
