
-- Fatia 1: Review workflow for template versions
CREATE TABLE public.template_review_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.document_templates(id) ON DELETE CASCADE,
  version_id uuid REFERENCES public.template_versions(id) ON DELETE SET NULL,
  company_id uuid,
  requested_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','changes_requested','cancelled')),
  request_note text,
  decided_by uuid,
  decided_at timestamptz,
  decision_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.template_review_requests TO authenticated;
GRANT ALL ON public.template_review_requests TO service_role;

ALTER TABLE public.template_review_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "review_requests_select" ON public.template_review_requests
  FOR SELECT TO authenticated
  USING (
    public.is_admin_master()
    OR company_id IS NULL
    OR company_id = public.current_user_company_id()
  );

CREATE POLICY "review_requests_insert" ON public.template_review_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    requested_by = auth.uid()
    AND (
      public.is_admin_master()
      OR company_id = public.current_user_company_id()
    )
  );

CREATE POLICY "review_requests_update" ON public.template_review_requests
  FOR UPDATE TO authenticated
  USING (
    public.is_admin_master()
    OR company_id = public.current_user_company_id()
  );

CREATE INDEX idx_trr_template ON public.template_review_requests(template_id, status);
CREATE INDEX idx_trr_company ON public.template_review_requests(company_id, status);

CREATE TRIGGER trg_trr_updated_at
  BEFORE UPDATE ON public.template_review_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Comments
CREATE TABLE public.template_review_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_request_id uuid NOT NULL REFERENCES public.template_review_requests(id) ON DELETE CASCADE,
  author_id uuid NOT NULL,
  body text NOT NULL CHECK (length(trim(body)) > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.template_review_comments TO authenticated;
GRANT ALL ON public.template_review_comments TO service_role;

ALTER TABLE public.template_review_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "review_comments_select" ON public.template_review_comments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.template_review_requests r
       WHERE r.id = review_request_id
         AND (public.is_admin_master()
              OR r.company_id IS NULL
              OR r.company_id = public.current_user_company_id())
    )
  );

CREATE POLICY "review_comments_insert" ON public.template_review_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.template_review_requests r
       WHERE r.id = review_request_id
         AND (public.is_admin_master()
              OR r.company_id = public.current_user_company_id())
    )
  );

CREATE INDEX idx_trc_request ON public.template_review_comments(review_request_id, created_at);

-- RPCs
CREATE OR REPLACE FUNCTION public.template_review_open(
  p_template_id uuid,
  p_version_id uuid DEFAULT NULL,
  p_note text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_company uuid;
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  SELECT company_id INTO v_company FROM public.document_templates WHERE id = p_template_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'template_not_found'; END IF;

  IF NOT (public.is_admin_master()
          OR v_company IS NULL
          OR v_company = public.current_user_company_id()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  -- Prevent duplicate pending request for same version
  IF EXISTS (
    SELECT 1 FROM public.template_review_requests
     WHERE template_id = p_template_id
       AND COALESCE(version_id::text,'') = COALESCE(p_version_id::text,'')
       AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'review_already_pending';
  END IF;

  INSERT INTO public.template_review_requests(template_id, version_id, company_id, requested_by, request_note)
  VALUES (p_template_id, p_version_id, v_company, auth.uid(), NULLIF(trim(p_note),''))
  RETURNING id INTO v_id;

  BEGIN
    INSERT INTO public.document_audit_logs(entity_type, entity_id, action, user_id, metadata)
    VALUES ('template_review_request', v_id, 'open',
            auth.uid(),
            jsonb_build_object('template_id', p_template_id, 'version_id', p_version_id));
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.template_review_decide(
  p_request_id uuid,
  p_decision text,
  p_reason text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_req public.template_review_requests;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF p_decision NOT IN ('approved','rejected','changes_requested','cancelled') THEN
    RAISE EXCEPTION 'invalid_decision';
  END IF;

  SELECT * INTO v_req FROM public.template_review_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
  IF v_req.status <> 'pending' THEN RAISE EXCEPTION 'already_decided'; END IF;

  IF NOT (public.is_admin_master()
          OR v_req.company_id IS NULL
          OR v_req.company_id = public.current_user_company_id()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_decision IN ('rejected','changes_requested') AND coalesce(trim(p_reason),'') = '' THEN
    RAISE EXCEPTION 'reason_required';
  END IF;

  UPDATE public.template_review_requests
     SET status = p_decision,
         decided_by = auth.uid(),
         decided_at = now(),
         decision_reason = NULLIF(trim(p_reason),''),
         updated_at = now()
   WHERE id = p_request_id;

  BEGIN
    INSERT INTO public.document_audit_logs(entity_type, entity_id, action, user_id, metadata)
    VALUES ('template_review_request', p_request_id, p_decision,
            auth.uid(),
            jsonb_build_object('template_id', v_req.template_id, 'version_id', v_req.version_id,
                               'reason', NULLIF(trim(p_reason),'')));
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;

CREATE OR REPLACE FUNCTION public.template_review_comment(
  p_request_id uuid,
  p_body text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_req public.template_review_requests;
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF coalesce(trim(p_body),'') = '' THEN RAISE EXCEPTION 'body_required'; END IF;

  SELECT * INTO v_req FROM public.template_review_requests WHERE id = p_request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;

  IF NOT (public.is_admin_master()
          OR v_req.company_id IS NULL
          OR v_req.company_id = public.current_user_company_id()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  INSERT INTO public.template_review_comments(review_request_id, author_id, body)
  VALUES (p_request_id, auth.uid(), trim(p_body))
  RETURNING id INTO v_id;

  RETURN v_id;
END $$;
