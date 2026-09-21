-- ============================================================
-- Migration: Gestão de Planos & Preços (Admin NavalDocs Pro)
-- ============================================================
-- Execução transacional para o Cloud SQL Editor.
-- 1. Garante colunas base (incluindo slug, price_yearly, process_limit) antes de qualquer manipulação.
-- 2. Migra valores legados técnicos ('synced', 'failed', 'syncing') para stripe_sync_status.
-- 3. Normaliza status comercial sem publicar automaticamente planos arquivados com contratos antigos.
-- 4. Bloqueia contratação se status IS DISTINCT FROM 'published' ou is_active IS DISTINCT FROM true (preservando renovações do mesmo plano).
-- 5. RLS separadas: leitura pública sem dependências circulares e leitura de contratos autenticados.
-- 6. Preços e limites preservados exatamente conforme aprovado, sem limites de clientes ou benefícios comerciais não solicitados.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1. ESTRUTURA DE COLUNAS DA TABELA PUBLIC.PLANS (DDL INICIAL)
-- ------------------------------------------------------------
-- Garante a coluna slug antes de qualquer consulta, update ou criação de índice
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS price_yearly DECIMAL(10,2);
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS user_limit INTEGER DEFAULT 1;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS process_limit INTEGER DEFAULT 20;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS ocr_limit INTEGER DEFAULT 200;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS storage_limit_gb INTEGER DEFAULT 5;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS is_popular BOOLEAN DEFAULT false;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS highlight_badge TEXT;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Colunas de controle de ciclo de vida e integração Stripe
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS stripe_sync_status TEXT DEFAULT 'not_synced';
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS stripe_product_id TEXT;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS stripe_price_monthly_id TEXT;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS stripe_price_yearly_id TEXT;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS sync_error TEXT;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- ------------------------------------------------------------
-- 2. TRATAMENTO DE SLUGS (NORMALIZAÇÃO E ÍNDICE EXCLUSIVO)
-- ------------------------------------------------------------
-- Preenche slugs nulos em planos legados de forma determinística
UPDATE public.plans 
SET slug = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || SUBSTRING(id::text, 1, 6)
WHERE slug IS NULL;

-- Verificação prévia de slugs duplicados
DO $$
DECLARE
  v_dup_count INT;
  v_dup_slugs TEXT;
BEGIN
  SELECT COUNT(*), string_agg(slug, ', ')
  INTO v_dup_count, v_dup_slugs
  FROM (
    SELECT slug FROM public.plans 
    WHERE slug IS NOT NULL 
    GROUP BY slug 
    HAVING COUNT(*) > 1
  ) dups;

  IF v_dup_count > 0 THEN
    RAISE EXCEPTION 'Abortando migration: Foram identificados slugs duplicados na tabela public.plans: (%). Corrija os registros duplicados antes de prosseguir.', v_dup_slugs;
  END IF;
END $$;

-- Criação do índice único em slug
CREATE UNIQUE INDEX IF NOT EXISTS plans_slug_idx ON public.plans (slug);

-- ------------------------------------------------------------
-- 3. MIGRAÇÃO DE STATUS TÉCNICOS E NORMALIZAÇÃO COMERCIAL
-- ------------------------------------------------------------
-- 3.1 Se o campo status guardava estados técnicos da Stripe ('synced', 'failed', 'syncing'), migra para stripe_sync_status
UPDATE public.plans
SET stripe_sync_status = CASE 
  WHEN status = 'synced' THEN 'synced'
  WHEN status = 'failed' THEN 'failed'
  WHEN status = 'syncing' THEN 'syncing'
  ELSE COALESCE(stripe_sync_status, 'not_synced')
END
WHERE status IN ('synced', 'failed', 'syncing');

-- Se possui identificadores Stripe já vinculados, marca como synced se ainda not_synced
UPDATE public.plans
SET stripe_sync_status = 'synced'
WHERE stripe_product_id IS NOT NULL AND (stripe_price_monthly_id IS NOT NULL OR stripe_price_yearly_id IS NOT NULL)
AND (stripe_sync_status IS NULL OR stripe_sync_status = 'not_synced');

-- 3.2 Normalização do status comercial:
-- - Planos inativos tornam-se 'archived' (mesmo que tenham assinaturas vigentes, não devem ser republicados na vitrine)
UPDATE public.plans
SET status = 'archived'
WHERE is_active = false AND (status IS NULL OR status IN ('synced', 'failed', 'syncing'));

-- - Os 3 novos planos previstos são mantidos/iniciados como 'draft'
UPDATE public.plans
SET status = 'draft'
WHERE slug IN ('essencial', 'profissional', 'equipe') AND (status IS NULL OR status IN ('synced', 'failed', 'syncing'));

-- - Planos legados ativos tornam-se 'published'
UPDATE public.plans
SET status = 'published'
WHERE is_active = true AND slug NOT IN ('essencial', 'profissional', 'equipe') AND (status IS NULL OR status IN ('synced', 'failed', 'syncing'));

-- - Fallback para qualquer outro registro sem status
UPDATE public.plans
SET status = 'draft'
WHERE status IS NULL;

-- 3.3 Definir DEFAULT 'draft' para novas inserções futuras
ALTER TABLE public.plans ALTER COLUMN status SET DEFAULT 'draft';

-- 3.4 Constraints de validação dos status (com limpeza prévia)
ALTER TABLE public.plans DROP CONSTRAINT IF EXISTS plans_status_check;
ALTER TABLE public.plans ADD CONSTRAINT plans_status_check 
  CHECK (status IN ('draft', 'published', 'archived'));

ALTER TABLE public.plans DROP CONSTRAINT IF EXISTS plans_stripe_sync_status_check;
ALTER TABLE public.plans ADD CONSTRAINT plans_stripe_sync_status_check 
  CHECK (stripe_sync_status IN ('not_synced', 'syncing', 'synced', 'failed'));

-- ------------------------------------------------------------
-- 4. PERMISSÕES DE TABELA (GRANTS)
-- ------------------------------------------------------------
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'GRANT SELECT ON public.plans TO anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.plans TO authenticated';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    EXECUTE 'GRANT ALL ON public.plans TO service_role';
  END IF;
END $$;

-- ------------------------------------------------------------
-- 5. POLÍTICAS RLS SEPARADAS (SEM DEPENDÊNCIA CIRCULAR)
-- ------------------------------------------------------------
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- Limpeza de políticas anteriores
DROP POLICY IF EXISTS "Authenticated users can view plans" ON public.plans;
DROP POLICY IF EXISTS "Everyone can view active plans" ON public.plans;
DROP POLICY IF EXISTS "Plans are viewable by everyone" ON public.plans;
DROP POLICY IF EXISTS "Admin master can manage everything" ON public.plans;
DROP POLICY IF EXISTS "Admin master can manage plans" ON public.plans;
DROP POLICY IF EXISTS "Public and users can view published plans" ON public.plans;
DROP POLICY IF EXISTS "View published plans and contracted plans" ON public.plans;
DROP POLICY IF EXISTS "Public can view published active plans" ON public.plans;
DROP POLICY IF EXISTS "Subscribers can view their contracted plans" ON public.plans;
DROP POLICY IF EXISTS "Admins can view and manage all plans" ON public.plans;

-- 5.1 LEITURA PÚBLICA (Vitrine e Landing Page):
-- Sem subqueries em subscriptions ou companies, evitando dependências circulares
CREATE POLICY "Public can view published active plans"
ON public.plans FOR SELECT
TO anon, authenticated
USING (status = 'published' AND is_active = true);

-- 5.2 LEITURA DE CONTRATOS ATIVOS (Clientes Autenticados):
-- Permite ao assinante consultar o plano da sua empresa, mesmo se for arquivado/legado
CREATE POLICY "Subscribers can view their contracted plans"
ON public.plans FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT s.plan_id 
    FROM public.subscriptions s 
    WHERE s.company_id = public.current_user_company_id()
    AND s.plan_id IS NOT NULL
  )
  OR
  id IN (
    SELECT c.plan_id 
    FROM public.companies c 
    WHERE c.id = public.current_user_company_id()
    AND c.plan_id IS NOT NULL
  )
);

-- 5.3 GESTÃO TOTAL (Administradores da Plataforma):
-- Exclusiva para administradores master via função segura is_admin_master()
CREATE POLICY "Admins can view and manage all plans"
ON public.plans FOR ALL
TO authenticated
USING (public.is_admin_master())
WITH CHECK (public.is_admin_master());

-- ------------------------------------------------------------
-- 6. TRIGGER DE BLINDAGEM CONTRA CONTRATAÇÃO DE RASCUNHOS E ARQUIVADOS
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_plan_eligibility_for_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_plan_status TEXT;
  v_is_active BOOLEAN;
  v_plan_name TEXT;
  v_is_plan_change BOOLEAN;
BEGIN
  -- Se o plan_id não foi preenchido, prossegue
  IF NEW.plan_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Identifica se é uma nova contratação (INSERT) ou alteração de plano (UPDATE com plan_id distinto)
  v_is_plan_change := (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE' AND (OLD.plan_id IS DISTINCT FROM NEW.plan_id));

  -- Se for apenas atualização ou renovação de contrato existente (sem mudança de plano), permite sem bloquear
  IF NOT v_is_plan_change THEN
    RETURN NEW;
  END IF;

  -- Para novas contratações ou migrações de plano, valida o plano de destino:
  SELECT status, is_active, name 
  INTO v_plan_status, v_is_active, v_plan_name
  FROM public.plans 
  WHERE id = NEW.plan_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plano de destino não encontrado no catálogo (id: %).', NEW.plan_id;
  END IF;

  -- Rejeita se status IS DISTINCT FROM 'published' ou is_active IS DISTINCT FROM true (cobre rascunhos, arquivados, inativos e valores nulos)
  IF (v_plan_status IS DISTINCT FROM 'published') OR (v_is_active IS DISTINCT FROM true) THEN
    RAISE EXCEPTION 'Operação bloqueada: O plano "%" não está disponível para novas contratações (status: %, ativo: %).', 
      COALESCE(v_plan_name, NEW.plan_id::text),
      COALESCE(v_plan_status, 'nulo'),
      COALESCE(v_is_active::text, 'nulo');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_draft_subscription ON public.subscriptions;
DROP TRIGGER IF EXISTS trg_check_subscription_plan_eligibility ON public.subscriptions;

CREATE TRIGGER trg_check_subscription_plan_eligibility
  BEFORE INSERT OR UPDATE OF plan_id ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.check_plan_eligibility_for_subscription();

-- ------------------------------------------------------------
-- 7. INSERÇÃO E ATUALIZAÇÃO IDEMPOTENTE DOS 3 PLANOS OFICIAIS COMO RASCUNHOS
-- ------------------------------------------------------------
-- Insere ou atualiza rascunhos preservando exatamente limites aprovados:
-- Essencial: R$149/mês, R$1.490/ano, 1 usuário, 20 processos/mês, 200 páginas IA/mês, 5GB
-- Profissional: R$299/mês, R$2.990/ano, 3 usuários, 60 processos/mês, 600 páginas IA/mês, 15GB
-- Equipe: R$599/mês, R$5.990/ano, 10 usuários, 150 processos/mês, 1.500 páginas IA/mês, 40GB
-- Sem acrescentar limites de clientes ou benefícios comerciais sem aprovação.
INSERT INTO public.plans (
  name,
  slug,
  description,
  price,
  price_yearly,
  billing_cycle,
  user_limit,
  process_limit,
  ocr_limit,
  storage_limit_gb,
  status,
  stripe_sync_status,
  is_popular,
  highlight_badge,
  is_active,
  features
)
VALUES 
(
  'Essencial',
  'essencial',
  'Ideal para profissionais autônomos e pequenos escritórios náuticos em início de operação.',
  149.00,
  1490.00,
  'monthly',
  1,
  20,
  200,
  5,
  'draft',
  'not_synced',
  false,
  NULL,
  true,
  '["1 usuário", "20 processos/mês", "200 páginas IA/mês", "5GB de armazenamento"]'::jsonb
),
(
  'Profissional',
  'profissional',
  'Para escritórios em crescimento que exigem mais capacidade analítica com IA e múltiplos usuários.',
  299.00,
  2990.00,
  'monthly',
  3,
  60,
  600,
  15,
  'draft',
  'not_synced',
  true,
  'Recomendado',
  true,
  '["3 usuários", "60 processos/mês", "600 páginas IA/mês", "15GB de armazenamento"]'::jsonb
),
(
  'Equipe',
  'equipe',
  'Solução completa para grandes empresas marítimas, estaleiros e consultorias com alta demanda.',
  599.00,
  5990.00,
  'monthly',
  10,
  150,
  1500,
  40,
  'draft',
  'not_synced',
  false,
  NULL,
  true,
  '["10 usuários", "150 processos/mês", "1.500 páginas IA/mês", "40GB de armazenamento"]'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  price_yearly = EXCLUDED.price_yearly,
  billing_cycle = EXCLUDED.billing_cycle,
  user_limit = EXCLUDED.user_limit,
  process_limit = EXCLUDED.process_limit,
  ocr_limit = EXCLUDED.ocr_limit,
  storage_limit_gb = EXCLUDED.storage_limit_gb,
  is_popular = EXCLUDED.is_popular,
  highlight_badge = EXCLUDED.highlight_badge,
  features = EXCLUDED.features
WHERE public.plans.status = 'draft'
  AND NOT EXISTS (
    SELECT 1 FROM public.subscriptions s WHERE s.plan_id = public.plans.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.companies c WHERE c.plan_id = public.plans.id
  );

-- Garante que customer_limit e document_limit não fiquem preenchidos indevidamente nos 3 rascunhos oficiais não contratados
UPDATE public.plans
SET customer_limit = NULL,
    document_limit = NULL
WHERE slug IN ('essencial', 'profissional', 'equipe')
  AND status = 'draft'
  AND NOT EXISTS (
    SELECT 1 FROM public.subscriptions s WHERE s.plan_id = public.plans.id
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.companies c WHERE c.plan_id = public.plans.id
  );

-- ------------------------------------------------------------
-- 8. VERIFICAÇÕES PÓS-EXECUÇÃO
-- ------------------------------------------------------------
DO $$
DECLARE
  v_published_count INT;
  v_draft_count INT;
  v_archived_count INT;
  v_invalid_count INT;
BEGIN
  SELECT COUNT(*) INTO v_published_count FROM public.plans WHERE status = 'published';
  SELECT COUNT(*) INTO v_draft_count FROM public.plans WHERE status = 'draft';
  SELECT COUNT(*) INTO v_archived_count FROM public.plans WHERE status = 'archived';
  SELECT COUNT(*) INTO v_invalid_count FROM public.plans WHERE status NOT IN ('draft', 'published', 'archived') OR status IS NULL;

  IF v_invalid_count > 0 THEN
    RAISE EXCEPTION 'Falha de integridade: existem % planos com status inválido.', v_invalid_count;
  END IF;

  RAISE NOTICE 'Migration executada com sucesso! Publicados: %, Rascunhos: %, Arquivados: %',
    v_published_count, v_draft_count, v_archived_count;
END $$;

COMMIT;
