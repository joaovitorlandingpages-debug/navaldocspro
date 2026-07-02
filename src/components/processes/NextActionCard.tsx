/**
 * Sprint 1 — Item 2/3
 * NextActionCard: mostra ao engenheiro/despachante EXATAMENTE a próxima ação
 * recomendada no processo, com um único CTA. Zero jargão técnico.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, FileText, Signature, Upload, Sparkles,
  CheckCircle2, PackageCheck, Loader2,
} from "lucide-react";

interface Props {
  processId: string;
  processStatus?: string | null;
  onOpenTab: (tab: string) => void;
}

type Action = {
  headline: string;
  detail: string;
  cta: string;
  tone: "primary" | "amber" | "emerald" | "slate";
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
};

const TONE: Record<Action["tone"], { bg: string; ring: string; btn: string; icon: string }> = {
  primary: { bg: "bg-primary/5", ring: "ring-primary/20", btn: "bg-primary text-white hover:bg-primary/90", icon: "text-primary" },
  amber:   { bg: "bg-amber-50",  ring: "ring-amber-200",  btn: "bg-amber-500 text-white hover:bg-amber-600", icon: "text-amber-600" },
  emerald: { bg: "bg-emerald-50", ring: "ring-emerald-200", btn: "bg-emerald-600 text-white hover:bg-emerald-700", icon: "text-emerald-600" },
  slate:   { bg: "bg-slate-50",  ring: "ring-slate-200",  btn: "bg-navy text-white hover:bg-slate-900", icon: "text-navy" },
};

export function NextActionCard({ processId, processStatus, onOpenTab }: Props) {
  const { data: checklist = [], isLoading } = useQuery({
    queryKey: ["next-action-checklist", processId],
    queryFn: async () => {
      const { data } = await supabase
        .from("document_checklists")
        .select("id,item_name,status,is_mandatory,requires_signature,document_id")
        .eq("process_id", processId)
        .order("sort_order", { ascending: true });
      return data ?? [];
    },
    enabled: !!processId,
  });

  const { data: signatures = [] } = useQuery({
    queryKey: ["next-action-signatures", processId],
    queryFn: async () => {
      const { data } = await supabase
        .from("signature_requests")
        .select("id,status")
        .eq("process_id", processId);
      return data ?? [];
    },
    enabled: !!processId,
  });

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-white border border-slate-100 p-6 flex items-center gap-3 text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Analisando próximo passo…
      </div>
    );
  }

  const mandatory = checklist.filter((c: any) => c.is_mandatory);
  const missingGeneration = mandatory.filter((c: any) => !c.document_id && (c.status ?? "pending") === "pending");
  const needAttach = mandatory.filter((c: any) => (c.status ?? "").toLowerCase() === "waiting_upload");
  const needSign = mandatory.filter((c: any) => c.requires_signature && c.document_id && (c.status ?? "").toLowerCase() !== "signed");
  const pendingSignatures = signatures.filter((s: any) => ["pending","sent","in_progress"].includes((s.status ?? "").toLowerCase()));
  const allDone = mandatory.length > 0 && mandatory.every((c: any) => ["signed","completed","attached","done"].includes((c.status ?? "").toLowerCase()));

  let action: Action;

  if (mandatory.length === 0) {
    action = {
      headline: "Escolha o tipo de processo",
      detail: "Ainda não há documentos exigidos. Ajuste o tipo de processo para gerar o roteiro.",
      cta: "Ajustar processo",
      tone: "slate",
      icon: FileText,
      onClick: () => onOpenTab("edit"),
    };
  } else if (missingGeneration.length > 0) {
    action = {
      headline: `Gerar ${missingGeneration.length} documento${missingGeneration.length > 1 ? "s" : ""} obrigatório${missingGeneration.length > 1 ? "s" : ""}`,
      detail: `Comece por: ${missingGeneration[0].item_name}. Podemos gerar todos de uma vez.`,
      cta: "Gerar documentos",
      tone: "primary",
      icon: Sparkles,
      onClick: () => onOpenTab("overview"),
    };
  } else if (needAttach.length > 0) {
    action = {
      headline: `Anexar ${needAttach.length} documento${needAttach.length > 1 ? "s" : ""} do cliente`,
      detail: `Faltando: ${needAttach[0].item_name}. Envie o PDF ou peça pelo Portal do Cliente.`,
      cta: "Anexar agora",
      tone: "amber",
      icon: Upload,
      onClick: () => onOpenTab("documents"),
    };
  } else if (needSign.length > 0 && pendingSignatures.length === 0) {
    action = {
      headline: `Enviar ${needSign.length} documento${needSign.length > 1 ? "s" : ""} para assinatura`,
      detail: "Documentos prontos. Enviamos por e-mail ao cliente com link seguro.",
      cta: "Enviar para assinatura",
      tone: "primary",
      icon: Signature,
      onClick: () => onOpenTab("signatures"),
    };
  } else if (pendingSignatures.length > 0) {
    action = {
      headline: `Aguardando ${pendingSignatures.length} assinatura${pendingSignatures.length > 1 ? "s" : ""}`,
      detail: "Você já enviou. Podemos reenviar o lembrete ou acompanhar o status.",
      cta: "Ver assinaturas",
      tone: "amber",
      icon: Signature,
      onClick: () => onOpenTab("signatures"),
    };
  } else if (allDone && processStatus !== "completed") {
    action = {
      headline: "Tudo pronto — gerar o dossiê final",
      detail: "Todos os documentos estão assinados. Gere o dossiê consolidado para envio ao órgão.",
      cta: "Gerar dossiê",
      tone: "emerald",
      icon: PackageCheck,
      onClick: () => onOpenTab("dossier_v2"),
    };
  } else {
    action = {
      headline: "Processo concluído",
      detail: "Nenhuma ação pendente. Você pode arquivar ou baixar o dossiê final.",
      cta: "Ver dossiê",
      tone: "emerald",
      icon: CheckCircle2,
      onClick: () => onOpenTab("dossier_v2"),
    };
  }

  const tone = TONE[action.tone];
  const Icon = action.icon;

  return (
    <div className={`rounded-2xl border border-slate-100 ring-1 ${tone.ring} p-6 md:p-7 ${tone.bg} flex flex-col md:flex-row md:items-center gap-5 shadow-sm`}>
      <div className={`h-12 w-12 rounded-2xl bg-white shadow-sm flex items-center justify-center shrink-0 ${tone.icon}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Próxima ação recomendada</p>
        <h3 className="text-lg md:text-xl font-semibold text-navy leading-tight">{action.headline}</h3>
        <p className="text-sm text-slate-500 mt-1 leading-relaxed">{action.detail}</p>
      </div>
      <Button onClick={action.onClick} className={`${tone.btn} shrink-0 h-12 px-6 rounded-xl font-bold text-xs uppercase tracking-wider gap-2`}>
        {action.cta} <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
