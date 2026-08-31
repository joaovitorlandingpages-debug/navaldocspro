import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { X, Save, Loader2, Palette } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

import { PDF_TEMPLATES, type CompanyBranding, type PdfTemplateId } from "@/services/companyBranding";
import { buildBrandedDocumentPdf } from "@/services/brandedPdfBuilder";
import {
  applyTemplateConfig,
  saveCompanyTemplate,
  type CompanyPdfTemplate,
  type DocumentType,
  type TemplateCategory,
  type TemplateConfig,
  DOCUMENT_TYPES,
  TEMPLATE_CATEGORIES,
  CATEGORY_OF,
} from "@/services/companyPdfTemplates";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface Props {
  open: boolean;
  onClose: () => void;
  companyId: string;
  branding: CompanyBranding | null;
  initial?: CompanyPdfTemplate | null;
  initialBaseTemplate?: PdfTemplateId;
  onSaved: (t: CompanyPdfTemplate) => void;
}

const SAMPLE = {
  name: "Modelo de Visualização",
  body: `Documento de demonstração utilizado pelo Editor Visual de Templates do NavalDocs Pro.

Este texto permite que a empresa visualize, em tempo real, como o modelo escolhido será aplicado em documentos reais — incluindo cabeçalho, marca d'água, rodapé, assinatura, carimbo e código de verificação.

Dados do interessado:
Nome: João da Silva
CPF: 000.000.000-00
Embarcação: Phoenix Ops-01

Conforme legislação vigente e Normas da Autoridade Marítima, o presente documento segue para apreciação e despacho.`,
};

export function TemplateStudio({
  open,
  onClose,
  companyId,
  branding,
  initial,
  initialBaseTemplate,
  onSaved,
}: Props) {
  const [name, setName] = useState(initial?.name ?? "Meu Template");
  const [baseTemplate, setBaseTemplate] = useState<PdfTemplateId>(
    initial?.base_template ?? initialBaseTemplate ?? branding?.pdf_template ?? "classico",
  );
  const [category, setCategory] = useState<TemplateCategory>(
    initial?.category ?? CATEGORY_OF[initial?.base_template ?? initialBaseTemplate ?? "classico"],
  );
  const [docType, setDocType] = useState<DocumentType | "none">(initial?.document_type ?? "none");
  const [isDefault, setIsDefault] = useState<boolean>(initial?.is_default ?? false);
  const [config, setConfig] = useState<TemplateConfig>(initial?.config ?? {});
  const [saving, setSaving] = useState(false);
  const [rendering, setRendering] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const debounceRef = useRef<number | null>(null);

  // Reset when modal reopens with new initial
  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? "Meu Template");
    setBaseTemplate(initial?.base_template ?? initialBaseTemplate ?? branding?.pdf_template ?? "classico");
    setCategory(initial?.category ?? CATEGORY_OF[initial?.base_template ?? initialBaseTemplate ?? "classico"]);
    setDocType(initial?.document_type ?? "none");
    setIsDefault(initial?.is_default ?? false);
    setConfig(initial?.config ?? {});
  }, [open, initial, initialBaseTemplate, branding]);

  // Live preview render with debounce
  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      setRendering(true);
      try {
        const effective = applyTemplateConfig(branding, baseTemplate, config);
        const { bytes } = await buildBrandedDocumentPdf({
          docName: SAMPLE.name,
          content: SAMPLE.body,
          branding: effective,
        });
        const pdf = await pdfjsLib.getDocument({
          data: bytes,
          enableScripting: false,
          isEvalSupported: false,
          disableAutoFetch: true,
        } as any).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1.2 });
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvas, canvasContext: ctx, viewport } as any).promise;
      } catch (e) {
        console.error("Studio preview error:", e);
      } finally {
        setRendering(false);
      }
    }, 250);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [open, baseTemplate, config, branding]);

  const set = <K extends keyof TemplateConfig>(k: K, v: TemplateConfig[K]) =>
    setConfig((c) => ({ ...c, [k]: v }));

  const handleSave = async (asNew: boolean) => {
    if (!name.trim()) {
      toast.error("Dê um nome ao template");
      return;
    }
    setSaving(true);
    try {
      const saved = await saveCompanyTemplate({
        id: asNew ? undefined : initial?.id,
        company_id: companyId,
        name: name.trim(),
        base_template: baseTemplate,
        category,
        config,
        is_default: isDefault,
        document_type: docType === "none" ? null : docType,
      });
      toast.success(asNew ? "Template criado" : "Template atualizado");
      onSaved(saved as any);
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao salvar template");
    } finally {
      setSaving(false);
    }
  };

  const groupedTemplates = useMemo(() => {
    const map = new Map<TemplateCategory, typeof PDF_TEMPLATES>();
    for (const t of PDF_TEMPLATES) {
      const c = CATEGORY_OF[t.id];
      if (!map.has(c)) map.set(c, [] as any);
      (map.get(c) as any).push(t);
    }
    return map;
  }, []);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
      <div className="w-full max-w-6xl h-full max-h-[95vh] bg-slate-950 border border-white/10 rounded-2xl overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="h-14 px-4 sm:px-6 border-b border-white/10 flex items-center justify-between bg-slate-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Palette className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">
                Editor Visual de Template
              </h2>
              <p className="text-[10px] text-slate-500 font-mono">
                Preview em tempo real · sem programação
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Sidebar controls */}
          <div className="w-full lg:w-96 border-b lg:border-b-0 lg:border-r border-white/10 bg-slate-900/30 overflow-y-auto p-4 sm:p-5 space-y-5 scrollbar-hide">
            {/* Identity */}
            <Section title="Identidade do template">
              <Field label="Nome">
                <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-black/40 border-white/10 text-white h-9 text-xs" />
              </Field>
              <Field label="Modelo base">
                <Select value={baseTemplate} onValueChange={(v) => { setBaseTemplate(v as PdfTemplateId); setCategory(CATEGORY_OF[v as PdfTemplateId]); }}>
                  <SelectTrigger className="bg-black/40 border-white/10 text-white h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-72 bg-slate-900 text-white border-white/10">
                    {Array.from(groupedTemplates.entries()).map(([cat, tpls]) => (
                      <div key={cat}>
                        <div className="px-2 py-1 text-[9px] uppercase tracking-widest text-slate-500">
                          {TEMPLATE_CATEGORIES.find((c) => c.id === cat)?.label}
                        </div>
                        {tpls.map((t) => (
                          <SelectItem key={t.id} value={t.id} className="text-xs">{t.label}</SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Categoria">
                <Select value={category} onValueChange={(v) => setCategory(v as TemplateCategory)}>
                  <SelectTrigger className="bg-black/40 border-white/10 text-white h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-900 text-white border-white/10">
                    {TEMPLATE_CATEGORIES.map((c) => <SelectItem key={c.id} value={c.id} className="text-xs">{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Tipo de documento (opcional)">
                <Select value={docType} onValueChange={(v) => setDocType(v as any)}>
                  <SelectTrigger className="bg-black/40 border-white/10 text-white h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-slate-900 text-white border-white/10">
                    <SelectItem value="none" className="text-xs">Genérico (todos)</SelectItem>
                    {DOCUMENT_TYPES.map((d) => <SelectItem key={d.id} value={d.id} className="text-xs">{d.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Toggle label="Definir como padrão" checked={isDefault} onChange={setIsDefault} />
            </Section>

            {/* Colors */}
            <Section title="Cores">
              <ColorField label="Primária" value={config.brand_primary_color ?? branding?.brand_primary_color ?? "#2563eb"}
                onChange={(v) => set("brand_primary_color", v)} />
              <ColorField label="Secundária" value={config.brand_secondary_color ?? branding?.brand_secondary_color ?? "#0f172a"}
                onChange={(v) => set("brand_secondary_color", v)} />
            </Section>

            {/* Footer */}
            <Section title="Rodapé">
              <Toggle label="Ocultar rodapé" checked={!!config.hideFooter} onChange={(v) => set("hideFooter", v)} />
              {!config.hideFooter && (
                <>
                  <Field label="Telefone"><Input value={config.contact_phone ?? branding?.contact_phone ?? ""} onChange={(e) => set("contact_phone", e.target.value)} className="bg-black/40 border-white/10 text-white h-9 text-xs" /></Field>
                  <Field label="WhatsApp"><Input value={config.contact_whatsapp ?? branding?.contact_whatsapp ?? ""} onChange={(e) => set("contact_whatsapp", e.target.value)} className="bg-black/40 border-white/10 text-white h-9 text-xs" /></Field>
                  <Field label="E-mail"><Input value={config.contact_email ?? branding?.contact_email ?? ""} onChange={(e) => set("contact_email", e.target.value)} className="bg-black/40 border-white/10 text-white h-9 text-xs" /></Field>
                  <Field label="Site"><Input value={config.contact_website ?? branding?.contact_website ?? ""} onChange={(e) => set("contact_website", e.target.value)} className="bg-black/40 border-white/10 text-white h-9 text-xs" /></Field>
                  <Field label="Endereço"><Input value={config.contact_address ?? branding?.contact_address ?? ""} onChange={(e) => set("contact_address", e.target.value)} className="bg-black/40 border-white/10 text-white h-9 text-xs" /></Field>
                  <Field label="Texto adicional"><Input value={config.pdf_footer_text ?? branding?.pdf_footer_text ?? ""} onChange={(e) => set("pdf_footer_text", e.target.value)} className="bg-black/40 border-white/10 text-white h-9 text-xs" /></Field>
                </>
              )}
            </Section>

            {/* Watermark */}
            <Section title="Marca d'água">
              <Toggle label="Ocultar marca d'água" checked={!!config.hideWatermark} onChange={(v) => set("hideWatermark", v)} />
              {!config.hideWatermark && (
                <>
                  <Field label="URL da imagem (opcional)">
                    <Input value={config.watermark_url ?? branding?.watermark_url ?? ""} onChange={(e) => set("watermark_url", e.target.value)} placeholder="Deixe em branco para usar o logo"
                      className="bg-black/40 border-white/10 text-white h-9 text-xs" />
                  </Field>
                </>
              )}
            </Section>

            {/* Signature / Stamp */}
            <Section title="Assinatura e carimbo">
              <Toggle label="Ocultar assinatura" checked={!!config.hideSignature} onChange={(v) => set("hideSignature", v)} />
              <Toggle label="Ocultar carimbo" checked={!!config.hideStamp} onChange={(v) => set("hideStamp", v)} />
              {!config.hideSignature && (
                <Field label="URL da assinatura"><Input value={config.signature_url ?? branding?.signature_url ?? ""} onChange={(e) => set("signature_url", e.target.value)} className="bg-black/40 border-white/10 text-white h-9 text-xs" /></Field>
              )}
              {!config.hideStamp && (
                <Field label="URL do carimbo"><Input value={config.stamp_url ?? branding?.stamp_url ?? ""} onChange={(e) => set("stamp_url", e.target.value)} className="bg-black/40 border-white/10 text-white h-9 text-xs" /></Field>
              )}
            </Section>
          </div>

          {/* Preview */}
          <div className="flex-1 bg-gradient-to-br from-slate-900 to-black overflow-auto flex items-start justify-center p-4 sm:p-8 relative">
            {rendering && (
              <div className="absolute top-4 right-4 flex items-center gap-2 text-[10px] uppercase tracking-widest text-slate-400">
                <Loader2 className="h-3 w-3 animate-spin" /> renderizando…
              </div>
            )}
            <div className="bg-white shadow-2xl">
              <canvas ref={canvasRef} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="h-16 px-4 sm:px-6 border-t border-white/10 bg-black/40 flex items-center justify-between gap-3 shrink-0">
          <p className="hidden sm:block text-[10px] text-slate-500 font-mono">
            Preview reflete exatamente o PDF final.
          </p>
          <div className="flex items-center gap-2 ml-auto">
            <Button variant="ghost" onClick={onClose} className="text-slate-400 hover:text-white rounded-lg h-9 text-xs">
              Cancelar
            </Button>
            <Button onClick={() => handleSave(true)} disabled={saving} variant="outline"
              className="border-white/10 text-white hover:bg-white/5 rounded-lg h-9 text-xs">
              Salvar como novo
            </Button>
            <Button onClick={() => handleSave(false)} disabled={saving}
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg h-9 text-xs gap-2 font-bold">
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              {initial ? "Salvar" : "Criar"}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2.5">
      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary/80">{title}</p>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[9px] uppercase tracking-widest text-slate-500 font-bold">{label}</Label>
      {children}
    </div>
  );
}
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-[11px] text-slate-300">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label}>
      <div className="flex gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 rounded-md bg-black/40 border border-white/10 cursor-pointer" />
        <Input value={value} onChange={(e) => onChange(e.target.value)}
          className="bg-black/40 border-white/10 text-white h-9 text-xs font-mono flex-1" />
      </div>
    </Field>
  );
}
