/**
 * Card inteligente por documento — Workspace 3.0.
 * Renderiza finalidade, dados usados, checklist pré-geração, ações
 * completas, resumo técnico (BSADE) e conhecimento contextual.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  FileText, Eye, Pencil, Signature, Download, Copy, History, Info, Scale,
  Ship, ChevronDown, Zap, AlertTriangle, CheckCircle2, Sparkles, HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getDocumentKnowledge,
  isResidenceDeclaration,
  isVesselSummaryDoc,
} from "@/services/processes/documentKnowledge";

type ChecklistRow = {
  id: string;
  item_name: string;
  status: string | null;
  is_mandatory: boolean | null;
  is_conditional: boolean | null;
  conditional_rule: any;
  requires_signature: boolean | null;
  requires_ocr: boolean | null;
  document_id: string | null;
  template_id: string | null;
  document_role: string | null;
};

interface Props {
  row: ChecklistRow;
  process: any;
  isSelected: boolean;
  onToggleSelect: () => void;
  onFocus: (id: string, action: "gerar" | "editar" | "anexar" | "assinar" | "historico") => void;
  onEditVessel?: () => void;
  onWaive?: (id: string) => void;
  onMarkAttached?: (id: string) => void;
}

function statusDisplay(status: string | null | undefined, hasDoc: boolean) {
  const s = (status || "pending").toLowerCase();
  if (s === "signed" || s === "assinado") return { label: "Assinada", tone: "sky", dot: "bg-sky-500" };
  if (hasDoc || ["completed", "done", "ok", "generated"].includes(s)) return { label: "Gerada", tone: "emerald", dot: "bg-emerald-500" };
  if (s === "attached") return { label: "Anexada", tone: "emerald", dot: "bg-emerald-500" };
  if (s === "in_progress" || s === "processing" || s === "editing") return { label: "Em edição", tone: "amber", dot: "bg-amber-500" };
  if (s === "waived") return { label: "Não aplicável", tone: "slate", dot: "bg-slate-400" };
  if (s === "blocked" || s === "error") return { label: "Bloqueado", tone: "red", dot: "bg-red-500" };
  return { label: "Não iniciada", tone: "slate", dot: "bg-slate-300" };
}

export function SmartDocumentCard({
  row, process, isSelected, onToggleSelect, onFocus, onEditVessel, onWaive, onMarkAttached,
}: Props) {
  const [openHow, setOpenHow] = useState(false);
  const [openLegal, setOpenLegal] = useState(false);
  const knowledge = getDocumentKnowledge(row.item_name);
  const hasDoc = !!row.document_id;
  const status = statusDisplay(row.status, hasDoc);
  const isVessel = isVesselSummaryDoc(row.item_name);
  const isResidence = isResidenceDeclaration(row.item_name);
  const vessel = process?.vessel;

  const kind = row.is_conditional ? "conditional" : row.is_mandatory ? "mandatory" : "optional";
  const kindLabel = kind === "mandatory" ? "Obrigatório" : kind === "conditional" ? "Condicional" : "Opcional";
  const kindCls =
    kind === "mandatory" ? "bg-red-50 text-red-600 border-red-100"
    : kind === "conditional" ? "bg-violet-50 text-violet-600 border-violet-100"
    : "bg-slate-50 text-slate-500 border-slate-100";

  return (
    <div
      className={cn(
        "rounded-2xl border bg-white transition-all overflow-hidden",
        isSelected ? "border-primary shadow-lg shadow-primary/10 ring-2 ring-primary/20" : "border-slate-100 hover:border-primary/30 hover:shadow-md",
      )}
    >
      {/* Header */}
      <div className="p-4 md:p-5 border-b border-slate-50">
        <div className="flex items-start gap-3">
          <Checkbox checked={isSelected} onCheckedChange={onToggleSelect} className="mt-1 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                  <h4 className="text-sm md:text-base font-black text-navy uppercase tracking-tight truncate">
                    {row.item_name}
                  </h4>
                </div>
                {row.document_role && (
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    {row.document_role}
                  </p>
                )}
              </div>
              <Badge className={cn("text-[9px] font-black uppercase tracking-widest border shrink-0", kindCls)}>
                {kindLabel}
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-50 border border-slate-100">
                <span className={cn("h-1.5 w-1.5 rounded-full", status.dot)} />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">{status.label}</span>
              </span>
              {row.requires_signature && (
                <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest gap-1 border-amber-200 text-amber-600">
                  <Signature className="h-2.5 w-2.5" /> assina
                </Badge>
              )}
              {row.requires_ocr && (
                <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest gap-1 border-sky-200 text-sky-600">
                  <Zap className="h-2.5 w-2.5" /> OCR
                </Badge>
              )}
              {knowledge?.averageTime && (
                <span className="text-[10px] text-slate-400 font-medium">⏱ {knowledge.averageTime}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Aviso condicional */}
      {isResidence && (
        <div className="mx-4 md:mx-5 mt-4 p-3 rounded-xl bg-amber-50 border border-amber-100">
          <p className="text-xs text-amber-800 font-medium flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>Este documento só é necessário quando o proprietário não possui comprovante de residência formal.</span>
          </p>
        </div>
      )}

      {/* Resumo técnico BSADE */}
      {isVessel && vessel && (
        <div className="mx-4 md:mx-5 mt-4 p-4 rounded-xl bg-gradient-to-br from-navy/5 to-sky-50 border border-navy/10">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-navy flex items-center gap-1.5">
              <Ship className="h-3.5 w-3.5" /> Resumo da embarcação
            </p>
            {onEditVessel && (
              <Button size="sm" variant="outline" className="h-7 rounded-lg text-[10px] font-bold" onClick={onEditVessel}>
                <Pencil className="h-3 w-3 mr-1" /> Editar dados
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-[11px]">
            <VesselField label="Nome" value={vessel.name} />
            <VesselField label="Tipo" value={vessel.vessel_type} />
            <VesselField label="Categoria" value={vessel.category} />
            <VesselField label="Comprimento" value={vessel.length ? `${vessel.length} m` : null} />
            <VesselField label="Boca" value={vessel.beam ? `${vessel.beam} m` : null} />
            <VesselField label="Pontal" value={vessel.depth ? `${vessel.depth} m` : null} />
            <VesselField label="Material" value={vessel.hull_material} />
            <VesselField label="Motor" value={vessel.engine_type || vessel.engine_brand} />
            <VesselField label="Potência" value={vessel.engine_power ? `${vessel.engine_power} HP` : null} />
            <VesselField label="Ano" value={vessel.construction_year} />
            <VesselField label="TIE" value={vessel.tie_number} />
            <VesselField label="Proprietário" value={process?.customer?.name} />
          </div>
        </div>
      )}

      {/* Conhecimento contextual */}
      {knowledge && (
        <div className="px-4 md:px-5 pt-4 space-y-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Finalidade</p>
            <p className="text-xs text-slate-700 font-medium leading-relaxed">{knowledge.purpose}</p>
          </div>

          {knowledge.dataUsed.length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">
                Campos utilizados automaticamente
              </p>
              <div className="flex flex-wrap gap-1.5">
                {knowledge.dataUsed.map((d) => (
                  <span key={d} className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                    <CheckCircle2 className="h-2.5 w-2.5" /> {d}
                  </span>
                ))}
              </div>
            </div>
          )}

          {knowledge.preflightChecklist.length > 0 && !hasDoc && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-2">
                Antes de gerar, confira
              </p>
              <ul className="space-y-1">
                {knowledge.preflightChecklist.map((p) => (
                  <li key={p} className="flex items-start gap-2 text-[11px] text-slate-700 font-medium">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-300 shrink-0" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Ações */}
      <div className="p-4 md:p-5 mt-3">
        <div className="flex flex-wrap gap-1.5">
          <Button size="sm" className="h-8 rounded-lg text-[10px] font-black uppercase tracking-widest gap-1" onClick={() => onFocus(row.id, "gerar")}>
            <Sparkles className="h-3 w-3" /> Gerar
          </Button>
          <Button size="sm" variant="outline" className="h-8 rounded-lg text-[10px] font-black uppercase tracking-widest gap-1" onClick={() => onFocus(row.id, "editar")}>
            <Eye className="h-3 w-3" /> Visualizar
          </Button>
          <Button size="sm" variant="outline" className="h-8 rounded-lg text-[10px] font-black uppercase tracking-widest gap-1" onClick={() => onFocus(row.id, "editar")}>
            <Pencil className="h-3 w-3" /> Editar
          </Button>
          {row.requires_signature && (
            <Button size="sm" variant="outline" className="h-8 rounded-lg text-[10px] font-black uppercase tracking-widest gap-1 border-amber-200 text-amber-700 hover:bg-amber-50" onClick={() => onFocus(row.id, "assinar")}>
              <Signature className="h-3 w-3" /> Assinar
            </Button>
          )}
          <Button size="sm" variant="outline" className="h-8 rounded-lg text-[10px] font-black uppercase tracking-widest gap-1" onClick={() => onFocus(row.id, "anexar")}>
            <Download className="h-3 w-3 rotate-180" /> Anexar
          </Button>
          <Button size="sm" variant="outline" className="h-8 rounded-lg text-[10px] font-black uppercase tracking-widest gap-1" onClick={() => onFocus(row.id, "editar")}>
            <Download className="h-3 w-3" /> Baixar
          </Button>
          <Button size="sm" variant="ghost" className="h-8 rounded-lg text-[10px] font-black uppercase tracking-widest gap-1" onClick={() => onFocus(row.id, "gerar")} title="Duplicar geração">
            <Copy className="h-3 w-3" /> Duplicar
          </Button>
          <Button size="sm" variant="ghost" className="h-8 rounded-lg text-[10px] font-black uppercase tracking-widest gap-1" onClick={() => onFocus(row.id, "historico")}>
            <History className="h-3 w-3" /> Histórico
          </Button>
        </div>

        {/* Ações extras para condicional (Declaração de Residência) */}
        {isResidence && (
          <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-slate-100">
            {onWaive && (
              <Button size="sm" variant="ghost" className="h-7 rounded-lg text-[10px] font-bold text-slate-500 hover:text-slate-700" onClick={() => onWaive(row.id)}>
                Ignorar (não aplicável)
              </Button>
            )}
            {onMarkAttached && (
              <Button size="sm" variant="ghost" className="h-7 rounded-lg text-[10px] font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" onClick={() => onMarkAttached(row.id)}>
                <CheckCircle2 className="h-3 w-3 mr-1" /> Marcar comprovante anexado
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Conhecimento colapsável */}
      {knowledge && (
        <div className="border-t border-slate-50 bg-slate-50/40 px-4 md:px-5 py-3 space-y-1">
          <Collapsible open={openHow} onOpenChange={setOpenHow}>
            <CollapsibleTrigger asChild>
              <button className="flex items-center justify-between w-full text-[10px] font-black uppercase tracking-widest text-navy hover:text-primary py-1.5">
                <span className="flex items-center gap-1.5"><HelpCircle className="h-3 w-3" /> Como funciona?</span>
                <ChevronDown className={cn("h-3 w-3 transition-transform", openHow && "rotate-180")} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 pb-3 space-y-2 text-[11px] text-slate-700">
              <p><b className="text-navy">O que é:</b> {knowledge.howItWorks}</p>
              {knowledge.whoSigns && <p><b className="text-navy">Quem assina:</b> {knowledge.whoSigns}</p>}
              {knowledge.whenMandatory && <p><b className="text-navy">Quando é obrigatório:</b> {knowledge.whenMandatory}</p>}
              {knowledge.whenWaived && <p><b className="text-navy">Quando deixa de ser obrigatório:</b> {knowledge.whenWaived}</p>}
              {knowledge.commonErrors.length > 0 && (
                <div>
                  <b className="text-navy">Erros comuns:</b>
                  <ul className="list-disc ml-4 mt-0.5 space-y-0.5">
                    {knowledge.commonErrors.map((e) => <li key={e}>{e}</li>)}
                  </ul>
                </div>
              )}
              {knowledge.relatedDocs.length > 0 && (
                <p><b className="text-navy">Documentos relacionados:</b> {knowledge.relatedDocs.join(", ")}</p>
              )}
            </CollapsibleContent>
          </Collapsible>

          <Collapsible open={openLegal} onOpenChange={setOpenLegal}>
            <CollapsibleTrigger asChild>
              <button className="flex items-center justify-between w-full text-[10px] font-black uppercase tracking-widest text-navy hover:text-primary py-1.5">
                <span className="flex items-center gap-1.5"><Scale className="h-3 w-3" /> Base legal</span>
                <ChevronDown className={cn("h-3 w-3 transition-transform", openLegal && "rotate-180")} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2 pb-3 grid grid-cols-2 gap-2 text-[11px] text-slate-700">
              <LegalField label="Norma" value={knowledge.legalBase.norm} />
              <LegalField label="Anexo" value={knowledge.legalBase.annex} />
              <LegalField label="Modelo" value={knowledge.legalBase.template} />
              <LegalField label="Versão" value={knowledge.legalBase.version} />
              <LegalField label="Atualização" value={knowledge.legalBase.updatedAt} />
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}
    </div>
  );
}

function VesselField({ label, value }: { label: string; value: any }) {
  return (
    <div>
      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className="text-[11px] font-bold text-navy truncate">{value || "—"}</p>
    </div>
  );
}

function LegalField({ label, value }: { label: string; value: string | undefined }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className="text-[11px] font-bold text-navy">{value}</p>
    </div>
  );
}

export default SmartDocumentCard;
