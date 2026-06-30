import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/navigation/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Archive, Loader2, User, Ship, ArrowRight } from "lucide-react";
import { ProcessActionsMenu } from "@/components/processes/ProcessActionsMenu";

export const Route = createFileRoute("/processes/archived")({
  component: ArchivedProcesses,
});

function ArchivedProcesses() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user.id).single();
    if (!profile?.company_id) { setLoading(false); return; }

    const { data } = await supabase
      .from("processes")
      .select("*, customers(name), vessels(name)")
      .eq("company_id", profile.company_id)
      .not("archived_at", "is", null)
      .is("trashed_at", null)
      .is("deleted_at", null)
      .order("archived_at", { ascending: false });

    setItems(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  return (
    <div className="animate-in fade-in duration-500 pb-20">
      <PageHeader
        title="Processos Arquivados"
        description="Itens fora do fluxo ativo. Não contam para o limite do plano."
      />
      {loading ? (
        <div className="py-20 grid place-items-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
      ) : items.length === 0 ? (
        <EmptyState icon={Archive} title="Nenhum processo arquivado" description="Ao arquivar um processo, ele aparecerá aqui." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {items.map((p) => (
            <div key={p.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-[9px] font-mono font-black text-primary bg-primary/10 px-2 py-0.5 rounded uppercase">PROC-{p.id.substring(0, 6)}</span>
                  <h3 className="font-black text-navy text-sm leading-tight mt-1 line-clamp-2">{p.title || p.process_type}</h3>
                </div>
                <ProcessActionsMenu process={p} state="archived" onChanged={fetchItems} />
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-bold text-slate-500 border-y border-slate-50 py-3">
                <span className="inline-flex items-center gap-1.5 truncate"><User className="h-3 w-3 text-slate-400" />{p.customers?.name || "—"}</span>
                <span className="inline-flex items-center gap-1.5 truncate"><Ship className="h-3 w-3 text-slate-400" />{p.vessels?.name || "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Arquivado em {p.archived_at ? new Date(p.archived_at).toLocaleDateString("pt-BR") : "—"}
                </span>
                <Link
                  to="/processes/$id" params={{ id: p.id }}
                  className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-primary hover:underline"
                >
                  Abrir <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
