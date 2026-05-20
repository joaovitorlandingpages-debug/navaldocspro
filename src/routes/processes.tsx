import { createFileRoute, Link } from "@tanstack/react-router";
import { 
  ClipboardList, Search, Plus, MoreHorizontal, 
  ArrowRight, Calendar, User, Ship, AlertCircle, Loader2, CheckCircle2 
} from "lucide-react";
import { useState, useEffect } from "react";
import { useNewProcess } from "@/hooks/useNewProcess";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import { UpgradeModal } from "@/components/billing/UpgradeModal";
import { supabase } from "@/integrations/supabase/client";
import { BackButton } from "@/components/BackButton";


export const Route = createFileRoute("/processes")({
  component: Processes,
});

function Processes() {
  const [view, setView] = useState<"list" | "kanban">("kanban");
  const [processes, setProcesses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { setIsNewProcessOpen } = useNewProcess();
  const { checkLimit } = usePlanLimits();
  const [upgradeModal, setUpgradeModal] = useState<{ isOpen: boolean; current: number; limit: number | null }>({
    isOpen: false,
    current: 0,
    limit: null
  });


  useEffect(() => {
    const fetchProcesses = async () => {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (profile?.company_id) {
        const { data } = await supabase
          .from('processes')
          .select('*, customers(name), vessels(name)')
          .eq('company_id', profile.company_id);
        
        if (data) setProcesses(data);
      }
      setIsLoading(false);
    };

    console.log("PROCESSES_PAGE_OK");
    console.log("PROCESSES_STABLE");
    fetchProcesses();
  }, []);

  const columns = [
    { id: "pending", title: "Novo", color: "bg-red-500" },
    { id: "in_progress", title: "Em andamento", color: "bg-blue-500" },
    { id: "waiting_docs", title: "Aguardando documentos", color: "bg-amber-500" },
    { id: "review", title: "Em revisão", color: "bg-purple-500" },
    { id: "ready_to_generate", title: "Pronto para geração", color: "bg-indigo-500" },
    { id: "waiting_signature", title: "Aguardando assinatura", color: "bg-orange-500" },
    { id: "protocolado", title: "Protocolado", color: "bg-cyan-500" },
    { id: "completed", title: "Finalizado", color: "bg-green-500" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div className="flex flex-col gap-2">
          <BackButton className="w-fit lg:hidden" />
          <div>
            <h1 className="text-3xl font-bold text-navy tracking-tight uppercase">Fluxo de Processos</h1>
            <p className="text-muted-foreground font-medium">Acompanhamento visual de cada etapa técnica e burocrática.</p>
          </div>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <div className="bg-slate-100 p-1 rounded-2xl flex border border-slate-200">
            <button 
              onClick={() => setView("kanban")}
              className={`px-5 py-2 rounded-xl text-xs font-black uppercase transition-all ${view === 'kanban' ? 'bg-white shadow-sm text-navy' : 'text-slate-500'}`}
            >
              Kanban
            </button>
            <button 
              onClick={() => setView("list")}
              className={`px-5 py-2 rounded-xl text-xs font-black uppercase transition-all ${view === 'list' ? 'bg-white shadow-sm text-navy' : 'text-slate-500'}`}
            >
              Lista
            </button>
          </div>
          <button 
            onClick={async () => {
              const limit = await checkLimit('processes');
              if (limit.reached) {
                setUpgradeModal({ isOpen: true, current: limit.current, limit: limit.limit });
                return;
              }
              setIsNewProcessOpen(true);
            }}
            className="flex-grow sm:flex-initial bg-primary text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:opacity-90 transition-all shadow-xl shadow-primary/20"
          >

            <Plus className="h-4 w-4 inline mr-2" /> Novo Processo
          </button>
        </div>
      </div>

      {view === "kanban" ? (
        <div className="flex gap-8 overflow-x-auto pb-8 h-[calc(100vh-280px)] min-h-[650px] custom-scrollbar px-2">
          {columns.map((col) => (
            <div key={col.id} className="flex-shrink-0 w-80 flex flex-col gap-6">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                  <div className={`h-2.5 w-2.5 rounded-full ${col.color} shadow-[0_0_10px_rgba(0,0,0,0.1)]`} />
                  <h3 className="font-black text-navy text-[10px] uppercase tracking-[0.2em]">{col.title}</h3>
                  <span className="bg-white border border-slate-100 text-slate-400 text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-sm">
                    {processes.filter(p => p.status === col.id).length}
                  </span>
                </div>
                <button onClick={() => setIsNewProcessOpen(true)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-300 transition-colors"><Plus className="h-4 w-4" /></button>
              </div>
              
              <div className="flex-grow bg-slate-100/30 rounded-[2.5rem] p-5 space-y-5 border border-slate-100/50 overflow-y-auto custom-scrollbar backdrop-blur-sm">
                {isLoading ? (
                  <div className="py-10 text-center">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-300 mx-auto" />
                  </div>
                ) : processes.filter(p => p.status === col.id).map((p) => (
                  <Link 
                    key={p.id} 
                    to={`/processes/${p.id}`}
                    className="block bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl hover:border-primary/30 transition-all cursor-pointer group relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-4">
                       <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-50 rounded-lg text-slate-300 transition-all">
                          <MoreHorizontal className="h-4 w-4" />
                       </button>
                    </div>
                    
                    <div className="mb-4">
                      <span className="text-[10px] font-mono font-black text-primary bg-primary/5 px-2 py-0.5 rounded uppercase tracking-tighter">{p.id.substring(0, 8)}</span>
                    </div>

                    <h4 className="font-black text-navy text-sm mb-4 leading-tight group-hover:text-primary transition-colors">{p.process_type}</h4>
                    
                    <div className="space-y-3 pb-5 mb-5 border-b border-slate-50">
                      <div className="flex items-center gap-3 text-[11px] font-bold text-slate-500">
                        <div className="h-6 w-6 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                          <User className="h-3.5 w-3.5" />
                        </div>
                        {p.customers?.name || "Cliente"}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] font-bold text-slate-500">
                        <div className="h-6 w-6 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-cyan-100 group-hover:text-cyan-600 transition-all">
                          <Ship className="h-3.5 w-3.5" />
                        </div>
                        {p.vessels?.name || "Embarcação"}
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <Calendar className="h-3.5 w-3.5 text-red-400" /> {p.due_date ? new Date(p.due_date).toLocaleDateString('pt-BR') : "S/ data"}
                      </div>
                      <div className="flex gap-1.5">
                         <div className={`h-8 w-8 rounded-xl flex items-center justify-center text-[10px] font-black shadow-lg border-2 border-white ${
                            p.priority === 'urgent' || p.priority === 'critical' ? 'bg-red-500 text-white' : 'bg-navy text-white'
                         }`}>
                           {p.priority === 'urgent' ? '!!!' : p.priority === 'critical' ? 'RT' : 'P'}
                         </div>
                         {p.completion_percentage === 100 && (
                            <div className="h-8 w-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-lg border-2 border-white">
                               <CheckCircle2 className="h-4 w-4" />
                            </div>
                         )}
                      </div>
                    </div>
                  </Link>
                ))}
                
                <button 
                  onClick={() => setIsNewProcessOpen(true)}
                  className="w-full py-4 border-2 border-dashed border-slate-200 rounded-3xl text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 hover:border-primary/30 hover:text-primary transition-all hover:bg-white/50"
                >
                   Adicionar Card
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden p-20 flex flex-col items-center justify-center text-center">
           <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-6">
              <ClipboardList className="h-10 w-10" />
           </div>
           <h3 className="text-xl font-black text-navy mb-2 uppercase tracking-tight">Visualização em Lista</h3>
           <p className="text-sm text-slate-400 max-w-xs mx-auto mb-8 font-medium">Prefere o modo clássico? Esta visualização está sendo otimizada para tabelas de alta densidade.</p>
           <button onClick={() => setView("kanban")} className="text-xs font-black uppercase tracking-widest text-primary hover:underline">Voltar para Kanban</button>
        </div>
      )}

      <UpgradeModal 
        isOpen={upgradeModal.isOpen} 
        onClose={() => setUpgradeModal({ ...upgradeModal, isOpen: false })} 
        resource="processes"
        limit={upgradeModal.limit}
        current={upgradeModal.current}
      />
    </div>

  );
}
