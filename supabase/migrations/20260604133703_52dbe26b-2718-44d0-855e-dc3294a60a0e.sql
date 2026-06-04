-- Primeiro, identificamos se o usuário atual (o que está testando) tem uma empresa vinculada.
-- No ambiente de sandbox, o usuário logado costuma ser o primeiro da tabela auth.users.
-- Vamos garantir que todos os perfis existentes tenham uma empresa e assinatura.

DO $$
DECLARE
    curr_user_id UUID;
    new_company_id UUID;
    starter_plan_id UUID;
BEGIN
    -- Obter um ID de plano starter
    SELECT id INTO starter_plan_id FROM public.plans WHERE name ILIKE '%starter%' LIMIT 1;
    
    -- Se não houver plano starter, pegar o primeiro plano
    IF starter_plan_id IS NULL THEN
        SELECT id INTO starter_plan_id FROM public.plans LIMIT 1;
    END IF;

    -- Loop por perfis sem empresa
    FOR curr_user_id IN SELECT id FROM public.profiles WHERE company_id IS NULL LOOP
        -- Criar empresa para o usuário
        INSERT INTO public.companies (name, plan, is_active, created_by)
        VALUES ('Workspace Pessoal', 'starter', true, curr_user_id)
        RETURNING id INTO new_company_id;

        -- Atualizar perfil
        UPDATE public.profiles SET company_id = new_company_id WHERE id = curr_user_id;

        -- Criar assinatura para a empresa
        IF starter_plan_id IS NOT NULL THEN
            INSERT INTO public.subscriptions (company_id, plan_id, status, current_period_start, current_period_end)
            VALUES (new_company_id, starter_plan_id, 'active', now(), now() + interval '1 year');
        END IF;
    END LOOP;

    -- Garantir que as empresas existentes também tenham uma assinatura ativa
    FOR new_company_id IN SELECT id FROM public.companies c WHERE NOT EXISTS (SELECT 1 FROM public.subscriptions s WHERE s.company_id = c.id) LOOP
        IF starter_plan_id IS NOT NULL THEN
            INSERT INTO public.subscriptions (company_id, plan_id, status, current_period_start, current_period_end)
            VALUES (new_company_id, starter_plan_id, 'active', now(), now() + interval '1 year');
        END IF;
    END LOOP;
END $$;
