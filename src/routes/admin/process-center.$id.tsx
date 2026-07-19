import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Loader2, AlertCircle, ArrowLeft, 
  CheckCircle2, FileText, Activity, 
  Zap, History, ChevronRight,
  ShieldCheck, AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { 
  ProcessCenterHeader, 
  ProcessCenterDashboard, 
  ProcessCenterSidebar 
} from "@/components/process-center/shared";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Suspense, lazy } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// Lazy loading existing panels for integration
const ProcessTimeline = lazy(() => import("@/components/ProcessTimeline").then(m => ({ default: m.ProcessTimeline })));
const ProcessDocumentsPanel = lazy(() => import("@/components/process/ProcessDocumentsPanel").then(m => ({ default: m.ProcessDocumentsPanel })));
const ProcessSignaturesPanel = lazy(() => import("@/components/process/ProcessSignaturesPanel").then(m => ({ default: m.ProcessSignaturesPanel })));

export const Route = createFileRoute("/admin/process-center/$id")({
  component: EnterpriseProcessCenterPage,
});

function EnterpriseProcessCenterPage() {
  const { id } = Route.useParams();

  const { data: process, isLoading, error } = useQuery({
    queryKey: ["process-center", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('processes')
        .select(`
          *,
          customer:customers!processes_customer_id_fkey(id, name, cpf_cnpj, email),
          vessel:vessels!processes_vessel_id_fkey(id, name, registration_number, vessel_type, current_owner_name, current_owner_cpf_cnpj)
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
      </div>
    );
  }

  if (error || !process) {
    return (
      <div className="p-12 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">Processo não encontrado</h2>
        <p className="text-slate-500 mb-6">Não foi possível carregar os detalhes deste processo.</p>
        <Button asChild variant="outline">
          <Link to="/admin/processes">
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para lista
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <ProcessCenterSidebar />
      
      <div className="flex-1 flex flex-col min-w-0">
        <ProcessCenterHeader process={process} />
        
        <ScrollArea className="flex-1">
          <ProcessCenterDashboard process={process} />
          
          <div className="px-6 pb-20">
            <Tabs defaultValue="workspace" className="w-full">
              <TabsList className="bg-slate-100/50 p-1 mb-6 border border-slate-200 rounded-xl">
                <TabsTrigger value="workspace" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg font-bold text-[10px] uppercase tracking-widest px-6">Workspace Inteligente</TabsTrigger>
                <TabsTrigger value="documentos" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg font-bold text-[10px] uppercase tracking-widest px-6">Painel Documental</TabsTrigger>
                <TabsTrigger value="assinaturas" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg font-bold text-[10px] uppercase tracking-widest px-6">Assinaturas</TabsTrigger>
                <TabsTrigger value="timeline" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg font-bold text-[10px] uppercase tracking-widest px-6">Timeline Enterprise</TabsTrigger>
              </TabsList>
              
              <TabsContent value="workspace" className="mt-0 animate-in fade-in duration-500">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-6">
                    {/* Workspace Central */}
                    <Card className="border-slate-200 shadow-sm overflow-hidden">
                       <div className="p-6 border-b bg-slate-50/50 flex justify-between items-center">
                          <div>
                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                              <Zap className="h-4 w-4 text-primary" />
                              Próximos Passos Sugeridos
                            </h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">IA Operacional em tempo real</p>
                          </div>
                          <Badge className="bg-emerald-50 text-emerald-600 border-none font-black text-[9px] px-3 py-1 uppercase tracking-widest">Ativo</Badge>
                       </div>
                       <div className="p-6 space-y-4">
                          <div className="flex items-start gap-4 p-5 rounded-2xl bg-white border border-slate-100 hover:border-primary/20 hover:shadow-lg transition-all cursor-pointer group">
                             <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0 border border-amber-100">
                                <AlertTriangle className="h-5 w-5 text-amber-600" />
                             </div>
                             <div className="flex-1">
                                <p className="text-sm font-bold text-slate-900 group-hover:text-primary transition-colors">Aprovar rascunho da Procuração</p>
                                <p className="text-[11px] text-slate-500 font-medium mt-1 leading-relaxed">O documento foi gerado automaticamente, mas requer sua revisão final antes de ser enviado para assinatura do cliente.</p>
                             </div>
                             <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-primary" />
                          </div>

                          <div className="flex items-start gap-4 p-5 rounded-2xl bg-white border border-slate-100 hover:border-primary/20 hover:shadow-lg transition-all cursor-pointer group opacity-60">
                             <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100">
                                <CheckCircle2 className="h-5 w-5 text-blue-600" />
                             </div>
                             <div className="flex-1">
                                <p className="text-sm font-bold text-slate-900">Validar OCR do TIE</p>
                                <p className="text-[11px] text-slate-500 font-medium mt-1 leading-relaxed">O sistema identificou 98% de confiança nos campos extraídos. Confirme se os dados conferem com a imagem original.</p>
                             </div>
                             <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-primary" />
                          </div>
                       </div>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <Card className="p-6 border-slate-200">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Saúde Documental</h4>
                          <div className="space-y-4">
                             {[
                               { label: "Documentação", score: 98, color: "bg-emerald-500" },
                               { label: "OCR Intelligence", score: 100, color: "bg-emerald-500" },
                               { label: "Assinaturas", score: 75, color: "bg-amber-500" },
                               { label: "Checklist", score: 82, color: "bg-blue-500" }
                             ].map((item) => (
                               <div key={item.label} className="space-y-2">
                                  <div className="flex justify-between items-center">
                                     <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">{item.label}</span>
                                     <span className="text-[11px] font-black text-slate-900">{item.score}</span>
                                  </div>
                                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                     <div className={cn("h-full transition-all duration-1000", item.color)} style={{ width: `${item.score}%` }} />
                                  </div>
                               </div>
                             ))}
                          </div>
                       </Card>

                       <Card className="p-6 border-slate-200 bg-slate-900 text-white overflow-hidden relative">
                          <div className="absolute top-0 right-0 p-4 opacity-10">
                             <Activity className="h-24 w-24" />
                          </div>
                          <h4 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-6">Métricas de Performance</h4>
                          <div className="space-y-6 relative z-10">
                             <div>
                                <p className="text-3xl font-black tracking-tighter">0.5s</p>
                                <p className="text-[9px] font-bold text-white/50 uppercase tracking-widest mt-1">Tempo médio de processamento OCR</p>
                             </div>
                             <div className="h-px bg-white/10" />
                             <div>
                                <p className="text-3xl font-black tracking-tighter">100%</p>
                                <p className="text-[9px] font-bold text-white/50 uppercase tracking-widest mt-1">Conformidade com normas DPC/Marinha</p>
                             </div>
                          </div>
                       </Card>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {/* Alertas Críticos */}
                    <Card className="p-5 border-rose-100 bg-rose-50 shadow-sm border-l-4 border-l-rose-500">
                      <h4 className="text-[10px] font-black text-rose-900 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Alertas Bloqueantes
                      </h4>
                      <div className="space-y-3">
                        <div className="p-4 bg-white border border-rose-100 rounded-xl shadow-sm">
                          <p className="text-xs font-black text-rose-900 uppercase tracking-tight">Assinatura Expirada</p>
                          <p className="text-[10px] text-rose-700 mt-1 font-medium leading-relaxed">O link de assinatura enviado para o proprietário expirou hoje às 08:00. É necessário reenviar.</p>
                          <Button variant="outline" size="sm" className="w-full mt-3 h-8 text-[9px] font-black uppercase tracking-widest text-rose-600 border-rose-200 hover:bg-rose-50">Reenviar Agora</Button>
                        </div>
                      </div>
                    </Card>

                    {/* Timeline Resumida */}
                    <Card className="p-6 border-slate-200">
                       <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center justify-between">
                          Movimentações Recentes
                          <History className="h-3.5 w-3.5" />
                       </h4>
                       <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[7px] before:h-full before:w-px before:bg-slate-100">
                          {[
                            { user: "Sistema", action: "OCR concluído com sucesso", time: "10m atrás", icon: Zap, color: "text-primary" },
                            { user: "Ricardo A.", action: "Documento 'TIE' anexado", time: "1h atrás", icon: FileText, color: "text-blue-500" },
                            { user: "Sistema", action: "Novo processo criado", time: "2h atrás", icon: CheckCircle2, color: "text-emerald-500" }
                          ].map((item, i) => (
                            <div key={i} className="flex gap-4 relative">
                               <div className={cn("h-4 w-4 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center z-10", item.color)}>
                                  <div className="h-1.5 w-1.5 rounded-full bg-current" />
                               </div>
                               <div>
                                  <p className="text-[11px] font-bold text-slate-900">{item.action}</p>
                                  <p className="text-[9px] font-bold text-slate-400 uppercase mt-1 tracking-tight">{item.user} • {item.time}</p>
                               </div>
                            </div>
                          ))}
                       </div>
                       <Button variant="ghost" className="w-full mt-6 h-8 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 border border-dashed border-slate-200">Ver Histórico Completo</Button>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="documentos" className="mt-0 animate-in fade-in duration-500">
                <Suspense fallback={<Loader2 className="h-6 w-6 animate-spin mx-auto my-8" />}>
                  <ProcessDocumentsPanel processId={id} />
                </Suspense>
              </TabsContent>

              <TabsContent value="assinaturas" className="mt-0 animate-in fade-in duration-500">
                <Suspense fallback={<Loader2 className="h-6 w-6 animate-spin mx-auto my-8" />}>
                  <ProcessSignaturesPanel processId={id} />
                </Suspense>
              </TabsContent>

              <TabsContent value="timeline" className="mt-0 animate-in fade-in duration-500">
                <Suspense fallback={<Loader2 className="h-6 w-6 animate-spin mx-auto my-8" />}>
                  <ProcessTimeline events={[]} />
                </Suspense>
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
