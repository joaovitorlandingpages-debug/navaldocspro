-- Digital Signatures Table
CREATE TABLE IF NOT EXISTS public.digital_signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    document_id UUID REFERENCES public.generated_documents(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    signer_name TEXT NOT NULL,
    signer_role TEXT, -- 'proprietario', 'engenheiro', 'despachante', 'testemunha', 'responsavel_tecnico'
    signature_type TEXT NOT NULL, -- 'manual', 'digital', 'image', 'typed'
    signature_data TEXT, -- SVG path, Base64 image, or hash
    ip_address TEXT,
    user_agent TEXT,
    signed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    verification_hash TEXT UNIQUE, -- For future validation
    is_valid BOOLEAN DEFAULT true
);

-- Enable RLS on digital_signatures
ALTER TABLE public.digital_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view signatures from their company"
ON public.digital_signatures FOR SELECT
USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "Users can create signatures for their company"
ON public.digital_signatures FOR INSERT
WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- Update processes table for protocols and finalization
ALTER TABLE public.processes 
ADD COLUMN IF NOT EXISTS protocol_number TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS protocol_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS finalized_by UUID REFERENCES auth.users(id);

-- Update generated_documents for signatures
ALTER TABLE public.generated_documents
ADD COLUMN IF NOT EXISTS signature_status TEXT DEFAULT 'not_required', -- 'not_required', 'pending', 'signed', 'rejected'
ADD COLUMN IF NOT EXISTS signed_file_url TEXT,
ADD COLUMN IF NOT EXISTS qr_code_url TEXT,
ADD COLUMN IF NOT EXISTS verification_code TEXT;

-- Sequence for Protocol Numbers
CREATE SEQUENCE IF NOT EXISTS process_protocol_seq;

-- Function to generate protocol number
CREATE OR REPLACE FUNCTION public.generate_protocol_number()
RETURNS TRIGGER AS $$
DECLARE
    year_val TEXT;
    seq_val TEXT;
BEGIN
    IF NEW.status = 'protocolado' AND OLD.protocol_number IS NULL THEN
        year_val := to_char(now(), 'YYYY');
        seq_val := lpad(nextval('process_protocol_seq')::text, 6, '0');
        NEW.protocol_number := 'NDP-' || year_val || '-' || seq_val;
        NEW.protocol_at := now();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for protocol number
DROP TRIGGER IF EXISTS tr_generate_protocol ON public.processes;
CREATE TRIGGER tr_generate_protocol
BEFORE UPDATE ON public.processes
FOR EACH ROW
EXECUTE FUNCTION public.generate_protocol_number();

-- Update process_status check/domain if needed (if it exists, otherwise just policy update)
-- Since status is usually a TEXT field in Supabase, we just ensure the app logic uses the new statuses.

-- Add signature field types to document_fields if not exists (already a TEXT column)
-- 'signature_proprietario', 'signature_engenheiro', 'signature_despachante', etc.
