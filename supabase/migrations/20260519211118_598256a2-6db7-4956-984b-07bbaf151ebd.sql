-- Adicionar suporte a conteúdo base nos templates
ALTER TABLE public.document_templates 
ADD COLUMN IF NOT EXISTS base_content TEXT, -- Texto formal base com placeholders como {{customer_name}}
ADD COLUMN IF NOT EXISTS document_structure JSONB DEFAULT '{}'::jsonb; -- Estrutura de blocos (header, body, footer)

-- Tabela de Documentos Gerados (Instâncias reais dos templates para um processo)
CREATE TABLE IF NOT EXISTS public.generated_documents_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    process_id UUID REFERENCES public.processes(id) ON DELETE CASCADE,
    template_id UUID REFERENCES public.document_templates(id),
    document_name TEXT NOT NULL,
    content_html TEXT, -- Conteúdo final preenchido/editado
    mapped_data JSONB DEFAULT '{}'::jsonb, -- Dados usados no preenchimento
    status TEXT DEFAULT 'rascunho', -- 'rascunho', 'auto_preenchido', 'em_revisao', 'aprovado', 'gerado', 'assinado'
    version_number INTEGER DEFAULT 1,
    last_edited_by UUID REFERENCES auth.users(id),
    file_url TEXT, -- URL do PDF final gerado
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- RLS para instâncias de documentos
ALTER TABLE public.generated_documents_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their company documents" 
ON public.generated_documents_instances FOR ALL TO authenticated 
USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Admin master can view all generated documents" 
ON public.generated_documents_instances FOR SELECT TO authenticated 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_master'));

-- Inserir Textos Base para Templates Oficiais
UPDATE public.document_templates 
SET base_content = 'Ao Senhor Capitão dos Portos, {{customer_name}}, portador do CPF {{customer_cpf}}, residente em {{customer_address}}, vem requerer a V.Sa. o registro inicial da embarcação {{vessel_name}}, inscrita sob o número {{vessel_id}}.'
WHERE name = 'Requerimento DPC-2211';

UPDATE public.document_templates 
SET base_content = 'OUTORGANTE: {{customer_name}}, CPF {{customer_cpf}}. OUTORGADO: {{company_name}}, CNPJ {{company_cnpj}}. PODERES: Representar o outorgante perante a Capitania dos Portos para fins de {{process_type}} da embarcação {{vessel_name}}.'
WHERE name = 'Procuração';
