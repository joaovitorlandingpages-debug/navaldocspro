import { createFileRoute } from "@tanstack/react-router";
import { 
  Zap, 
  Search, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  BarChart3,
  FileText,
  MousePointer2,
  Camera,
  History,
  Info
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { OCRUpload } from "@/components/ocr/OCRUpload";
import { OCRHistory } from "@/components/ocr/OCRHistory";
import { OCRReview } from "@/components/ocr/OCRReview";
import { BatchOCRQueue } from "@/components/ocr/BatchOCRQueue";
import { OCRJob, useOCR } from "@/hooks/useOCR";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/ocr-center")({
  component: OCRCenterPage,
});

function OCRCenterPage() {
  console.log("OCR_PAGE_OK");
  const { profile } = useAuth();
  const { jobs, isLoading } = useOCR();
  const [selectedJob, setSelectedJob] = useState<OCRJob | null>(null);

  const stats = [
    { label: "Total Processado", value: jobs?.length || "0", icon: <FileText className="text-blue-600" />, trend: "+24% este mês" },
    { label: "Taxa de Sucesso", value: "98.5%", icon: <CheckCircle2 className="text-green-600" />, trend: "Precisão nominal" },
    { label: "Tempo Médio", value: "1.2s", icon: <Clock className="text-amber-600" />, trend: "-0.4s vs ontem" },
    { label: "Pendentes", value: jobs?.filter(j => j.status === 'processing').length || "0", icon: <Zap className="text-primary" />, trend: "Fila em tempo real" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700 max-w-7xl mx-auto pb-20 p-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-3xl font-black text-navy tracking-tight uppercase">Central de OCR</h1>
          </div>
          <p className="text-slate-500 font-medium max-w-lg">
            Extração inteligente de dados via Visão Computacional e IA. Reduza o trabalho manual em até 90%.
          </p>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative group flex-grow md:w-64">
             <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
             <input 
               placeholder="Buscar em documentos..." 
               className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
             />
          </div>
          <Badge variant="secondary" className="h-10 px-4 rounded-xl border-slate-200 bg-white text-navy font-black uppercase text-[10px] tracking-widest flex items-center gap-2">
            <TrendingUp className="h-3 w-3 text-green-500" /> 100% Online
          </Badge>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <Card key={idx} className="p-6 border-none shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
             <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500">
               {stat.icon}
             </div>
             <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="p-2.5 bg-slate-50 rounded-xl group-hover:bg-primary/5 group-hover:text-primary transition-colors">
                   {stat.icon}
                </div>
             </div>
             <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest relative z-10">{stat.label}</p>
             <h3 className="text-2xl font-black text-navy mt-1 relative z-10">{stat.value}</h3>
             <p className="text-[9px] font-bold text-slate-400 mt-2 flex items-center gap-1">
               {stat.trend}
             </p>
          </Card>
        ))}
      </div>

      {/* Main Interface */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column: Upload & History */}
        <div className="lg:col-span-1 space-y-8">
          <Tabs defaultValue="upload" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-slate-100 p-1 rounded-2xl h-12">
              <TabsTrigger value="upload" className="rounded-xl font-bold uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">
                <Camera className="h-3.5 w-3.5 mr-2" /> Novo Scan
              </TabsTrigger>
              <TabsTrigger value="history" className="rounded-xl font-bold uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">
                <History className="h-3.5 w-3.5 mr-2" /> Histórico
              </TabsTrigger>
            </TabsList>
            
            <div className="mt-6">
              <TabsContent value="upload" className="mt-0 focus-visible:outline-none">
                <OCRUpload companyId={profile?.company_id || ""} />
                
                <div className="mt-6">
                  <BatchOCRQueue jobs={jobs || []} />
                </div>
                
                <div className="mt-6 p-4 bg-navy rounded-2xl text-white shadow-xl shadow-navy/20">
                   <div className="flex items-center gap-3 mb-3">
                      <div className="h-8 w-8 bg-white/10 rounded-lg flex items-center justify-center">
                        <BarChart3 className="h-4 w-4 text-primary" />
                      </div>
                      <h4 className="text-xs font-black uppercase tracking-widest">Dica de Performance</h4>
                   </div>
                   <p className="text-[11px] text-white/70 leading-relaxed font-medium">
                      Para melhores resultados em CNH e RG, garanta que o documento esteja em uma superfície plana e com boa iluminação.
                   </p>
                </div>
              </TabsContent>
              
              <TabsContent value="history" className="mt-0 focus-visible:outline-none">
                <OCRHistory 
                  selectedJobId={selectedJob?.id} 
                  onSelectJob={(job) => setSelectedJob(job)} 
                />
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Right Column: Processing & Results */}
        <div className="lg:col-span-2">
          {!selectedJob ? (
            <Card className="h-full border-dashed border-2 flex flex-col items-center justify-center p-20 text-center bg-slate-50/50 rounded-[2.5rem] group hover:border-primary/30 transition-all">
               <div className="h-24 w-24 bg-white rounded-3xl shadow-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500">
                  <MousePointer2 className="h-10 w-10 text-primary animate-bounce" />
               </div>
               <h4 className="text-xl font-black text-navy uppercase tracking-tight mb-2">Aguardando Seleção</h4>
               <p className="text-sm text-slate-400 font-medium max-w-sm">
                 Selecione um documento no histórico ao lado ou faça um novo upload para visualizar os dados extraídos pela nossa IA.
               </p>
               <div className="mt-8 flex gap-2">
                  <Badge variant="outline" className="text-[9px] font-black uppercase border-slate-200">PDF</Badge>
                  <Badge variant="outline" className="text-[9px] font-black uppercase border-slate-200">JPG</Badge>
                  <Badge variant="outline" className="text-[9px] font-black uppercase border-slate-200">PNG</Badge>
               </div>
            </Card>
          ) : (
            <div className="animate-in slide-in-from-right-8 duration-500">
              {selectedJob.status === 'processing' ? (
                <Card className="h-[600px] flex flex-col items-center justify-center p-20 text-center bg-white rounded-[2.5rem] shadow-sm">
                   <div className="relative w-48 h-64 bg-slate-50 rounded-2xl overflow-hidden border-2 border-slate-100 flex items-center justify-center">
                      <FileText className="h-20 w-20 text-slate-200" />
                      <div className="absolute top-0 left-0 w-full h-1 bg-primary shadow-[0_0_15px_rgba(var(--primary),0.8)] animate-scan"></div>
                   </div>
                   <div className="mt-8 space-y-4">
                      <h4 className="text-xl font-black text-navy uppercase tracking-tight">Processando Documento</h4>
                      <div className="flex flex-col items-center gap-2">
                         <div className="flex gap-1">
                            {[1, 2, 3].map(i => (
                              <div key={i} className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />
                            ))}
                         </div>
                         <p className="text-xs text-slate-500 font-medium max-w-xs">
                           Nossa rede neural está identificando campos, OCR e validando assinaturas...
                         </p>
                      </div>
                   </div>
                </Card>
              ) : (
                <OCRReview 
                  jobId={selectedJob.id} 
                  onBack={() => setSelectedJob(null)} 
                  onComplete={() => setSelectedJob(null)} 
                />
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Help Banner */}
      <div className="mt-12 p-1 bg-gradient-to-r from-primary/20 via-primary/5 to-primary/20 rounded-[2rem]">
         <div className="bg-white rounded-[1.9rem] p-8 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-6">
               <div className="h-16 w-16 bg-navy rounded-[1.5rem] flex items-center justify-center shadow-lg">
                  <Info className="h-8 w-8 text-white" />
               </div>
               <div>
                  <h4 className="text-lg font-black text-navy uppercase tracking-tight">Privacidade e Segurança</h4>
                  <p className="text-sm text-slate-500 font-medium max-w-xl">
                    Todos os documentos são processados em servidores criptografados e os dados extraídos são protegidos por sigilo empresarial.
                  </p>
               </div>
            </div>
            <button className="bg-slate-50 hover:bg-slate-100 text-navy px-8 py-3 rounded-2xl font-black uppercase text-xs tracking-widest transition-all">
              Saiba mais sobre IA
            </button>
         </div>
      </div>
    </div>
  );
}
