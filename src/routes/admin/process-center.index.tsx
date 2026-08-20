import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Plus, Ship, User, Calendar, ArrowRight,
  MoreVertical, Loader2, Activity, Search, Filter
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/navigation/PageHeader";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/admin/process-center/")({
  component: ProcessCenterListPage,
});

function ProcessCenterListPage() {
  const { data: processes, isLoading } = useQuery({
    queryKey: ["admin-process-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from('processes')
        .select(`
          *,
          customer:customers!processes_customer_id_fkey(name),
          vessel:vessels!processes_vessel_id_fkey(name)
        `)
        .order('created_at', { ascending: false })
        .limit(20);
      return data ?? [];
    }
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <PageHeader 
        title="Enterprise Process Center v1.1" 
        description="Painel Central de Processos Navais."
        actions={
          <div className="flex gap-3">
             <Button className="gap-2 bg-slate-900 font-black uppercase text-[10px] tracking-widest rounded-xl px-6 shadow-xl shadow-slate-200 transition-all hover:scale-105 active:scale-95">
                <Plus className="h-4 w-4" /> Novo Processo
             </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <Card className="p-6 border-slate-200 bg-white shadow-sm border-b-4 border-b-primary">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Processos Ativos</p>
            <h3 className="text-4xl font-black text-slate-900 tracking-tighter">{processes?.length || 0}</h3>
         </Card>
         <Card className="p-6 border-slate-200 bg-white shadow-sm border-b-4 border-b-emerald-500">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Health Score Médio</p>
            <h3 className="text-4xl font-black text-emerald-600 tracking-tighter">--</h3>
         </Card>
         <Card className="p-6 border-slate-200 bg-white shadow-sm border-b-4 border-b-blue-500">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Automação</p>
            <h3 className="text-4xl font-black text-blue-600 tracking-tighter">--</h3>
         </Card>
      </div>

      <Card className="p-4 border-slate-200 bg-slate-50 shadow-inner">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
            <Input className="pl-11 h-12 bg-white border-slate-200 rounded-xl font-bold uppercase text-[10px] tracking-widest" placeholder="Pesquisar processos por número, cliente ou embarcação..." />
          </div>
          <Button variant="outline" className="gap-2 h-12 px-6 rounded-xl font-bold uppercase text-[10px] tracking-widest bg-white border-slate-200">
            <Filter className="h-4 w-4" /> Filtros
          </Button>
        </div>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 pb-20">
          {processes?.map((process: any) => (
            <Card key={process.id} className="p-6 hover:border-primary/20 hover:shadow-2xl transition-all group bg-white border-slate-100 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                <Ship className="h-20 w-20" />
              </div>
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-8">
                  <div className="h-16 w-16 bg-slate-50 rounded-2xl flex items-center justify-center border group-hover:bg-primary/5 group-hover:border-primary/10 transition-all shadow-sm">
                    <Ship className="h-8 w-8 text-slate-300 group-hover:text-primary group-hover:scale-110 transition-all" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-black text-slate-900 group-hover:text-primary transition-colors tracking-tight uppercase italic">
                        {process.vessel?.name || "Sem embarcação"}
                      </h3>
                      <Badge variant="outline" className="text-[10px] uppercase font-black tracking-widest bg-slate-50 px-3 border-slate-200">
                        {process.process_number || `#${process.id.slice(0,8)}`}
                      </Badge>
                      <Badge className="text-[10px] uppercase font-black bg-emerald-50 text-emerald-600 border-none px-3">
                        {process.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <span className="flex items-center gap-2 hover:text-slate-600 transition-colors">
                        <User className="h-4 w-4 text-primary" /> {process.customer?.name}
                      </span>
                      <div className="h-3 w-px bg-slate-200" />
                      <span className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" /> {format(new Date(process.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="hidden lg:flex flex-col items-end px-6 border-r border-slate-100">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                       <Activity className="h-3 w-3" />
                       Health Score
                    </span>
                    <div className="flex items-center gap-3">
                      <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full w-[0%] transition-all duration-1000" />
                      </div>
                      <span className="text-sm font-black text-slate-900">--</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="text-slate-300 hover:text-slate-900 hover:bg-slate-50">
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                    <Button asChild className="gap-3 bg-slate-900 hover:bg-primary px-6 h-12 rounded-xl font-black uppercase text-[10px] tracking-[0.15em] shadow-lg shadow-slate-200 transition-all hover:scale-105 active:scale-95">
                      <Link to="/admin/process-center/$id" params={{ id: process.id }} search={{ tab: 'workspace' }}>
                        Abrir Centro Operacional <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
