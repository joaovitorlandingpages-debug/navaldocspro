import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { 
  ArrowLeft, Calendar, User, Ship, FileText, 
  Clock, CheckCircle2, AlertCircle, MoreHorizontal, 
  Download, Share2, PlayCircle, MessageSquare, Plus,
  FileCheck, History, Info, Zap, Bot, Eye, Trash2,
  Image as ImageIcon, Send, Loader2
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
    
    // Subscribe to new comments
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

  const timeline = [
    { title: "Processo criado", date: "10/05/2026 - 09:45", user: "Ricardo Almeida", icon: <Plus className="h-3 w-3" />, color: "bg-blue-500" },
    { title: "Cliente vinculado", date: "10/05/2026 - 10:15", user: "Ricardo Almeida", icon: <User className="h-3 w-3" />, color: "bg-purple-500" },
    { title: "OCR: Dados Extraídos", date: "10/05/2026 - 10:16", user: "Sistema IA", desc: "CNH processada e campos preenchidos automaticamente.", icon: <Zap className="h-3 w-3" />, color: "bg-amber-500" },
    { title: "Doc: Procuração Gerada", date: "10/05/2026 - 10:17", user: "Sistema", desc: "Template de procuração preenchido com dados do cliente.", icon: <Bot className="h-3 w-3" />, color: "bg-indigo-500" },
    { title: "Documento enviado", date: "11/05/2026 - 14:20", user: "Sistema", desc: "Link de assinatura enviado via WhatsApp.", icon: <FileText className="h-3 w-3" />, color: "bg-blue-400" },
    { title: "GRU anexada", date: "12/05/2026 - 08:30", user: "Cliente", icon: <FileText className="h-3 w-3" />, color: "bg-green-500" },
    { title: "Documento validado", date: "12/05/2026 - 11:00", user: "Admin", desc: "RG e CPF validados com sucesso.", icon: <FileCheck className="h-3 w-3" />, color: "bg-cyan-500" },
  ];


  const documents = [
    { name: "RG / CPF Requerente", type: "PDF", size: "1.2 MB", status: "Validado" },
    { name: "Comprovante de Residência", type: "JPG", size: "2.4 MB", status: "Em Análise" },
    { name: "Procuração Assinada", type: "PDF", size: "0.8 MB", status: "Pendente" },
    { name: "Título de Inscrição (TIE)", type: "PDF", size: "3.1 MB", status: "Correção Necessária" },
    { name: "GRU Paga", type: "PDF", size: "0.5 MB", status: "Validado" },
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
            <span className="text-[10px] font-mono font-black text-primary bg-primary/10 px-2 py-1 rounded uppercase tracking-tighter">{id}</span>
            <h1 className="text-2xl font-black text-navy uppercase tracking-tight">Registro de Embarcação Especial</h1>
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
                    <p className="text-sm font-bold text-navy">Marinha Mercante Ltda</p>
                 </div>
              </div>
              <div className="flex items-center gap-3">
                 <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                    <Ship className="h-5 w-5" />
                 </div>
                 <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Embarcação</p>
                    <p className="text-sm font-bold text-navy">Phoenix (Petroleiro)</p>
                 </div>
              </div>
              <div className="flex items-center gap-3">
                 <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400">
                    <Calendar className="h-5 w-5" />
                 </div>
                 <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Abertura</p>
                    <p className="text-sm font-bold text-navy">10 Mai 2026</p>
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
         {/* Main Column */}
         <div className="lg:col-span-2 space-y-8">
            <Tabs defaultValue="overview" className="w-full">
               <TabsList className="bg-slate-100/50 p-1.5 rounded-2xl border border-slate-100 mb-6 flex-wrap h-auto">
                  <TabsTrigger value="overview" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-xs uppercase tracking-widest">Geral</TabsTrigger>
                  <TabsTrigger value="documents" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-sm font-bold text-xs uppercase tracking-widest">Documentos</TabsTrigger>
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
                              <span className="text-sm font-bold text-navy">Registro Inicial</span>
                           </div>
                           <div className="flex justify-between py-3 border-b border-slate-50">
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Responsável</span>
                              <span className="text-sm font-bold text-navy">Ricardo Almeida</span>
                           </div>
                           <div className="flex justify-between py-3 border-b border-slate-50">
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Prazo</span>
                              <span className="text-sm font-bold text-red-500">25/05/2026 (12 dias)</span>
                           </div>
                           <div className="flex justify-between py-3">
                              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Prioridade</span>
                              <span className="text-sm font-bold text-amber-500">Alta</span>
                           </div>
                        </div>
                     </div>

                     <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between">
                        <div>
                           <h3 className="text-lg font-black text-navy uppercase tracking-tight mb-6 flex items-center gap-2">
                              <CheckCircle2 className="h-5 w-5 text-green-500" /> Progresso
                           </h3>
                           <div className="flex items-center gap-4 mb-2">
                              <div className="text-3xl font-black text-navy">65%</div>
                              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Concluído</div>
                           </div>
                           <div className="h-3 bg-slate-100 rounded-full overflow-hidden mb-8">
                              <div className="h-full bg-green-500 w-[65%] rounded-full shadow-[0_0_10px_rgba(34,197,94,0.3)] transition-all duration-1000" />
                           </div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl">
                           <p className="text-xs text-slate-500 leading-relaxed font-medium">Aguardando apenas a assinatura da procuração para protocolar junto à Capitania.</p>
                        </div>
                     </div>
                  </div>

                  <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                     <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-black text-navy uppercase tracking-tight flex items-center gap-2">
                           <MessageSquare className="h-5 w-5 text-primary" /> Observações Internas
                        </h3>
                        <Button variant="ghost" className="text-xs font-black uppercase text-primary tracking-widest">Editar</Button>
                     </div>
                     <p className="text-sm text-slate-500 leading-relaxed bg-slate-50 p-6 rounded-2xl border border-dashed border-slate-200">
                        O cliente solicitou urgência devido ao contrato de afretamento que inicia no próximo mês. Todos os documentos técnicos da embarcação Phoenix já foram conferidos. Falta apenas o comprovante de residência atualizado do sócio-administrador.
                     </p>
                  </div>
               </TabsContent>

               <TabsContent value="documents" className="animate-in fade-in duration-300">
                  <div className="grid lg:grid-cols-2 gap-8">
                     <div className="space-y-6">
                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                           <h3 className="text-lg font-black text-navy uppercase tracking-tight mb-6 flex items-center justify-between">
                              Anexar Documento
                           </h3>
                           <FileUploader 
                             bucket="process-attachments" 
                             category="attachment" 
                             processId={id}
                             customerId={process?.customer?.id}
                             vesselId={process?.vessel?.id}
                           />
                        </div>
                     </div>

                     <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden h-fit">
                        <div className="p-8 border-b flex justify-between items-center">
                           <h3 className="text-lg font-black text-navy uppercase tracking-tight">Arquivos do Processo</h3>
                           <Badge className="bg-primary/10 text-primary border-none font-black text-[10px] uppercase px-2.5 py-1">{files?.length || 0} Itens</Badge>
                        </div>
                        <div className="p-4 space-y-2">
                           {files?.map((file) => (
                              <div key={file.id} className="p-4 rounded-2xl flex items-center justify-between hover:bg-slate-50 transition-all border-b border-slate-50 last:border-0 group">
                                 <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                                       {file.file_type.includes('image') ? <ImageIcon className="h-6 w-6" /> : <FileText className="h-6 w-6" />}
                                    </div>
                                    <div>
                                       <p className="text-sm font-bold text-navy truncate max-w-[150px]">{file.file_name}</p>
                                       <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-0.5">{file.status === 'validated' ? 'Validado' : 'Em Análise'}</p>
                                    </div>
                                 </div>
                                 <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <a href={file.file_url} target="_blank" rel="noreferrer" className="p-2 text-slate-400 hover:text-navy"><Eye className="h-4 w-4" /></a>
                                    <button onClick={() => deleteFile.mutate(file.id)} className="p-2 text-slate-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                                 </div>
                              </div>
                           ))}
                           
                           {(!files || files.length === 0) && (
                             <div className="text-center py-12">
                                <FileText className="h-10 w-10 text-slate-100 mx-auto mb-2" />
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Nenhum anexo</p>
                             </div>
                           )}
                        </div>
                     </div>
                  </div>
               </TabsContent>

               <TabsContent value="history" className="animate-in fade-in duration-300">
                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                     <h3 className="text-lg font-black text-navy uppercase tracking-tight mb-8 flex items-center gap-2">
                        <History className="h-5 w-5 text-primary" /> Linha do Tempo
                     </h3>
                     <div className="space-y-8 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                        {timeline.map((item, idx) => (
                           <div key={idx} className="relative pl-12">
                              <div className={`absolute left-0 top-0 h-10 w-10 rounded-full ${item.color} text-white flex items-center justify-center shadow-lg border-4 border-white z-10`}>
                                 {item.icon}
                              </div>
                              <div className="bg-slate-50 p-5 rounded-2xl">
                                 <div className="flex flex-wrap justify-between items-start mb-2 gap-2">
                                    <h4 className="text-sm font-black text-navy uppercase tracking-tight">{item.title}</h4>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.date}</span>
                                 </div>
                                 <p className="text-xs text-slate-500 mb-3">{item.desc || "Ação registrada automaticamente pelo sistema."}</p>
                                 <div className="flex items-center gap-2">
                                    <div className="h-5 w-5 rounded-full bg-navy text-white flex items-center justify-center text-[8px] font-black">
                                       {item.user.charAt(0)}
                                    </div>
                                    <span className="text-[10px] font-bold text-navy uppercase tracking-widest">{item.user}</span>
                                 </div>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               </TabsContent>
            </Tabs>
         </div>

         {/* Right Column / Widgets */}
         <div className="space-y-8">
            <div className="bg-navy text-white p-8 rounded-[2rem] shadow-xl relative overflow-hidden group">
               <div className="absolute -right-4 -top-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                  <PlayCircle className="h-40 w-40" />
               </div>
               <div className="relative z-10">
                  <h4 className="text-xl font-bold mb-6">Ações Rápidas</h4>
                  <div className="space-y-3">
                     <Button className="w-full bg-primary hover:opacity-90 h-12 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-lg shadow-primary/20">
                        Validar Documentos
                     </Button>
                     <Button className="w-full bg-white/10 hover:bg-white/20 h-12 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] border border-white/10 transition-all">
                        Anexar Procuração
                     </Button>
                     <Button variant="ghost" className="w-full text-slate-400 hover:text-white h-12 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em]">
                        Suspender Processo
                     </Button>
                  </div>
               </div>
            </div>

            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
               <h3 className="font-bold text-navy mb-6 flex items-center gap-2 uppercase text-xs tracking-[0.2em]">
                  <AlertCircle className="h-4 w-4 text-amber-500" /> Alertas
               </h3>
               <div className="p-4 bg-red-50 rounded-2xl border-l-4 border-red-500">
                  <p className="text-xs font-bold text-navy mb-1">Título de Inscrição Inválido</p>
                  <p className="text-[11px] text-slate-500 leading-relaxed mb-3">O documento enviado está com a data de validade vencida desde 2023.</p>
                  <Button size="sm" className="h-8 bg-red-500 text-white rounded-lg text-[10px] font-black uppercase px-4">Resolver Agora</Button>
               </div>
            </div>

            <div className="bg-slate-100/50 p-8 rounded-[2rem] border border-slate-100 border-dashed">
               <h3 className="font-bold text-slate-400 mb-6 uppercase text-[10px] tracking-[0.2em] text-center">Atalhos do Sistema</h3>
               <div className="grid grid-cols-2 gap-4">
                  <Link to="/customers" className="bg-white p-4 rounded-2xl shadow-sm hover:shadow-md transition-all text-center">
                     <User className="h-5 w-5 text-primary mx-auto mb-2" />
                     <span className="text-[10px] font-black text-navy uppercase">Cliente</span>
                  </Link>
                  <Link to="/vessels" className="bg-white p-4 rounded-2xl shadow-sm hover:shadow-md transition-all text-center">
                     <Ship className="h-5 w-5 text-cyan-500 mx-auto mb-2" />
                     <span className="text-[10px] font-black text-navy uppercase">Embarcação</span>
                  </Link>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
