import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { 
  Loader2, AlertCircle, ArrowLeft, 
  CheckCircle2, FileText, Activity, 
  Zap, History, ChevronRight,
  AlertTriangle
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
import { Suspense, lazy, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useProcessCenterData } from "@/features/process-center/hooks/useProcessCenterData";
import { z } from "zod";

const processCenterSearchSchema = z.object({
  tab: z.string().optional().default('workspace'),
});

export const Route = createFileRoute("/admin/process-center/$id")({
  validateSearch: (search) => processCenterSearchSchema.parse(search),
  component: EnterpriseProcessCenterPage,
});

// Lazy loading existing panels for integration
const ProcessTimeline = lazy(() => import("@/components/ProcessTimeline").then(m => ({ default: m.ProcessTimeline })));
const ProcessDocumentsPanel = lazy(() => import("@/components/process/ProcessDocumentsPanel").then(m => ({ default: m.ProcessDocumentsPanel })));
const ProcessSignaturesPanel = lazy(() => import("@/components/process/ProcessSignaturesPanel").then(m => ({ default: m.ProcessSignaturesPanel })));

function EnterpriseProcessCenterPage() {
  const { id } = Route.useParams();
  const search = Route.useSearch();
  const queryOptions = useProcessCenterData(id);

  const { data, isLoading, error } = useQuery(queryOptions);

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
      </div>
    );
  }

  if (error || !data) {
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

  const { process, docStats, healthReport, suggestions, timeInProgress } = data;

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <ProcessCenterSidebar suggestions={suggestions} />
      
      <div className="flex-1 flex flex-col min-w-0">
        <ProcessCenterHeader process={process} timeInProgress={timeInProgress} />
        
        <ScrollArea className="flex-1">
          <ProcessCenterDashboard docStats={docStats} healthReport={healthReport} />
          
          <div className="px-6 pb-20">
            <Tabs value={search.tab} className="w-full">
              <TabsList className="bg-slate-100/50 p-1 mb-6 border border-slate-200 rounded-xl">
                <Link from="/admin/process-center/$id" search={{ tab: 'workspace' }} className="contents">
                  <TabsTrigger value="workspace" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg font-bold text-[10px] uppercase tracking-widest px-6">Workspace Inteligente</TabsTrigger>
                </Link>
                <Link from="/admin/process-center/$id" search={{ tab: 'documentos' }} className="contents">
                  <TabsTrigger value="documentos" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg font-bold text-[10px] uppercase tracking-widest px-6">Painel Documental</TabsTrigger>
                </Link>
                <Link from="/admin/process-center/$id" search={{ tab: 'assinaturas' }} className="contents">
                  <TabsTrigger value="assinaturas" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg font-bold text-[10px] uppercase tracking-widest px-6">Assinaturas</TabsTrigger>
                </Link>
                <Link from="/admin/process-center/$id" search={{ tab: 'timeline' }} className="contents">
                  <TabsTrigger value="timeline" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg font-bold text-[10px] uppercase tracking-widest px-6">Timeline Enterprise</TabsTrigger>
                </Link>
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
                          {suggestions.length === 0 ? (
                            <div className="p-12 text-center border-2 border-dashed border-slate-100 rounded-3xl">
                               <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nenhuma ação pendente</p>
                            </div>
                          ) : suggestions.map((s) => (
                            <div 
                              key={s.id} 
                              className="flex items-start gap-4 p-5 rounded-2xl bg-white border border-slate-100 hover:border-primary/20 hover:shadow-lg transition-all cursor-pointer group"
                              onClick={() => {
                                if (s.resolutionPath) window.location.href = s.resolutionPath;
                              }}
                            >
                               <div className={cn(
                                 "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border",
                                 s.priority === 'high' ? "bg-amber-50 border-amber-100 text-amber-600" : "bg-blue-50 border-blue-100 text-blue-600"
                               )}>
                                  {s.priority === 'high' ? <AlertTriangle className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
                               </div>
                               <div className="flex-1">
                                  <p className="text-sm font-bold text-slate-900 group-hover:text-primary transition-colors">{s.title}</p>
                                  <p className="text-[11px] text-slate-500 font-medium mt-1 leading-relaxed">{s.message}</p>
                               </div>
                               <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-primary" />
                            </div>
                          ))}
                       </div>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <Card className="p-6 border-slate-200">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Saúde Documental</h4>
                          <div className="space-y-4">
                             {Object.entries(healthReport.dimensions).map(([key, item]: [string, any]) => (
                               <div key={key} className="space-y-2">
                                  <div className="flex justify-between items-center">
                                     <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">{key}</span>
                                     <span className="text-[11px] font-black text-slate-900">{item.score}</span>
                                  </div>
                                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                     <div className={cn(
                                       "h-full transition-all duration-1000", 
                                       item.status === 'stable' ? "bg-emerald-500" : item.status === 'warning' ? "bg-amber-500" : "bg-rose-500"
                                     )} style={{ width: `${item.score}%` }} />
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
                                <p className="text-3xl font-black tracking-tighter">--</p>
                                <p className="text-[9px] font-bold text-white/50 uppercase tracking-widest mt-1">Sem dados de OCR</p>
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
                    {docStats.totalBlocking > 0 && (
                      <Card className="p-5 border-rose-100 bg-rose-50 shadow-sm border-l-4 border-l-rose-500">
                        <h4 className="text-[10px] font-black text-rose-900 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          Alertas Bloqueantes
                        </h4>
                        <div className="space-y-3">
                          <div className="p-4 bg-white border border-rose-100 rounded-xl shadow-sm">
                            <p className="text-xs font-black text-rose-900 uppercase tracking-tight">Documentação Incompleta</p>
                            <p className="text-[10px] text-rose-700 mt-1 font-medium leading-relaxed">Existem {docStats.totalBlocking} documentos obrigatórios ausentes que bloqueiam o protocolo.</p>
                            <Link from="/admin/process-center/$id" search={{ tab: 'documentos' }}>
                              <Button variant="outline" size="sm" className="w-full mt-3 h-8 text-[9px] font-black uppercase tracking-widest text-rose-600 border-rose-200 hover:bg-rose-50">Resolver Agora</Button>
                            </Link>
                          </div>
                        </div>
                      </Card>
                    )}

                    {/* Timeline Resumida */}
                    <Card className="p-6 border-slate-200">
                       <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center justify-between">
                          Movimentações Recentes
                          <History className="h-3.5 w-3.5" />
                       </h4>
                       <div className="space-y-6 relative before:absolute before:inset-0 before:ml-[7px] before:h-full before:w-px before:bg-slate-100">
                          <div className="p-8 text-center">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nenhuma auditoria registrada</p>
                          </div>
                       </div>
                       <Link from="/admin/process-center/$id" search={{ tab: 'timeline' }}>
                         <Button variant="ghost" className="w-full mt-6 h-8 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 border border-dashed border-slate-200">Ver Histórico Completo</Button>
                       </Link>
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

