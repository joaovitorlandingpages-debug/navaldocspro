import { supabase } from "@/integrations/supabase/client";

export type AnchorRole =
  | "cliente" | "engenheiro" | "despachante" | "responsavel_tecnico" | "testemunha" | "outro";
export type AnchorAlign = "left" | "center" | "right";

export interface TemplateSignatureAnchor {
  id: string;
  company_id: string | null;
  template_id: string;
  role: AnchorRole;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  align: AnchorAlign;
  label: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export const ANCHOR_ROLES: { value: AnchorRole; label: string }[] = [
  { value: "cliente", label: "Cliente" },
  { value: "engenheiro", label: "Engenheiro" },
  { value: "despachante", label: "Despachante" },
  { value: "responsavel_tecnico", label: "Responsável Técnico" },
  { value: "testemunha", label: "Testemunha" },
  { value: "outro", label: "Outro" },
];

export const signatureAnchorsService = {
  async listByTemplate(templateId: string, companyId?: string | null) {
    let q = supabase.from("template_signature_anchors" as any)
      .select("*")
      .eq("template_id", templateId);
    if (companyId) {
      q = q.or(`company_id.is.null,company_id.eq.${companyId}`);
    } else {
      q = q.is("company_id", null);
    }
    const { data, error } = await q.order("page").order("role");
    if (error) throw error;
    return (data ?? []) as unknown as TemplateSignatureAnchor[];
  },

  /** Returns one anchor per role: company override > global default > undefined. */
  async resolveForRoles(templateId: string, companyId: string | null, roles: string[]) {
    const all = await this.listByTemplate(templateId, companyId);
    const map = new Map<string, TemplateSignatureAnchor>();
    // global first, then company override
    for (const a of all.filter(a => a.company_id === null)) {
      if (!map.has(a.role)) map.set(a.role, a);
    }
    for (const a of all.filter(a => a.company_id !== null)) {
      map.set(a.role, a);
    }
    return roles.map(r => map.get(r)).filter(Boolean) as TemplateSignatureAnchor[];
  },

  async save(anchor: Partial<TemplateSignatureAnchor> & { template_id: string; role: AnchorRole }) {
    if (anchor.id) {
      const { id, created_at, updated_at, ...rest } = anchor as any;
      const { error } = await supabase.from("template_signature_anchors" as any).update(rest).eq("id", id);
      if (error) throw error;
      return id as string;
    } else {
      const { data, error } = await supabase.from("template_signature_anchors" as any)
        .insert(anchor).select("id").single();
      if (error) throw error;
      return (data as any).id as string;
    }
  },

  async remove(id: string) {
    const { error } = await supabase.from("template_signature_anchors" as any).delete().eq("id", id);
    if (error) throw error;
  },
};
