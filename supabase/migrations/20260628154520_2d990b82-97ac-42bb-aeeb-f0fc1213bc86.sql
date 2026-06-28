
CREATE TABLE public.template_signature_anchors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  template_id text NOT NULL,
  role text NOT NULL CHECK (role IN ('cliente','engenheiro','despachante','responsavel_tecnico','testemunha','outro')),
  page integer NOT NULL DEFAULT 1 CHECK (page >= 1),
  x numeric NOT NULL DEFAULT 40,
  y numeric NOT NULL DEFAULT 80,
  width numeric NOT NULL DEFAULT 200,
  height numeric NOT NULL DEFAULT 70,
  align text NOT NULL DEFAULT 'left' CHECK (align IN ('left','center','right')),
  label text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tsa_template ON public.template_signature_anchors (template_id);
CREATE INDEX idx_tsa_company ON public.template_signature_anchors (company_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.template_signature_anchors TO authenticated;
GRANT ALL ON public.template_signature_anchors TO service_role;

ALTER TABLE public.template_signature_anchors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tsa_read_global_or_own"
  ON public.template_signature_anchors FOR SELECT TO authenticated
  USING (company_id IS NULL OR company_id = public.current_user_company_id() OR public.is_admin_master());

CREATE POLICY "tsa_company_write"
  ON public.template_signature_anchors FOR INSERT TO authenticated
  WITH CHECK (company_id = public.current_user_company_id() OR (company_id IS NULL AND public.is_admin_master()));

CREATE POLICY "tsa_company_update"
  ON public.template_signature_anchors FOR UPDATE TO authenticated
  USING (company_id = public.current_user_company_id() OR (company_id IS NULL AND public.is_admin_master()))
  WITH CHECK (company_id = public.current_user_company_id() OR (company_id IS NULL AND public.is_admin_master()));

CREATE POLICY "tsa_company_delete"
  ON public.template_signature_anchors FOR DELETE TO authenticated
  USING (company_id = public.current_user_company_id() OR (company_id IS NULL AND public.is_admin_master()));

CREATE TRIGGER trg_tsa_updated
  BEFORE UPDATE ON public.template_signature_anchors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
