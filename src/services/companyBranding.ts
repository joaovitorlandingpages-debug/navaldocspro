import { supabase } from "@/integrations/supabase/client";

export type CompanyBranding = {
  company_name: string;
  logo_primary_url: string | null;
  logo_secondary_url: string | null;
  brand_primary_color: string;
  brand_secondary_color: string;
  contact_phone: string | null;
  contact_whatsapp: string | null;
  contact_email: string | null;
  contact_website: string | null;
  contact_address: string | null;
  technical_responsible_name: string | null;
  technical_responsible_registry: string | null;
  signature_url: string | null;
  stamp_url: string | null;
  watermark_url: string | null;
  pdf_footer_text: string | null;
};

export const DEFAULT_BRANDING: Omit<CompanyBranding, "company_name"> = {
  logo_primary_url: null,
  logo_secondary_url: null,
  brand_primary_color: "#2563eb",
  brand_secondary_color: "#0f172a",
  contact_phone: null,
  contact_whatsapp: null,
  contact_email: null,
  contact_website: null,
  contact_address: null,
  technical_responsible_name: null,
  technical_responsible_registry: null,
  signature_url: null,
  stamp_url: null,
  watermark_url: null,
  pdf_footer_text: null,
};

export async function loadCompanyBranding(companyId: string): Promise<CompanyBranding | null> {
  const { data, error } = await supabase
    .from("companies")
    .select(
      "name, logo_primary_url, logo_secondary_url, brand_primary_color, brand_secondary_color, contact_phone, contact_whatsapp, contact_email, contact_website, contact_address, technical_responsible_name, technical_responsible_registry, signature_url, stamp_url, watermark_url, pdf_footer_text"
    )
    .eq("id", companyId)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as any;
  return {
    company_name: row.name || "Empresa",
    ...DEFAULT_BRANDING,
    ...row,
  };
}
