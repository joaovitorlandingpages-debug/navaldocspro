
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS procurador_nome text,
  ADD COLUMN IF NOT EXISTS procurador_cpf text,
  ADD COLUMN IF NOT EXISTS procurador_rg text,
  ADD COLUMN IF NOT EXISTS procurador_orgao_expedidor text,
  ADD COLUMN IF NOT EXISTS procurador_nacionalidade text,
  ADD COLUMN IF NOT EXISTS procurador_endereco text,
  ADD COLUMN IF NOT EXISTS procurador_telefone text,
  ADD COLUMN IF NOT EXISTS procurador_email text,
  ADD COLUMN IF NOT EXISTS procurador_crea text;
