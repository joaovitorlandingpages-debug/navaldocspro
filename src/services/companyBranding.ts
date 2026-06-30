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
  | "checklist"
  | "premium-branco"
  | "azul-profundo"
  | "oficial"
  | "engenharia-naval"
  | "protocolo"
  | "capa-executiva"
  | "relatorio-tecnico"
  | "corporate-clean"
  | "timbrado"
  | "naval-premium";

export const PDF_TEMPLATES: { id: PdfTemplateId; label: string; description: string; bestFor: string }[] = [
  { id: "classico", label: "Clássico Oficial", description: "Cabeçalho sólido na cor primária — padrão institucional.", bestFor: "Requerimentos, GRU, ofícios" },
  { id: "executivo", label: "Executivo Premium", description: "Cabeçalho com gradiente e caixa de título em destaque.", bestFor: "Propostas e relatórios executivos" },
  { id: "naval-azul", label: "Naval Azul", description: "Faixa azul-marinho profunda com filete dourado.", bestFor: "Documentos náuticos e marinha" },
  { id: "minimalista", label: "Minimalista", description: "Sem barra colorida, apenas filete sutil e tipografia limpa.", bestFor: "Memorandos curtos" },
  { id: "laudo", label: "Técnico Engenharia", description: "Caixa lateral, seções numeradas, ideal para laudos técnicos.", bestFor: "Laudos e pareceres técnicos" },
  { id: "escritorio", label: "Escritório Despachante", description: "Cabeçalho claro corporativo com filete primário e blocos formais.", bestFor: "Despachos administrativos" },
  { id: "institucional", label: "Institucional Marinha", description: "Cabeçalho navy, título centralizado e estética oficial.", bestFor: "Comunicações à Marinha" },
  { id: "moderno", label: "Moderno Corporativo", description: "Cabeçalho amplo em gradiente e caixa de título arredondada.", bestFor: "Apresentações comerciais" },
  { id: "luxo", label: "Luxo Azul/Dourado", description: "Navy escuro com duas linhas douradas e tipografia premium.", bestFor: "Certificados e contratos" },
  { id: "checklist", label: "Checklist Operacional", description: "Layout enxuto otimizado para listas e conferências.", bestFor: "Checklists de embarcação" },
  { id: "premium-branco", label: "Premium Branco", description: "Cabeçalho branco com linha dourada e título centralizado.", bestFor: "Convites e documentos elegantes" },
  { id: "azul-profundo", label: "Azul Profundo", description: "Header alto em azul-marinho profundo, tipografia branca.", bestFor: "Memorandos institucionais" },
  { id: "oficial", label: "Documento Oficial", description: "Cabeçalho escuro com dupla linha de assinatura sob o título.", bestFor: "Atas e protocolos formais" },
  { id: "engenharia-naval", label: "Engenharia Naval", description: "Barra lateral secundária, seções numeradas, identidade técnica.", bestFor: "Memoriais de cálculo" },
  { id: "protocolo", label: "Protocolo Marítimo", description: "Cabeçalho enxuto com selo de protocolo no canto direito.", bestFor: "Comunicações com protocolo" },
  { id: "capa-executiva", label: "Capa Executiva", description: "Header alto com título dentro do cabeçalho — estilo capa.", bestFor: "Capas de processo e dossiês" },
  { id: "relatorio-tecnico", label: "Relatório Técnico", description: "Gradiente secundário→primário, seções numeradas com filete.", bestFor: "Relatórios extensos" },
  { id: "corporate-clean", label: "Corporate Clean", description: "Header branco com bloco primário lateral e título limpo.", bestFor: "Comunicados corporativos" },
  { id: "timbrado", label: "Timbrado Elegante", description: "Faixa primária + sub-faixa secundária e itálico no subtítulo.", bestFor: "Papel timbrado clássico" },
  { id: "naval-premium", label: "Naval Premium", description: "Navy escuro com duas linhas douradas e coluna primária à direita.", bestFor: "Documentos de alto padrão" },
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

export type ProcessBrandingMode = "none" | "company" | "customer" | "custom";

/**
 * Loads the effective branding for a given process, respecting per-process
 * identity overrides (none / company / customer / custom upload). The result
 * is a CompanyBranding shape with the logo_primary_url overridden when the
 * process specifies its own logo, so downstream PDF generators don't need
 * to know about the process-level identity model.
 */
export async function loadProcessBranding(processId: string): Promise<CompanyBranding | null> {
  const { data: proc, error } = await supabase
    .from("processes")
    .select("company_id, customer_id, branding_mode, branding_logo_url")
    .eq("id", processId)
    .maybeSingle();
  if (error || !proc?.company_id) return null;

  const base = await loadCompanyBranding(proc.company_id);
  if (!base) return null;

  const mode = (proc.branding_mode as ProcessBrandingMode | null) || "company";

  if (mode === "none") {
    return { ...base, logo_primary_url: null, logo_secondary_url: null };
  }
  if (mode === "custom" && proc.branding_logo_url) {
    return { ...base, logo_primary_url: proc.branding_logo_url };
  }
  if (mode === "customer" && proc.customer_id) {
    // Customer-level logo is optional and may not exist in schema; ignore failures.
    try {
      const { data: customer } = await (supabase
        .from("customers")
        .select("*")
        .eq("id", proc.customer_id)
        .maybeSingle() as any);
      const customerLogo = (customer as any)?.logo_url || null;
      if (customerLogo) return { ...base, logo_primary_url: customerLogo };
    } catch {
      /* no-op: customer has no logo column */
    }
  }

  // fallback: company branding as-is
  return base;
}

