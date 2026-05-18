import { User, FileText, CheckCircle2, Zap, Clock, Loader2, Ship, Users, ClipboardList } from "lucide-react";
import { useRecentActivity } from "@/hooks/useRecentActivity";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export function ActivityFeed() {
  const { data: activities, isLoading } = useRecentActivity();

  const getIcon = (resource: string) => {
    switch (resource) {
      case 'vessels': return <Ship className="h-4 w-4" />;
      case 'customers': return <Users className="h-4 w-4" />;
      case 'processes': return <ClipboardList className="h-4 w-4" />;
      case 'generated_documents': return <FileText className="h-4 w-4" />;
      default: return <Zap className="h-4 w-4" />;
    }
  };

  const getColor = (action: string) => {
    switch (action) {
      case 'created': return 'blue';
      case 'updated': return 'amber';
      case 'deleted': return 'red';
      default: return 'emerald';
    }
  };

  const getActionLabel = (action: string, resource: string) => {
    const labels: any = {
      created: {
        customers: "cadastrou o cliente",
        vessels: "adicionou a embarcação",
        processes: "iniciou o processo",
        generated_documents: "gerou o documento"
      },
      updated: {
        customers: "atualizou o cliente",
        vessels: "editou a embarcação",
        processes: "atualizou o processo",
        generated_documents: "editou o documento"
      }
    };
    return labels[action]?.[resource] || `${action} ${resource}`;
  };

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-6 border-b flex justify-between items-center bg-slate-50/50">
        <h3 className="font-bold text-navy flex items-center gap-2 uppercase text-xs tracking-widest">
          <Clock className="h-5 w-5 text-primary" /> Centro de Atividades
        </h3>
        {isLoading ? (
          <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
        ) : (
          <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
        )}
      </div>
      
      <div className="divide-y divide-slate-50 min-h-[300px]">
        {isLoading ? (
          <div className="flex items-center justify-center p-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary/20" />
          </div>
        ) : activities && activities.length > 0 ? (
          activities.map((act, i) => (
            <div key={i} className="p-6 hover:bg-slate-50 transition-colors group cursor-pointer">
              <div className="flex gap-4">
                 <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform ${
                   getColor(act.action) === 'blue' ? 'bg-blue-50 text-blue-600' : 
                   getColor(act.action) === 'amber' ? 'bg-amber-50 text-amber-600' : 
                   getColor(act.action) === 'red' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                 }`}>
                    {getIcon(act.resource_type)}
                 </div>
                 <div>
                    <p className="text-sm text-slate-600 leading-snug">
                      <span className="font-bold text-navy">{act.profiles?.name || "Usuário"}</span> {getActionLabel(act.action, act.resource_type)} <span className="font-bold text-primary">{act.metadata?.target_name || act.resource_type}</span>
                    </p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                      {formatDistanceToNow(new Date(act.created_at), { addSuffix: true, locale: ptBR })}
                    </p>
                 </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center p-20 text-center">
            <Clock className="h-8 w-8 text-slate-100 mb-2" />
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Nenhuma atividade recente</p>
          </div>
        )}
      </div>
      
      <button className="w-full py-4 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-navy hover:bg-slate-50 transition-all">Ver Histórico Completo</button>
    </div>
  );
}

