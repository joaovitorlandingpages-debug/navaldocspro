-- Onda 2C — Finalização e Imutabilidade Total

CREATE OR REPLACE FUNCTION public.is_admin_master_caller()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin_master','admin_master_global')
  );
$$;

CREATE TABLE IF NOT EXISTS public.process_finalization_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id uuid NOT NULL,
  table_name text NOT NULL,
  op text NOT NULL,
  row_pk uuid,
  actor_id uuid,
  actor_role text,
  old_data jsonb,
  new_data jsonb,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.process_finalization_overrides TO authenticated;
GRANT ALL ON public.process_finalization_overrides TO service_role;
ALTER TABLE public.process_finalization_overrides ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_master reads overrides" ON public.process_finalization_overrides;
CREATE POLICY "admin_master reads overrides" ON public.process_finalization_overrides
  FOR SELECT TO authenticated USING (public.is_admin_master_caller());
CREATE INDEX IF NOT EXISTS idx_pfo_process ON public.process_finalization_overrides(process_id);

CREATE OR REPLACE FUNCTION public.assert_process_not_finalized()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_pid uuid; v_status text; v_finalized timestamptz;
  v_row_pk uuid; v_old jsonb; v_new jsonb;
BEGIN
  v_pid := COALESCE(NEW.process_id, OLD.process_id);
  IF v_pid IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  SELECT status, finalized_at INTO v_status, v_finalized
    FROM public.processes WHERE id = v_pid;

  IF v_finalized IS NULL AND (v_status IS NULL OR v_status NOT IN ('completed','finalized','archived')) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF public.is_admin_master_caller() THEN
    BEGIN v_row_pk := COALESCE((NEW).id, (OLD).id); EXCEPTION WHEN OTHERS THEN v_row_pk := NULL; END;
    BEGIN v_old := to_jsonb(OLD); EXCEPTION WHEN OTHERS THEN v_old := NULL; END;
    BEGIN v_new := to_jsonb(NEW); EXCEPTION WHEN OTHERS THEN v_new := NULL; END;
    INSERT INTO public.process_finalization_overrides
      (process_id, table_name, op, row_pk, actor_id, actor_role, old_data, new_data)
    VALUES (v_pid, TG_TABLE_NAME, TG_OP, v_row_pk, auth.uid(), 'admin_master', v_old, v_new);
    RETURN COALESCE(NEW, OLD);
  END IF;

  RAISE EXCEPTION 'process_finalized_immutable: cannot % on % for finalized process %',
    TG_OP, TG_TABLE_NAME, v_pid USING ERRCODE = 'P0001';
END $$;

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'generated_documents','process_dossiers','signature_requests',
    'document_checklists','process_document_uploads','documents',
    'process_participants','process_comments','process_document_packages',
    'signature_participants'
  ]) LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema='public' AND table_name = t) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_immutable_%1$s ON public.%1$I', t);
      EXECUTE format(
        'CREATE TRIGGER trg_immutable_%1$s
           BEFORE INSERT OR UPDATE OR DELETE ON public.%1$I
           FOR EACH ROW EXECUTE FUNCTION public.assert_process_not_finalized()',
        t
      );
    END IF;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.assert_process_self_immutable()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_admin boolean;
  v_finalized boolean;
BEGIN
  v_finalized := OLD.finalized_at IS NOT NULL
              OR OLD.status IN ('completed','finalized','archived');
  IF NOT v_finalized THEN RETURN NEW; END IF;

  v_admin := public.is_admin_master_caller();

  IF TG_OP = 'DELETE' THEN
    IF v_admin THEN
      INSERT INTO public.process_finalization_overrides
        (process_id, table_name, op, row_pk, actor_id, actor_role, old_data)
      VALUES (OLD.id, 'processes', 'DELETE', OLD.id, auth.uid(), 'admin_master', to_jsonb(OLD));
      RETURN OLD;
    END IF;
    RAISE EXCEPTION 'process_finalized_immutable: cannot DELETE finalized process %', OLD.id
      USING ERRCODE = 'P0001';
  END IF;

  IF NEW.customer_id IS DISTINCT FROM OLD.customer_id
     OR NEW.vessel_id IS DISTINCT FROM OLD.vessel_id
     OR NEW.process_type IS DISTINCT FROM OLD.process_type
     OR NEW.process_type_id IS DISTINCT FROM OLD.process_type_id
     OR NEW.company_id IS DISTINCT FROM OLD.company_id
     OR NEW.title IS DISTINCT FROM OLD.title
  THEN
    IF v_admin THEN
      INSERT INTO public.process_finalization_overrides
        (process_id, table_name, op, row_pk, actor_id, actor_role, old_data, new_data)
      VALUES (OLD.id, 'processes', 'UPDATE', OLD.id, auth.uid(), 'admin_master',
              to_jsonb(OLD), to_jsonb(NEW));
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'process_finalized_immutable: cannot modify critical fields of finalized process %', OLD.id
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_immutable_processes ON public.processes;
CREATE TRIGGER trg_immutable_processes
  BEFORE UPDATE OR DELETE ON public.processes
  FOR EACH ROW EXECUTE FUNCTION public.assert_process_self_immutable();