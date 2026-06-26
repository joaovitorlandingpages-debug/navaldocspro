import { supabase } from "@/integrations/supabase/client";

export type PdfTemplateId =
  | "classico"
  | "executivo"
  | "naval-azul"
  | "minimalista"
  | "laudo"
  | "escritorio"
  | "institucional"
  | "moderno"
  | "luxo"
  | "checklist";

export const PDF_TEMPLATES: { id: PdfTemplateId; label: string; description: string }[] = [
  { id: "classico", label: "Clássico Oficial", description: "Cabeçalho sólido na cor primária — padrão institucional." },
  { id: "executivo", label: "Executivo Premium", description: "Cabeçalho com gradiente e caixa de título em destaque." },
  { id: "naval-azul", label: "Naval Azul", description: "Faixa azul-marinho profunda com filete dourado." },
  { id: "minimalista", label: "Minimalista", description: "Sem barra colorida, apenas filete sutil e tipografia limpa." },
  { id: "laudo", label: "Técnico Engenharia", description: "Caixa lateral, seções numeradas, ideal para laudos técnicos." },
  { id: "escritorio", label: "Escritório Despachante", description: "Cabeçalho claro corporativo com filete primário e blocos formais." },
  { id: "institucional", label: "Institucional Marinha", description: "Cabeçalho navy, título centralizado e estética oficial." },
  { id: "moderno", label: "Moderno Corporativo", description: "Cabeçalho amplo em gradiente e caixa de título arredondada." },
  { id: "luxo", label: "Luxo Azul/Dourado", description: "Navy escuro com duas linhas douradas e tipografia premium." },
  { id: "checklist", label: "Checklist Operacional", description: "Layout enxuto otimizado para listas e conferências." },
];

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
  pdf_template: PdfTemplateId;
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
  pdf_template: "classico",
};

export async function loadCompanyBranding(companyId: string): Promise<CompanyBranding | null> {
  const { data, error } = await supabase
    .from("companies")
    .select(
      "name, logo_primary_url, logo_secondary_url, brand_primary_color, brand_secondary_color, contact_phone, contact_whatsapp, contact_email, contact_website, contact_address, technical_responsible_name, technical_responsible_registry, signature_url, stamp_url, watermark_url, pdf_footer_text, pdf_template",
    )
    .eq("id", companyId)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as any;
  return {
    company_name: row.name || "Empresa",
    ...DEFAULT_BRANDING,
    ...row,
    pdf_template: (row.pdf_template as PdfTemplateId) || "classico",
  };
}
