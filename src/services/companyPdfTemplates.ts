import { supabase } from "@/integrations/supabase/client";
import type { CompanyBranding, PdfTemplateId } from "./companyBranding";

export type TemplateCategory =
  | "oficiais"
  | "engenharia"
  | "marinha"
  | "premium"
  | "corporativo"
  | "checklists"
  | "dossies";

export type DocumentType =
  | "requerimento"
  | "gru"
  | "checklist"
  | "laudo"
  | "dossie";

export const DOCUMENT_TYPES: { id: DocumentType; label: string }[] = [
  { id: "requerimento", label: "Requerimento" },
  { id: "gru", label: "GRU" },
  { id: "checklist", label: "Checklist" },
  { id: "laudo", label: "Laudo" },
  { id: "dossie", label: "Dossiê" },
];

export const TEMPLATE_CATEGORIES: { id: TemplateCategory; label: string; anchor: PdfTemplateId }[] = [
  { id: "oficiais", label: "Oficiais", anchor: "oficial" },
  { id: "engenharia", label: "Engenharia", anchor: "engenharia-naval" },
  { id: "marinha", label: "Marinha", anchor: "naval-azul" },
  { id: "premium", label: "Premium", anchor: "luxo" },
  { id: "corporativo", label: "Corporativo", anchor: "corporate-clean" },
  { id: "checklists", label: "Checklists", anchor: "checklist" },
  { id: "dossies", label: "Dossiês", anchor: "capa-executiva" },
];

export const CATEGORY_OF: Record<PdfTemplateId, TemplateCategory> = {
  classico: "oficiais",
  oficial: "oficiais",
  protocolo: "oficiais",
  institucional: "marinha",
  "naval-azul": "marinha",
  "naval-premium": "marinha",
  laudo: "engenharia",
  "engenharia-naval": "engenharia",
  "relatorio-tecnico": "engenharia",
  executivo: "premium",
  luxo: "premium",
  "premium-branco": "premium",
  "capa-executiva": "dossies",
  escritorio: "corporativo",
  moderno: "corporativo",
  "corporate-clean": "corporativo",
  timbrado: "corporativo",
  "azul-profundo": "corporativo",
  minimalista: "corporativo",
  checklist: "checklists",
};

/** Subset of CompanyBranding fields the user can override per template. */
export type TemplateConfig = Partial<
  Pick<
    CompanyBranding,
    | "brand_primary_color"
    | "brand_secondary_color"
    | "contact_phone"
    | "contact_whatsapp"
    | "contact_email"
    | "contact_website"
    | "contact_address"
    | "pdf_footer_text"
    | "watermark_url"
    | "signature_url"
    | "stamp_url"
  >
> & {
  hideFooter?: boolean;
  hideSignature?: boolean;
  hideStamp?: boolean;
  hideWatermark?: boolean;
  watermarkOpacity?: number; // 0..1
};

export type CompanyPdfTemplate = {
  id: string;
  company_id: string;
  name: string;
  base_template: PdfTemplateId;
  category: TemplateCategory;
  config: TemplateConfig;
  is_default: boolean;
  document_type: DocumentType | null;
  created_at: string;
  updated_at: string;
};

export async function listCompanyTemplates(companyId: string): Promise<CompanyPdfTemplate[]> {
  const { data, error } = await supabase
    .from("company_pdf_templates" as any)
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as any;
}

export async function saveCompanyTemplate(
  input: Omit<CompanyPdfTemplate, "id" | "created_at" | "updated_at"> & { id?: string },
): Promise<CompanyPdfTemplate> {
  const payload: any = {
    company_id: input.company_id,
    name: input.name,
    base_template: input.base_template,
    category: input.category,
    config: input.config,
    is_default: input.is_default,
    document_type: input.document_type,
  };
  if (input.id) {
    const { data, error } = await supabase
      .from("company_pdf_templates" as any)
      .update(payload)
      .eq("id", input.id)
      .select("*")
      .single();
    if (error) throw error;
    return data as any;
  }
  const { data, error } = await supabase
    .from("company_pdf_templates" as any)
    .insert(payload)
    .select("*")
    .single();
  if (error) throw error;
  return data as any;
}

export async function deleteCompanyTemplate(id: string): Promise<void> {
  const { error } = await supabase.from("company_pdf_templates" as any).delete().eq("id", id);
  if (error) throw error;
}

/** Merge TemplateConfig onto a branding to produce the effective branding for the PDF builder. */
export function applyTemplateConfig(
  branding: CompanyBranding | null,
  baseTemplate: PdfTemplateId,
  config: TemplateConfig | null | undefined,
): CompanyBranding {
  const base: CompanyBranding = {
    company_name: branding?.company_name || "Empresa",
    logo_primary_url: branding?.logo_primary_url ?? null,
    logo_secondary_url: branding?.logo_secondary_url ?? null,
    brand_primary_color: branding?.brand_primary_color || "#2563eb",
    brand_secondary_color: branding?.brand_secondary_color || "#0f172a",
    contact_phone: branding?.contact_phone ?? null,
    contact_whatsapp: branding?.contact_whatsapp ?? null,
    contact_email: branding?.contact_email ?? null,
    contact_website: branding?.contact_website ?? null,
    contact_address: branding?.contact_address ?? null,
    technical_responsible_name: branding?.technical_responsible_name ?? null,
    technical_responsible_registry: branding?.technical_responsible_registry ?? null,
    signature_url: branding?.signature_url ?? null,
    stamp_url: branding?.stamp_url ?? null,
    watermark_url: branding?.watermark_url ?? null,
    pdf_footer_text: branding?.pdf_footer_text ?? null,
    pdf_template: baseTemplate,
  };
  if (!config) return base;
  const out = { ...base, ...stripUndefined(config) } as CompanyBranding;
  if (config.hideFooter) out.pdf_footer_text = "";
  if (config.hideSignature) out.signature_url = null;
  if (config.hideStamp) out.stamp_url = null;
  if (config.hideWatermark) out.watermark_url = null;
  out.pdf_template = baseTemplate;
  return out;
}

function stripUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  const o: any = {};
  for (const k of Object.keys(obj)) if (obj[k] !== undefined) o[k] = obj[k];
  return o;
}

/** Resolve which (baseTemplate, config) to use for a given document type. */
export function resolveTemplateForDocument(
  templates: CompanyPdfTemplate[],
  documentType: DocumentType | null,
  fallbackBase: PdfTemplateId,
): { baseTemplate: PdfTemplateId; config: TemplateConfig | null; templateId: string | null } {
  if (documentType) {
    const byType = templates.find((t) => t.document_type === documentType);
    if (byType) return { baseTemplate: byType.base_template, config: byType.config, templateId: byType.id };
  }
  const def = templates.find((t) => t.is_default && !t.document_type);
  if (def) return { baseTemplate: def.base_template, config: def.config, templateId: def.id };
  return { baseTemplate: fallbackBase, config: null, templateId: null };
}
