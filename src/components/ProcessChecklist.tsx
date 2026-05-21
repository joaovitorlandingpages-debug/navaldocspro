import { useState, useEffect } from "react";
import { 
  FileText, Check, Clock, AlertCircle, 
  Plus, Download, Eye, FileCheck, 
  Loader2, AlertTriangle, ShieldCheck, Signature,
  Zap, Info, Ban, FolderArchive, Package, RefreshCw,
  History
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useProcessRequirements } from "@/hooks/useProcessRequirements";
import { useProcessPackage } from "@/hooks/useProcessPackages";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ProcessChecklistProps {
  processId: string;
  processTypeId?: string;
  processTypeSlug?: string;
}

export function ProcessChecklist({ processId, processTypeId, processTypeSlug }: ProcessChecklistProps) {
  const { requirements, isLoading: loadingReqs } = useProcessRequirements(processTypeId);
  const { pkg, isLoading: loadingPkg } = useProcessPackage(processTypeSlug);
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchDocs() {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('documents')
          .select('*')
          .eq('process_id', processId);
        
        if (error) throw error;
        setDocuments(data || []);
      } catch (err) {
        console.error("Error fetching documents:", err);
      } finally {
        setIsLoading(false);
      }
    }

    if (processId) {
      console.log("PROCESS_CHECKLIST_OK");
      fetchDocs();
    }
  }, [processId]);

  const calculateProgress = () => {
    if (requirements.length === 0) return 0;
    const mandatory = requirements.filter(r => r.is_mandatory);
    if (mandatory.length === 0) return 100;
    
    const completedMandatory = mandatory.filter(r => {
      const doc = documents.find((d: any) => d.document_type === r.template?.name || d.file_name?.includes(r.template?.name || ''));
      return doc && (doc.compliance_status === 'conforme' || doc.status === 'validado');
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

  console.log("DOCUMENT_FLOW_READY");
  return (
    <div className="space-y-6">
      <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-black text-navy uppercase tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-green-500" /> Conformidade Operacional
          </h3>
          <div className="text-right">
             <div className="text-2xl font-black text-navy">{calculateProgress()}%</div>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Score de Conformidade</p>
          </div>
        </div>
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden mb-2">
          <div 
            className={`h-full rounded-full shadow-lg transition-all duration-1000 ${
              calculateProgress() === 100 ? 'bg-green-500' : 'bg-primary'
            }`} 
            style={{ width: `${calculateProgress()}%` }}
          />
        </div>
        <div className="flex justify-between items-center mt-2">
          <p className="text-[10px] text-slate-400 italic">Validação automática baseada em regras marítimas e OCR.</p>
          {calculateProgress() === 100 && (
            <Button size="sm" className="bg-navy hover:bg-navy/90 text-white font-black text-[9px] uppercase tracking-widest h-8 gap-2 animate-bounce">
              <FolderArchive className="h-3.5 w-3.5" /> Gerar Pacote Documental
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b bg-slate-50/50 flex justify-between items-center">
          <h3 className="text-xs font-black text-navy uppercase tracking-widest">Checklist Inteligente</h3>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-100 bg-emerald-50">
              <Zap className="h-3 w-3 mr-1" /> Auto-Validação Ativa
            </Badge>
          </div>
        </div>

        <div className="divide-y divide-slate-50">
          {requirements.map((req) => {
            const doc = documents.find((d: any) => 
              d.document_type === req.template?.name || 
              d.file_url?.includes(req.template?.name || '')
            );
            console.log("PROCESS_UPLOAD_CONNECTED", !!doc);
            const status = doc ? (doc.compliance_status || (doc.status === 'uploaded' ? 'enviado' : doc.status)) : 'pendente';
            const hasErrors = doc && Array.isArray(doc.validation_errors) && doc.validation_errors.length > 0;
            
            return (
              <div key={req.id} className="p-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className={`h-12 w-12 rounded-2xl flex items-center justify-center transition-all ${
                    status === 'conforme' || status === 'validado' ? 'bg-green-100 text-green-600' : 
                    status === 'pendente' ? 'bg-slate-100 text-slate-400' :
                    'bg-amber-100 text-amber-600'
                  }`}>
                    {req.document_role === 'signature' ? <Signature className="h-6 w-6" /> : <FileText className="h-6 w-6" />}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-navy flex items-center gap-2">
                      {req.template?.name}
                      {req.is_mandatory && <span className="text-[8px] bg-red-50 text-red-500 px-1.5 py-0.5 rounded uppercase font-black">Obrigatório</span>}
                      {hasErrors && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <AlertCircle className="h-4 w-4 text-red-500 animate-pulse" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs font-bold">{doc.validation_errors[0].message}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
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
                    status === 'conforme' || status === 'validado' ? 'bg-green-500 text-white' : 
                    status === 'pendente' ? 'bg-slate-200 text-slate-500' :
                    status === 'divergente' || hasErrors ? 'bg-red-500 text-white' :
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
                    ) : (req.document_role as string) === 'gerado' ? (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-9 px-4 rounded-xl gap-2 font-bold text-xs border-primary/20 text-primary hover:bg-primary/5"
                        onClick={async () => {
                           const { data } = await supabase.from('document_templates').select('*').eq('name', req.template?.name).single();
                           if (data) {
                             window.dispatchEvent(new CustomEvent('generate-document', { detail: data }));
                           }
                        }}
                      >
                        <RefreshCw className="h-3.5 w-3.5" /> Gerar
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" className="h-9 px-4 rounded-xl gap-2 font-bold text-xs border-slate-200 hover:border-primary hover:text-primary">
                        <Plus className="h-3.5 w-3.5" /> Upload
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          
          {requirements.length === 0 && (
            <div className="p-10 space-y-6">
              <div className="p-8 border-2 border-dashed border-slate-100 rounded-[2rem] text-center bg-slate-50/50">
                <AlertTriangle className="h-10 w-10 text-slate-200 mx-auto mb-4" />
                <h4 className="text-sm font-bold text-navy uppercase mb-2">Nenhum requisito configurado</h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto font-medium">Este tipo de processo ainda não possui um pacote documental padrão. Adicione documentos manualmente na aba "Uploads".</p>
              </div>
              
              <div className="space-y-3 opacity-30 grayscale">
                {[
                  { name: "RG / CNH do Proprietário", role: "Identidade", mandatory: true },
                  { name: "TIE / TIEM Original", role: "Inscrição", mandatory: true },
                  { name: "Comprovante de Endereço", role: "Residência", mandatory: false }
                ].map((mock, i) => (
                  <div key={i} className="p-4 bg-white rounded-2xl border border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-navy">{mock.name}</p>
                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-tighter">{mock.role} • EXEMPLO</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[8px] uppercase font-black">Aguardando</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <div className="p-6 bg-slate-50 border-t border-slate-100">
           <div className="flex items-center gap-3 text-navy/40 mb-4">
              <History className="h-4 w-4" />
              <p className="text-[10px] font-black uppercase tracking-widest">Timeline do Checklist</p>
           </div>
           <div className="space-y-4">
              <div className="flex gap-4 relative">
                 <div className="absolute left-[7px] top-4 bottom-0 w-px bg-slate-200" />
                 <div className="h-4 w-4 rounded-full bg-emerald-500 border-4 border-white shadow-sm z-10" />
                 <div>
                    <p className="text-xs font-bold text-navy">Checklist Automático Gerado</p>
                    <p className="text-[9px] text-slate-400 font-medium">{requirements.length} itens aguardando ação.</p>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
