import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageHeader } from "@/components/navigation/PageHeader";
import { toast } from "sonner";
import { Loader2, Upload, Image as ImageIcon, Palette, Building2, PenTool, Stamp, Droplet, LayoutTemplate, Check, Wand2, Plus, Trash2, Star, FileText, Copy, Pencil } from "lucide-react";
import { PDF_TEMPLATES, type PdfTemplateId, loadCompanyBranding, type CompanyBranding } from "@/services/companyBranding";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TemplateStudio } from "@/components/templates/TemplateStudio";
import { NewTemplateDialog } from "@/components/templates/NewTemplateDialog";
import {
  listCompanyTemplates,
  saveCompanyTemplate,
  deleteCompanyTemplate,
  DOCUMENT_TYPES,
  type CompanyPdfTemplate,
  type DocumentType,
} from "@/services/companyPdfTemplates";

export const Route = createFileRoute("/identidade")({
  component: () => (
    <ProtectedRoute>
      <IdentidadePage />
    </ProtectedRoute>
  ),
});

type BrandingFields = {
  logo_primary_url: string | null;
  logo_secondary_url: string | null;
  brand_primary_color: string;
  brand_secondary_color: string;
  contact_phone: string;
  contact_whatsapp: string;
  contact_email: string;
  contact_website: string;
  contact_address: string;
  technical_responsible_name: string;
  technical_responsible_registry: string;
  signature_url: string | null;
  stamp_url: string | null;
  watermark_url: string | null;
  pdf_footer_text: string;
  pdf_template: PdfTemplateId;
};

const EMPTY: BrandingFields = {
  logo_primary_url: null,
  logo_secondary_url: null,
  brand_primary_color: "#2563eb",
  brand_secondary_color: "#0f172a",
  contact_phone: "",
  contact_whatsapp: "",
  contact_email: "",
  contact_website: "",
  contact_address: "",
  technical_responsible_name: "",
  technical_responsible_registry: "",
  signature_url: null,
  stamp_url: null,
  watermark_url: null,
  pdf_footer_text: "",
  pdf_template: "classico",
};

function IdentidadePage() {
  const { profile } = useAuth();
  const companyId = profile?.company_id;
  const [data, setData] = useState<BrandingFields>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [myTemplates, setMyTemplates] = useState<CompanyPdfTemplate[]>([]);
  const [studioOpen, setStudioOpen] = useState(false);
  const [studioInitial, setStudioInitial] = useState<CompanyPdfTemplate | null>(null);
  const [studioBase, setStudioBase] = useState<PdfTemplateId | undefined>(undefined);
  const [brandingForStudio, setBrandingForStudio] = useState<CompanyBranding | null>(null);
  const [docTypeMap, setDocTypeMap] = useState<Record<string, string>>({});
  const [newDialogOpen, setNewDialogOpen] = useState(false);

  const loadMyTemplates = async () => {
    if (!companyId) return;
    try {
      const list = await listCompanyTemplates(companyId);
      setMyTemplates(list);
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao carregar meus templates");
    }
  };
  useEffect(() => { loadMyTemplates(); }, [companyId]);
  useEffect(() => {
    if (!companyId) return;
    (async () => {
      const b = await loadCompanyBranding(companyId);
      setBrandingForStudio(b);
      const { data: row } = await supabase
        .from("companies").select("document_template_map").eq("id", companyId).maybeSingle();
      setDocTypeMap(((row as any)?.document_template_map as Record<string, string>) || {});
    })();
  }, [companyId, data]);

  const openStudio = (initial: CompanyPdfTemplate | null, base?: PdfTemplateId) => {
    setStudioInitial(initial);
    setStudioBase(base);
    setStudioOpen(true);
  };
  const onTemplateSaved = (_t: CompanyPdfTemplate) => { loadMyTemplates(); };
  const removeTemplate = async (id: string) => {
    if (!confirm("Excluir este template?")) return;
    try { await deleteCompanyTemplate(id); toast.success("Removido"); loadMyTemplates(); }
    catch (e: any) { toast.error(e.message ?? "Falha"); }
  };
  const duplicateTemplate = async (t: CompanyPdfTemplate) => {
    if (!companyId) return;
    try {
      await saveCompanyTemplate({
        company_id: companyId,
        name: `${t.name} (cópia)`,
        base_template: t.base_template,
        category: t.category,
        config: t.config,
        is_default: false,
        document_type: t.document_type,
      });
      toast.success("Template duplicado");
      loadMyTemplates();
    } catch (e: any) { toast.error(e.message ?? "Falha ao duplicar"); }
  };
  const renameTemplate = async (t: CompanyPdfTemplate) => {
    const next = prompt("Novo nome:", t.name);
    if (!next || !next.trim() || next.trim() === t.name) return;
    try {
      await saveCompanyTemplate({
        id: t.id, company_id: t.company_id, name: next.trim(),
        base_template: t.base_template, category: t.category, config: t.config,
        is_default: t.is_default, document_type: t.document_type,
      });
      toast.success("Renomeado");
      loadMyTemplates();
    } catch (e: any) { toast.error(e.message ?? "Falha ao renomear"); }
  };
  const setAsDefault = async (t: CompanyPdfTemplate) => {
    try {
      await saveCompanyTemplate({
        id: t.id, company_id: t.company_id, name: t.name,
        base_template: t.base_template, category: t.category, config: t.config,
        is_default: !t.is_default, document_type: t.document_type,
      });
      toast.success(t.is_default ? "Padrão removido" : "Definido como padrão");
      loadMyTemplates();
    } catch (e: any) { toast.error(e.message ?? "Falha"); }
  };
  const setDocTypeTemplate = async (docType: DocumentType, value: string) => {
    if (!companyId) return;
    const next = { ...docTypeMap, [docType]: value };
    if (value === "__none__") delete next[docType];
    setDocTypeMap(next);
    const { error } = await supabase
      .from("companies").update({ document_template_map: next } as any).eq("id", companyId);
    if (error) toast.error(error.message);
  };

  useEffect(() => {
    if (!companyId) {
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      const { data: row, error } = await supabase
        .from("companies")
        .select(
          "logo_primary_url, logo_secondary_url, brand_primary_color, brand_secondary_color, contact_phone, contact_whatsapp, contact_email, contact_website, contact_address, technical_responsible_name, technical_responsible_registry, signature_url, stamp_url, watermark_url, pdf_footer_text, pdf_template"
        )
        .eq("id", companyId)
        .maybeSingle();
      if (error) {
        toast.error("Falha ao carregar identidade");
      } else if (row) {
        setData({ ...EMPTY, ...(row as Partial<BrandingFields>) });
      }
      setLoading(false);
    })();
  }, [companyId]);

  const ACCEPTED = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml"];
  const MAX_BYTES = 5 * 1024 * 1024;

  const upload = async (field: keyof BrandingFields, file: File) => {
    if (!companyId) {
      toast.error("Empresa não identificada");
      return;
    }
    if (!ACCEPTED.includes(file.type)) {
      toast.error("Formato inválido. Use PNG, JPG, WEBP ou SVG.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Arquivo muito grande. Máximo 5 MB.");
      return;
    }
    setUploadingField(field);
    try {
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `${companyId}/${field}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("company-branding")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: signed, error: signErr } = await supabase.storage
        .from("company-branding")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      if (signErr) throw signErr;
      const url = signed?.signedUrl || path;
      const { error: dbErr } = await supabase
        .from("companies")
        .update({ [field]: url } as any)
        .eq("id", companyId);
      if (dbErr) throw dbErr;
      setData((d) => ({ ...d, [field]: url }));
      toast.success("Arquivo enviado e salvo");
    } catch (e: any) {
      toast.error(e.message || "Falha no upload");
    } finally {
      setUploadingField(null);
    }
  };

  const clearField = async (field: keyof BrandingFields) => {
    if (!companyId) return;
    if (!confirm("Remover este arquivo?")) return;
    const { error } = await supabase
      .from("companies")
      .update({ [field]: null } as any)
      .eq("id", companyId);
    if (error) {
      toast.error("Erro ao remover: " + error.message);
      return;
    }
    setData((d) => ({ ...d, [field]: null }));
    toast.success("Removido");
  };

  const save = async () => {
    if (!companyId) return;
    setSaving(true);
    const { error } = await supabase
      .from("companies")
      .update(data as any)
      .eq("id", companyId);
    setSaving(false);
    if (error) toast.error("Erro ao salvar: " + error.message);
    else toast.success("Identidade corporativa salva");
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 pb-32">
      <div className="max-w-5xl mx-auto space-y-8">
        <PageHeader
          title="Identidade Corporativa"
          description="Logos, cores, contatos e elementos que aparecerão nos PDFs gerados pela sua empresa."
          actions={
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar alterações
            </Button>
          }
        />

        <Section title="Logos" icon={<ImageIcon className="h-5 w-5" />}>
          <div className="grid md:grid-cols-2 gap-6">
            <UploadField
              inputId="logo-upload"
              label="Logo principal"
              actionLabel="Enviar Logo"
              value={data.logo_primary_url}
              busy={uploadingField === "logo_primary_url"}
              onFile={(f) => upload("logo_primary_url", f)}
              onClear={() => clearField("logo_primary_url")}
            />
            <UploadField
              inputId="logo-secondary-upload"
              label="Logo secundário (opcional)"
              actionLabel="Enviar Logo secundário"
              value={data.logo_secondary_url}
              busy={uploadingField === "logo_secondary_url"}
              onFile={(f) => upload("logo_secondary_url", f)}
              onClear={() => clearField("logo_secondary_url")}
            />
          </div>
        </Section>

        <Section title="Modelo de PDF" icon={<LayoutTemplate className="h-5 w-5" />}>
          <p className="text-xs text-slate-500 mb-4">
            Modelo aplicado automaticamente em todos os PDFs (Requerimento, GRU, Checklists, Capa, Laudos, Dossiê).
            Se nenhum for escolhido, usamos o <strong>Clássico Oficial</strong>.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {PDF_TEMPLATES.map((tpl) => {
              const active = data.pdf_template === tpl.id;
              return (
                <div
                  key={tpl.id}
                  onClick={() => setData((d) => ({ ...d, pdf_template: tpl.id }))}
                  className={`group relative text-left rounded-xl border p-3 transition-all cursor-pointer ${
                    active
                      ? "border-primary bg-primary/5 shadow-md"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <TemplatePreview id={tpl.id} primary={data.brand_primary_color} />
                  <div className="mt-2 text-[11px] font-black uppercase tracking-wider text-navy">{tpl.label}</div>
                  <div className="text-[10px] text-slate-500 leading-snug mt-0.5">{tpl.description}</div>
                  <div className="text-[9px] text-slate-400 mt-1">Ideal: {tpl.bestFor}</div>
                  {active && (
                    <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary text-white grid place-items-center">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Section>

        <Section title="Meus Templates" icon={<Star className="h-5 w-5" />}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-slate-500">
              Modelos personalizados da sua empresa. Use o editor visual para criar quantos quiser.
            </p>
            <Button size="sm" onClick={() => setNewDialogOpen(true)} className="gap-2">
              <Plus className="h-3.5 w-3.5" /> Novo template
            </Button>
          </div>
          {myTemplates.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-slate-200 rounded-xl text-xs text-slate-400">
              Nenhum template personalizado ainda.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {myTemplates.map((t) => (
                <div key={t.id} className="rounded-xl border border-slate-200 p-3 bg-white hover:border-primary/30 transition-all">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-navy truncate">{t.name}</div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-widest">
                        Base: {PDF_TEMPLATES.find((p) => p.id === t.base_template)?.label ?? t.base_template}
                        {t.document_type && ` · ${DOCUMENT_TYPES.find((d) => d.id === t.document_type)?.label}`}
                        {t.is_default && " · Padrão"}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1 shrink-0">
                      <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => openStudio(t)} title="Editar">
                        <Wand2 className="h-3 w-3" /> Editar
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => duplicateTemplate(t)} title="Duplicar">
                        <Copy className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => renameTemplate(t)} title="Renomear">
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className={`h-8 w-8 p-0 ${t.is_default ? "text-amber-500" : ""}`} onClick={() => setAsDefault(t)} title={t.is_default ? "Remover padrão" : "Definir como padrão"}>
                        <Star className={`h-3 w-3 ${t.is_default ? "fill-current" : ""}`} />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500" onClick={() => removeTemplate(t.id)} title="Excluir">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title="Templates por tipo de documento" icon={<FileText className="h-5 w-5" />}>
          <p className="text-xs text-slate-500 mb-4">
            Defina um modelo específico para cada tipo. Quando vazio, é usado o modelo padrão da empresa.
          </p>
          <div className="grid md:grid-cols-2 gap-3">
            {DOCUMENT_TYPES.map((d) => (
              <div key={d.id} className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-600">{d.label}</Label>
                <Select value={docTypeMap[d.id] ?? "__none__"} onValueChange={(v) => setDocTypeTemplate(d.id, v)}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    <SelectItem value="__none__">Usar padrão da empresa</SelectItem>
                    <div className="px-2 pt-2 pb-1 text-[9px] uppercase tracking-widest text-slate-400">Modelos base</div>
                    {PDF_TEMPLATES.map((t) => <SelectItem key={t.id} value={`base:${t.id}`}>{t.label}</SelectItem>)}
                    {myTemplates.length > 0 && (
                      <>
                        <div className="px-2 pt-2 pb-1 text-[9px] uppercase tracking-widest text-slate-400">Meus templates</div>
                        {myTemplates.map((t) => <SelectItem key={t.id} value={`mine:${t.id}`}>{t.name}</SelectItem>)}
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </Section>



        <Section title="Cores da marca" icon={<Palette className="h-5 w-5" />}>
          <div className="grid md:grid-cols-2 gap-6">
            <ColorField
              label="Cor primária"
              value={data.brand_primary_color}
              onChange={(v) => setData((d) => ({ ...d, brand_primary_color: v }))}
            />
            <ColorField
              label="Cor secundária"
              value={data.brand_secondary_color}
              onChange={(v) => setData((d) => ({ ...d, brand_secondary_color: v }))}
            />
          </div>
        </Section>

        <Section title="Contatos institucionais" icon={<Building2 className="h-5 w-5" />}>
          <div className="grid md:grid-cols-2 gap-4">
            <TextField label="Telefone" value={data.contact_phone} onChange={(v) => setData((d) => ({ ...d, contact_phone: v }))} />
            <TextField label="WhatsApp" value={data.contact_whatsapp} onChange={(v) => setData((d) => ({ ...d, contact_whatsapp: v }))} />
            <TextField label="E-mail" value={data.contact_email} onChange={(v) => setData((d) => ({ ...d, contact_email: v }))} />
            <TextField label="Site" value={data.contact_website} onChange={(v) => setData((d) => ({ ...d, contact_website: v }))} />
            <div className="md:col-span-2">
              <TextField label="Endereço" value={data.contact_address} onChange={(v) => setData((d) => ({ ...d, contact_address: v }))} />
            </div>
          </div>
        </Section>

        <Section title="Responsável técnico" icon={<PenTool className="h-5 w-5" />}>
          <div className="grid md:grid-cols-2 gap-4">
            <TextField label="Nome completo" value={data.technical_responsible_name} onChange={(v) => setData((d) => ({ ...d, technical_responsible_name: v }))} />
            <TextField label="Registro / CREA" value={data.technical_responsible_registry} onChange={(v) => setData((d) => ({ ...d, technical_responsible_registry: v }))} />
          </div>
        </Section>

        <Section title="Assinatura, carimbo e marca d'água" icon={<Stamp className="h-5 w-5" />}>
          <div className="grid md:grid-cols-3 gap-6">
            <UploadField
              inputId="signature-upload"
              label="Assinatura digital"
              actionLabel="Enviar assinatura"
              value={data.signature_url}
              busy={uploadingField === "signature_url"}
              onFile={(f) => upload("signature_url", f)}
              onClear={() => clearField("signature_url")}
            />
            <UploadField
              inputId="stamp-upload"
              label="Carimbo"
              actionLabel="Enviar carimbo"
              value={data.stamp_url}
              busy={uploadingField === "stamp_url"}
              onFile={(f) => upload("stamp_url", f)}
              onClear={() => clearField("stamp_url")}
            />
            <UploadField
              inputId="watermark-upload"
              label="Marca d'água (PDF)"
              actionLabel="Enviar marca d'água"
              value={data.watermark_url}
              busy={uploadingField === "watermark_url"}
              onFile={(f) => upload("watermark_url", f)}
              onClear={() => clearField("watermark_url")}
            />
          </div>
        </Section>

        <Section title="Rodapé institucional" icon={<Droplet className="h-5 w-5" />}>
          <Label className="text-xs">Texto do rodapé (aparece em todos os PDFs)</Label>
          <textarea
            value={data.pdf_footer_text}
            onChange={(e) => setData((d) => ({ ...d, pdf_footer_text: e.target.value }))}
            rows={3}
            className="mt-2 w-full rounded-lg border border-slate-200 p-3 text-sm"
            placeholder="Ex.: Documento emitido por NavalDocs Pro — uso restrito."
          />
        </Section>

        <div className="flex justify-end">
          <Button onClick={save} disabled={saving} size="lg">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Salvar identidade corporativa
          </Button>
          </div>
        </div>
      </div>



      <TemplateStudio
        open={studioOpen}
        onClose={() => setStudioOpen(false)}
        companyId={companyId ?? ""}
        branding={brandingForStudio}
        initial={studioInitial}
        initialBaseTemplate={studioBase}
        onSaved={onTemplateSaved}
      />

      <NewTemplateDialog
        open={newDialogOpen}
        onClose={() => setNewDialogOpen(false)}
        defaultBase={data.pdf_template}
        onPick={(base) => {
          setNewDialogOpen(false);
          openStudio(null, base);
        }}
      />
    </>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="text-primary">{icon}</div>
        <h2 className="text-sm font-black uppercase tracking-widest text-navy">{title}</h2>
      </div>
      {children}
    </Card>
  );
}

function TemplatePreview({ id, primary }: { id: PdfTemplateId; primary: string }) {
  const gold = "#c9a13a";
  const light = "#f1f5f9";
  const ink = "#0f172a";
  return (
    <div className="aspect-[3/4] rounded-md border border-slate-200 bg-white overflow-hidden relative">
      {id === "classico" && (
        <>
          <div className="h-3" style={{ background: primary }} />
          <div className="px-1.5 pt-1 space-y-0.5">
            <div className="h-1 w-2/3 rounded-sm" style={{ background: ink }} />
            <div className="h-px w-full bg-slate-200 mt-1" />
            <div className="h-0.5 w-full bg-slate-100" />
            <div className="h-0.5 w-5/6 bg-slate-100" />
            <div className="h-0.5 w-3/4 bg-slate-100" />
          </div>
        </>
      )}
      {id === "executivo" && (
        <>
          <div className="h-4" style={{ background: `linear-gradient(90deg, ${ink}, ${primary})` }} />
          <div className="h-[2px]" style={{ background: gold }} />
          <div className="m-1.5 p-1 rounded-sm border-l-2" style={{ background: light, borderColor: primary }}>
            <div className="h-1 w-3/4 rounded-sm" style={{ background: ink }} />
          </div>
          <div className="px-1.5 space-y-0.5">
            <div className="h-0.5 w-full bg-slate-100" />
            <div className="h-0.5 w-5/6 bg-slate-100" />
          </div>
        </>
      )}
      {id === "naval-azul" && (
        <>
          <div className="h-3" style={{ background: "#0d1f45" }} />
          <div className="h-[2px]" style={{ background: gold }} />
          <div className="px-1.5 pt-1 space-y-0.5">
            <div className="h-1 w-2/3 rounded-sm" style={{ background: ink }} />
            <div className="h-px w-full" style={{ background: gold }} />
            <div className="h-0.5 w-full bg-slate-100" />
            <div className="h-0.5 w-4/5 bg-slate-100" />
          </div>
        </>
      )}
      {id === "minimalista" && (
        <div className="px-1.5 pt-2 space-y-1">
          <div className="h-1 w-1/2 rounded-sm" style={{ background: ink }} />
          <div className="h-px w-6" style={{ background: primary }} />
          <div className="h-0.5 w-full bg-slate-100" />
          <div className="h-0.5 w-5/6 bg-slate-100" />
          <div className="h-0.5 w-3/4 bg-slate-100" />
        </div>
      )}
      {id === "laudo" && (
        <>
          <div className="h-4 flex items-stretch" style={{ background: light }}>
            <div className="w-1" style={{ background: primary }} />
          </div>
          <div className="px-1.5 pt-1 space-y-1">
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-sm" style={{ background: primary }} />
              <div className="h-1 w-2/3 rounded-sm" style={{ background: ink }} />
            </div>
            <div className="h-0.5 w-full bg-slate-100" />
            <div className="h-0.5 w-4/5 bg-slate-100" />
          </div>
        </>
      )}
      {id === "escritorio" && (
        <>
          <div className="h-3 bg-slate-50 border-b border-slate-200" />
          <div className="h-[2px]" style={{ background: primary }} />
          <div className="px-1.5 pt-1 space-y-0.5">
            <div className="h-1 w-1/2 rounded-sm" style={{ background: ink }} />
            <div className="h-px w-full" style={{ background: primary }} />
            <div className="h-0.5 w-full bg-slate-100" />
            <div className="h-0.5 w-5/6 bg-slate-100" />
          </div>
        </>
      )}
      {id === "institucional" && (
        <>
          <div className="h-4" style={{ background: "#0f213f" }} />
          <div className="px-1.5 pt-1 flex flex-col items-center space-y-0.5">
            <div className="h-1 w-1/2 rounded-sm" style={{ background: ink }} />
            <div className="h-px w-6" style={{ background: "#0f213f" }} />
            <div className="h-0.5 w-full bg-slate-100" />
            <div className="h-0.5 w-4/5 bg-slate-100" />
          </div>
        </>
      )}
      {id === "moderno" && (
        <>
          <div className="h-5" style={{ background: `linear-gradient(135deg, ${primary}, ${ink})` }} />
          <div className="m-1.5 p-1 rounded-md" style={{ background: light, borderTop: `2px solid ${primary}` }}>
            <div className="h-1 w-3/4 rounded-sm" style={{ background: ink }} />
          </div>
          <div className="px-1.5 space-y-0.5">
            <div className="h-0.5 w-full bg-slate-100" />
            <div className="h-0.5 w-5/6 bg-slate-100" />
          </div>
        </>
      )}
      {id === "luxo" && (
        <>
          <div className="h-3" style={{ background: "#0a1733" }} />
          <div className="h-[2px]" style={{ background: gold }} />
          <div className="h-px" style={{ background: gold }} />
          <div className="px-1.5 pt-1 space-y-0.5">
            <div className="h-1 w-2/3 rounded-sm" style={{ background: ink }} />
            <div className="h-px w-full" style={{ background: gold }} />
            <div className="h-px w-full" style={{ background: gold, opacity: 0.5 }} />
            <div className="h-0.5 w-full bg-slate-100" />
            <div className="h-0.5 w-4/5 bg-slate-100" />
          </div>
        </>
      )}
      {id === "checklist" && (
        <>
          <div className="h-3" style={{ background: light }} />
          <div className="h-[2px]" style={{ background: primary }} />
          <div className="px-1.5 pt-1 space-y-0.5">
            <div className="flex items-center gap-1">
              <div className="h-1.5 w-1.5 border" style={{ borderColor: primary }} />
              <div className="h-0.5 w-3/4 bg-slate-200" />
            </div>
            <div className="flex items-center gap-1">
              <div className="h-1.5 w-1.5 border" style={{ borderColor: primary }} />
              <div className="h-0.5 w-2/3 bg-slate-200" />
            </div>
            <div className="flex items-center gap-1">
              <div className="h-1.5 w-1.5 border" style={{ borderColor: primary }} />
              <div className="h-0.5 w-1/2 bg-slate-200" />
            </div>
          </div>
        </>
      )}
      {id === "premium-branco" && (
        <>
          <div className="h-3 bg-white border-b" style={{ borderColor: gold }} />
          <div className="px-1.5 pt-1 flex flex-col items-center space-y-0.5">
            <div className="h-1 w-1/2 rounded-sm" style={{ background: primary }} />
            <div className="h-px w-6" style={{ background: gold }} />
            <div className="h-0.5 w-full bg-slate-100" />
            <div className="h-0.5 w-4/5 bg-slate-100" />
          </div>
        </>
      )}
      {id === "azul-profundo" && (
        <>
          <div className="h-4" style={{ background: "#062046" }} />
          <div className="px-1.5 pt-1 space-y-0.5">
            <div className="h-1 w-2/3 rounded-sm" style={{ background: ink }} />
            <div className="h-px w-full" style={{ background: "#062046" }} />
            <div className="h-0.5 w-full bg-slate-100" />
            <div className="h-0.5 w-5/6 bg-slate-100" />
          </div>
        </>
      )}
      {id === "oficial" && (
        <>
          <div className="h-3" style={{ background: "#1f2937" }} />
          <div className="h-[1px]" style={{ background: primary }} />
          <div className="px-1.5 pt-1 space-y-0.5">
            <div className="h-1 w-2/3 rounded-sm" style={{ background: ink }} />
            <div className="h-px w-full bg-slate-300" />
            <div className="h-px w-full bg-slate-200" />
            <div className="h-0.5 w-full bg-slate-100" />
            <div className="h-0.5 w-4/5 bg-slate-100" />
          </div>
        </>
      )}
      {id === "engenharia-naval" && (
        <>
          <div className="h-3 flex" style={{ background: light }}>
            <div className="w-1" style={{ background: ink }} />
          </div>
          <div className="px-1.5 pt-1 space-y-0.5">
            <div className="h-1 w-1/3 rounded-sm" style={{ background: ink }} />
            <div className="flex items-center gap-1">
              <div className="h-1.5 w-1.5" style={{ background: "#64748b" }} />
              <div className="h-0.5 w-2/3 bg-slate-200" />
            </div>
            <div className="flex items-center gap-1">
              <div className="h-1.5 w-1.5" style={{ background: "#64748b" }} />
              <div className="h-0.5 w-1/2 bg-slate-200" />
            </div>
          </div>
        </>
      )}
      {id === "protocolo" && (
        <div className="px-1.5 pt-2 space-y-1">
          <div className="flex justify-end">
            <div className="h-1.5 w-8 border" style={{ borderColor: "#64748b" }} />
          </div>
          <div className="h-1 w-1/2 rounded-sm" style={{ background: ink }} />
          <div className="h-px w-6 bg-slate-400" />
          <div className="h-0.5 w-full bg-slate-100" />
          <div className="h-0.5 w-5/6 bg-slate-100" />
        </div>
      )}
      {id === "capa-executiva" && (
        <>
          <div className="h-7 relative" style={{ background: `linear-gradient(135deg, ${primary}, #334155)` }}>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-1 w-2/3 bg-white/90 rounded-sm" />
            </div>
            <div className="absolute left-0 right-0 -bottom-0.5 h-[2px]" style={{ background: gold }} />
          </div>
          <div className="px-1.5 pt-1 space-y-0.5">
            <div className="h-px w-full bg-slate-200" />
            <div className="h-0.5 w-full bg-slate-100" />
            <div className="h-0.5 w-5/6 bg-slate-100" />
          </div>
        </>
      )}
      {id === "relatorio-tecnico" && (
        <>
          <div className="h-4" style={{ background: `linear-gradient(90deg, ${ink}, ${primary})` }} />
          <div className="h-[2px]" style={{ background: gold }} />
          <div className="px-1.5 pt-1 space-y-0.5">
            <div className="h-1 w-2/3 rounded-sm" style={{ background: ink }} />
            <div className="h-px w-full" style={{ background: primary }} />
            <div className="h-px w-1/4" style={{ background: gold }} />
            <div className="flex items-center gap-1">
              <div className="h-1.5 w-1.5" style={{ background: primary }} />
              <div className="h-0.5 w-3/4 bg-slate-200" />
            </div>
            <div className="flex items-center gap-1">
              <div className="h-1.5 w-1.5" style={{ background: primary }} />
              <div className="h-0.5 w-2/3 bg-slate-200" />
            </div>
          </div>
        </>
      )}
      {id === "corporate-clean" && (
        <div className="flex h-full">
          <div className="w-2" style={{ background: primary }} />
          <div className="flex-1 px-1.5 pt-2 space-y-1">
            <div className="h-1 w-1/2 rounded-sm" style={{ background: ink }} />
            <div className="h-0.5 w-full bg-slate-100" />
            <div className="h-0.5 w-5/6 bg-slate-100" />
            <div className="h-0.5 w-3/4 bg-slate-100" />
          </div>
        </div>
      )}
      {id === "timbrado" && (
        <>
          <div className="h-3" style={{ background: primary }} />
          <div className="h-1" style={{ background: "#94a3b8" }} />
          <div className="px-1.5 pt-1 space-y-0.5">
            <div className="h-1 w-2/3 rounded-sm" style={{ background: ink }} />
            <div className="h-px w-1/2 bg-slate-400 italic" />
            <div className="h-0.5 w-full bg-slate-100" />
            <div className="h-0.5 w-5/6 bg-slate-100" />
          </div>
        </>
      )}
      {id === "naval-premium" && (
        <>
          <div className="h-4 relative" style={{ background: "#061838" }}>
            <div className="absolute right-0 top-0 bottom-0 w-3" style={{ background: primary, opacity: 0.7 }} />
          </div>
          <div className="h-[2px]" style={{ background: gold }} />
          <div className="h-px" style={{ background: gold, opacity: 0.6 }} />
          <div className="px-1.5 pt-1 flex flex-col items-center space-y-0.5">
            <div className="h-1 w-1/2 rounded-sm" style={{ background: ink }} />
            <div className="h-px w-full" style={{ background: gold }} />
            <div className="h-0.5 w-full bg-slate-100" />
            <div className="h-0.5 w-4/5 bg-slate-100" />
          </div>
        </>
      )}
    </div>
  );
}


function TextField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input className="mt-1.5" value={value || ""} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1.5 flex items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-16 rounded-lg border border-slate-200 cursor-pointer"
        />
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="flex-1" />
      </div>
    </div>
  );
}

function UploadField({
  inputId,
  label,
  actionLabel,
  value,
  busy,
  onFile,
  onClear,
}: {
  inputId: string;
  label: string;
  actionLabel: string;
  value: string | null;
  busy: boolean;
  onFile: (f: File) => void;
  onClear: () => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (busy) return;
    const f = e.dataTransfer.files?.[0];
    if (f) onFile(f);
  };
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("[UPLOAD]", inputId, "change event", e.target.files);
    const f = e.target.files?.[0];
    if (f) onFile(f);
    e.target.value = "";
  };
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`mt-1.5 rounded-xl border-2 border-dashed p-4 flex flex-col items-center justify-center min-h-[140px] transition-colors select-none ${
          dragOver ? "border-primary bg-primary/5" : "border-slate-300 bg-slate-50 hover:bg-slate-100"
        } ${busy ? "opacity-60" : ""}`}
      >
        {value ? (
          <img src={value} alt={label} className="max-h-20 max-w-full object-contain mb-2 pointer-events-none" />
        ) : (
          <div className="flex flex-col items-center text-center pointer-events-none">
            {busy ? (
              <Loader2 className="h-6 w-6 animate-spin text-primary mb-2" />
            ) : (
              <Upload className="h-6 w-6 text-slate-400 mb-2" />
            )}
            <p className="text-sm font-medium text-slate-700">
              {busy ? "Enviando..." : "Clique no botão abaixo ou arraste uma imagem"}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">PNG, JPG, WEBP ou SVG · até 5 MB</p>
          </div>
        )}
      </div>

      {/* Botão com o INPUT FILE NATIVO sobreposto (opacity:0).
          O clique do usuário cai diretamente no <input type=file> — o browser
          nunca bloqueia isso porque é gesto nativo no próprio input. */}
      <div className="mt-2 flex justify-center gap-2">
        <div className="relative inline-flex">
          <button
            type="button"
            disabled={busy}
            onClick={() => console.log("[UPLOAD]", inputId, "button click registered")}
            className={`inline-flex h-9 items-center justify-center rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground shadow-sm transition-colors hover:bg-secondary/80 ${
              busy ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
            }`}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
            {value ? "Trocar arquivo" : actionLabel}
          </button>
          <input
            id={inputId}
            name={inputId}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
            disabled={busy}
            onChange={handleChange}
            onClick={() => console.log("[UPLOAD]", inputId, "native input click")}
            aria-label={actionLabel}
            className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-[0.01] disabled:cursor-not-allowed"
            style={{ fontSize: 999 }}
          />
        </div>
        {value ? (
          <Button size="sm" variant="ghost" onClick={onClear} disabled={busy} type="button">
            Remover
          </Button>
        ) : null}
      </div>
    </div>
  );
}
