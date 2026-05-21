import { useState } from "react";
import { 
  Zap, FileText, Check, Loader2, 
  AlertCircle, ArrowRight, ShieldCheck,
  RefreshCcw, User, Ship, ChevronRight
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { OCRUpload } from "./ocr/OCRUpload";
import { useAuth } from "@/hooks/useAuth";
import { useOCR } from "@/hooks/useOCR";
import { Link } from "@tanstack/react-router";

export function SmartOCR() {
  const { profile } = useAuth();
  const { jobs } = useOCR();
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  
  const displayJobs = jobs && jobs.length > 0 ? jobs : [
    { id: 'm1', status: 'completed', confidence_score: 0.98, identified_document_type: 'PERSONAL_IDENTITY', document_type: 'RG', uploaded_files: { file_name: 'RG_ENG_DOUGLAS.JPG' }, extracted_data: { name: 'DOUGLAS ENGENHARIA', doc_number: '123.456.789-00' } },
    { id: 'm2', status: 'processing', confidence_score: 0.85, identified_document_type: 'VESSEL_TIE', document_type: 'TIE', uploaded_files: { file_name: 'TIE_PHOENIX_OPS_01.PDF' }, extracted_data: { vessel_name: 'PHOENIX OPS-01' } },
    { id: 'm3', status: 'completed', confidence_score: 0.95, identified_document_type: 'CNH', document_type: 'CNH', uploaded_files: { file_name: 'CNH_DESPACHANTE.JPG' }, extracted_data: { name: 'MARCUS DESPACHANTE', doc_number: '445.667.889-11' } },
  ] as any[];

  const isMock = !jobs || jobs.length === 0;
  const currentJob = displayJobs.find(j => j.id === activeJobId) || (activeJobId === null && displayJobs.length > 0 ? displayJobs[0] : undefined);

  console.log("OCR_OPERATIONAL_READY");
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
           <h3 className="text-xl font-black text-navy uppercase tracking-tight flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" /> OCR Inteligente
           </h3>
           <p className="text-xs text-slate-500 font-medium">Extraia dados de CNH, RG e documentos navais automaticamente.</p>
        </div>
        <Link to="/ocr-review-center">
           <Button variant="ghost" className="text-[10px] font-black uppercase tracking-widest text-primary gap-2">
              Ver Central Completa <ChevronRight className="h-3 w-3" />
           </Button>
        </Link>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Coluna de Upload */}
        <div className="space-y-6">
           <OCRUpload companyId={profile?.company_id || ""} />

           <div className="space-y-3">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Jobs Recentes</p>
              <div className="grid gap-2">
                  {displayJobs?.slice(0, 3).map((job) => (
                   <div 
                    key={job.id} 
                    onClick={() => setActiveJobId(job.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${isMock ? 'opacity-50 grayscale' : ''} ${
                      activeJobId === job.id || (activeJobId === null && job.id === displayJobs[0].id) ? "border-primary bg-primary/5" : "border-slate-100 hover:bg-slate-50"
                    }`}
                   >
                      <div className="flex items-center gap-3">
                         <div className="h-8 w-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                            <FileText className="h-4 w-4" />
                         </div>
                         <div>
                            <p className="text-xs font-bold text-navy truncate max-w-[120px]">{job.uploaded_files?.file_name || "Documento IA"}</p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase">{job.document_type || "Geral"}</p>
                         </div>
                      </div>
                      <Badge variant={job.status === 'reviewed' ? 'default' : 'secondary'} className="text-[8px] uppercase font-black">
                         {job.status === 'reviewed' ? 'Sincronizado' : job.status === 'completed' ? 'Pendente' : job.status === 'processing' ? 'IA Lendo...' : 'Fila'}
                      </Badge>
                   </div>
                 ))}
              </div>
           </div>
        </div>

        {/* Coluna de Resultado Rápido */}
        <div className="relative">
           {!currentJob ? (
             <Card className="h-full border-dashed border-2 flex flex-col items-center justify-center p-12 text-center bg-slate-50/50 rounded-3xl group">
                <div className="h-16 w-16 bg-white rounded-2xl shadow-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                   <Zap className="h-8 w-8 text-slate-200" />
                </div>
                <p className="text-sm font-bold text-slate-400 max-w-xs">Selecione um job ao lado ou envie um novo arquivo para ver a prévia da extração.</p>
             </Card>
           ) : (
             <Card className={`p-8 rounded-[2.5rem] border-slate-100 shadow-xl space-y-8 animate-in fade-in zoom-in-95 duration-300 relative overflow-hidden ${isMock ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-[80px] -mr-6 -mt-6"></div>
                
                <div className="flex justify-between items-start relative z-10">
                   <div className="flex items-center gap-3">
                      <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                         <Zap className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                         <p className="text-[10px] font-black uppercase text-primary tracking-widest">{isMock ? 'Exemplo IA' : 'Preview IA'}</p>
                         <h4 className="font-bold text-navy truncate max-w-[150px]">{currentJob?.uploaded_files?.file_name}</h4>
                      </div>
                   </div>
                   {currentJob?.confidence_score && (
                     <Badge className="bg-green-500 text-white border-none font-black text-[9px] tracking-widest uppercase">
                        Confiança: {(currentJob.confidence_score * 100).toFixed(0)}%
                     </Badge>
                   )}
                </div>

                <div className="space-y-6 relative z-10">
                   {currentJob?.status === 'processing' ? (
                     <div className="py-20 flex flex-col items-center justify-center gap-4">
                        <Loader2 className="h-10 w-10 text-primary animate-spin" />
                        <div className="text-center">
                           <p className="text-sm font-bold text-navy uppercase">Lendo Campos...</p>
                           <p className="text-[10px] text-slate-400 font-bold">Nossa rede neural está identificando o documento.</p>
                        </div>
                     </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 gap-4">
                           <div className="space-y-1">
                              <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Dados Primários</p>
                              <div className="p-4 bg-slate-50 rounded-2xl text-xs font-bold border border-slate-100 flex items-center justify-between">
                                 <div className="flex items-center gap-3">
                                    <User className="h-4 w-4 text-primary" />
                                    <span className="truncate max-w-[180px]">{currentJob?.extracted_data?.name || currentJob?.extracted_data?.person?.nome || "Não detectado"}</span>
                                 </div>
                                 {currentJob?.status === 'reviewed' && <Check className="h-4 w-4 text-green-500" />}
                              </div>
                           </div>
                           
                           {currentJob?.extracted_data?.doc_number && (
                              <div className="p-4 bg-slate-50 rounded-2xl text-xs font-bold border border-slate-100 flex items-center justify-between">
                                 <div className="flex items-center gap-3">
                                    <FileText className="h-4 w-4 text-primary" />
                                    <span>{currentJob.extracted_data.doc_number}</span>
                                 </div>
                              </div>
                           )}

                           {(currentJob?.extracted_data?.vessel_name || currentJob?.extracted_data?.vessel?.nome) && (
                              <div className="p-4 bg-navy text-white rounded-2xl text-xs font-bold flex items-center justify-between">
                                 <div className="flex items-center gap-3">
                                    <Ship className="h-4 w-4 text-primary" />
                                    <span className="truncate max-w-[180px]">{currentJob.extracted_data.vessel_name || currentJob.extracted_data.vessel?.nome}</span>
                                 </div>
                                 <Badge variant="outline" className="border-white/20 text-white/60 text-[8px] font-black">{currentJob.extracted_data.inscription || "TIE"}</Badge>
                              </div>
                           )}
                        </div>

                        <div className="p-5 bg-blue-50 border border-blue-100 rounded-[1.5rem] flex items-center gap-4 shadow-sm">
                           <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center shrink-0 border border-blue-100">
                              <ShieldCheck className="h-5 w-5 text-blue-500" />
                           </div>
                           <p className="text-[11px] text-blue-700 font-bold leading-relaxed">
                              Este documento foi identificado como <span className="uppercase">{currentJob?.identified_document_type || "Geral"}</span>.
                           </p>
                        </div>

                        <div className="flex gap-2">
                           <Link to="/ocr-review-center" className="flex-1">
                              <Button className="w-full bg-primary text-white rounded-xl h-12 font-black uppercase text-[10px] tracking-widest gap-2 shadow-lg shadow-primary/20">
                                 <ArrowRight className="h-4 w-4" /> Abrir Revisor Completo
                              </Button>
                           </Link>
                        </div>
                      </>
                    )}

                </div>
             </Card>
           )}
        </div>
      </div>
    </div>
  );
}