CREATE TABLE IF NOT EXISTS public.operational_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_name TEXT NOT NULL,
  engineer_id UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'pending', -- pending, running, completed, failed
  duration_ms INTEGER,
  findings TEXT[],
  ux_bottlenecks TEXT[],
  errors_encountered TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.operational_tests TO authenticated;
GRANT ALL ON public.operational_tests TO service_role;

ALTER TABLE public.operational_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage operational tests" ON public.operational_tests
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin_master', 'admin_master_global'))
  );

-- Inserir os testes iniciais da fase final
INSERT INTO public.operational_tests (test_name, status) VALUES 
('TESTE 01 - Transferência de Propriedade', 'pending'),
('TESTE 02 - Registro Inicial', 'pending'),
('TESTE 03 - Alteração de Motor', 'pending'),
('TESTE 04 - Engenheiro sem ajuda', 'pending'),
('TESTE 05 - Mobile Resilience', 'pending'),
('TESTE 06 - Validação Comercial', 'pending');
