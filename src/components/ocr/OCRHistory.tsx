import { 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ChevronRight,
  UserCheck
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useOCR, OCRJob } from "@/hooks/useOCR";

interface OCRHistoryProps {
  onSelectJob: (job: OCRJob) => void;
  selectedJobId?: string;
}

export function OCRHistory({ onSelectJob, selectedJobId }: OCRHistoryProps) {
  const { jobs, isLoading } = useOCR();

  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 bg-slate-100 rounded-2xl" />
        ))}
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'pending': return <Clock className="h-4 w-4 text-slate-400" />;
      case 'processing': return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'failed': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'reviewed': return <UserCheck className="h-4 w-4 text-primary" />;
      default: return <Clock className="h-4 w-4 text-slate-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none text-[9px] font-black uppercase">Pronto</Badge>;
      case 'pending': return <Badge variant="secondary" className="text-[9px] font-black uppercase">Fila</Badge>;
      case 'processing': return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none text-[9px] font-black uppercase">Lendo...</Badge>;
      case 'failed': return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-none text-[9px] font-black uppercase">Erro</Badge>;
      case 'reviewed': return <Badge className="bg-primary/10 text-primary hover:bg-primary/10 border-none text-[9px] font-black uppercase">Revisado</Badge>;
      default: return <Badge variant="secondary" className="text-[9px] font-black uppercase">Pendente</Badge>;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-2">
        <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Atividade Recente</h5>
        <span className="text-[10px] font-bold text-primary cursor-pointer hover:underline">Ver tudo</span>
      </div>

      <div className="grid gap-2">
        {jobs?.length === 0 && (
          <div className="text-center py-10 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
            <p className="text-xs font-bold text-slate-400">Nenhum documento processado.</p>
          </div>
        )}

        {jobs?.map((job) => (
          <div 
            key={job.id}
            onClick={() => onSelectJob(job)}
            className={`
              p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group
              ${selectedJobId === job.id 
                ? "border-primary bg-primary/5 shadow-sm" 
                : "border-slate-100 hover:border-slate-200 hover:bg-slate-50"}
            `}
          >
            <div className="flex items-center gap-4">
              <div className={`
                h-10 w-10 rounded-xl flex items-center justify-center transition-colors
                ${selectedJobId === job.id ? "bg-primary text-white" : "bg-slate-100 text-slate-400 group-hover:bg-slate-200"}
              `}>
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-black text-navy uppercase truncate max-w-[150px]">
                  {job.uploaded_files?.file_name || "Documento Sem Nome"}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[9px] text-slate-400 font-bold">
                    {new Date(job.created_at).toLocaleDateString()}
                  </span>
                  <span className="w-1 h-1 bg-slate-300 rounded-full" />
                  <span className="text-[9px] text-slate-400 font-bold uppercase">
                    {job.document_type || "Geral"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden sm:flex flex-col items-end">
                {getStatusBadge(job.status)}
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(job.status)}
                <ChevronRight className={`h-4 w-4 transition-transform ${selectedJobId === job.id ? "translate-x-1 text-primary" : "text-slate-300"}`} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
