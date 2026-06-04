ALTER TABLE public.vessels 
ADD COLUMN IF NOT EXISTS length TEXT,
ADD COLUMN IF NOT EXISTS boca TEXT,
ADD COLUMN IF NOT EXISTS pontal TEXT,
ADD COLUMN IF NOT EXISTS material TEXT,
ADD COLUMN IF NOT EXISTS capacity TEXT,
ADD COLUMN IF NOT EXISTS engine_power TEXT,
ADD COLUMN IF NOT EXISTS engine_serial_number TEXT;

GRANT ALL ON public.vessels TO service_role;
GRANT ALL ON public.vessels TO authenticated;
GRANT ALL ON public.vessels TO anon;
