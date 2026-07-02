-- 1) Enum de roles de participantes
DO $$ BEGIN
  CREATE TYPE public.process_participant_role AS ENUM (
    'owner','buyer','seller','representative','attorney',
    'engineer','technician','witness','applicant','grantor'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Tabela process_participants
CREATE TABLE IF NOT EXISTS public.process_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id uuid NOT NULL REFERENCES public.processes(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  role public.process_participant_role NOT NULL,
  company_id uuid NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (process_id, customer_id, role)
);

CREATE INDEX IF NOT EXISTS idx_pp_process ON public.process_participants(process_id);
CREATE INDEX IF NOT EXISTS idx_pp_role    ON public.process_participants(process_id, role);
CREATE INDEX IF NOT EXISTS idx_pp_company ON public.process_participants(company_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.process_participants TO authenticated;
GRANT ALL ON public.process_participants TO service_role;

ALTER TABLE public.process_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pp_select_same_company" ON public.process_participants
  FOR SELECT TO authenticated
  USING (company_id = public.current_user_company_id() OR public.is_admin_master());

CREATE POLICY "pp_write_same_company" ON public.process_participants
  FOR ALL TO authenticated
  USING (company_id = public.current_user_company_id() OR public.is_admin_master())
  WITH CHECK (company_id = public.current_user_company_id() OR public.is_admin_master());

CREATE TRIGGER trg_pp_updated_at
  BEFORE UPDATE ON public.process_participants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Trigger para preencher company_id automaticamente a partir do processo
CREATE OR REPLACE FUNCTION public.pp_set_company_id()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.company_id IS NULL THEN
    SELECT company_id INTO NEW.company_id FROM public.processes WHERE id = NEW.process_id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_pp_set_company ON public.process_participants;
CREATE TRIGGER trg_pp_set_company
  BEFORE INSERT ON public.process_participants
  FOR EACH ROW EXECUTE FUNCTION public.pp_set_company_id();

-- 4) Backfill: customer_id -> owner ; secondary_customer_id -> seller
INSERT INTO public.process_participants (process_id, customer_id, role, company_id)
SELECT p.id, p.customer_id, 'owner'::public.process_participant_role, p.company_id
  FROM public.processes p
 WHERE p.customer_id IS NOT NULL
ON CONFLICT (process_id, customer_id, role) DO NOTHING;

INSERT INTO public.process_participants (process_id, customer_id, role, company_id)
SELECT p.id, p.secondary_customer_id, 'seller'::public.process_participant_role, p.company_id
  FROM public.processes p
 WHERE p.secondary_customer_id IS NOT NULL
ON CONFLICT (process_id, customer_id, role) DO NOTHING;

-- 5) Trigger de sync: quando um processo é criado/atualizado com customer_id/secondary_customer_id,
--    mantém participantes owner/seller alinhados (retrocompatibilidade com Quick Dialog atual).
CREATE OR REPLACE FUNCTION public.sync_process_participants_from_processes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.customer_id IS NOT NULL THEN
    INSERT INTO public.process_participants(process_id, customer_id, role, company_id)
    VALUES (NEW.id, NEW.customer_id, 'owner', NEW.company_id)
    ON CONFLICT (process_id, customer_id, role) DO NOTHING;
  END IF;
  IF NEW.secondary_customer_id IS NOT NULL THEN
    INSERT INTO public.process_participants(process_id, customer_id, role, company_id)
    VALUES (NEW.id, NEW.secondary_customer_id, 'seller', NEW.company_id)
    ON CONFLICT (process_id, customer_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_pp_from_processes ON public.processes;
CREATE TRIGGER trg_sync_pp_from_processes
  AFTER INSERT OR UPDATE OF customer_id, secondary_customer_id ON public.processes
  FOR EACH ROW EXECUTE FUNCTION public.sync_process_participants_from_processes();

-- 6) RPC helper: retorna participantes de um processo com dados do cliente
CREATE OR REPLACE FUNCTION public.process_get_participants(p_process_id uuid)
RETURNS TABLE(
  id uuid, role public.process_participant_role,
  customer_id uuid, name text, cpf_cnpj text, email text, phone text,
  address text, metadata jsonb
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
BEGIN
  PERFORM public._assert_process_access(p_process_id);
  RETURN QUERY
    SELECT pp.id, pp.role, c.id, c.name, c.cpf_cnpj, c.email, c.phone,
           c.address, pp.metadata
      FROM public.process_participants pp
      JOIN public.customers c ON c.id = pp.customer_id
     WHERE pp.process_id = p_process_id
     ORDER BY pp.role, pp.created_at;
END $$;

REVOKE EXECUTE ON FUNCTION public.process_get_participants(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.process_get_participants(uuid) TO authenticated;