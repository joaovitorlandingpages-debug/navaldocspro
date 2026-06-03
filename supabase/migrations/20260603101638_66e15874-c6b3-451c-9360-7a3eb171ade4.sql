
-- Allow vessels without a directly linked customer (transfers / unassigned)
ALTER TABLE public.vessels ALTER COLUMN customer_id DROP NOT NULL;

-- Separate ownership fields (current owner may not be the process customer)
ALTER TABLE public.vessels
  ADD COLUMN IF NOT EXISTS current_owner_name text,
  ADD COLUMN IF NOT EXISTS current_owner_cpf_cnpj text;

-- Buyer / seller separation on processes for transfer flows
ALTER TABLE public.processes
  ADD COLUMN IF NOT EXISTS seller_id uuid,
  ADD COLUMN IF NOT EXISTS buyer_id uuid,
  ADD COLUMN IF NOT EXISTS new_owner_name text,
  ADD COLUMN IF NOT EXISTS new_owner_cpf_cnpj text;
