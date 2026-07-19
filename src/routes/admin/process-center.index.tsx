import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Rocket, Search, Filter, Plus, 
  Ship, User, Calendar, ArrowRight,
  MoreVertical, Loader2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/navigation/PageHeader";

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
    <div className="space-y-6">
      <PageHeader 
        title="Enterprise Process Center" 
        description="O novo centro operacional do NavalDocs Pro v1.0"
        actions={
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> Novo Processo
          </Button>
        }
      />

      <Card className="p-4 border-slate-200">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input className="pl-10" placeholder="Pesquisar processos por número, cliente ou embarcação..." />
          </div>
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" /> Filtros
          </Button>
        </div>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {processes?.map((process) => (
            <Card key={process.id} className="p-5 hover:border-slate-300 transition-all group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="h-12 w-12 bg-slate-50 rounded-xl flex items-center justify-center border group-hover:bg-blue-50 group-hover:border-blue-100 transition-colors">
                    <Ship className="h-6 w-6 text-slate-400 group-hover:text-blue-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {process.vessel?.name || "Sem embarcação"}
                      </h3>
                      <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-widest bg-slate-50">
                        {process.process_number || `#${process.id.slice(0,8)}`}
                      </Badge>
                      <Badge className="text-[10px] uppercase font-black bg-emerald-50 text-emerald-600 border-none">
                        {process.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500 font-medium">
                      <span className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5" /> {process.customer?.name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" /> Criado em {new Date(process.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="hidden md:flex flex-col items-end mr-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Health Score</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full w-[85%]" />
                      </div>
                      <span className="text-xs font-bold text-slate-700">85</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="text-slate-400">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                  <Button asChild className="gap-2 bg-slate-900">
                    <Link to="/admin/process-center/$id" params={{ id: process.id }}>
                      Abrir Centro Operacional <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
