import { Link } from "@tanstack/react-router";
import { ChevronLeft, User, Ship, Calendar, Star, Pencil, CheckCircle2, Ban } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProcessActionsMenu } from "./ProcessActionsMenu";
import { toast } from "sonner";
import { toggleFavoriteProcess, copyShareLink } from "@/services/processLifecycle";
import { translateTerm } from "@/lib/naval-terms";

interface Props {
  process: any;
  onChanged?: () => void;
  automationReady?: boolean;
  onFinalize?: () => void;
  onEdit?: () => void;
  pendingDossierItems?: string[];
}

function statusLabel(status?: string | null) {
  const map: Record<string, string> = {
    pending: "Novo",
    in_progress: "Em andamento",
    waiting_docs: "Aguardando documentos",
    review: "Em revisão",
    ready_to_generate: "Pronto para geração",
    waiting_signature: "Aguardando assinatura",
    protocolado: "Protocolado",
    completed: "Finalizado",
    cancelled: "Cancelado",
  };
  return map[status ?? ""] ?? translateTerm(status);
}

function dueInfo(due?: string | null) {
  if (!due) return { label: "Sem prazo", tone: "text-slate-400" };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(due);
  const diff = Math.ceil((d.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return { label: `${Math.abs(diff)}d atrasado`, tone: "text-red-600" };
  if (diff === 0) return { label: "Vence hoje", tone: "text-amber-600" };
  if (diff <= 3) return { label: `Em ${diff}d`, tone: "text-amber-600" };
  return { label: d.toLocaleDateString("pt-BR"), tone: "text-slate-500" };
}

export function ProcessTopBar({ process, onChanged, automationReady, onFinalize, onEdit, pendingDossierItems }: Props) {
  if (!process) return null;
  const due = dueInfo(process.due_date);
  const progress = Math.max(0, Math.min(100, process.completion_percentage ?? 0));
  const customerName = process.customer?.name ?? process.customers?.name ?? "—";
  const vesselName = process.vessel?.name ?? process.vessels?.name ?? "Sem embarcação";
  const title = process.title || process.process_type || "Processo";

  return (
    <div className="sticky top-0 z-20 -mx-4 md:-mx-8 mb-6 bg-white/95 backdrop-blur border-b border-slate-100">
      <div className="px-4 md:px-8 py-3 flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          <Link to="/processes" className="shrink-0 p-2 rounded-lg hover:bg-slate-100 text-slate-500" title="Voltar">
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[9px] font-mono font-black text-primary bg-primary/10 px-2 py-0.5 rounded uppercase tracking-tighter">
                PROC-{String(process.id).substring(0, 6)}
              </span>
              {process.protocol_number && (
                <span className="text-[9px] font-bold text-slate-500 uppercase">
                  Protocolo {process.protocol_number}
                </span>
              )}
              <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest border-slate-200">
                {statusLabel(process.status)}
              </Badge>
              {process.is_favorite && <Star className="h-3 w-3 text-amber-500 fill-amber-500" />}
            </div>
            <h1 className="font-semibold text-navy text-sm md:text-base leading-tight truncate" title={title}>
              {title}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-bold text-slate-500 mt-1">
              <span className="inline-flex items-center gap-1.5 min-w-0">
                <User className="h-3 w-3 text-slate-400" />
                <span className="truncate max-w-[180px]">{customerName}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 min-w-0">
                <Ship className="h-3 w-3 text-slate-400" />
                <span className="truncate max-w-[180px]">{vesselName}</span>
              </span>
              <span className={`inline-flex items-center gap-1.5 ${due.tone}`}>
                <Calendar className="h-3 w-3" /> {due.label}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-1.5 w-24 bg-slate-100 rounded-full overflow-hidden">
                  <span className="block h-full bg-primary" style={{ width: `${progress}%` }} />
                </span>
                <span className="text-navy font-black">{progress}%</span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="h-9 rounded-xl gap-1.5"
            onClick={async () => {
              try { await toggleFavoriteProcess(process.id); onChanged?.(); }
              catch (e: any) { toast.error(e.message); }
            }}
          >
            <Star className={`h-4 w-4 ${process.is_favorite ? "fill-amber-500 text-amber-500" : ""}`} />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9 rounded-xl gap-1.5"
            onClick={async () => {
              try { await copyShareLink(process.id); toast.success("Link copiado."); }
              catch (e: any) { toast.error(e.message); }
            }}
          >
            Compartilhar
          </Button>
          {onEdit && (
            <Button variant="outline" size="sm" className="h-9 rounded-xl gap-1.5" onClick={onEdit}>
              <Pencil className="h-4 w-4" /> Editar
            </Button>
          )}
          {onFinalize && automationReady && (pendingDossierItems?.length ?? 0) === 0 && (
            <Button
              size="sm"
              className="h-9 rounded-xl gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
              onClick={onFinalize}
            >
              <CheckCircle2 className="h-4 w-4" />
              Concluir processo
            </Button>
          )}
          {onFinalize && (!automationReady || (pendingDossierItems?.length ?? 0) > 0) && (
            <div
              className="hidden md:flex items-center gap-1.5 h-9 px-3 rounded-xl bg-slate-100 text-slate-500 text-[11px] font-semibold max-w-[320px] truncate"
              title={`Para gerar o dossiê falta: ${(pendingDossierItems ?? []).join(", ") || "concluir todos os documentos obrigatórios"}`}
            >
              <Ban className="h-4 w-4 shrink-0" />
              <span className="truncate">
                Falta: {(pendingDossierItems ?? []).slice(0, 2).join(", ") || "documentos pendentes"}
                {(pendingDossierItems?.length ?? 0) > 2 ? ` +${(pendingDossierItems!.length - 2)}` : ""}
              </span>
            </div>
          )}
          <ProcessActionsMenu
            process={process}
            onChanged={onChanged}
            trigger={
              <Button variant="default" size="sm" className="h-9 rounded-xl bg-navy text-white hover:bg-navy/90">
                Mais ▾
              </Button>
            }
          />
        </div>
      </div>
    </div>
  );
}
