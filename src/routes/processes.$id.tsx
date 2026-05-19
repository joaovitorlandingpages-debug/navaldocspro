import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { 
  ArrowLeft, Calendar, User, Ship, FileText, 
  Clock, CheckCircle2, AlertCircle, MoreHorizontal, 
  Download, Share2, PlayCircle, MessageSquare, Plus,
  FileCheck, History, Info, Zap, Bot, Eye, Trash2,
  Image as ImageIcon, Send, Loader2, Target
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useRef } from "react";
import { useFiles } from "@/hooks/useFiles";
import { FileUploader } from "@/components/FileUploader";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { ProcessChecklist } from "@/components/ProcessChecklist";
import { SmartAutomationDashboard } from "@/components/automation/SmartAutomationDashboard";
import { ProcessTimeline } from "@/components/ProcessTimeline";

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

  const fetchProcess = async () => {
    const { data } = await supabase
      .from('processes')
      .select(`
        *,
        customer:customers(id, name),
        vessel:vessels(id, name)
      `)
      .eq('id', id)
      .single();
    if (data) {
      setProcess(data);
      setStatus(data.status === 'in_progress' ? 'Em Andamento' : data.status);
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
    fetchProcess();
    fetchComments();
    
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'process_comments', filter: `process_id=eq.${id}` },
        () => fetchComments()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  useEffect(() => {
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

  const timelineEvents: any[] = [
    { id: "1", type: "creation", user: "Ricardo Almeida", description: "Processo aberto no sistema.", date: "2026-05-10T09:45:00Z" },
    { id: "2", type: "update", user: "Ricardo Almeida", description: "Cliente vinculado e embarcação selecionada.", date: "2026-05-10T10:15:00Z" },
    { id: "3", type: "update", user: "Sistema IA", description: "OCR: CNH processada e campos preenchidos automaticamente.", date: "2026-05-10T10:16:00Z" },
    { id: "4", type: "signature", user: "Eng. Mariana", description: "Procuração assinada digitalmente.", date: "2026-05-10T14:20:00Z" },
    { id: "5", type: "protocol", user: "Sistema", description: "Processo enviado para protocolo na Marinha.", date: "2026-05-11T08:30:00Z" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <Link to="/processes" className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all">
            <ArrowLeft className="h-5 w-5 text-navy" />
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[10px] font-mono font-black text-primary bg-primary/10 px-2 py-1 rounded uppercase tracking-tighter">{id.substring(0, 8)}</span>
            <h1 className="text-2xl font-black text-navy uppercase tracking-tight">{process?.process_type || "Carregando..."}</h1>
            <Badge className="bg-amber-500 text-white border-none px-3 py-1 rounded-lg font-black text-[10px] uppercase tracking-widest">{status}</Badge>
          </div>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
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

           <div className="flex gap-2 w-full md:w-auto">
              <Button variant="outline" className="flex-1 md:flex-none h-11 rounded-xl gap-2 font-bold border-slate-200">
                 <Share2 className="h-4 w-4" /> WhatsApp
              </Button>
              <Button variant="outline" className="flex-1 md:flex-none h-11 rounded-xl gap-2 font-bold border-slate-200">
                 <Download className="h-4 w-4" /> Gerar PDF
              </Button>
              <Button className="flex-1 md:flex-none bg-primary text-white h-11 rounded-xl gap-2 font-bold hover:opacity-90 shadow-lg shadow-primary/20">
                 Finalizar Processo
              </Button>
           </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
         <div className="lg:col-span-2 space-y-8">
            <Tabs defaultValue="overview" className="w-full">
               <TabsList className="bg-slate-100/50 p-1.5 rounded-2xl border border-slate-100 mb-6 flex-wrap h-auto">
                  <TabsTrigger value="overview" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-xs uppercase tracking-widest">Geral</TabsTrigger>
                  <TabsTrigger value="automation" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                    <Zap className="h-3 w-3" /> Automação IA
                  </TabsTrigger>
                  <TabsTrigger value="requirements" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-xs uppercase tracking-widest">Checklist</TabsTrigger>
                  <TabsTrigger value="documents" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-xs uppercase tracking-widest">Arquivos</TabsTrigger>
                  <TabsTrigger value="comments" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-xs uppercase tracking-widest flex gap-2 items-center">
                    Notas {comments.length > 0 && <span className="bg-primary text-white text-[10px] px-1.5 rounded-full">{comments.length}</span>}
                  </TabsTrigger>
                  <TabsTrigger value="history" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-xs uppercase tracking-widest">Histórico</TabsTrigger>
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
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Responsável</span>
                              <span className="text-sm font-bold text-navy">Ricardo Almeida</span>
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
                           <div className="space-y-4">
                              <div className="flex justify-between items-end">
                                 <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status do Prazo</p>
                                    <p className="text-sm font-bold text-navy">No prazo operacional</p>
                                 </div>
                                 <p className="text-xs font-black text-primary uppercase">80%</p>
                              </div>
                              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                 <div className="h-full bg-primary rounded-full" style={{ width: '80%' }} />
                              </div>
                              <p className="text-[10px] text-slate-400 italic">Previsão de conclusão em 2 dias úteis.</p>
                           </div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl mt-6">
                           <p className="text-xs text-slate-500 leading-relaxed font-medium">{process?.notes || "Nenhuma observação interna registrada."}</p>
                        </div>
                     </div>
                  </div>
               </TabsContent>

               <TabsContent value="automation" className="space-y-8 animate-in fade-in duration-300">
                  <SmartAutomationDashboard processId={id} />
               </TabsContent>

               <TabsContent value="requirements" className="space-y-8 animate-in fade-in duration-300">
                  <ProcessChecklist processId={id} processTypeId={process?.process_type_id} />
               </TabsContent>

               <TabsContent value="documents" className="animate-in fade-in duration-300">
                  <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-black text-navy uppercase tracking-tight flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" /> Arquivos Enviados
                      </h3>
                      <div className="w-64">
                        <FileUploader 
                          processId={id} 
                          bucket="process-attachments" 
                          category="Processo" 
                          compact
                        />
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {files && files.map((file: any) => (
                        <div key={file.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/30 group hover:bg-white hover:border-primary/20 transition-all">
                           <div className="flex justify-between items-start mb-4">
                              <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                                 <FileText className="h-5 w-5" />
                              </div>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild>
                                  <a href={file.file_url} target="_blank" rel="noreferrer"><Eye className="h-4 w-4" /></a>
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

               <TabsContent value="comments" className="animate-in fade-in duration-300">
                  <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm flex flex-col h-[600px] overflow-hidden">
                    <div className="p-6 border-b bg-slate-50/50 flex justify-between items-center">
                      <h3 className="text-sm font-black text-navy uppercase tracking-widest flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-primary" /> Comunicação Interna
                      </h3>
                      <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-200">Visível apenas para equipe</Badge>
                    </div>
                    
                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-50/30">
                      {comments.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                          <MessageSquare className="h-12 w-12 mb-4" />
                          <p className="text-sm font-bold uppercase tracking-widest">Nenhum comentário ainda</p>
                          <p className="text-xs">Inicie a conversa sobre este processo.</p>
                        </div>
                      ) : (
                        comments.map((comment) => (
                          <div key={comment.id} className={`flex flex-col ${comment.user_id === profile?.id ? "items-end" : "items-start"}`}>
                            <div className={`max-w-[80%] p-4 rounded-2xl ${
                              comment.user_id === profile?.id 
                                ? "bg-navy text-white rounded-tr-none" 
                                : "bg-white text-navy rounded-tl-none border border-slate-100 shadow-sm"
                            }`}>
                              <p className="text-sm leading-relaxed">{comment.content}</p>
                            </div>
                            <div className="flex items-center gap-2 mt-2 px-1">
                               <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">
                                 {comment.profiles?.name} • {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ptBR })}
                               </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <form onSubmit={handleSendComment} className="p-6 border-t bg-white flex gap-3">
                      <Input 
                        placeholder="Digite sua nota interna..." 
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="h-12 rounded-xl bg-slate-50 border-slate-100 focus:bg-white"
                      />
                      <Button 
                        type="submit" 
                        disabled={!newComment.trim() || isSubmittingComment}
                        className="h-12 w-12 rounded-xl p-0 bg-primary hover:opacity-90 shadow-lg shadow-primary/20"
                      >
                        {isSubmittingComment ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                      </Button>
                    </form>
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
            </Tabs>
         </div>

         {/* Sidebar */}
         <div className="space-y-8">
            <div className="bg-navy p-8 rounded-[2.5rem] text-white shadow-xl shadow-navy/20">
               <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6">Ações Rápidas</h3>
               <div className="space-y-3">
                  <Button className="w-full bg-primary hover:opacity-90 text-white h-12 rounded-2xl font-bold gap-2">
                     <FileCheck className="h-4 w-4" /> Validar Documentos
                  </Button>
                  <Button variant="outline" className="w-full h-12 rounded-2xl font-bold gap-2 border-white/10 text-white hover:bg-white/5">
                     <PlayCircle className="h-4 w-4" /> Iniciar Automação
                  </Button>
                  <Button variant="outline" className="w-full h-12 rounded-2xl font-bold gap-2 border-white/10 text-white hover:bg-white/5">
                     <MessageSquare className="h-4 w-4" /> Notificar Cliente
                  </Button>
               </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
               <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6">Equipe Vinculada</h3>
               <div className="space-y-4">
                  {[
                    { name: "Ricardo Almeida", role: "Engenheiro Responsável", avatar: "RA" },
                    { name: "Ana Paula", role: "Assistente Documental", avatar: "AP" }
                  ].map((user) => (
                    <div key={user.name} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100">
                       <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">{user.avatar}</div>
                       <div>
                          <p className="text-xs font-bold text-navy">{user.name}</p>
                          <p className="text-[10px] font-medium text-slate-500">{user.role}</p>
                       </div>
                    </div>
                  ))}
                  <Button variant="ghost" className="w-full mt-4 text-[10px] font-black uppercase tracking-widest text-primary gap-2">
                     <Plus className="h-3 w-3" /> Gerenciar Equipe
                  </Button>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
