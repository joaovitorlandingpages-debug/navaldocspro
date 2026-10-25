-- ====================================================================
-- MIGRATION: 20261025120000_grant_can_manage_company_billing.sql
-- AUTORIZAÇÃO FINANCEIRA RIGOROSA: can_manage_company_billing
-- ====================================================================
-- 1. Exige que chamadas de usuários autenticados (auth.role() = 'authenticated')
--    utilizem estritamente a identidade de sua própria sessão (auth.uid()),
--    rejeitando consultas forjadas em nome de outros usuários.
-- 2. Permite que chamadas com papel service_role (Edge Functions seguras)
--    repassem p_user_id validado pelo token JWT decodificado no servidor.
-- 3. Revoga explicitamente permissões de anon e PUBLIC.
-- 4. Preserva exatamente os nomes e tipos dos parâmetros existentes: (p_user_id UUID, p_company_id UUID).
-- ====================================================================

-- Garante remoção de sobrecargas antigas para evitar divergência de assinatura
DROP FUNCTION IF EXISTS public.can_manage_company_billing(UUID, UUID);

CREATE OR REPLACE FUNCTION public.can_manage_company_billing(
    p_user_id UUID,
    p_company_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
STABLE
AS $$
DECLARE
    v_effective_user_id UUID;
    v_current_role TEXT;
BEGIN
    -- Validação de nulidade básica
    IF p_user_id IS NULL OR p_company_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Papel da requisição atual no contexto Postgres
    v_current_role := COALESCE(auth.role(), current_user);

    -- 1. Se chamada por usuário autenticado direto (ex: via PostgREST / cliente frontend),
    --    NÃO confia no p_user_id fornecido se diferir do auth.uid() da sessão
    IF v_current_role = 'authenticated' THEN
        IF auth.uid() IS NULL OR auth.uid() <> p_user_id THEN
            -- Rejeição imediata de tentativa de impersonation
            RETURN FALSE;
        END IF;
        v_effective_user_id := auth.uid();
    ELSIF v_current_role IN ('service_role', 'postgres', 'supabase_admin') THEN
        -- Chamadas internas confiáveis provenientes de Edge Functions autenticadas
        v_effective_user_id := p_user_id;
    ELSE
        -- Bloqueio para qualquer outro papel não autorizado (ex: anon)
        RETURN FALSE;
    END IF;

    -- 2. Verificação estrita de autorização no banco
    RETURN (
        -- Gestor financeiro da própria empresa
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = v_effective_user_id
              AND p.company_id = p_company_id
              AND p.role IN ('company_admin', 'admin', 'owner', 'finance')
        )
        OR
        -- Administrador Master da plataforma (isento comercialmente / controle master)
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = v_effective_user_id
              AND p.role IN ('admin_master', 'admin_master_global', 'superadmin')
        )
    );
END;
$$;

-- 3. Gestão estrita de privilégios de execução
REVOKE ALL ON FUNCTION public.can_manage_company_billing(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_manage_company_billing(UUID, UUID) FROM anon;

GRANT EXECUTE ON FUNCTION public.can_manage_company_billing(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_company_billing(UUID, UUID) TO service_role;

NOTIFY pgrst, 'reload schema';
