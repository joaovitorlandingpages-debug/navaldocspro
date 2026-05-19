-- 1. Consolidar Telemetria (Migrar system_health para system_health_status se necessário)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_health') THEN
        INSERT INTO public.system_health_status (service_name, status, message)
        SELECT module_name, status, last_check::text FROM public.system_health
        ON CONFLICT (service_name) DO UPDATE SET status = EXCLUDED.status;
    END IF;
END $$;

-- 2. Índices de Performance Enterprise
CREATE INDEX IF NOT EXISTS idx_processes_company_status ON public.processes(company_id, status);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_process_id ON public.uploaded_files(process_id);
CREATE INDEX IF NOT EXISTS idx_ocr_jobs_status ON public.ocr_jobs(status);
CREATE INDEX IF NOT EXISTS idx_operational_tasks_company_priority ON public.operational_tasks(company_id, priority);

-- 3. Garantir Buckets de Storage
INSERT INTO storage.buckets (id, name, public) 
VALUES ('ocr-documents', 'ocr-documents', false)
ON CONFLICT (id) DO NOTHING;

-- 4. Políticas de Segurança Globais Finais
-- Garantir que admin_master_global ignore RLS em tabelas críticas (através de políticas ALL)
DO $$ 
DECLARE
    t text;
BEGIN
    FOR t IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Global Admin Bypass %I" ON public.%I', t, t);
        EXECUTE format('CREATE POLICY "Global Admin Bypass %I" ON public.%I FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = ''admin_master_global''))', t, t);
    END LOOP;
END $$;

-- 5. Função de Auditoria de Readiness (Executada via RPC se necessário)
CREATE OR REPLACE FUNCTION public.get_system_readiness()
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'database_status', 'operational',
        'active_companies', (SELECT count(*) FROM public.companies WHERE is_active = true),
        'total_ocr_jobs', (SELECT count(*) FROM public.ocr_jobs),
        'security_level', 'enterprise_rls_v2',
        'timestamp', now()
    ) INTO result;
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
