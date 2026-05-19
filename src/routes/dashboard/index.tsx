import { createFileRoute, Link } from "@tanstack/react-router";
import { 
  ClipboardList, Search, Plus, 
  ArrowRight, Calendar, User, Ship, AlertCircle, Loader2,
  Filter, LayoutGrid, List, CheckCircle2, Clock, 
  ChevronRight, MoreVertical, LayoutDashboard,
  Timer, AlertTriangle, FileText, Zap, Star, Edit3, Trash2
} from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription 
} from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/dashboard/")({
  component: OperationsCenter,
});

function OperationsCenter() {
  const { profile } = useAuth();
  const [processes, setProcesses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const fetchProcesses = async () => {
    if (!profile?.company_id) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('processes')
        .select(`
          *,
          customers(name),
          vessels(name)
        `)
        .eq('company_id', profile.company_id)
        .order('is_favorite', { ascending: false })
        .order('priority', { ascending: false })
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      if (data) setProcesses(data);
    } catch (err: any) {
      console.error("Error fetching processes:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProcesses();
  }, [profile?.company_id]);

  const stats = {
    total: processes.length,
    urgent: processes.filter(p => p.priority === 'urgent' || p.priority === 'critical').length,
    pending_docs: processes.filter(p => p.completion_percentage < 100).length,
    ready_to_protocol: processes.filter(p => p.completion_percentage === 100 && p.status !== 'completed').length,
    finalized: processes.filter(p => p.status === 'completed' || p.status === 'finalized').length,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'in_progress': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'waiting_protocol': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case 'ready_for_protocol': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'completed': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const filteredProcesses = processes.filter(p => {
    if (filter === 'all') return true;
    if (filter === 'urgent') return p.priority === 'urgent' || p.priority === 'critical';
    if (filter === 'ready') return p.completion_percentage === 100;
    if (filter === 'pending_docs') return p.completion_percentage < 100;
    if (filter === 'finalized') return p.status === 'completed' || p.status === 'finalized';
    return p.status === filter;
  });

  const toggleFavorite = async (id: string, isFavorite: boolean) => {
    try {
      const { error } = await supabase
        .from('processes')
        .update({ is_favorite: !isFavorite })
        .eq('id', id);
      if (error) throw error;
      setProcesses(prev => prev.map(p => p.id === id ? { ...p, is_favorite: !isFavorite } : p));
      toast.success(isFavorite ? "Removido dos favoritos" : "Adicionado aos favoritos");
    } catch (err: any) {
      toast.error("Erro ao atualizar favorito");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-navy tracking-tight uppercase flex items-center gap-3">
            <LayoutDashboard className="h-8 w-8 text-primary" />
            Central Operacional
          </h1>
          <p className="text-muted-foreground font-medium">Gestão inteligente e acompanhamento em tempo real dos processos navais.</p>
        </div>
        <div className="flex gap-2">
           <Badge variant="outline" className="px-4 py-2 rounded-xl bg-white shadow-sm border-slate-200 text-navy font-bold uppercase tracking-wider flex gap-2">
              <Zap className="h-3 w-3 text-primary animate-pulse" />
              IA Ativa
           </Badge>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-white border-slate-100 shadow-sm hover:shadow-md transition-all">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-slate-50 rounded-lg"><ClipboardList className="h-4 w-4 text-slate-600" /></div>
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total Ativos</span>
            </div>
            <h3 className="text-2xl font-black text-navy">{stats.total}</h3>
          </CardContent>
        </Card>
        <Card className="bg-white border-red-100 shadow-sm hover:shadow-md transition-all">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-red-50 rounded-lg"><AlertTriangle className="h-4 w-4 text-red-600" /></div>
              <span className="text-[10px] font-black uppercase text-red-400 tracking-widest">Urgentes</span>
            </div>
            <h3 className="text-2xl font-black text-navy">{stats.urgent}</h3>
          </CardContent>
        </Card>
        <Card className="bg-white border-amber-100 shadow-sm hover:shadow-md transition-all">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-amber-50 rounded-lg"><FileText className="h-4 w-4 text-amber-600" /></div>
              <span className="text-[10px] font-black uppercase text-amber-400 tracking-widest">Pendentes</span>
            </div>
            <h3 className="text-2xl font-black text-navy">{stats.pending_docs}</h3>
          </CardContent>
        </Card>
        <Card className="bg-white border-primary/20 shadow-sm hover:shadow-md transition-all">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-primary/5 rounded-lg"><Zap className="h-4 w-4 text-primary" /></div>
              <span className="text-[10px] font-black uppercase text-primary tracking-widest">Prontos</span>
            </div>
            <h3 className="text-2xl font-black text-navy">{stats.ready_to_protocol}</h3>
          </CardContent>
        </Card>
        <Card className="bg-white border-emerald-100 shadow-sm hover:shadow-md transition-all">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-emerald-50 rounded-lg"><CheckCircle2 className="h-4 w-4 text-emerald-600" /></div>
              <span className="text-[10px] font-black uppercase text-emerald-400 tracking-widest">Concluídos</span>
            </div>
            <h3 className="text-2xl font-black text-navy">{stats.finalized}</h3>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="w-full" onValueChange={setFilter}>
        <div className="flex items-center justify-between mb-6">
          <TabsList className="bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <TabsTrigger value="all" className="rounded-xl px-6 py-2 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">Todos</TabsTrigger>
            <TabsTrigger value="urgent" className="rounded-xl px-6 py-2 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">Urgentes</TabsTrigger>
            <TabsTrigger value="pending_docs" className="rounded-xl px-6 py-2 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">Docs Pendentes</TabsTrigger>
            <TabsTrigger value="ready" className="rounded-xl px-6 py-2 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">Prontos</TabsTrigger>
            <TabsTrigger value="finalized" className="rounded-xl px-6 py-2 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-sm">Concluídos</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-3">
             <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input 
                  placeholder="Filtrar processos..." 
                  className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-primary/20 outline-none transition-all w-64 shadow-sm"
                />
             </div>
             <Button variant="outline" className="rounded-xl border-slate-200 shadow-sm">
                <Filter className="h-4 w-4 mr-2" /> Filtros
             </Button>
          </div>
        </div>

        <TabsContent value={filter} className="m-0 space-y-4">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sincronizando com a Central IA...</p>
            </div>
          ) : filteredProcesses.length === 0 ? (
            <div className="bg-white border-2 border-dashed border-slate-200 rounded-[2.5rem] p-20 text-center">
               <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mx-auto mb-6">
                  <ClipboardList className="h-10 w-10" />
               </div>
               <h3 className="text-xl font-black text-navy uppercase">Nenhum processo encontrado</h3>
               <p className="text-sm text-slate-400 font-medium max-w-xs mx-auto">Não encontramos processos para o filtro selecionado.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredProcesses.map((p) => {
                const progress = p.completion_percentage || 0;

                return (
                  <Card key={p.id} className={`bg-white border-slate-100 shadow-sm hover:shadow-xl hover:border-primary/20 transition-all group overflow-hidden relative ${p.is_favorite ? 'ring-2 ring-primary/10' : ''}`}>
                    <CardContent className="p-0">
                      <div className="flex flex-col lg:flex-row">
                        <div className="lg:w-1/4 p-6 border-b lg:border-b-0 lg:border-r border-slate-50 relative">
                           <button 
                             onClick={() => toggleFavorite(p.id, p.is_favorite)}
                             className={`absolute top-4 right-4 h-8 w-8 rounded-full flex items-center justify-center transition-all ${p.is_favorite ? 'text-amber-500 bg-amber-50' : 'text-slate-200 hover:text-amber-500 hover:bg-amber-50'}`}
                           >
                              <Star className={`h-4 w-4 ${p.is_favorite ? 'fill-current' : ''}`} />
                           </button>
                           
                           <div className="flex items-center justify-between mb-4">
                              <Badge className={`${getStatusColor(p.status)} border text-[9px] uppercase font-black px-3 py-1 rounded-full`}>
                                {p.status}
                              </Badge>
                           </div>
                           <h4 className="text-sm font-black text-navy group-hover:text-primary transition-colors line-clamp-2 uppercase leading-tight pr-8">{p.process_type}</h4>
                           
                           <div className="flex gap-2 mt-3">
                              {p.priority === 'urgent' || p.priority === 'critical' ? (
                                <Badge className="bg-red-500 text-white border-none text-[8px] uppercase font-black">Crítico</Badge>
                              ) : null}
                              {p.tags?.map((tag: string) => (
                                <Badge key={tag} variant="outline" className="text-[8px] uppercase border-slate-200">{tag}</Badge>
                              ))}
                           </div>
                        </div>

                        <div className="lg:w-1/3 p-6 space-y-4 border-b lg:border-b-0 lg:border-r border-slate-50 bg-slate-50/30">
                           <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 shadow-sm group-hover:scale-110 transition-all">
                                 <User className="h-5 w-5" />
                              </div>
                              <div className="min-w-0">
                                 <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Cliente</p>
                                 <p className="text-xs font-bold text-navy truncate">{p.customers?.name || "N/A"}</p>
                              </div>
                           </div>
                           <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-400 shadow-sm group-hover:scale-110 transition-all">
                                 <Ship className="h-5 w-5" />
                              </div>
                              <div className="min-w-0">
                                 <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Embarcação</p>
                                 <p className="text-xs font-bold text-navy truncate">{p.vessels?.name || "Não vinculada"}</p>
                              </div>
                           </div>
                        </div>

                        <div className="lg:w-1/3 p-6 flex flex-col justify-center space-y-4">
                           <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                              <div className="flex items-center gap-1.5">
                                 <Zap className={`h-3 w-3 ${progress === 100 ? 'text-green-500' : 'text-primary'}`} />
                                 <span className="text-slate-400">Eficiência Operacional</span>
                              </div>
                              <span className="text-navy font-black">{Math.round(progress)}%</span>
                           </div>
                           <Progress value={progress} className={`h-2 rounded-full ${progress === 100 ? 'bg-green-100' : ''}`} />
                           
                           <div className="flex items-center justify-between pt-2">
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                {p.protocol_number ? `Protocolo: ${p.protocol_number}` : 'Aguardando Protocolo'}
                              </p>
                              {p.sla_status === 'warning' && <AlertTriangle className="h-3.5 w-3.5 text-amber-500 animate-pulse" />}
                           </div>
                        </div>

                        <div className="lg:w-1/12 p-6 flex lg:flex-col justify-between items-center bg-slate-50/50">
                           <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                 <button className="h-10 w-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:text-primary transition-all shadow-sm">
                                    <MoreVertical className="h-5 w-5" />
                                 </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48 rounded-xl">
                                 <DropdownMenuItem className="text-xs font-bold gap-2"><Edit3 className="h-4 w-4" /> Editar Processo</DropdownMenuItem>
                                 <DropdownMenuItem className="text-xs font-bold gap-2"><Star className="h-4 w-4" /> Alternar Favorito</DropdownMenuItem>
                                 <DropdownMenuItem className="text-xs font-bold gap-2 text-red-600"><Trash2 className="h-4 w-4" /> Excluir</DropdownMenuItem>
                              </DropdownMenuContent>
                           </DropdownMenu>

                           <Link to={`/processes/${p.id}`} className="lg:mt-auto">
                              <button className="h-10 w-10 bg-navy text-white rounded-xl flex items-center justify-center hover:bg-primary transition-all shadow-lg shadow-navy/20">
                                 <ChevronRight className="h-5 w-5" />
                              </button>
                           </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Footer Info */}
      <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">
         <div className="flex items-center gap-2">
            <Timer className="h-3 w-3" /> Atualizado em tempo real via Lovable Cloud
         </div>
         <div className="flex items-center gap-4">
            <span className="flex items-center gap-1"><div className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Sistema Nominal</span>
            <span className="flex items-center gap-1"><div className="h-1.5 w-1.5 rounded-full bg-primary" /> IA Sincronizada</span>
         </div>
      </div>
    </div>
  );
}
