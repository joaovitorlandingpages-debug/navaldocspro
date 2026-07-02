/**
 * Sprint 1 — Item 3
 * WhatsMissingCard: lista compacta e humana do que falta para concluir o processo.
 */
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Circle, AlertCircle, Signature, Upload, FileText, Loader2 } from "lucide-react";

interface Props {
  processId: string;
  onOpenTab: (tab: string) => void;
}

export function WhatsMissingCard({ processId, onOpenTab }: Props) {
  const queryClient = useQueryClient();
  const { data: checklist = [], isLoading } = useQuery({
    queryKey: ["missing-checklist", processId],
    queryFn: async () => {
      const { data } = await supabase
        .from("document_checklists")
        .select("id,item_name,status,is_mandatory,requires_signature,document_id,sort_order")
        .eq("process_id", processId)
        .order("sort_order", { ascending: true });
      return data ?? [];
    },
    enabled: !!processId,
  });

  useEffect(() => {
    if (!processId) return;
    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ["missing-checklist", processId] });
    };
    const channel = supabase
      .channel(`whats-missing-${processId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "document_checklists", filter: `process_id=eq.${processId}` }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "generated_documents", filter: `process_id=eq.${processId}` }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "signature_requests", filter: `process_id=eq.${processId}` }, invalidate)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [processId, queryClient]);

  const mandatory = checklist.filter((c: any) => c.is_mandatory);
  const total = mandatory.length;
  const done = mandatory.filter((c: any) => ["signed","completed","attached","done"].includes((c.status ?? "").toLowerCase())).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  function itemState(c: any) {
    const s = (c.status ?? "pending").toLowerCase();
    if (["signed","completed","attached","done"].includes(s)) {
      return { icon: CheckCircle2, cls: "text-emerald-500", label: "Concluído", muted: true, action: null as null | (() => void) };
    }
    if (c.requires_signature && c.document_id) {
      return { icon: Signature, cls: "text-primary", label: "Enviar para assinatura", muted: false, action: () => onOpenTab("signatures") };
    }
    if (!c.document_id) {
      return { icon: FileText, cls: "text-amber-600", label: "Gerar documento", muted: false, action: () => onOpenTab("overview") };
    }
    if (s === "waiting_upload") {
      return { icon: Upload, cls: "text-amber-600", label: "Anexar arquivo do cliente", muted: false, action: () => onOpenTab("documents") };
    }
    return { icon: AlertCircle, cls: "text-slate-400", label: "Pendente", muted: false, action: () => onOpenTab("overview") };
  }

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-white border border-slate-100 p-6 flex items-center gap-3 text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Verificando pendências…
      </div>
    );
  }

  if (total === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-6 md:p-7">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">O que falta fazer</p>
          <h3 className="text-lg font-semibold text-navy">{done} de {total} concluídos</h3>
        </div>
        <div className="text-right">
          <span className="text-2xl font-black text-navy">{pct}%</span>
        </div>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-5">
        <div className="h-full bg-emerald-500 transition-all duration-700" style={{ width: `${pct}%` }} />
      </div>
      <ul className="space-y-2">
        {mandatory.map((c: any) => {
          const st = itemState(c);
          const Icon = st.icon;
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={st.action ?? undefined}
                disabled={!st.action}
                className={`w-full text-left flex items-center gap-3 rounded-xl px-3 py-2.5 border transition-colors ${
                  st.muted
                    ? "border-transparent bg-slate-50/60 cursor-default"
                    : "border-slate-100 hover:bg-slate-50 hover:border-primary/30"
                }`}
              >
                {st.muted
                  ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  : <Circle className="h-4 w-4 text-slate-300 shrink-0" />
                }
                <span className={`flex-1 min-w-0 text-sm font-medium truncate ${st.muted ? "text-slate-400 line-through" : "text-navy"}`}>
                  {c.item_name}
                </span>
                {!st.muted && (
                  <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${st.cls}`}>
                    <Icon className="h-3.5 w-3.5" /> {st.label}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
