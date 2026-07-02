
ALTER TABLE public.vessels
  ADD COLUMN IF NOT EXISTS construction_year integer,
  ADD COLUMN IF NOT EXISTS hull_color text,
  ADD COLUMN IF NOT EXISTS hull_number text,
  ADD COLUMN IF NOT EXISTS gross_tonnage numeric,
  ADD COLUMN IF NOT EXISTS net_tonnage numeric,
  ADD COLUMN IF NOT EXISTS contorno numeric,
  ADD COLUMN IF NOT EXISTS passenger_capacity integer,
  ADD COLUMN IF NOT EXISTS crew_count integer,
  ADD COLUMN IF NOT EXISTS activity text;

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text;

ALTER TABLE public.processes
  ADD COLUMN IF NOT EXISTS location_city text,
  ADD COLUMN IF NOT EXISTS location_state text;
