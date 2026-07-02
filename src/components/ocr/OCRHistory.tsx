import { 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ChevronRight,
  UserCheck,
  Loader2,
  AlertTriangle,
  Search
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
          <div key={i} className="h-24 bg-slate-100 rounded-2xl" />
        ))}
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <AlertCircle className="h-4 w-4 text-amber-500" />;
      case 'pending': return <Clock className="h-4 w-4 text-slate-400" />;
      case 'processing': return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
      case 'failed': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'reviewed': return <UserCheck className="h-4 w-4 text-green-500" />;
      default: return <Clock className="h-4 w-4 text-slate-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none text-[8px] font-black uppercase tracking-tighter">Revisão Pendente</Badge>;
      case 'pending': return <Badge variant="secondary" className="text-[8px] font-black uppercase tracking-tighter bg-slate-100">Na Fila</Badge>;
      case 'processing': return <Badge className="bg-primary/10 text-primary hover:bg-primary/10 border-none text-[8px] font-black uppercase tracking-tighter">IA Processando</Badge>;
      case 'failed': return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-none text-[8px] font-black uppercase tracking-tighter">Erro Crítico</Badge>;
      case 'reviewed': return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none text-[8px] font-black uppercase tracking-tighter">Sincronizado</Badge>;
      default: return <Badge variant="secondary" className="text-[8px] font-black uppercase tracking-tighter">Status: {status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="relative group">
         <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
         <input 
           placeholder="Filtrar por nome ou ID..." 
           className="w-full pl-9 pr-4 py-2 bg-slate-50 border-none rounded-xl text-[10px] font-bold uppercase tracking-widest focus:ring-2 focus:ring-primary/20 transition-all outline-none"
         />
      </div>

      <div className="space-y-3">
        {jobs?.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-slate-100">
            <div className="h-12 w-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="h-6 w-6 text-slate-200" />
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nenhum documento na fila.</p>
          </div>
        )}

        {jobs?.map((job: any) => (
          <div 
            key={job.id}
            onClick={() => onSelectJob(job)}
            className={`
              p-5 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between group relative overflow-hidden
              ${selectedJobId === job.id 
                ? "border-primary bg-white shadow-xl shadow-primary/5 -translate-y-1" 
                : "border-transparent bg-white hover:border-slate-100 hover:shadow-lg hover:-translate-y-0.5"}
            `}
          >
            <div className="flex items-center gap-4 relative z-10">
              <div className={`
                h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-500
                ${selectedJobId === job.id ? "bg-primary text-white scale-110 shadow-lg" : "bg-slate-50 text-slate-400 group-hover:bg-primary/5 group-hover:text-primary"}
              `}>
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-xs font-black text-navy uppercase truncate max-w-[120px]">
                    {job.uploaded_files?.file_name || "Documento IA"}
                  </p>
                  {job.comparison_data && Object.values(job.comparison_data).some((d: any) => d.diff) && (
                     <AlertTriangle className="h-3 w-3 text-amber-500" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-slate-400 font-bold">
                    {new Date(job.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="w-1 h-1 bg-slate-200 rounded-full" />
                  <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest border-slate-100 py-0 px-1.5 h-4">
                    {job.document_type || "AUTO"}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-1.5 relative z-10">
              {getStatusBadge(job.status)}
              <div className="flex items-center gap-2">
                {getStatusIcon(job.status)}
                <ChevronRight className={`h-3.5 w-3.5 transition-all duration-300 ${selectedJobId === job.id ? "translate-x-1 text-primary" : "text-slate-200"}`} />
              </div>
            </div>
            
            {/* Indicador de progresso se estiver processando */}
            {job.status === 'processing' && (
              <div className="absolute bottom-0 left-0 h-1 bg-primary/10 w-full overflow-hidden">
                <div className="h-full bg-primary animate-shimmer w-1/3"></div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
