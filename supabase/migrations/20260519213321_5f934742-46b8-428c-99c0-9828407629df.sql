-- Adicionar campos de progresso e automação na tabela de processos
ALTER TABLE public.processes 
ADD COLUMN IF NOT EXISTS completion_percentage INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS pending_documents_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS missing_signatures_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS automation_status TEXT DEFAULT 'idle', -- 'idle', 'running', 'blocked', 'ready'
ADD COLUMN IF NOT EXISTS last_automation_run TIMESTAMP WITH TIME ZONE;

-- Tabela de Tarefas Operacionais Automáticas
CREATE TABLE IF NOT EXISTS public.operational_tasks (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    process_id UUID REFERENCES public.processes(id) ON DELETE CASCADE,
    company_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'cancelled'
    task_type TEXT, -- 'ocr_review', 'document_upload', 'signature', 'correction'
    due_date TIMESTAMP WITH TIME ZONE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.operational_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Empresas acessam suas próprias tarefas"
ON public.operational_tasks
FOR SELECT
USING (
    company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_master')
);

-- Função para calcular progresso do processo e disparar automações
CREATE OR REPLACE FUNCTION public.sync_process_automation()
RETURNS TRIGGER AS $$
DECLARE
    total_req INTEGER;
    done_req INTEGER;
    perc INTEGER;
    pending_docs INTEGER;
    v_process_id UUID;
    v_company_id UUID;
BEGIN
    v_process_id := COALESCE(NEW.process_id, OLD.process_id);
    
    -- Obter total de itens no checklist para este processo
    SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'completed')
    INTO total_req, done_req
    FROM public.document_checklists
    WHERE process_id = v_process_id;

    IF total_req > 0 THEN
        perc := (done_req * 100) / total_req;
        pending_docs := total_req - done_req;
    ELSE
        perc := 0;
        pending_docs := 0;
    END IF;

    -- Obter company_id do processo
    SELECT company_id INTO v_company_id FROM public.processes WHERE id = v_process_id;

    -- Atualizar o processo pai
    UPDATE public.processes 
    SET 
        completion_percentage = perc,
        pending_documents_count = pending_docs,
        automation_status = CASE 
            WHEN perc = 100 THEN 'ready'
            WHEN perc > 0 THEN 'running'
            ELSE 'idle'
        END,
        -- Atualizar status automaticamente se estiver pronto (opcional, dependendo do fluxo real)
        status = CASE 
            WHEN perc = 100 AND status = 'in_progress' THEN 'waiting_protocol'
            ELSE status
        END,
        last_automation_run = now()
    WHERE id = v_process_id;

    -- Registrar na activity_logs
    INSERT INTO public.activity_logs (company_id, action, module)
    VALUES (v_company_id, 'Progresso do processo ' || v_process_id || ' atualizado para ' || perc || '%', 'AUTOMATION');

    -- Se um item foi marcado como completo, ver se precisamos criar tarefas subsequentes
    -- Exemplo: Se subiu um documento e o status mudou para completo, pode precisar de revisão
    IF (TG_OP = 'UPDATE' AND OLD.status != 'completed' AND NEW.status = 'completed') THEN
        -- Criar tarefa de conferência se necessário
        -- INSERT INTO public.operational_tasks ...
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Triggers para sincronização automática
DROP TRIGGER IF EXISTS trigger_sync_on_checklist_change ON public.document_checklists;
CREATE TRIGGER trigger_sync_on_checklist_change
AFTER INSERT OR UPDATE OR DELETE ON public.document_checklists
FOR EACH ROW EXECUTE FUNCTION public.sync_process_automation();
