
-- Marketplace templates
CREATE TABLE public.marketplace_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  category text NOT NULL,
  base_template text NOT NULL,
  cover_url text,
  gallery_urls text[] NOT NULL DEFAULT '{}',
  author text NOT NULL DEFAULT 'NavalDocs',
  version text NOT NULL DEFAULT '1.0.0',
  price_cents integer NOT NULL DEFAULT 0,
  is_exclusive boolean NOT NULL DEFAULT false,
  is_featured boolean NOT NULL DEFAULT false,
  is_new boolean NOT NULL DEFAULT false,
  is_bestseller boolean NOT NULL DEFAULT false,
  is_promo boolean NOT NULL DEFAULT false,
  downloads_count integer NOT NULL DEFAULT 0,
  rating numeric(2,1) NOT NULL DEFAULT 5.0,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.marketplace_templates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketplace_templates TO authenticated;
GRANT ALL ON public.marketplace_templates TO service_role;
ALTER TABLE public.marketplace_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read published templates" ON public.marketplace_templates
  FOR SELECT USING (published = true);
CREATE POLICY "admin manages templates" ON public.marketplace_templates
  FOR ALL USING (public.is_admin_master()) WITH CHECK (public.is_admin_master());

-- Marketplace collections
CREATE TABLE public.marketplace_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  cover_url text,
  price_cents integer NOT NULL DEFAULT 0,
  template_slugs text[] NOT NULL DEFAULT '{}',
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.marketplace_collections TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketplace_collections TO authenticated;
GRANT ALL ON public.marketplace_collections TO service_role;
ALTER TABLE public.marketplace_collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read published collections" ON public.marketplace_collections
  FOR SELECT USING (published = true);
CREATE POLICY "admin manages collections" ON public.marketplace_collections
  FOR ALL USING (public.is_admin_master()) WITH CHECK (public.is_admin_master());

-- Company template library
CREATE TABLE public.company_template_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('free','purchased','collection')),
  template_slug text NOT NULL,
  base_template text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  is_favorite boolean NOT NULL DEFAULT false,
  document_type text,
  acquired_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, template_slug)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_template_library TO authenticated;
GRANT ALL ON public.company_template_library TO service_role;
ALTER TABLE public.company_template_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company manages own library" ON public.company_template_library
  FOR ALL USING (company_id = public.current_user_company_id() OR public.is_admin_master())
  WITH CHECK (company_id = public.current_user_company_id() OR public.is_admin_master());

-- Marketplace orders
CREATE TABLE public.marketplace_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  item_kind text NOT NULL CHECK (item_kind IN ('template','collection')),
  item_slug text NOT NULL,
  amount_cents integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','refunded')),
  mp_payment_id text,
  mp_preference_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.marketplace_orders TO authenticated;
GRANT ALL ON public.marketplace_orders TO service_role;
ALTER TABLE public.marketplace_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company sees own orders" ON public.marketplace_orders
  FOR SELECT USING (company_id = public.current_user_company_id() OR public.is_admin_master());
CREATE POLICY "company creates own orders" ON public.marketplace_orders
  FOR INSERT WITH CHECK (company_id = public.current_user_company_id());

-- Updated_at triggers
CREATE TRIGGER mp_templates_updated BEFORE UPDATE ON public.marketplace_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER mp_collections_updated BEFORE UPDATE ON public.marketplace_collections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER mp_library_updated BEFORE UPDATE ON public.company_template_library
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER mp_orders_updated BEFORE UPDATE ON public.marketplace_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
