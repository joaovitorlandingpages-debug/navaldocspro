-- ============================================================
-- Migration: Expansão do Catálogo Comercial & Addons (NavalDocs Pro)
-- ============================================================
-- 1. Suporte a múltiplos aplicativos: NavalDocs, Arrais e Notificador
-- 2. Franquias específicas (kits Arrais, docs Notificador)
-- 3. Preços unitários de extras / addons (processos, kits, leituras, docs monitorados)
-- 4. Versionamento da oferta comercial e histórico de preços para proteger contratos vigentes
-- 5. Preservação estrita de contratos e assinaturas já existentes
-- ============================================================

BEGIN;

-- 1. Colunas de Aplicativos e Novas Franquias
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS apps_included TEXT[] DEFAULT ARRAY['navaldocs'];
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS arrais_kits_limit INTEGER DEFAULT 0;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS monitored_docs_limit INTEGER DEFAULT 0;

-- 2. Preços de Adicionais / Addons
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS addon_process_price DECIMAL(10,2) DEFAULT 0;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS addon_arrais_kit_price DECIMAL(10,2) DEFAULT 0;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS addon_ocr_price DECIMAL(10,2) DEFAULT 0;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS addon_monitored_doc_price DECIMAL(10,2) DEFAULT 0;

-- 3. Versionamento e Histórico de Preços
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS price_history JSONB DEFAULT '[]'::jsonb;

-- 4. Normalização dos planos existentes para apps_included
UPDATE public.plans 
SET apps_included = ARRAY['navaldocs']
WHERE apps_included IS NULL OR array_length(apps_included, 1) IS NULL;

-- 5. Se o plano for o combo ou profissional, pode incluir outros apps conforme aprovação
UPDATE public.plans
SET apps_included = ARRAY['navaldocs', 'arrais', 'notificador']
WHERE slug ILIKE '%combo%' OR slug ILIKE '%completo%' OR slug ILIKE '%pacote%';

-- 6. Garantir que as assinaturas existentes registrem a versão contratada se ainda não possuírem
UPDATE public.subscriptions s
SET metadata = COALESCE(s.metadata, '{}'::jsonb) || jsonb_build_object(
  'plan_version', COALESCE((SELECT p.version FROM public.plans p WHERE p.id = s.plan_id), 1),
  'contracted_at', COALESCE(s.created_at, now())
)
WHERE s.metadata->>'plan_version' IS NULL;

COMMIT;
