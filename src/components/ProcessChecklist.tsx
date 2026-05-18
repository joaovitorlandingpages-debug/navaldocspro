import { useState, useEffect } from "react";
import { 
  FileText, Check, Clock, AlertCircle, 
  Plus, Download, Eye, FileCheck, 
  Loader2, AlertTriangle, ShieldCheck, Signature
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useProcessRequirements } from "@/hooks/useProcessRequirements";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProcessChecklistProps {
  processId: string;
  processTypeId?: string;
}

export function ProcessChecklist({ processId, processTypeId }: ProcessChecklistProps) {
  const { requirements, isLoading: loadingReqs } = useProcessRequirements(processTypeId);
  const [uploadedDocs, setUploadedDocs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchDocs() {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('uploaded_files')
          .select('*')
          .eq('process_id', processId);
        
        if (error) throw error;
        setUploadedDocs(data || []);
      } catch (err) {
        console.error("Error fetching documents:", err);
      } finally {
        setIsLoading(false);
      }
    }

    if (processId) fetchDocs();
  }, [processId]);

  const getDocForRequirement = (templateId: string) => {
    // This logic might need refinement depending on how we match uploaded docs to templates
    // For now, let's assume document_type matches template name or we have a template_id in documents (we should add it)
    return uploadedDocs.find(d => d.document_type === requirements.find(r => r.template_id === templateId)?.template?.name);
  };

  const calculateProgress = () => {
    if (requirements.length === 0) return 0;
    const mandatory = requirements.filter(r => r.is_mandatory);
    if (mandatory.length === 0) return 100;
    
    const completedMandatory = mandatory.filter(r => {
      const doc = uploadedDocs.find(d => d.category === r.template?.name || d.file_name.includes(r.template?.name || ''));
      return doc && doc.status === 'validado';
    });
    
    return Math.round((completedMandatory.length / mandatory.length) * 100);
  };

  if (loadingReqs || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2rem] border border-slate-100">
        <Loader2 className="h-8 w-8 text-primary animate-spin mb-4" />
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Carregando checklist inteligente...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-black text-navy uppercase tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-green-500" /> Checklist de Requisitos
          </h3>
          <div className="text-right">
             <div className="text-2xl font-black text-navy">{calculateProgress()}%</div>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Requisitos Obrigatórios</p>
          </div>
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden mb-2">
          <div 
            className="h-full bg-green-500 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.3)] transition-all duration-1000" 
            style={{ width: `${calculateProgress()}%` }}
          />
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b bg-slate-50/50 flex justify-between items-center">
          <h3 className="text-xs font-black text-navy uppercase tracking-widest">Documentação Necessária</h3>
          <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-200">
            {requirements.length} itens definidos
          </Badge>
        </div>

        <div className="divide-y divide-slate-50">
          {requirements.map((req) => {
            const doc = uploadedDocs.find(d => d.category === req.template?.name || d.file_name.includes(req.template?.name || ''));
            const status = doc ? (doc.status === 'uploaded' ? 'enviado' : doc.status) : 'pendente';
            
            return (
              <div key={req.id} className="p-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`h-12 w-12 rounded-2xl flex items-center justify-center transition-all ${
                    status === 'validado' ? 'bg-green-100 text-green-600' : 
                    status === 'pendente' ? 'bg-slate-100 text-slate-400' :
                    'bg-amber-100 text-amber-600'
                  }`}>
                    {req.document_role === 'signature' ? <Signature className="h-6 w-6" /> : <FileText className="h-6 w-6" />}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-navy flex items-center gap-2">
                      {req.template?.name}
                      {req.is_mandatory && <span className="text-[8px] bg-red-50 text-red-500 px-1.5 py-0.5 rounded uppercase font-black">Obrigatório</span>}
                    </h4>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-[10px] font-medium text-slate-400">{req.template?.description || 'Documento operacional'}</p>
                      <span className="h-1 w-1 bg-slate-200 rounded-full" />
                      <p className="text-[10px] font-black uppercase text-primary tracking-widest">{req.document_role}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <Badge className={`px-3 py-1 rounded-lg font-black text-[10px] uppercase tracking-widest border-none ${
                    status === 'validado' ? 'bg-green-500 text-white' : 
                    status === 'pendente' ? 'bg-slate-200 text-slate-500' :
                    'bg-amber-500 text-white'
                  }`}>
                    {status}
                  </Badge>
                  
                  <div className="flex gap-1">
                    {doc ? (
                      <>
                        <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-xl text-slate-400 hover:text-primary hover:bg-primary/5">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-xl text-slate-400 hover:text-green-500 hover:bg-green-50">
                          <FileCheck className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <Button variant="outline" size="sm" className="h-9 px-4 rounded-xl gap-2 font-bold text-xs border-slate-200 hover:border-primary hover:text-primary">
                        <Plus className="h-3.5 w-3.5" /> Anexar
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          
          {requirements.length === 0 && (
            <div className="p-20 text-center">
              <AlertTriangle className="h-12 w-12 text-slate-200 mx-auto mb-4" />
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Nenhum requisito configurado para este tipo de processo.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
