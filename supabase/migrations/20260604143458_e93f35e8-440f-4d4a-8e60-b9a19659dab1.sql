CREATE TABLE IF NOT EXISTS public.ux_usability_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  flow_name TEXT NOT NULL, -- ex: 'Criação de Cliente', 'Geração de Dossiê'
  duration_ms INTEGER,
  confusion_points TEXT[], -- onde o usuário parou ou clicou errado
  complexity_rating INTEGER CHECK (complexity_rating >= 1 AND complexity_rating <= 10),
  redundant_fields TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ux_usability_metrics TO authenticated;
GRANT ALL ON public.ux_usability_metrics TO service_role;

ALTER TABLE public.ux_usability_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view UX metrics" ON public.ux_usability_metrics
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin_master', 'admin_master_global'))
  );

-- Logs iniciais de UX
INSERT INTO public.ux_usability_metrics (flow_name, complexity_rating, confusion_points) VALUES 
('Fluxo de Transferência', 3, ARRAY['Seleção de Comprador no Wizard', 'Botão de Assinatura Canvas']),
('Cadastro de Embarcação', 2, ARRAY['Upload de TIE']),
('Geração de Dossiê', 4, ARRAY['Esperar processamento ZIP']);
