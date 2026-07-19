import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";
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
          
          <div className="px-6 pb-12">
            <Tabs defaultValue="visao-geral" className="w-full">
              <TabsList className="bg-slate-100/50 p-1 mb-6 border border-slate-200">
                <TabsTrigger value="visao-geral" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Visão Geral</TabsTrigger>
                <TabsTrigger value="documentos" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Documentos</TabsTrigger>
                <TabsTrigger value="assinaturas" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Assinaturas</TabsTrigger>
                <TabsTrigger value="timeline" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">Timeline</TabsTrigger>
              </TabsList>
              
              <TabsContent value="visao-geral" className="mt-0">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-6">
                    {/* Main operational area */}
                    <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl h-[400px] flex items-center justify-center text-slate-400">
                      Work in Progress: Painel Operacional Central
                    </div>
                  </div>
                  <div className="space-y-6">
                    {/* Side intelligence area */}
                    <div className="bg-white border rounded-xl p-4 shadow-sm">
                      <h4 className="text-sm font-bold mb-4 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                        Alertas Ativos
                      </h4>
                      <div className="space-y-3">
                        <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
                          <p className="text-xs font-semibold text-red-900">Assinatura Atrasada</p>
                          <p className="text-[10px] text-red-700 mt-1">O cliente ainda não assinou a Procuração (há 3 dias).</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="documentos" className="mt-0">
                <Suspense fallback={<Loader2 className="h-6 w-6 animate-spin mx-auto my-8" />}>
                  <ProcessDocumentsPanel processId={id} />
                </Suspense>
              </TabsContent>

              <TabsContent value="assinaturas" className="mt-0">
                <Suspense fallback={<Loader2 className="h-6 w-6 animate-spin mx-auto my-8" />}>
                  <ProcessSignaturesPanel processId={id} companyId={process.company_id} />
                </Suspense>
              </TabsContent>

              <TabsContent value="timeline" className="mt-0">
                <Suspense fallback={<Loader2 className="h-6 w-6 animate-spin mx-auto my-8" />}>
                  <ProcessTimeline processId={id} />
                </Suspense>
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
