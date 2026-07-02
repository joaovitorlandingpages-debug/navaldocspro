import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/navigation/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { Trash2, Loader2, User, Ship } from "lucide-react";
import { ProcessActionsMenu } from "@/components/processes/ProcessActionsMenu";

export const Route = createFileRoute("/processes/trash")({
  component: TrashProcesses,
});

function TrashProcesses() {
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
      .not("trashed_at", "is", null)
      .is("deleted_at", null)
      .order("trashed_at", { ascending: false });

    setItems(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  return (
    <div className="animate-in fade-in duration-500 pb-20">
      <PageHeader
        title="Lixeira"
        description="Processos removidos. Restaure ou exclua definitivamente."
      />
      {loading ? (
        <div className="py-20 grid place-items-center"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
      ) : items.length === 0 ? (
        <EmptyState icon={Trash2} title="Lixeira vazia" description="Nenhum processo na lixeira." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {items.map((p) => (
            <div key={p.id} className="bg-white rounded-3xl border border-red-100 shadow-sm p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="text-[9px] font-mono font-black text-red-600 bg-red-50 px-2 py-0.5 rounded uppercase">PROC-{p.id.substring(0, 6)}</span>
                  <h3 className="font-semibold text-navy text-sm leading-tight mt-1 line-clamp-2">{p.title || p.process_type}</h3>
                </div>
                <ProcessActionsMenu process={p} state="trashed" onChanged={fetchItems} />
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] font-bold text-slate-500 border-y border-slate-50 py-3">
                <span className="inline-flex items-center gap-1.5 truncate"><User className="h-3 w-3 text-slate-400" />{p.customers?.name || "—"}</span>
                <span className="inline-flex items-center gap-1.5 truncate"><Ship className="h-3 w-3 text-slate-400" />{p.vessels?.name || "—"}</span>
              </div>
              <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">
                Removido em {p.trashed_at ? new Date(p.trashed_at).toLocaleDateString("pt-BR") : "—"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
