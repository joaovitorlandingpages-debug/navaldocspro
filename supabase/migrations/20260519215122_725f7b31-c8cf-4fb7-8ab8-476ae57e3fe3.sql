-- 0. Habilitar Extensões Necessárias
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1. Expansão de Processos para UX Avançada
ALTER TABLE public.processes 
ADD COLUMN IF NOT EXISTS tags TEXT[],
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false;

-- 2. Sistema de Favoritos e Versão para Documentos
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS version_history JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- 3. Índices para Busca Global Rápida
CREATE INDEX IF NOT EXISTS idx_processes_tags ON public.processes USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_vessels_name_trgm ON public.vessels USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_customers_name_trgm ON public.customers USING gin (name gin_trgm_ops);

-- 4. Função para Duplicar Documentos (UX de Produtividade)
CREATE OR REPLACE FUNCTION public.duplicate_document(doc_id UUID)
RETURNS UUID AS $$
DECLARE
    new_doc_id UUID;
BEGIN
    INSERT INTO public.documents (
        company_id, process_id, document_type, file_url, status, metadata, content_data
    )
    SELECT 
        company_id, process_id, document_type, file_url, 'rascunho', metadata, content_data
    FROM public.documents WHERE id = doc_id
    RETURNING id INTO new_doc_id;
    
    RETURN new_doc_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Revogar execução pública
REVOKE EXECUTE ON FUNCTION public.duplicate_document(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.duplicate_document(UUID) TO authenticated, service_role;
