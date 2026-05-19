-- 1. Atualizar a constraint de roles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
CHECK (role = ANY (ARRAY['admin_master_global'::text, 'admin_master'::text, 'company_admin'::text, 'engineer'::text, 'dispatcher'::text, 'operational'::text, 'finance'::text, 'viewer'::text]));

-- 2. Promover o primeiro Admin Global
UPDATE public.profiles
SET role = 'admin_master_global'
WHERE email = 'joaovitor.f0725@gmail.com';

-- 3. Tabelas de Gestão Global
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    subject TEXT NOT NULL,
    description TEXT,
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'open',
    category TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.global_audit_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_id UUID REFERENCES public.profiles(id),
    action TEXT NOT NULL,
    target_table TEXT,
    target_id UUID,
    previous_value JSONB,
    new_value JSONB,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Habilitar RLS e Criar Políticas Globais
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_audit_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso para Admin Global
DO $$ 
BEGIN
    -- Empresas
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'companies' AND policyname = 'Global Admin acessa todas empresas') THEN
        DROP POLICY "Global Admin acessa todas empresas" ON public.companies;
    END IF;
    CREATE POLICY "Global Admin acessa todas empresas" ON public.companies FOR ALL 
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_master_global'));

    -- Perfis
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Global Admin acessa todos perfis') THEN
        DROP POLICY "Global Admin acessa todos perfis" ON public.profiles;
    END IF;
    CREATE POLICY "Global Admin acessa todos perfis" ON public.profiles FOR ALL 
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_master_global'));

    -- Processos
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'processes' AND policyname = 'Global Admin acessa todos processos') THEN
        DROP POLICY "Global Admin acessa todos processos" ON public.processes;
    END IF;
    CREATE POLICY "Global Admin acessa todos processos" ON public.processes FOR ALL 
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_master_global'));
END $$;

-- Política de Suporte
CREATE POLICY "Usuários veem seus próprios tickets" ON public.support_tickets FOR SELECT
USING (company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Global Admin acessa todos tickets" ON public.support_tickets FOR ALL
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_master_global'));

-- Auditoria
CREATE POLICY "Global Admin acessa logs de auditoria" ON public.global_audit_logs FOR SELECT
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_master_global'));
