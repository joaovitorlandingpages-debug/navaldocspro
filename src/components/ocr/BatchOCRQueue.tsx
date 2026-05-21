import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle2, AlertCircle, Zap, FileText, Clock, Activity } from "lucide-react";
import { OCRJob } from "@/hooks/useOCR";

interface BatchOCRQueueProps {
  jobs: OCRJob[];
  isLoading?: boolean;
}

export function BatchOCRQueue({ jobs, isLoading }: BatchOCRQueueProps) {
  const activeJobs = jobs.filter(j => j.status === 'pending' || j.status === 'processing');
  const completedToday = jobs.filter(j => 
    j.status === 'completed' && 
    new Date(j.created_at).toDateString() === new Date().toDateString()
  );

  if (activeJobs.length === 0 && completedToday.length === 0) {
    return null;
  }

  return (
    <Card className="p-6 border-none shadow-xl bg-white rounded-[2rem] space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <Zap className="h-5 w-5 text-primary animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-black text-navy uppercase tracking-widest">Fila de Processamento</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase">Monitorando redes neurais</p>
          </div>
        </div>
        <Badge variant="secondary" className="bg-slate-50 text-slate-400 border-none font-black text-[9px] uppercase tracking-widest">
          {activeJobs.length} ativos
        </Badge>
      </div>

      <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
        {activeJobs.map((job) => (
          <div key={job.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-primary/20 transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-8 w-8 bg-white rounded-lg flex items-center justify-center border border-slate-100 shrink-0">
                  <FileText className="h-4 w-4 text-slate-400" />
                </div>
                <div className="truncate">
                  <p className="text-[11px] font-black text-navy uppercase truncate">
                    {job.uploaded_files?.file_name || 'Documento...'}
                  </p>
                  <p className="text-[9px] text-slate-400 font-bold uppercase">{job.document_type}</p>
                </div>
              </div>
              {job.status === 'processing' ? (
                <Loader2 className="h-4 w-4 text-primary animate-spin" />
              ) : (
                <Clock className="h-4 w-4 text-amber-500" />
              )}
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-[8px] font-black uppercase text-slate-400">
                <span>{job.status === 'processing' ? 'Extraindo Dados...' : 'Na Fila'}</span>
                <span>{job.status === 'processing' ? '45%' : '0%'}</span>
              </div>
              <Progress value={job.status === 'processing' ? 45 : 5} className="h-1 bg-white" />
            </div>
          </div>
        ))}

        {completedToday.slice(0, 3).map((job) => (
          <div key={job.id} className="p-4 bg-green-50/50 rounded-2xl border border-green-100 opacity-80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-8 w-8 bg-white rounded-lg flex items-center justify-center border border-green-100 shrink-0">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                </div>
                <div className="truncate">
                  <p className="text-[11px] font-black text-navy uppercase truncate">
                    {job.uploaded_files?.file_name}
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-[9px] text-green-600 font-black uppercase">Concluído</p>
                    <span className="text-[9px] text-slate-400">•</span>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">{job.processing_time || '1.2'}s</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-2">
        <div className="p-3 bg-navy rounded-xl text-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-primary/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
          <p className="text-[9px] font-black text-white uppercase tracking-[0.2em] relative z-10 flex items-center justify-center gap-2">
            <Activity className="h-3 w-3 text-primary animate-pulse" />
            Enterprise Neural Engine Active
          </p>
        </div>
      </div>
    </Card>
  );
}
