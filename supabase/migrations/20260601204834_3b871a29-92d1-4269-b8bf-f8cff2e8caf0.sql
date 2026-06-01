ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS rg text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text;