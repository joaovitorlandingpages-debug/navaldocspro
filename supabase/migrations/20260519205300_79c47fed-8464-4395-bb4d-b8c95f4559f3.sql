-- Adicionar campos de conformidade em processes
ALTER TABLE public.processes 
ADD COLUMN IF NOT EXISTS compliance_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS compliance_score NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS validation_errors JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false;

-- Adicionar campos de conformidade em documents
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS compliance_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS validation_errors JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS ocr_confidence_alerts JSONB DEFAULT '[]'::jsonb;

-- Criar tabela de regras de conformidade marítima avançada
CREATE TABLE IF NOT EXISTS public.maritime_compliance_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_name TEXT NOT NULL,
    rule_description TEXT,
    entity_type TEXT NOT NULL, -- 'vessel', 'process', 'document'
    condition_logic JSONB NOT NULL, -- ex: { "field": "vessel_activity", "operator": "==", "value": "comercial" }
    required_action TEXT NOT NULL, -- 'require_document', 'block_process', 'warning'
    action_params JSONB, -- ex: { "document_template_id": "...", "message": "..." }
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Criar tabela de timeline de conformidade
CREATE TABLE IF NOT EXISTS public.compliance_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    process_id UUID REFERENCES public.processes(id) ON DELETE CASCADE,
    document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- 'validation_passed', 'error_detected', 'inconsistency_found', 'manual_override'
    description TEXT NOT NULL,
    severity TEXT DEFAULT 'info', -- 'info', 'warning', 'critical'
    metadata JSONB,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Inserir regras marítimas iniciais
INSERT INTO public.maritime_compliance_rules (rule_name, rule_description, entity_type, condition_logic, required_action, action_params)
VALUES 
    ('Certificados Comerciais', 'Embarcações comerciais exigem certificados extras', 'vessel', '{"field": "activity", "operator": "==", "value": "Comercial"}', 'require_document', '{"templates": ["CSN", "Borda Livre"]}'),
    ('Licença Anatel', 'Embarcações com rádio exigem licença da Anatel', 'vessel', '{"field": "has_radio", "operator": "==", "value": true}', 'require_document', '{"templates": ["Licença de Estação de Navio"]}'),
    ('Motor Série', 'Motores exigem número de série obrigatório', 'vessel', '{"field": "has_engine", "operator": "==", "value": true}', 'warning', '{"message": "Número de série do motor não identificado"}'),
    ('Arqueação Bruta', 'Embarcações acima de 20AB exigem documentos específicos', 'vessel', '{"field": "gross_tonnage", "operator": ">", "value": 20}', 'require_document', '{"templates": ["Certificado de Arqueação"]}');

-- Habilitar RLS
ALTER TABLE public.maritime_compliance_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_history ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Enable read for authenticated users" ON public.maritime_compliance_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Enable all for authenticated users" ON public.compliance_history FOR ALL TO authenticated USING (true);

-- Trigger para atualizar status de conformidade baseado no checklist (exemplo simplificado)
CREATE OR REPLACE FUNCTION public.update_process_compliance_status()
RETURNS TRIGGER AS $$
DECLARE
    total_mandatory INTEGER;
    completed_mandatory INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_mandatory FROM public.document_checklists WHERE process_id = NEW.process_id AND is_mandatory = true;
    SELECT COUNT(*) INTO completed_mandatory FROM public.document_checklists WHERE process_id = NEW.process_id AND is_mandatory = true AND status = 'completed';

    IF total_mandatory = 0 THEN
        UPDATE public.processes SET compliance_status = 'conforme', compliance_score = 100 WHERE id = NEW.process_id;
    ELSIF completed_mandatory = total_mandatory THEN
        UPDATE public.processes SET compliance_status = 'conforme', compliance_score = 100 WHERE id = NEW.process_id;
    ELSE
        UPDATE public.processes SET compliance_status = 'incompleto', compliance_score = (completed_mandatory::numeric / total_mandatory::numeric) * 100 WHERE id = NEW.process_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_update_process_compliance ON public.document_checklists;
CREATE TRIGGER tr_update_process_compliance
AFTER UPDATE ON public.document_checklists
FOR EACH ROW
EXECUTE FUNCTION public.update_process_compliance_status();
