import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { History, User, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

export function EnterpriseAuditFeed() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["enterprise-audit-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("enterprise_audit_logs")
        .select(`
          *,
          profiles:user_id(name)
        `)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) return <Skeleton className="h-64 w-full rounded-3xl" />;

  return (
    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden animate-in fade-in duration-700">
      <div className="p-6 border-b flex justify-between items-center bg-slate-50/30">
        <h3 className="font-bold text-navy flex items-center gap-2 uppercase text-xs tracking-widest">
          <History className="h-5 w-5 text-primary" /> Auditoria Live
        </h3>
        <button className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline flex items-center gap-1">
          Ver Log Completo <ChevronRight className="h-3 w-3" />
        </button>
      </div>
      <div className="p-6 space-y-4">
        {logs?.map((log: any) => (
          <div key={log.id} className="flex gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-white hover:shadow-md transition-all group">
            <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center border border-slate-100 group-hover:bg-primary group-hover:text-white transition-colors">
              <User className="h-5 w-5" />
            </div>
            <div className="flex-grow">
              <div className="flex justify-between items-start">
                <p className="text-sm font-bold text-navy capitalize">{(log.action || "").toLowerCase()} em {log.entity_type}</p>
                <span className="text-[9px] font-black text-slate-400 uppercase">{format(new Date(log.created_at), "HH:mm", { locale: ptBR })}</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Usuário: <span className="font-bold">{log.profiles?.name || "Sistema"}</span></p>
            </div>
          </div>
        ))}
        {(!logs || logs.length === 0) && (
          <p className="text-center text-xs text-slate-400 py-8 italic">Nenhuma atividade registrada.</p>
        )}
      </div>
    </div>
  );
}
