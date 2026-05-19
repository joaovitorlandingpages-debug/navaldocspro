-- Adicionar campos para comparação e identificação inteligente
ALTER TABLE public.ocr_jobs 
ADD COLUMN IF NOT EXISTS identified_document_type TEXT,
ADD COLUMN IF NOT EXISTS comparison_data JSONB, -- { "field": { "current": "...", "extracted": "...", "diff": true } }
ADD COLUMN IF NOT EXISTS is_applied BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS applied_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS suggested_actions JSONB; -- [ { "type": "update_customer", "label": "Atualizar Cliente", "description": "..." } ]

-- Tabela para Timeline Operacional de OCR
CREATE TABLE IF NOT EXISTS public.ocr_timeline_events (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id UUID REFERENCES public.ocr_jobs(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- 'upload', 'processing_start', 'processing_complete', 'data_applied', 'error'
    event_message TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.ocr_timeline_events ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Empresas podem ver timeline de seus jobs de OCR"
ON public.ocr_timeline_events
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.ocr_jobs j
        WHERE j.id = job_id
        AND (j.company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
             OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_master'))
    )
);

-- Função para registrar eventos de timeline automaticamente
CREATE OR REPLACE FUNCTION public.log_ocr_timeline_event()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.ocr_timeline_events (job_id, event_type, event_message)
        VALUES (NEW.id, 'upload', 'Documento enviado para processamento OCR');
    ELSIF (TG_OP = 'UPDATE') THEN
        IF (OLD.status != NEW.status) THEN
            IF (NEW.status = 'processing') THEN
                INSERT INTO public.ocr_timeline_events (job_id, event_type, event_message)
                VALUES (NEW.id, 'processing_start', 'Iniciado processamento de extração inteligente');
            ELSIF (NEW.status = 'completed') THEN
                INSERT INTO public.ocr_timeline_events (job_id, event_type, event_message)
                VALUES (NEW.id, 'processing_complete', 'Extração concluída com sucesso');
            ELSIF (NEW.status = 'failed') THEN
                INSERT INTO public.ocr_timeline_events (job_id, event_type, event_message, metadata)
                VALUES (NEW.id, 'error', 'Falha no processamento OCR', jsonb_build_object('error', NEW.error_message));
            END IF;
        END IF;
        
        IF (OLD.is_applied = false AND NEW.is_applied = true) THEN
            INSERT INTO public.ocr_timeline_events (job_id, event_type, event_message)
            VALUES (NEW.id, 'data_applied', 'Dados extraídos aplicados ao sistema');
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para registrar eventos
CREATE TRIGGER trigger_ocr_timeline_log
AFTER INSERT OR UPDATE ON public.ocr_jobs
FOR EACH ROW
EXECUTE FUNCTION public.log_ocr_timeline_event();
