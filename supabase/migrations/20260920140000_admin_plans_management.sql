-- ============================================================
-- Migration: Gestão de Planos & Preços (Admin NavalDocs Pro)
-- ============================================================
-- Execução transacional para o Cloud SQL Editor.
-- - Sem autorização por e-mail fixo (usa public.is_admin_master()).
-- - Separação estrita de status comercial (status) e Stripe (stripe_sync_status).
-- - Leitura de rascunhos/arquivados restrita a administradores.
-- - Preservação de planos publicados para a vitrine e contratos vigentes para assinantes.
-- - Bloqueio de contratação de rascunhos via trigger em subscriptions.
-- - Verificação prévia de duplicidades de slug antes de indexar.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 0. VERIFICAÇÕES PRÉ-EXECUÇÃO: SLUGS DUPLICADOS E NULOS
-- ------------------------------------------------------------
DO $$
DECLARE
  v_dup_count INT;
  v_dup_slugs TEXT;
  v_null_slug_count INT;
BEGIN
  -- 0.1 Verificar slugs nulos e preencher de forma determinística
  SELECT COUNT(*) INTO v_null_slug_count FROM public.plans WHERE slug IS NULL;
  IF v_null_slug_count > 0 THEN
    UPDATE public.plans 
    SET slug = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || SUBSTRING(id::text, 1, 6)
    WHERE slug IS NULL;
    RAISE NOTICE 'Ajustados % planos que estavam com slug nulo.', v_null_slug_count;
  END IF;

  -- 0.2 Verificar se existem slugs duplicados
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

  RAISE NOTICE 'Verificação prévia de slugs concluída com sucesso (sem duplicidades).';
END $$;

-- Criação segura do índice único em slug
CREATE UNIQUE INDEX IF NOT EXISTS plans_slug_idx ON public.plans (slug);

-- ------------------------------------------------------------
-- 1. ESTRUTURA DE COLUNAS DA TABELA PUBLIC.PLANS
-- ------------------------------------------------------------
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS ocr_limit INTEGER DEFAULT 0;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS storage_limit_gb INTEGER DEFAULT 1;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS process_limit INTEGER DEFAULT 5;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS price_yearly DECIMAL(10,2);
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS is_popular BOOLEAN DEFAULT false;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS highlight_badge TEXT;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS stripe_product_id TEXT;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS stripe_price_monthly_id TEXT;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS stripe_price_yearly_id TEXT;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS sync_error TEXT;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- Adiciona status de publicação comercial (sem default 'draft' de imediato para não sobrescrever legados)
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS status TEXT;

-- Adiciona status de integração com gateway Stripe
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS stripe_sync_status TEXT DEFAULT 'not_synced';

-- ------------------------------------------------------------
-- 2. NORMALIZAÇÃO CORRETA DE STATUS E PRESERVAÇÃO DE LEGADOS
-- ------------------------------------------------------------
-- 2.1 Preservar como 'published' qualquer plano que:
--     a) Tenha assinaturas vigentes vinculadas (subscriptions)
--     b) Tenha empresas vinculadas (companies)
--     c) Seja um plano legado ativo que não seja os 3 novos previstos
UPDATE public.plans
SET status = 'published'
WHERE (
  id IN (SELECT DISTINCT plan_id FROM public.subscriptions WHERE plan_id IS NOT NULL)
  OR id IN (SELECT DISTINCT plan_id FROM public.companies WHERE plan_id IS NOT NULL)
  OR (is_active = true AND slug NOT IN ('essencial', 'profissional', 'equipe'))
)
AND (status IS NULL OR status = 'draft');

-- 2.2 Planos inativos sem status viram 'archived'
UPDATE public.plans
SET status = 'archived'
WHERE is_active = false AND (status IS NULL);

-- 2.3 Para os novos planos previstos ou registros sem status, definir 'draft'
UPDATE public.plans
SET status = 'draft'
WHERE status IS NULL;

-- 2.4 Definir o DEFAULT 'draft' para novas inserções futuras
ALTER TABLE public.plans ALTER COLUMN status SET DEFAULT 'draft';

-- 2.5 Normalizar stripe_sync_status conforme identificadores já existentes
UPDATE public.plans
SET stripe_sync_status = 'synced'
WHERE stripe_product_id IS NOT NULL AND (stripe_price_monthly_id IS NOT NULL OR stripe_price_yearly_id IS NOT NULL)
AND stripe_sync_status != 'synced';

UPDATE public.plans
SET stripe_sync_status = 'failed'
WHERE sync_error IS NOT NULL AND stripe_sync_status = 'not_synced';

-- 2.6 Constraints de validação dos status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'plans_status_check') THEN
    ALTER TABLE public.plans ADD CONSTRAINT plans_status_check 
      CHECK (status IN ('draft', 'published', 'archived'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'plans_stripe_sync_status_check') THEN
    ALTER TABLE public.plans ADD CONSTRAINT plans_stripe_sync_status_check 
      CHECK (stripe_sync_status IN ('not_synced', 'syncing', 'synced', 'failed'));
  END IF;
END $$;

-- ------------------------------------------------------------
-- 3. PERMISSÕES DE TABELA (GRANTS)
-- ------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plans TO authenticated;
GRANT SELECT ON public.plans TO anon;
GRANT ALL ON public.plans TO service_role;

-- ------------------------------------------------------------
-- 4. POLÍTICAS RLS (ROW LEVEL SECURITY)
-- ------------------------------------------------------------
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- Limpeza de políticas anteriores em plans
DROP POLICY IF EXISTS "Authenticated users can view plans" ON public.plans;
DROP POLICY IF EXISTS "Everyone can view active plans" ON public.plans;
DROP POLICY IF EXISTS "Plans are viewable by everyone" ON public.plans;
DROP POLICY IF EXISTS "Admin master can manage everything" ON public.plans;
DROP POLICY IF EXISTS "Admin master can manage plans" ON public.plans;
DROP POLICY IF EXISTS "Public and users can view published plans" ON public.plans;
DROP POLICY IF EXISTS "View published plans and contracted plans" ON public.plans;

-- 4.1 LEITURA CONTROLADA (SELECT):
-- - Planos publicados e ativos são públicos (vitrine e landing page)
-- - Administradores da plataforma vêem todos (rascunhos, arquivados e publicados)
-- - Assinantes autenticados podem ver os dados do plano vinculado à sua empresa, mesmo que legado/arquivado
CREATE POLICY "View published plans and contracted plans"
ON public.plans FOR SELECT
TO anon, authenticated
USING (
  -- Regra 1: Planos publicados e ativos são públicos
  (status = 'published' AND is_active = true)
  OR
  -- Regra 2: Administradores da plataforma acessam todos os status
  (auth.role() = 'authenticated' AND public.is_admin_master())
  OR
  -- Regra 3: Assinantes autenticados acessam o plano contratado pela sua empresa
  (auth.role() = 'authenticated' AND (
    id IN (
      SELECT plan_id FROM public.subscriptions 
      WHERE company_id = public.current_user_company_id()
      AND plan_id IS NOT NULL
    )
    OR
    id IN (
      SELECT plan_id FROM public.companies 
      WHERE id = public.current_user_company_id()
      AND plan_id IS NOT NULL
    )
  ))
);

-- 4.2 GESTÃO COMPLETA (INSERT, UPDATE, DELETE):
-- Exclusiva para administradores da plataforma via função protegida is_admin_master()
CREATE POLICY "Admin master can manage plans" 
ON public.plans FOR ALL 
TO authenticated
USING (public.is_admin_master())
WITH CHECK (public.is_admin_master());

-- ------------------------------------------------------------
-- 5. BLINDAGEM CONTRA CONTRATAÇÃO DE RASCUNHOS (TRIGGER DB)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_plan_not_draft_for_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_plan_status TEXT;
  v_plan_name TEXT;
BEGIN
  IF NEW.plan_id IS NOT NULL THEN
    SELECT status, name INTO v_plan_status, v_plan_name 
    FROM public.plans 
    WHERE id = NEW.plan_id;

    IF v_plan_status = 'draft' THEN
      RAISE EXCEPTION 'Operação bloqueada: O plano "%" está em rascunho e não pode ser contratado.', COALESCE(v_plan_name, NEW.plan_id::text);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_draft_subscription ON public.subscriptions;
CREATE TRIGGER trg_prevent_draft_subscription
  BEFORE INSERT OR UPDATE OF plan_id ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.check_plan_not_draft_for_subscription();

-- ------------------------------------------------------------
-- 6. INSERÇÃO IDEMPOTENTE DOS 3 PLANOS OFICIAIS COMO RASCUNHOS
-- ------------------------------------------------------------
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
  jsonb_build_object(
    'priceYearly', 1490,
    'status', 'draft',
    'stripeSyncStatus', 'not_synced',
    'isPopular', false,
    'highlightFeatures', jsonb_build_array('1 Usuário', '20 Processos/mês', '200 Páginas IA/mês', '5 GB Storage')
  )
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
  jsonb_build_object(
    'priceYearly', 2990,
    'status', 'draft',
    'stripeSyncStatus', 'not_synced',
    'isPopular', true,
    'highlightBadge', 'Recomendado',
    'highlightFeatures', jsonb_build_array('3 Usuários', '60 Processos/mês', '600 Páginas IA/mês', '15 GB Storage')
  )
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
  jsonb_build_object(
    'priceYearly', 5990,
    'status', 'draft',
    'stripeSyncStatus', 'not_synced',
    'isPopular', false,
    'highlightFeatures', jsonb_build_array('10 Usuários', '150 Processos/mês', '1.500 Páginas IA/mês', '40 GB Storage')
  )
)
ON CONFLICT (slug) DO NOTHING;

-- ------------------------------------------------------------
-- 7. VERIFICAÇÕES PÓS-EXECUÇÃO
-- ------------------------------------------------------------
DO $$
DECLARE
  v_published_count INT;
  v_draft_count INT;
  v_archived_count INT;
  v_total_count INT;
BEGIN
  SELECT COUNT(*) INTO v_total_count FROM public.plans;
  SELECT COUNT(*) INTO v_published_count FROM public.plans WHERE status = 'published';
  SELECT COUNT(*) INTO v_draft_count FROM public.plans WHERE status = 'draft';
  SELECT COUNT(*) INTO v_archived_count FROM public.plans WHERE status = 'archived';

  RAISE NOTICE 'Migration concluída com sucesso!';
  RAISE NOTICE 'Total de planos: %, Publicados: %, Rascunhos: %, Arquivados: %', 
    v_total_count, v_published_count, v_draft_count, v_archived_count;
END $$;

COMMIT;
