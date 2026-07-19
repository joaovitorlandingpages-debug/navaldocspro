import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { 
  Loader2, AlertCircle, ArrowLeft, 
  CheckCircle2, FileText, Activity, 
  Zap, History, ChevronRight,
  AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { useProcessCenterData } from "@/features/process-center/hooks/useProcessCenterData";
import { z } from "zod";

const processCenterSearchSchema = z.object({
  tab: z.string().optional().default('workspace'),
});

export const Route = createFileRoute("/admin/process-center/$id")({
  validateSearch: (search) => processCenterSearchSchema.parse(search),
  component: EnterpriseProcessCenterPage,
});

// Lazy loading components for Workspace 3.0
const Workspace3Header = lazy(() => import("@/components/process-center/workspace-3.0/Workspace3Header").then(m => ({ default: m.Workspace3Header })));
const Workspace3Left = lazy(() => import("@/components/process-center/workspace-3.0/Workspace3Left").then(m => ({ default: m.Workspace3Left })));
const Workspace3Central = lazy(() => import("@/components/process-center/workspace-3.0/Workspace3Central").then(m => ({ default: m.Workspace3Central })));
const Workspace3Right = lazy(() => import("@/components/process-center/workspace-3.0/Workspace3Right").then(m => ({ default: m.Workspace3Right })));
const Workspace3Timeline = lazy(() => import("@/components/process-center/workspace-3.0/Workspace3Timeline").then(m => ({ default: m.Workspace3Timeline })));

// Legacy panels for other tabs
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

  const { process, docStats, healthReport, riskReport, suggestions, timeInProgress } = data;

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <ProcessCenterSidebar suggestions={suggestions} />
      
      <div className="flex-1 flex flex-col min-w-0">
        <Suspense fallback={<div className="h-20 bg-white animate-pulse" />}>
          <Workspace3Header process={process} timeInProgress={timeInProgress} />
        </Suspense>
        
        <ScrollArea className="flex-1">
          {search.tab !== 'workspace' && (
            <ProcessCenterDashboard docStats={docStats} healthReport={healthReport} riskReport={riskReport} />
          )}
          
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
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 px-6 pb-20">
                  {/* Coluna Esquerda: Resumo (3/12) */}
                  <div className="lg:col-span-3 space-y-6">
                    <Suspense fallback={<div className="h-40 bg-slate-50 animate-pulse rounded-2xl" />}>
                      <Workspace3Left process={process} timeInProgress={timeInProgress} />
                    </Suspense>
                  </div>

                  {/* Área Central: Workspace (6/12) */}
                  <div className="lg:col-span-6 space-y-6">
                    <Suspense fallback={<div className="h-96 bg-slate-50 animate-pulse rounded-2xl" />}>
                      <Workspace3Central process={process} docStats={docStats} healthReport={healthReport} />
                    </Suspense>
                  </div>

                  {/* Coluna Direita: Copilot (3/12) */}
                  <div className="lg:col-span-3 space-y-6 h-[calc(100vh-250px)] sticky top-6">
                    <Suspense fallback={<div className="h-full bg-slate-50 animate-pulse rounded-2xl" />}>
                      <Workspace3Right suggestions={suggestions} process={process} />
                    </Suspense>
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
