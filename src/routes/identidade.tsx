import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PageHeader } from "@/components/navigation/PageHeader";
import { toast } from "sonner";
import { Loader2, Upload, Image as ImageIcon, Palette, Building2, PenTool, Stamp, Droplet } from "lucide-react";

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
};

function IdentidadePage() {
  const { profile } = useAuth();
  const companyId = profile?.company_id;
  const [data, setData] = useState<BrandingFields>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) return;
    (async () => {
      setLoading(true);
      const { data: row, error } = await supabase
        .from("companies")
        .select(
          "logo_primary_url, logo_secondary_url, brand_primary_color, brand_secondary_color, contact_phone, contact_whatsapp, contact_email, contact_website, contact_address, technical_responsible_name, technical_responsible_registry, signature_url, stamp_url, watermark_url, pdf_footer_text"
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
              label="Logo principal"
              value={data.logo_primary_url}
              busy={uploadingField === "logo_primary_url"}
              onFile={(f) => upload("logo_primary_url", f)}
              onClear={() => clearField("logo_primary_url")}
            />
            <UploadField
              label="Logo secundário (opcional)"
              value={data.logo_secondary_url}
              busy={uploadingField === "logo_secondary_url"}
              onFile={(f) => upload("logo_secondary_url", f)}
              onClear={() => clearField("logo_secondary_url")}
            />
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
              label="Assinatura digital"
              value={data.signature_url}
              busy={uploadingField === "signature_url"}
              onFile={(f) => upload("signature_url", f)}
              onClear={() => clearField("signature_url")}
            />
            <UploadField
              label="Carimbo"
              value={data.stamp_url}
              busy={uploadingField === "stamp_url"}
              onFile={(f) => upload("stamp_url", f)}
              onClear={() => clearField("stamp_url")}
            />
            <UploadField
              label="Marca d'água (PDF)"
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
  label,
  value,
  busy,
  onFile,
  onClear,
}: {
  label: string;
  value: string | null;
  busy: boolean;
  onFile: (f: File) => void;
  onClear: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const openPicker = () => {
    if (busy) return;
    ref.current?.click();
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (busy) return;
    const f = e.dataTransfer.files?.[0];
    if (f) onFile(f);
  };
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      {/* Input file SEMPRE no DOM, fora do card, para nunca ser bloqueado por overlay */}
      <input
        ref={ref}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
        style={{ position: "absolute", width: 1, height: 1, opacity: 0, pointerEvents: "none" }}
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
      <div
        role="button"
        tabIndex={0}
        onClick={openPicker}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openPicker();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`relative z-[1] mt-1.5 rounded-xl border-2 border-dashed p-4 flex flex-col items-center justify-center min-h-[140px] transition-colors cursor-pointer outline-none focus:ring-2 focus:ring-primary/40 select-none ${
          dragOver ? "border-primary bg-primary/5" : "border-slate-300 bg-slate-50 hover:bg-slate-100"
        } ${busy ? "opacity-60 cursor-wait" : ""}`}
      >
        {value ? (
          <>
            <img src={value} alt={label} className="max-h-20 max-w-full object-contain mb-2 pointer-events-none" />
            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
              <Button size="sm" variant="outline" onClick={openPicker} disabled={busy} type="button">
                {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Trocar
              </Button>
              <Button size="sm" variant="ghost" onClick={onClear} disabled={busy} type="button">
                Remover
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center text-center pointer-events-none">
            {busy ? (
              <Loader2 className="h-6 w-6 animate-spin text-primary mb-2" />
            ) : (
              <Upload className="h-6 w-6 text-slate-400 mb-2" />
            )}
            <p className="text-sm font-medium text-slate-700">
              {busy ? "Enviando..." : "Clique ou arraste uma imagem"}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">PNG, JPG, WEBP ou SVG · até 5 MB</p>
          </div>
        )}
      </div>
      {/* Botão visível de fallback — independente do card */}
      <div className="mt-2 flex justify-center">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={busy}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            ref.current?.click();
          }}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
          {value ? "Trocar arquivo" : "Enviar arquivo"}
        </Button>
      </div>
    </div>
  );
}
