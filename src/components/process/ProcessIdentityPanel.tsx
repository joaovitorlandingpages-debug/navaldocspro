import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, ImageOff, Building2, User, Image as ImageIcon, Check } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { ProcessBrandingMode } from "@/services/companyBranding";

type Props = { processId: string };

const OPTIONS: { id: ProcessBrandingMode; label: string; description: string; icon: React.ReactNode }[] = [
  { id: "none", label: "Sem logo", description: "PDF gerado sem nenhum logo no cabeçalho.", icon: <ImageOff className="h-5 w-5" /> },
  { id: "company", label: "Logo da minha empresa", description: "Usar o logo padrão definido em Identidade Corporativa.", icon: <Building2 className="h-5 w-5" /> },
  { id: "customer", label: "Logo do cliente", description: "Aplica o logo cadastrado do cliente (quando disponível).", icon: <User className="h-5 w-5" /> },
  { id: "custom", label: "Upload exclusivo deste processo", description: "Envie um logo válido apenas para este processo.", icon: <ImageIcon className="h-5 w-5" /> },
];

export function ProcessIdentityPanel({ processId }: Props) {
  const { profile } = useAuth();
  const companyId = profile?.company_id;
  const [mode, setMode] = useState<ProcessBrandingMode>("company");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [customerLogoUrl, setCustomerLogoUrl] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("processes")
        .select("branding_mode, branding_logo_url, customer_id")
        .eq("id", processId)
        .maybeSingle();
      if (data) {
        setMode((data.branding_mode as ProcessBrandingMode) || "company");
        setLogoUrl(data.branding_logo_url || null);
        if (data.customer_id) {
          const { data: cust } = await supabase
            .from("customers")
            .select("name, logo_url")
            .eq("id", data.customer_id)
            .maybeSingle();
          setCustomerName((cust as any)?.name || null);
          setCustomerLogoUrl((cust as any)?.logo_url || null);
        }
      }
      setLoading(false);
    })();
  }, [processId]);


  async function persist(nextMode: ProcessBrandingMode, nextLogo: string | null) {
    setSaving(true);
    const { error } = await supabase
      .from("processes")
      .update({ branding_mode: nextMode, branding_logo_url: nextLogo })
      .eq("id", processId);
    setSaving(false);
    if (error) {
      toast.error("Não foi possível salvar a identidade do processo.");
      return false;
    }
    toast.success("Identidade do processo atualizada.");
    return true;
  }

  async function onUpload(file: File) {
    if (!companyId) {
      toast.error("Empresa não identificada.");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem (PNG ou JPG).");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${companyId}/processes/${processId}/logo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("company-branding")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: signed, error: signErr } = await supabase.storage
        .from("company-branding")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      if (signErr || !signed?.signedUrl) throw signErr || new Error("sign failed");
      setLogoUrl(signed.signedUrl);
      setMode("custom");
      await persist("custom", signed.signedUrl);
    } catch (err: any) {
      toast.error(err?.message || "Falha ao enviar logo.");
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <Card className="p-8 flex items-center justify-center bg-white border-slate-100">
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-5 sm:p-6 bg-white border-slate-100">
        <div className="mb-4">
          <h3 className="text-base font-black text-navy">Identidade do Documento</h3>
          <p className="text-xs text-slate-500 mt-1">
            Escolha qual logo aparecerá nos PDFs gerados <strong>somente neste processo</strong>.
            Não altera documentos antigos nem a identidade global da empresa.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {OPTIONS.map((opt) => {
            const selected = mode === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={async () => {
                  if (opt.id === mode) return;
                  setMode(opt.id);
                  await persist(opt.id, opt.id === "custom" ? logoUrl : null);
                }}
                className={`text-left p-4 rounded-2xl border-2 transition-all flex items-start gap-3 ${
                  selected
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-slate-100 hover:border-slate-300 bg-white"
                }`}
              >
                <div
                  className={`h-10 w-10 shrink-0 grid place-items-center rounded-xl ${
                    selected ? "bg-primary text-white" : "bg-slate-50 text-slate-400"
                  }`}
                >
                  {opt.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-navy">{opt.label}</span>
                    {selected && <Check className="h-4 w-4 text-primary" />}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{opt.description}</p>
                </div>
              </button>
            );
          })}
        </div>

        {mode === "custom" && (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-200 p-4 bg-slate-50/40">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-xl bg-white border border-slate-100 grid place-items-center overflow-hidden shrink-0">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo do processo" className="max-h-full max-w-full object-contain" />
                ) : (
                  <ImageIcon className="h-6 w-6 text-slate-300" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-navy">Logo exclusivo deste processo</p>
                <p className="text-[11px] text-slate-500 mt-0.5">PNG ou JPG, fundo transparente preferencial. Será aplicado apenas aqui.</p>
                <label className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-primary text-white text-[11px] font-bold cursor-pointer hover:opacity-90">
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  {uploading ? "Enviando..." : "Selecionar imagem"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
                  />
                </label>
              </div>
            </div>
          </div>
        )}
        {mode === "customer" && (
          <div className="mt-5 rounded-2xl border border-dashed border-slate-200 p-4 bg-slate-50/40">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-xl bg-white border border-slate-100 grid place-items-center overflow-hidden shrink-0">
                {customerLogoUrl ? (
                  <img src={customerLogoUrl} alt="Logo do cliente" className="max-h-full max-w-full object-contain" />
                ) : (
                  <ImageOff className="h-6 w-6 text-slate-300" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-navy">
                  {customerName ? `Logo de ${customerName}` : "Logo do cliente"}
                </p>
                {customerLogoUrl ? (
                  <p className="text-[11px] text-slate-500 mt-0.5">Será aplicado nos PDFs deste processo.</p>
                ) : (
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    Este cliente ainda não tem logo cadastrado. Cadastre em <strong>Clientes → Editar → Logo do Cliente</strong> ou os PDFs sairão sem logo.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}


        {saving && (
          <div className="mt-4 text-[11px] text-slate-400 flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin" /> Salvando…
          </div>
        )}
      </Card>

      <Card className="p-4 bg-slate-50/60 border-slate-100">
        <p className="text-[11px] text-slate-500 leading-relaxed">
          <strong className="text-navy">Ordem de precedência aplicada pelo PDF Builder:</strong>
          {" "}identidade deste processo →
          identidade da empresa → <em>sem logo</em>. Você pode alterar o modo a qualquer momento;
          documentos já gerados <strong>não</strong> serão modificados.
        </p>
      </Card>
    </div>
  );
}

export default ProcessIdentityPanel;
