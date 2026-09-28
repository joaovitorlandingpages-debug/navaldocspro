-- ====================================================================
-- MIGRATION: 20260928183000_update_navaldocs_pro_commercial_plans.sql
-- ATUALIZAÇÃO DA PROPOSTA COMERCIAL NAVALDOCS PRO (3 NOVOS PLANOS)
-- ====================================================================
-- 1. Essencial: R$ 249/mês | R$ 2.490/ano | 30 processos/mês | 15 leituras OCR/mês | 1 usuário | 2 GB
-- 2. Profissional: R$ 549/mês | R$ 5.490/ano | 100 processos/mês | 50 leituras OCR/mês | 3 usuários | 8 GB
-- 3. Equipe: R$ 1.099/mês | R$ 10.990/ano | 300 processos/mês | 150 leituras OCR/mês | 10 usuários | 20 GB
-- Preservação rigorosa de contratos e assinaturas já existentes (não altera retroativamente)
-- Arquivamento de planos legados para novas contratações (status = 'archived')
-- ====================================================================

BEGIN;

-- 1. Garante que planos legados não sejam oferecidos para novas contratações
UPDATE public.plans
SET status = 'archived',
    updated_at = timezone('utc'::text, now())
WHERE slug NOT IN ('essencial', 'profissional', 'equipe')
  AND status = 'published';

-- 2. Upsert idempotente dos 3 novos planos comerciais oficiais
INSERT INTO public.plans (
  slug,
  name,
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
  stripe_product_id,
  stripe_price_monthly_id,
  stripe_price_yearly_id,
  is_popular,
  highlight_badge,
  is_active,
  features,
  version,
  updated_at
)
VALUES
(
  'essencial',
  'NavalDocs Essencial',
  'Ideal para profissionais autônomos e pequenos escritórios náuticos em início de operação.',
  249.00,
  2490.00,
  'monthly',
  1,
  30,
  15,
  2,
  'published',
  'synced',
  'prod_navaldocs_essencial',
  'price_essencial_monthly_249',
  'price_essencial_yearly_2490',
  false,
  NULL,
  true,
  '{"features":["1 usuário titular","30 processos navais por mês","15 documentos de origem lidos automaticamente por mês","Geração automática e ilimitada de documentos finais","2 GB de armazenamento seguro em nuvem","Reutilização de dados e digitação manual sem consumir leituras","Modelos oficiais DPC / NORMAM atualizados"]}'::jsonb,
  1,
  timezone('utc'::text, now())
),
(
  'profissional',
  'NavalDocs Profissional',
  'Para escritórios em crescimento que exigem maior volume de processos e equipe colaborativa.',
  549.00,
  5490.00,
  'monthly',
  3,
  100,
  50,
  8,
  'published',
  'synced',
  'prod_navaldocs_profissional',
  'price_profissional_monthly_549',
  'price_profissional_yearly_5490',
  true,
  'Recomendado',
  true,
  '{"features":["Até 3 usuários com controle de permissões","100 processos navais por mês","50 documentos de origem lidos automaticamente por mês","Geração automática e ilimitada de documentos finais","8 GB de armazenamento seguro em nuvem","Reutilização de dados e digitação manual sem consumir leituras","Modelos oficiais DPC / NORMAM atualizados","Suporte prioritário"]}'::jsonb,
  1,
  timezone('utc'::text, now())
),
(
  'equipe',
  'NavalDocs Equipe',
  'Solução completa para grandes empresas marítimas, despachantes estruturados e estaleiros.',
  1099.00,
  10990.00,
  'monthly',
  10,
  300,
  150,
  20,
  'published',
  'synced',
  'prod_navaldocs_equipe',
  'price_equipe_monthly_1099',
  'price_equipe_yearly_10990',
  false,
  NULL,
  true,
  '{"features":["Até 10 usuários simultâneos","300 processos navais por mês","150 documentos de origem lidos automaticamente por mês","Geração automática e ilimitada de documentos finais","20 GB de armazenamento em nuvem","Reutilização de dados e digitação manual sem consumir leituras","Modelos oficiais DPC / NORMAM atualizados","Gestão avançada e atendimento prioritário com SLA"]}'::jsonb,
  1,
  timezone('utc'::text, now())
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
  status = 'published',
  stripe_sync_status = 'synced',
  stripe_product_id = COALESCE(public.plans.stripe_product_id, EXCLUDED.stripe_product_id),
  stripe_price_monthly_id = COALESCE(public.plans.stripe_price_monthly_id, EXCLUDED.stripe_price_monthly_id),
  stripe_price_yearly_id = COALESCE(public.plans.stripe_price_yearly_id, EXCLUDED.stripe_price_yearly_id),
  is_popular = EXCLUDED.is_popular,
  highlight_badge = EXCLUDED.highlight_badge,
  is_active = true,
  features = EXCLUDED.features,
  updated_at = timezone('utc'::text, now());

-- 3. Confirmação dos 3 planos publicados
DO $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count 
  FROM public.plans 
  WHERE status = 'published' AND is_active = true;

  RAISE NOTICE 'Planos comerciais prontos para novas contratações: %', v_count;
END $$;

COMMIT;
