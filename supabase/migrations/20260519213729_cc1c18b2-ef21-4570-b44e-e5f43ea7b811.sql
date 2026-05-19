-- 1. Expansão de Processos para SLA e Prioridades
ALTER TABLE public.processes 
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent', 'critical'
ADD COLUMN IF NOT EXISTS responsible_id UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS technical_manager_id UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS sla_deadline TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS sla_status TEXT DEFAULT 'normal', -- 'normal', 'warning', 'breached'
ADD COLUMN IF NOT EXISTS stalled_since TIMESTAMP WITH TIME ZONE;

-- 2. Histórico de SLA por Etapa (Gargalos)
CREATE TABLE IF NOT EXISTS public.process_sla_history (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    process_id UUID REFERENCES public.processes(id) ON DELETE CASCADE,
    stage TEXT NOT NULL, -- 'ocr_pending', 'waiting_signature', etc.
    entered_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    exited_at TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    is_breached BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Tabela de Monitoramento de Saúde do Sistema (Real-time)
CREATE TABLE IF NOT EXISTS public.system_health_status (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    service_name TEXT NOT NULL UNIQUE, -- 'supabase_db', 'ocr_engine', 'payment_gateway', 'edge_functions'
    status TEXT NOT NULL, -- 'operational', 'degraded', 'outage'
    last_check TIMESTAMP WITH TIME ZONE DEFAULT now(),
    latency_ms INTEGER,
    message TEXT
);

-- Inserir serviços iniciais de monitoramento
INSERT INTO public.system_health_status (service_name, status)
VALUES 
('supabase_db', 'operational'),
('ocr_engine', 'operational'),
('payment_gateway', 'operational'),
('edge_functions', 'operational'),
('storage_service', 'operational')
ON CONFLICT (service_name) DO NOTHING;

-- 4. Função para monitorar mudanças de status e gravar SLA
CREATE OR REPLACE FUNCTION public.log_process_stage_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Se o status mudou, fechar a etapa anterior e abrir a nova
    IF (OLD.status IS NULL OR OLD.status != NEW.status) THEN
        -- Fechar etapa anterior
        UPDATE public.process_sla_history 
        SET exited_at = now(),
            duration_minutes = EXTRACT(EPOCH FROM (now() - entered_at))/60
        WHERE process_id = NEW.id AND exited_at IS NULL;

        -- Abrir nova etapa
        INSERT INTO public.process_sla_history (process_id, stage)
        VALUES (NEW.id, NEW.status);
        
        -- Resetar tempo de estagnação
        NEW.stalled_since = NULL;
    END IF;
    
    -- Lógica de prioridade automática: se for crítico, garantir visibilidade
    IF (NEW.priority = 'critical' OR NEW.priority = 'urgent') THEN
        -- Ações automáticas para prioridade crítica poderiam ser inseridas aqui
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para SLA
DROP TRIGGER IF EXISTS trigger_process_sla_log ON public.processes;
CREATE TRIGGER trigger_process_sla_log
BEFORE UPDATE ON public.processes
FOR EACH ROW EXECUTE FUNCTION public.log_process_stage_change();

-- 5. RLS para novas tabelas
ALTER TABLE public.process_sla_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_health_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Empresas veem histórico de SLA de seus processos"
ON public.process_sla_history FOR SELECT
USING (
    EXISTS (SELECT 1 FROM public.processes p WHERE p.id = process_id AND (p.company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_master')))
);

CREATE POLICY "Monitoramento visível para todos os autenticados"
ON public.system_health_status FOR SELECT
USING (auth.uid() IS NOT NULL);
