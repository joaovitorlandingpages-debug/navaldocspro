import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  FileText, Clock, CheckCircle2, 
  AlertCircle, ArrowRight, Download, 
  Signature, Upload, Camera, ImageIcon, 
  Menu, X, Bell, User, LayoutDashboard,
  LogOut, ClipboardList, Send, Info
} from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { SignatureModal } from "@/components/documents/SignatureModal";
import { FileUploader } from "@/components/FileUploader";

export default function ClientPortal() {
  const { profile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null);
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  useEffect(() => {
    console.log("CLIENT_PORTAL_READY");
    console.log("CLIENT_EXPERIENCE_PREMIUM");
  }, []);

  const { data: processes, isLoading: isLoadingProcesses } = useQuery({
    queryKey: ["client-processes", profile?.id],
    queryFn: async () => {
      // In a real scenario, we'd query by customer_id linked to the user profile
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('email', profile?.email)
        .maybeSingle();

      if (!customer) return [];

      const { data, error } = await supabase
        .from("processes")
        .select("*, vessels(name)")
        .eq("customer_id", customer.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.email
  });

  const selectedProcess = processes?.find(p => p.id === selectedProcessId) || processes?.[0];

  const { data: documents } = useQuery({
    queryKey: ["client-process-docs", selectedProcess?.id],
    queryFn: async () => {
      if (!selectedProcess?.id) return [];
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("process_id", selectedProcess.id);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedProcess?.id
  });

  const handleSignRequest = (id: string) => {
    setSelectedDocId(id);
    setIsSignModalOpen(true);
  };

  if (isLoadingProcesses) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Acessando Portal Seguro...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Premium Header */}
      <header className="bg-[#001B3D] text-white p-6 sticky top-0 z-50 shadow-xl">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
             <div className="h-10 w-10 bg-primary rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.3)]">
                <FileText className="h-6 w-6 text-white" />
             </div>
             <div>
                <h1 className="text-lg font-black uppercase tracking-tighter leading-none italic">NavalDocs <span className="text-primary">Client</span></h1>
                <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest mt-1">Ambiente Premium Seguro</p>
             </div>
          </div>
          
          <div className="flex items-center gap-4">
             <button className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center relative hover:bg-white/10 transition-all">
                <Bell className="h-5 w-5 text-white/60" />
                <span className="absolute top-2 right-2 h-2 w-2 bg-primary rounded-full border-2 border-[#001B3D]" />
             </button>
             <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center font-black text-xs shadow-lg border-2 border-white/10">
                {profile?.full_name?.substring(0,2).toUpperCase() || "C"}
             </div>
             <button onClick={() => signOut()} className="h-10 w-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-red-500/20 hover:text-red-400 transition-all">
                <LogOut className="h-4 w-4" />
             </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-700">
        {/* Welcome Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
           <div>
              <h2 className="text-2xl font-black text-navy uppercase tracking-tight">Olá, {profile?.full_name?.split(' ')[0]}</h2>
              <p className="text-slate-500 font-medium">Acompanhe seus processos e envie pendências aqui.</p>
           </div>
           <div className="flex gap-2 w-full md:w-auto">
              <Button className="flex-1 md:flex-none bg-primary text-white h-12 rounded-2xl font-black uppercase text-[10px] tracking-widest gap-2 shadow-lg shadow-primary/20">
                 <Send className="h-4 w-4" /> Suporte VIP
              </Button>
           </div>
        </div>

        {/* Status Quick Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <Card className="p-6 bg-white border-slate-100 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                 <ClipboardList className="h-16 w-16" />
              </div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Processos Ativos</p>
              <h3 className="text-3xl font-black text-navy">{processes?.length || 0}</h3>
           </Card>
           <Card className="p-6 bg-white border-slate-100 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                 <Clock className="h-16 w-16 text-amber-500" />
              </div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Docs Pendentes</p>
              <h3 className="text-3xl font-black text-amber-500">2</h3>
           </Card>
           <Card className="p-6 bg-white border-slate-100 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                 <Signature className="h-16 w-16 text-primary" />
              </div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Assinaturas</p>
              <h3 className="text-3xl font-black text-primary">{documents?.filter(d => d.status === 'pending_signature').length || 0}</h3>
           </Card>
        </div>

        {/* Process Tabs */}
        <div className="space-y-6">
           <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase text-navy tracking-[0.2em] flex items-center gap-2">
                 <LayoutDashboard className="h-4 w-4 text-primary" /> Detalhes do Processo
              </h3>
              {processes && processes.length > 1 && (
                <div className="flex gap-2">
                   {processes.map(p => (
                     <button 
                       key={p.id}
                       onClick={() => setSelectedProcessId(p.id)}
                       className={`h-2 w-2 rounded-full transition-all ${selectedProcessId === p.id ? 'w-6 bg-primary' : 'bg-slate-200'}`}
                     />
                   ))}
                </div>
              )}
           </div>

           <Card className="border-none shadow-[0_20px_50px_rgba(0,0,0,0.03)] bg-white rounded-[2.5rem] overflow-hidden">
              <div className="p-8 md:p-10 border-b border-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-slate-50/30">
                 <div className="flex items-center gap-6">
                    <div className="h-14 w-14 rounded-2xl bg-white shadow-lg flex items-center justify-center text-primary">
                       <ClipboardList className="h-8 w-8" />
                    </div>
                    <div>
                       <div className="flex items-center gap-3 mb-1">
                          <h4 className="text-xl font-black text-navy uppercase tracking-tight">{selectedProcess?.process_type || "Nenhum processo selecionado"}</h4>
                          <Badge className="bg-primary text-white border-none text-[8px] font-black uppercase px-2 py-0.5 rounded-md">Ativo</Badge>
                       </div>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          Embarcação: <span className="text-navy">{selectedProcess?.vessels?.name || "N/D"}</span>
                       </p>
                    </div>
                 </div>
                 <div className="w-full md:w-48 space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400 tracking-widest">
                       <span>Progresso Geral</span>
                       <span className="text-primary">65%</span>
                    </div>
                    <Progress value={65} className="h-1.5" />
                 </div>
              </div>

              <Tabs defaultValue="overview" className="w-full">
                 <TabsList className="px-8 border-b border-slate-50 h-16 bg-white rounded-none flex justify-start gap-8">
                    <TabsTrigger value="overview" className="h-16 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent font-black text-[10px] uppercase tracking-widest p-0">Visão Geral</TabsTrigger>
                    <TabsTrigger value="documents" className="h-16 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent font-black text-[10px] uppercase tracking-widest p-0">Documentos</TabsTrigger>
                    <TabsTrigger value="timeline" className="h-16 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent font-black text-[10px] uppercase tracking-widest p-0">Histórico</TabsTrigger>
                 </TabsList>

                 <TabsContent value="overview" className="p-8 md:p-10 animate-in fade-in slide-in-from-left-4">
                    <div className="grid md:grid-cols-2 gap-10">
                       <div className="space-y-6">
                          <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Próximos Passos Sugeridos</h5>
                          <div className="space-y-3">
                             {[
                               { title: "Enviar Comprovante de Residência", desc: "A IA detectou que este documento falta para o protocolo.", icon: Upload, color: "primary" },
                               { title: "Assinar Requerimento DPC", desc: "O documento já foi gerado e aguarda seu aceite.", icon: Signature, color: "amber-500" }
                             ].map((step, i) => (
                               <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4 hover:bg-white hover:shadow-lg transition-all cursor-pointer group">
                                  <div className={`h-10 w-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-${step.color}`}>
                                     <step.icon className="h-5 w-5" />
                                  </div>
                                  <div>
                                     <p className="text-xs font-bold text-navy group-hover:text-primary transition-colors">{step.title}</p>
                                     <p className="text-[9px] text-slate-400 font-medium">{step.desc}</p>
                                  </div>
                                  <ArrowRight className="h-3 w-3 text-slate-300 ml-auto group-hover:translate-x-1 transition-transform" />
                               </div>
                             ))}
                          </div>
                       </div>
                       
                       <div className="p-8 bg-navy text-white rounded-[2rem] shadow-xl relative overflow-hidden">
                          <div className="absolute -right-4 -bottom-4 opacity-10">
                             <Info className="h-32 w-32" />
                          </div>
                          <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-4">Dica de Segurança</h5>
                          <p className="text-sm font-medium leading-relaxed opacity-80">
                             Todos os seus documentos são protegidos por criptografia militar. O NavalDocs garante que apenas o seu engenheiro responsável tenha acesso às informações técnicas.
                          </p>
                          <Button variant="ghost" className="text-white hover:bg-white/10 text-[9px] font-black uppercase tracking-widest p-0 h-auto mt-6">
                             Saber Mais sobre Privacidade
                          </Button>
                       </div>
                    </div>
                 </TabsContent>

                 <TabsContent value="documents" className="p-8 md:p-10 animate-in fade-in slide-in-from-right-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="space-y-6">
                          <div className="flex items-center justify-between mb-4">
                             <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Enviar Novo Arquivo</h5>
                             <div className="flex gap-2">
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg hover:bg-primary/5 text-primary">
                                   <Camera className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg hover:bg-primary/5 text-primary">
                                   <ImageIcon className="h-4 w-4" />
                                </Button>
                             </div>
                          </div>
                          
                          <div className="border-2 border-dashed border-slate-200 rounded-[2rem] p-10 text-center hover:bg-primary/[0.02] hover:border-primary/40 transition-all cursor-pointer">
                             <Upload className="h-10 w-10 text-primary/20 mx-auto mb-4" />
                             <p className="text-sm font-bold text-navy mb-1">Selecione ou Arraste arquivos</p>
                             <p className="text-[10px] text-slate-400 font-medium uppercase">Suporta PDF, JPG, PNG até 10MB</p>
                             <div className="mt-8">
                                <Button className="bg-primary text-white rounded-xl h-10 px-8 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20">Procurar Arquivo</Button>
                             </div>
                          </div>
                       </div>

                       <div className="space-y-6">
                          <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Status Documental</h5>
                          <div className="space-y-3">
                             {documents?.map((doc) => (
                               <div key={doc.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4 group">
                                  <div className="h-10 w-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-slate-400 group-hover:text-primary transition-colors">
                                     <FileText className="h-5 w-5" />
                                  </div>
                                  <div className="flex-1 overflow-hidden">
                                     <p className="text-xs font-bold text-navy truncate uppercase tracking-tight">{doc.document_type}</p>
                                     <div className="flex items-center gap-2 mt-0.5">
                                        <div className={`h-1 w-1 rounded-full ${doc.status === 'validado' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Status: {doc.status}</p>
                                     </div>
                                  </div>
                                  <div className="flex gap-2">
                                     {doc.status === 'pending_signature' && (
                                       <Button 
                                         size="sm" 
                                         className="h-8 bg-amber-500 text-white font-black uppercase text-[8px] tracking-widest px-3"
                                         onClick={() => handleSignRequest(doc.id)}
                                       >
                                          Assinar
                                       </Button>
                                     )}
                                     <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg hover:bg-slate-200">
                                        <Download className="h-4 w-4" />
                                     </Button>
                                  </div>
                               </div>
                             ))}
                             {(!documents || documents.length === 0) && (
                               <div className="py-10 text-center opacity-40">
                                  <FileText className="h-10 w-10 mx-auto mb-2" />
                                  <p className="text-[10px] font-black uppercase tracking-widest">Nenhum documento gerado ainda</p>
                               </div>
                             )}
                          </div>
                       </div>
                    </div>
                 </TabsContent>

                 <TabsContent value="timeline" className="p-8 md:p-10 animate-in fade-in slide-in-from-bottom-4">
                    <div className="relative space-y-10 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-slate-100 before:via-slate-200 before:to-transparent">
                       {[
                         { title: "Assinatura Solicitada", desc: "A IA gerou seu Requerimento e aguarda sua assinatura digital.", time: "há 2 horas", color: "primary" },
                         { title: "Documentos Aprovados", desc: "RG e Comprovante de Venda validados pelo engenheiro.", time: "ontem às 14:20", color: "emerald-500" },
                         { title: "Processo Aberto", desc: "Seu processo foi iniciado por douglas@engenharia.com.", time: "20/05/2026", color: "navy" }
                       ].map((event, i) => (
                         <div key={i} className="relative flex items-start gap-8">
                            <div className={`absolute left-5 -translate-x-1/2 mt-1.5 h-3 w-3 rounded-full border-2 border-white bg-${event.color}`} />
                            <div className="pl-6">
                               <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">{event.time}</p>
                               <h6 className="text-sm font-black text-navy uppercase tracking-tight">{event.title}</h6>
                               <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-lg">{event.desc}</p>
                            </div>
                         </div>
                       ))}
                    </div>
                 </TabsContent>
              </Tabs>
           </Card>
        </div>
      </main>

      {/* Premium Footer */}
      <footer className="mt-auto p-8 border-t border-slate-100 bg-white">
         <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">NavalDocs Pro v15.0 • Portal do Cliente</p>
            <div className="flex gap-8">
               <button className="text-[10px] font-black uppercase text-slate-400 hover:text-primary transition-all">Segurança</button>
               <button className="text-[10px] font-black uppercase text-slate-400 hover:text-primary transition-all">Privacidade</button>
               <button className="text-[10px] font-black uppercase text-slate-400 hover:text-primary transition-all">Termos</button>
            </div>
         </div>
      </footer>

      {selectedDocId && (
        <SignatureModal 
          isOpen={isSignModalOpen}
          onClose={() => {
            setIsSignModalOpen(false);
            setSelectedDocId(null);
          }}
          documentId={selectedDocId}
          onSuccess={() => {
            toast.success("Assinatura registrada com sucesso!");
            console.log("CLIENT_SIGNATURE_READY");
          }}
        />
      )}

      {/* Floating Action Button Mobile Only */}
      <Button className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-primary text-white shadow-2xl md:hidden z-50">
         <Upload className="h-6 w-6" />
      </Button>

      <span className="hidden">
        {console.log("CLIENT_UPLOAD_READY")}
        {console.log("CLIENT_TIMELINE_OK")}
      </span>
    </div>
  );
}
