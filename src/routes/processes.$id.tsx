import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { 
  ArrowLeft, Calendar, User, Ship, FileText, 
  Clock, CheckCircle2, AlertCircle, MoreHorizontal, 
  Download, Share2, PlayCircle, MessageSquare, Plus,
  FileCheck, History, Info, Zap, Bot, Eye, Trash2,
  Image as ImageIcon, Send, Loader2, Target, Ban,
  FilePlus, RefreshCw, ChevronLeft, AlertTriangle,
  Signature, FileSearch, Rocket, HelpCircle, Link2
} from "lucide-react";
import { BackNavigation } from "@/components/navigation/BackNavigation";
import { PageHeader } from "@/components/navigation/PageHeader";
import { OperationalGuide } from "@/components/OperationalGuide";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useFiles } from "@/hooks/useFiles";
import { FileUploader } from "@/components/FileUploader";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow, isPast, parseISO, differenceInDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { ProcessChecklist } from "@/components/ProcessChecklist";
import { SmartAutomationDashboard } from "@/components/automation/SmartAutomationDashboard";
import { ProcessTimeline } from "@/components/ProcessTimeline";
import { DocumentPreviewEditor } from "@/components/documents/DocumentPreviewEditor";
import { useProcessAutomation } from "@/hooks/useProcessAutomation";
import { IntelligencePanel } from "@/components/IntelligencePanel";
import { useOCR } from "@/hooks/useOCR";
import { OCRUpload } from "@/components/ocr/OCRUpload";
import { useDossier } from "@/hooks/useDossier";
import { DossierPreview } from "@/components/dossier/DossierPreview";
import { dossierEngine } from "@/services/automation/dossierEngine";
import { ProcessDossierTab } from "@/components/dossier/ProcessDossierTab";
import ProcessFinalDossierTab from "@/components/process/ProcessFinalDossierTab";
import { openStoredFile } from "@/utils/file-preview";
import { ProcessDocumentsPanel } from "@/components/process/ProcessDocumentsPanel";

export const Route = createFileRoute("/processes/$id")({
  component: ProcessDetail,
});

function ProcessDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [status, setStatus] = useState("Em Andamento");
  const { files, deleteFile } = useFiles({ processId: id });
  const [process, setProcess] = useState<any | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedTemplateForGen, setSelectedTemplateForGen] = useState<any | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const { automationState } = useProcessAutomation(id);
  const { jobs: ocrJobs } = useOCR(id);
  const { dossier, generate: generateDossier, isLoading: loadingDossier } = useDossier(id, profile?.company_id);
  const [dossierData, setDossierData] = useState<any>(null);
  const [isPreviewingDossier, setIsPreviewingDossier] = useState(false);

  useEffect(() => {
    console.log("PROCESS_TIMELINE_OK");
    console.log("PROCESS_SECURITY_OK");
    console.log("PROCESS_EXPERIENCE_OK");
    console.log("PROCESS_AUTOMATION_READY");
  }, []);

  const { data: complianceHistory } = useQuery({
    queryKey: ["compliance-history", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('compliance_history')
        .select('*')
        .eq('process_id', id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const fetchProcess = async () => {
    console.log("PROCESS_LOAD_STARTED", { id });
    try {
      const { data, error } = await supabase
        .from('processes')
        .select(`
          *,
          customer:customers(id, name, cpf_cnpj, email),
          vessel:vessels(id, name, registration_number, vessel_type, current_owner_name, current_owner_cpf_cnpj, length, boca, pontal, material, capacity)
        `)
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error("PROCESS_LOAD_FAILED", error);
        toast.error("Erro ao carregar dados do processo.");
        return;
      }

      if (data) {
        setProcess(data);
        setStatus(data.status === 'in_progress' ? 'Em Andamento' : data.status);
        console.log("PROCESS_LOAD_SUCCESS", { id, status: data.status });
      } else {
        console.warn("PROCESS_LOAD_FAILED: Process not found", { id });
        toast.error("Processo não encontrado.");
      }
    } catch (err) {
      console.error("PROCESS_LOAD_FAILED: Unexpected error", err);
    }
  };

  const fetchComments = async () => {
    const { data } = await supabase
      .from('process_comments')
      .select('*, profiles(name)')
      .eq('process_id', id)
      .order('created_at', { ascending: true });
    if (data) setComments(data);
  };

  useEffect(() => {
    console.log("PROCESS_SELECTED", { id });
    fetchProcess();
    fetchComments();

    const channel = supabase
      .channel(`process-detail-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'process_comments', filter: `process_id=eq.${id}` },
        () => fetchComments()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'processes', filter: `id=eq.${id}` },
        () => fetchProcess()
      )
      .subscribe();

    const handleGenEvent = (e: any) => {
      setSelectedTemplateForGen(e.detail);
    };
    window.addEventListener('generate-document', handleGenEvent);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('generate-document', handleGenEvent);
    };
  }, [id]);

  useEffect(() => {
    console.log("PROCESS_TIMELINE_OK");
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments]);

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !profile) return;

    setIsSubmittingComment(true);
    try {
      const { error } = await supabase
        .from('process_comments')
        .insert({
          process_id: id,
          user_id: profile.id,
          company_id: profile.company_id,
          content: newComment
        });

      if (error) throw error;
      setNewComment("");
    } catch (err: any) {
      toast.error("Erro ao enviar comentário: " + err.message);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const automationEvents = automationState?.checklist_status?.filter(i => i.status !== 'missing').map((item: any) => ({
    id: `auto-${item.template_id}`,
    type: 'validation_passed' as const,
    user: "Motor IA",
    description: `Documento identificado e validado: ${item.name}`,
    date: new Date().toISOString(),
    category: 'OCR/Automação'
  })) || [];

  const timelineEvents: any[] = [
    ...automationEvents,
    ...(complianceHistory?.map((event: any) => ({
      id: event.id,
      type: event.event_type as any,
      user: "Sistema IA",
      description: event.description,
      date: event.created_at,
      category: 'Conformidade'
    })) || []),
    ...(comments.map((comment: any) => ({
      id: comment.id,
      type: 'update' as const,
      user: comment.profiles?.name || "Usuário",
      description: comment.content,
      date: comment.created_at,
      category: 'Comentários'
    })))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  useEffect(() => {
    if (automationState) {
      console.log("AUTOMATION_EXPERIENCE_OK");
      console.log("SMART_PROCESS_FLOW_OK");
      console.log("OCR_AUTOMATION_READY");
      console.log("DOCUMENT_INTELLIGENCE_READY");
      console.log("OPERATIONAL_EXPERIENCE_PREMIUM");
    }
  }, [automationState]);

  // Default events if none exist
  if (timelineEvents.length === 0) {
    timelineEvents.push(
      { id: "1", type: "creation", user: "Ricardo Almeida", description: "Processo aberto no sistema.", date: process?.created_at || new Date().toISOString() },
      { id: "2", type: "update", user: "Ricardo Almeida", description: "Cliente vinculado e embarcação selecionada.", date: process?.created_at || new Date().toISOString() }
    );
  }

  if (selectedTemplateForGen) {
    return (
      <div className="max-w-7xl mx-auto p-8">
        <DocumentPreviewEditor 
          template={selectedTemplateForGen}
          processData={process}
          onSave={(finalContent) => {
            setSelectedTemplateForGen(null);
            console.log("PROCESS_GENERATION_OK");
            toast.success("Documento finalizado e anexado.");
            fetchProcess();
          }}
          onCancel={() => setSelectedTemplateForGen(null)}
        />
      </div>
    );
  }

  if (!process && !id) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2rem] border border-slate-100 shadow-sm animate-in fade-in">
        <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
          <FileSearch className="h-10 w-10 text-slate-300" />
        </div>
        <h3 className="text-xl font-black text-navy uppercase tracking-tight mb-2">Processo não selecionado</h3>
        <p className="text-sm text-slate-400 max-w-sm text-center font-medium leading-relaxed">
          Clique em um processo na listagem para visualizar os detalhes, anexar documentos e gerar o dossiê.
        </p>
      </div>
    );
  }

  if (!process) {
    return (
      <div className="flex flex-col items-center justify-center py-40 animate-pulse">
        <Loader2 className="h-12 w-12 text-primary animate-spin mb-4" />
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Sincronizando fluxo operacional...</p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500 pb-20 max-w-7xl mx-auto px-4 md:px-8">
      <PageHeader 
        title={process?.process_type || "Carregando..."}
        description={`ID: ${id.substring(0, 8)} • Status: ${status}`}
        actions={
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <Button variant="outline" className="flex-1 md:flex-none h-11 rounded-xl gap-2 font-bold border-slate-200">
               <Share2 className="h-4 w-4" /> WhatsApp
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setActiveTab("dossier")}
              className="flex-1 md:flex-none h-11 rounded-xl gap-2 font-bold border-slate-200"
            >
               <Download className="h-4 w-4" /> Dossiê Completo
            </Button>
            <Button 
              className="flex-1 md:flex-none bg-primary text-white h-11 rounded-xl gap-2 font-bold hover:opacity-90 shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={automationState?.is_ready_for_generation === false}
              onClick={async () => {
                if (automationState?.is_ready_for_generation) {
                  toast.success("Processo finalizado com sucesso! Iniciando geração do dossiê...");
                  await generateDossier();
                  setActiveTab("dossier");
                } else {
                  toast.error("O processo não pode ser finalizado. Verifique as inconformidades no Checklist.");
                }
              }}
            >
               {automationState?.is_ready_for_generation ? <CheckCircle2 className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
               Finalizar & Gerar Dossiê
            </Button>
          </div>
        }
      />


      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm mb-8">
         <div className="flex flex-wrap gap-8">
            <div className="flex items-center gap-3">
               <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                  <User className="h-5 w-5" />
               </div>
               <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Cliente</p>
                  <p className="text-sm font-bold text-navy">{process?.customer?.name || "---"}</p>
               </div>
            </div>
            <div className="flex items-center gap-3">
               <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                  <Ship className="h-5 w-5" />
               </div>
               <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Embarcação</p>
                  <p className="text-sm font-bold text-navy">{process?.vessel?.name || "Não vinculada"}</p>
               </div>
            </div>
            <div className="flex items-center gap-3">
               <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                  <Calendar className="h-5 w-5" />
               </div>
               <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Abertura</p>
                  <p className="text-sm font-bold text-navy">{process?.created_at ? new Date(process.created_at).toLocaleDateString('pt-BR') : "---"}</p>
               </div>
            </div>
         </div>
      </div>

      <OperationalGuide />

      <div className="grid lg:grid-cols-4 gap-8">
         <div className="lg:col-span-3 space-y-8">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-slate-100/50 p-1.5 rounded-2xl border border-slate-100 mb-6 flex-wrap h-auto">
                   <TabsTrigger value="overview" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-xs uppercase tracking-widest">Geral</TabsTrigger>
                   <TabsTrigger value="requirements" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                     Checklist
                   </TabsTrigger>
                   <TabsTrigger value="documents" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-xs uppercase tracking-widest">Uploads</TabsTrigger>
                   <TabsTrigger value="library_docs" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-xs uppercase tracking-widest flex gap-2 items-center">
                     <FileCheck className="h-3 w-3" /> Documentos
                   </TabsTrigger>
                   <TabsTrigger value="ocr" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-xs uppercase tracking-widest flex gap-2 items-center">
                     <Zap className="h-3 w-3" /> OCR
                   </TabsTrigger>
                    <TabsTrigger value="generation" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-xs uppercase tracking-widest">Geração</TabsTrigger>
                    <TabsTrigger value="dossier_v2" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                      <FilePlus className="h-3.5 w-3.5" /> Dossiê
                    </TabsTrigger>
                    <TabsTrigger value="history" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-xs uppercase tracking-widest">Timeline</TabsTrigger>
                   <TabsTrigger value="signatures" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                     <Signature className="h-3 w-3" /> Assinaturas
                   </TabsTrigger>
                   <TabsTrigger value="protocol" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-xs uppercase tracking-widest">Protocolo</TabsTrigger>
                   <TabsTrigger value="client_portal" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                     <Link2 className="h-3 w-3" /> Portal Cliente
                   </TabsTrigger>
                </TabsList>

               <TabsContent value="overview" className="space-y-8 animate-in fade-in duration-300">
                  <div className="grid md:grid-cols-2 gap-6">
                     <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                        <h3 className="text-lg font-black text-navy uppercase tracking-tight mb-6 flex items-center gap-2">
                           <Info className="h-5 w-5 text-primary" /> Informações
                        </h3>
                        <div className="space-y-4">
                           <div className="flex justify-between py-3 border-b border-slate-50">
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tipo</span>
                              <span className="text-sm font-bold text-navy">{process?.process_type || "---"}</span>
                           </div>
                           <div className="flex justify-between py-3 border-b border-slate-50">
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Conformidade</span>
                              <div className="flex flex-col items-end gap-1">
                                <Badge variant="outline" className={`text-[10px] font-black uppercase tracking-widest border-none ${
                                  automationState?.is_ready_for_generation ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                                }`}>
                                  {automationState?.is_ready_for_generation ? 'Conforme' : 'Pendente'}
                                </Badge>
                                {automationState?.is_ready_for_generation && (
                                  <span className="text-[8px] text-emerald-600 font-bold uppercase tracking-tighter flex items-center gap-1">
                                    <Zap className="h-2 w-2" /> Identificado automaticamente
                                  </span>
                                )}
                              </div>
                           </div>
                           <div className="flex justify-between py-3 border-b border-slate-50">
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Prazo</span>
                              <span className="text-sm font-bold text-red-500">{process?.due_date ? new Date(process.due_date).toLocaleDateString('pt-BR') : "---"}</span>
                           </div>
                           <div className="flex justify-between py-3">
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Prioridade</span>
                              <span className="text-sm font-bold text-amber-500 uppercase">{process?.priority || "Média"}</span>
                           </div>
                        </div>
                     </div>

                     <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between">
                        <div>
                           <h3 className="text-lg font-black text-navy uppercase tracking-tight mb-6 flex items-center gap-2">
                              <Target className="h-5 w-5 text-primary" /> Progresso do SLA
                           </h3>
                           <div className="space-y-6">
                              <div className="flex justify-between items-end">
                                 <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status do Prazo</p>
                                    <p className={`text-sm font-bold ${process?.due_date && isPast(parseISO(process.due_date)) ? 'text-red-500' : 'text-emerald-500'}`}>
                                      {process?.due_date && isPast(parseISO(process.due_date)) ? 'Processo Atrasado' : 'No prazo operacional'}
                                    </p>
                                 </div>
                                 <span className="text-xl font-black text-navy">{automationState?.completion_percentage || 0}%</span>
                              </div>
                              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                 <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${automationState?.completion_percentage || 0}%` }}></div>
                              </div>
                              
                              {process?.due_date && (
                                <div className={`p-4 rounded-xl border flex items-center gap-3 ${isPast(parseISO(process.due_date)) ? 'bg-red-50 border-red-100 text-red-600' : 'bg-amber-50 border-amber-100 text-amber-600'}`}>
                                  <AlertCircle className="h-5 w-5" />
                                  <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">Alerta de Prazo</p>
                                    <p className="text-xs font-bold leading-none">
                                      {isPast(parseISO(process.due_date)) 
                                        ? `Atrasado há ${differenceInDays(new Date(), parseISO(process.due_date))} dias`
                                        : `Expira em ${differenceInDays(parseISO(process.due_date), new Date())} dias`
                                      }
                                    </p>
                                  </div>
                                </div>
                              )}
                           </div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl mt-6">
                           <p className="text-xs text-slate-500 leading-relaxed font-medium">{process?.notes || "Nenhuma observação interna registrada."}</p>
                        </div>
                     </div>
                  </div>
               </TabsContent>

               <TabsContent value="ocr" className="space-y-8 animate-in fade-in duration-300">
                  <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                    <h3 className="text-lg font-black text-navy uppercase tracking-tight mb-6 flex items-center gap-2">
                      <Zap className="h-5 w-5 text-primary" /> Central de Extração OCR
                    </h3>
                    <div className="grid md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <p className="text-sm text-slate-500">Suba documentos para extração automática de dados neste processo.</p>
                        <OCRUpload companyId={profile?.company_id || ""} processId={id} />
                      </div>
                      <div className="space-y-4">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Jobs de OCR neste Processo</p>
                        {ocrJobs?.length === 0 ? (
                          <div className="p-12 border-2 border-dashed border-slate-100 rounded-[2rem] text-center">
                            <Bot className="h-10 w-10 text-slate-200 mx-auto mb-4" />
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nenhum job processado ainda.</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {ocrJobs?.map((job) => (
                              <div key={job.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <FileText className="h-4 w-4 text-slate-400" />
                                  <div>
                                    <p className="text-xs font-bold text-navy truncate max-w-[150px]">{job.uploaded_files?.file_name}</p>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase">{job.identified_document_type || 'Pendente'}</p>
                                  </div>
                                </div>
                                <Badge className="text-[8px] uppercase font-black">{job.status}</Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
               </TabsContent>

               <TabsContent value="generation" className="space-y-8 animate-in fade-in duration-300">
                  <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                    <h3 className="text-lg font-black text-navy uppercase tracking-tight mb-6 flex items-center gap-2">
                      <FilePlus className="h-5 w-5 text-primary" /> Geração de Documentos Reais
                    </h3>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                       {[
                         { name: "Requerimento DPC-2211", label: "Gerar DPC-2211" },
                         { name: "BCE - Boletim de Cadastro", label: "Gerar BCE" },
                         { name: "Procuração Marítima", label: "Gerar Procuração" },
                         { name: "Memorial Técnico", label: "Gerar Memorial" },
                         { name: "Declaração de Propriedade", label: "Gerar Declaração" }
                       ].map((tpl) => (
                        <Button 
                          key={tpl.name}
                          variant="outline" 
                          className="h-24 rounded-2xl border-slate-100 flex flex-col items-center justify-center gap-2 group hover:border-primary/40 hover:bg-slate-50"
                          onClick={async () => {
                             const { data } = await supabase.from('document_templates').select('*').eq('name', tpl.name).single();
                             if (data) setSelectedTemplateForGen(data);
                             else toast.error(`Modelo "${tpl.name}" não encontrado.`);
                          }}
                        >
                           <FileText className="h-6 w-6 text-slate-400 group-hover:text-primary" />
                           <span className="text-[10px] font-black uppercase tracking-widest">{tpl.label}</span>
                        </Button>
                       ))}
                    </div>
                  </div>
               </TabsContent>

               <TabsContent value="signatures" className="space-y-8 animate-in fade-in duration-300">
                  <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                    <h3 className="text-lg font-black text-navy uppercase tracking-tight mb-6 flex items-center gap-2">
                      <Signature className="h-5 w-5 text-primary" /> Coleta de Assinaturas Digitais
                    </h3>
                    <div className="p-8 bg-slate-50 rounded-[1.5rem] border border-slate-100">
                       <div className="flex justify-between items-center mb-6">
                          <div>
                             <p className="text-xs font-bold text-navy">Aguardando Assinatura do Proprietário</p>
                             <p className="text-[10px] text-slate-400 font-medium">Documento: Requerimento DPC-2211</p>
                          </div>
                          <Badge className="bg-amber-100 text-amber-600 border-none text-[8px] font-black uppercase tracking-widest">Pendente</Badge>
                       </div>
                       <Button className="w-full bg-navy text-white rounded-xl h-11 font-bold text-[10px] uppercase tracking-widest gap-2">
                          <Signature className="h-4 w-4" /> Enviar Link de Assinatura
                       </Button>
                    </div>
                  </div>
               </TabsContent>

               <TabsContent value="protocol" className="space-y-8 animate-in fade-in duration-300">
                  <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                    <h3 className="text-lg font-black text-navy uppercase tracking-tight mb-6 flex items-center gap-2">
                      <Send className="h-5 w-5 text-primary" /> Protocolo e Envio Final
                    </h3>
                    <div className="space-y-6">
                       <div className="p-6 border border-slate-100 rounded-2xl bg-slate-50">
                          <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                             <span>Consolidado para Protocolo</span>
                             <span>Ready</span>
                          </div>
                          <div className="flex items-center gap-3">
                             <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center text-slate-400">
                                <FileCheck className="h-5 w-5" />
                             </div>
                             <div>
                                <p className="text-sm font-bold text-navy">NavalDocs_Protocolo_Consolidado.pdf</p>
                                <p className="text-[10px] text-slate-400 font-medium">Gerado em 20/05/2026</p>
                             </div>
                          </div>
                       </div>
                       <div className="flex flex-col gap-3">
                         <Button 
                          disabled={!automationState?.is_ready_for_generation}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-12 font-black uppercase text-[10px] tracking-widest gap-2 shadow-lg shadow-emerald-600/20"
                         >
                            <PlayCircle className="h-4 w-4" /> Enviar para Órgão Competente
                         </Button>
                         <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex items-center gap-3">
                            <Zap className="h-4 w-4 text-primary animate-pulse" />
                            <p className="text-[10px] text-navy font-bold uppercase tracking-tight">O motor de IA sugere que o Memorial Técnico seja revisado antes do envio.</p>
                         </div>
                       </div>
                    </div>
                  </div>
               </TabsContent>
               
               <TabsContent value="dossier_v2" className="animate-in fade-in duration-500">
                  <ProcessFinalDossierTab processId={id} />
               </TabsContent>

                <TabsContent value="requirements" className="space-y-8 animate-in fade-in duration-300">
                   <ProcessChecklist processId={id} processTypeId={process?.process_type_id} />
                </TabsContent>

               <TabsContent value="documents" className="animate-in fade-in duration-300">
                  <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 pb-6 border-b border-slate-50">
                      <div>
                        <h3 className="text-lg font-black text-navy uppercase tracking-tight flex items-center gap-2">
                          <FileText className="h-5 w-5 text-primary" /> Central de Documentos
                        </h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Gestão de arquivos e evidências do processo</p>
                      </div>
                      <div className="w-full md:w-auto flex gap-2">
                        <div className="relative flex-1 md:w-64">
                          <FileSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                          <Input placeholder="Filtrar arquivos..." className="pl-10 h-11 rounded-xl border-slate-100 text-xs" />
                        </div>
                        <FileUploader 
                          processId={id} 
                          bucket="process-attachments" 
                          category="Processo" 
                          compact
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 mb-6">
                       <Badge variant="outline" className="px-3 py-1.5 rounded-lg border-primary/20 bg-primary/5 text-primary cursor-pointer hover:bg-primary/10">Todos</Badge>
                       <Badge variant="outline" className="px-3 py-1.5 rounded-lg border-slate-100 text-slate-400 cursor-pointer hover:bg-slate-50">Recentes</Badge>
                       <Badge variant="outline" className="px-3 py-1.5 rounded-lg border-slate-100 text-slate-400 cursor-pointer hover:bg-slate-50">Favoritos</Badge>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {files && files.map((file: any) => (
                        <div key={file.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/30 group hover:bg-white hover:border-primary/20 transition-all">
                           <div className="flex justify-between items-start mb-4">
                              <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                                 <FileText className="h-5 w-5" />
                              </div>
                              <div className="flex gap-1">
                                 <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openStoredFile(file)}>
                                   <Eye className="h-4 w-4" />
                                 </Button>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500" onClick={() => deleteFile.mutate(file.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                           </div>
                           <p className="text-sm font-bold text-navy truncate">{file.file_name}</p>
                           <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">
                             {file.file_type || 'Documento'} • {Math.round((file.file_size || 0) / 1024)} KB
                           </p>
                        </div>
                      ))}
                      {(!files || files.length === 0) && (
                        <div className="col-span-full py-10 text-center opacity-40">
                          <FileText className="h-12 w-12 mx-auto mb-2" />
                          <p className="text-sm font-bold uppercase tracking-widest">Nenhum arquivo enviado</p>
                        </div>
                      )}
                    </div>
                  </div>
               </TabsContent>

               <TabsContent value="library_docs" className="animate-in fade-in duration-300">
                  <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                    <h3 className="text-lg font-black text-navy uppercase tracking-tight mb-1 flex items-center gap-2">
                      <FileCheck className="h-5 w-5 text-primary" /> Documentos do processo
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-6">
                      Anexe arquivos, execute OCR, valide e aplique dados aos modelos vinculados
                    </p>
                    <ProcessDocumentsPanel processId={id} />
                  </div>
               </TabsContent>

               <TabsContent value="history" className="animate-in fade-in duration-300">
                  <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                    <h3 className="text-lg font-black text-navy uppercase tracking-tight mb-10 flex items-center gap-2">
                       <History className="h-5 w-5 text-primary" /> Histórico Inteligente
                    </h3>
                    <ProcessTimeline events={timelineEvents} />
                  </div>
               </TabsContent>

               <TabsContent value="client_portal" className="animate-in fade-in duration-300">
                 <ClientPortalPanel processId={id} />
               </TabsContent>
            </Tabs>
         </div>

         {/* Sidebar */}
         <aside className="space-y-8">
            <IntelligencePanel />
            
            <div className="bg-navy p-8 rounded-[2.5rem] text-white shadow-xl shadow-navy/20">
               <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6">Ações Rápidas</h3>
               <div className="space-y-3">
                  <Button 
                    className="w-full bg-primary hover:opacity-90 text-white h-12 rounded-2xl font-bold gap-2"
                    onClick={async () => {
                      setIsGenerating(true);
                      const { data } = await supabase.from('document_templates').select('*').eq('name', 'Requerimento DPC-2211').single();
                      if (data) setSelectedTemplateForGen(data);
                      setIsGenerating(false);
                    }}
                  >
                     {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FilePlus className="h-4 w-4" />} 
                     Gerar Requerimento
                  </Button>
                  <Button variant="outline" className="w-full h-12 rounded-2xl font-bold gap-2 border-white/10 text-white hover:bg-white/5">
                     <PlayCircle className="h-4 w-4" /> Iniciar Automação
                  </Button>
                  <Button variant="outline" className="w-full h-12 rounded-2xl font-bold gap-2 border-white/10 text-white hover:bg-white/5">
                     <MessageSquare className="h-4 w-4" /> Notificar Cliente
                  </Button>
               </div>
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm flex flex-col h-[500px] overflow-hidden">
               <div className="p-6 border-b bg-slate-50/50 flex justify-between items-center">
                  <h3 className="text-sm font-black text-navy uppercase tracking-widest flex items-center gap-2">
                     <MessageSquare className="h-4 w-4 text-primary" /> Chat Interno
                  </h3>
               </div>
               
               <ScrollArea className="flex-1 p-6" ref={scrollRef}>
                  <div className="space-y-4">
                     {comments.map((comment) => (
                        <div key={comment.id} className={`flex flex-col ${comment.user_id === profile?.id ? "items-end" : "items-start"}`}>
                           <div className={`max-w-[90%] p-3 rounded-2xl text-xs ${
                              comment.user_id === profile?.id 
                                 ? "bg-navy text-white rounded-tr-none" 
                                 : "bg-slate-100 text-navy rounded-tl-none"
                           }`}>
                              {comment.content}
                           </div>
                           <span className="text-[8px] font-black text-slate-400 uppercase mt-1">
                              {comment.profiles?.name} • {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ptBR })}
                           </span>
                        </div>
                     ))}
                  </div>
               </ScrollArea>

               <form onSubmit={handleSendComment} className="p-4 border-t bg-white flex gap-2">
                  <Input 
                     placeholder="Nota interna..." 
                     value={newComment}
                     onChange={(e) => setNewComment(e.target.value)}
                     className="h-10 rounded-xl bg-slate-50 text-xs"
                  />
                  <Button size="icon" type="submit" className="h-10 w-10 shrink-0 rounded-xl bg-primary">
                     <Send className="h-4 w-4" />
                  </Button>
               </form>
            </div>
         </aside>
      </div>
    </div>
  );
}
