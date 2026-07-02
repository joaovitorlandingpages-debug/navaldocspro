import { createFileRoute } from "@tanstack/react-router";
import { 
  Zap, 
  Search, 
  CheckCircle2, 
  Clock, 
  FileText,
  MousePointer2,
  Camera,
  History,
  Info,
  TrendingUp,
  BarChart3
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { OCRUpload } from "@/components/ocr/OCRUpload";
import { OCRHistory } from "@/components/ocr/OCRHistory";
import { OCRReview } from "@/components/ocr/OCRReview";
import { OCRJob, useOCR } from "@/hooks/useOCR";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/ocr-review-center")({
  component: OCRReviewCenterPage,
});

function OCRReviewCenterPage() {
  const { profile } = useAuth();
  const { jobs } = useOCR();
  const [selectedJob, setSelectedJob] = useState<OCRJob | null>(null);

  const stats = [
    { label: "Jobs em Revisão", value: jobs?.filter(j => j.status === 'completed').length || "0", icon: <FileText className="text-blue-600" />, trend: "Aguardando aprovação" },
    { label: "Taxa de Precisão", value: "98.2%", icon: <CheckCircle2 className="text-green-600" />, trend: "IA v3.5 ativa" },
    { label: "Tempo de Resposta", value: "0.8s", icon: <Clock className="text-amber-600" />, trend: "Processamento síncrono" },
    { label: "Sincronizados", value: jobs?.filter(j => j.status === 'reviewed').length || "0", icon: <Zap className="text-primary" />, trend: "Dados reais aplicados" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700 max-w-7xl mx-auto pb-20 p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Zap className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-3xl font-black text-navy tracking-tight uppercase">Revisão Inteligente OCR</h1>
          </div>
          <p className="text-slate-500 font-medium max-w-lg text-sm">
            Valide extrações, resolva divergências e alimente o sistema operacional com um clique.
          </p>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
          <Badge variant="secondary" className="h-10 px-4 rounded-xl border-slate-200 bg-white text-navy font-black uppercase text-[10px] tracking-widest flex items-center gap-2">
            <TrendingUp className="h-3 w-3 text-green-500" /> Operação em Tempo Real
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <Card key={idx} className="p-6 border-none shadow-sm hover:shadow-md transition-all group relative overflow-hidden rounded-2xl bg-white">
             <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest mb-1">{stat.label}</p>
             <h3 className="text-2xl font-black text-navy">{stat.value}</h3>
             <p className="text-[9px] font-bold text-slate-400 mt-2 flex items-center gap-1">
               {stat.trend}
             </p>
             <div className="absolute top-4 right-4 opacity-10 group-hover:scale-110 transition-transform">
                {stat.icon}
             </div>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-8">
          <Tabs defaultValue="history" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-slate-100 p-1.5 rounded-2xl h-14">
              <TabsTrigger value="upload" className="rounded-xl font-black uppercase text-[9px] tracking-widest data-[state=active]:bg-white data-[state=active]:text-primary">
                <Camera className="h-3.5 w-3.5 mr-2" /> Upload
              </TabsTrigger>
              <TabsTrigger value="history" className="rounded-xl font-black uppercase text-[9px] tracking-widest data-[state=active]:bg-white data-[state=active]:text-primary">
                <History className="h-3.5 w-3.5 mr-2" /> Fila de Revisão
              </TabsTrigger>
            </TabsList>
            
            <div className="mt-6">
              <TabsContent value="upload" className="mt-0">
                <OCRUpload companyId={profile?.company_id || ""} />
              </TabsContent>
              
              <TabsContent value="history" className="mt-0">
                <OCRHistory 
                  selectedJobId={selectedJob?.id} 
                  onSelectJob={(job) => setSelectedJob(job)} 
                />
              </TabsContent>
            </div>
          </Tabs>
        </div>

        <div className="lg:col-span-2">
          {!selectedJob ? (
            <Card className="h-full border-dashed border-2 flex flex-col items-center justify-center p-20 text-center bg-slate-50/50 rounded-3xl group">
               <div className="h-20 w-20 bg-white rounded-3xl shadow-xl flex items-center justify-center mb-6">
                  <MousePointer2 className="h-8 w-8 text-primary animate-bounce" />
               </div>
               <h4 className="text-xl font-black text-navy uppercase tracking-tight mb-2">Central de Aprovação</h4>
               <p className="text-xs text-slate-400 font-medium max-w-sm">
                 Selecione um documento na fila lateral para iniciar a revisão técnica e aprovação de dados.
               </p>
            </Card>
          ) : (
            <div className="animate-in slide-in-from-right-8 duration-500">
              <OCRReview 
                jobId={selectedJob.id} 
                onBack={() => setSelectedJob(null)} 
                onComplete={() => setSelectedJob(null)} 
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
