
-- Template versions (changelog per template_id, official or marketplace slug)
CREATE TABLE public.template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id TEXT NOT NULL,
  version TEXT NOT NULL,
  released_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  changelog JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.template_versions TO anon, authenticated;
GRANT ALL ON public.template_versions TO service_role;
ALTER TABLE public.template_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone_read_versions" ON public.template_versions FOR SELECT USING (true);
CREATE POLICY "admin_master_write_versions" ON public.template_versions FOR ALL USING (public.is_admin_master()) WITH CHECK (public.is_admin_master());
CREATE INDEX idx_template_versions_tid ON public.template_versions(template_id, released_at DESC);

-- Template reviews
CREATE TABLE public.template_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(template_id, user_id)
);
GRANT SELECT ON public.template_reviews TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.template_reviews TO authenticated;
GRANT ALL ON public.template_reviews TO service_role;
ALTER TABLE public.template_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone_read_reviews" ON public.template_reviews FOR SELECT USING (true);
CREATE POLICY "user_write_own_review" ON public.template_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_update_own_review" ON public.template_reviews FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_delete_own_review" ON public.template_reviews FOR DELETE USING (auth.uid() = user_id);
CREATE INDEX idx_template_reviews_tid ON public.template_reviews(template_id);

-- Template downloads (counter events)
CREATE TABLE public.template_downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  company_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.template_downloads TO anon, authenticated;
GRANT INSERT ON public.template_downloads TO authenticated;
GRANT ALL ON public.template_downloads TO service_role;
ALTER TABLE public.template_downloads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone_read_downloads" ON public.template_downloads FOR SELECT USING (true);
CREATE POLICY "user_insert_download" ON public.template_downloads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_template_downloads_tid ON public.template_downloads(template_id);
