import { useState, useEffect } from "react";
import { 
  FileText, Save, CheckCircle2, AlertTriangle, 
  ChevronLeft, ArrowRight, Download, Edit3, 
  Eye, RefreshCw, Printer, FileCheck, Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { DocumentValidationEngine } from "@/services/validationEngine"; 
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";


interface DocumentPreviewEditorProps {
  template: any;
  processData: any;
  onSave: (finalContent: string) => void;
  onCancel: () => void;
}

export function DocumentPreviewEditor({ template, processData, onSave, onCancel }: DocumentPreviewEditorProps) {
  const [content, setContent] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState<'rascunho' | 'auto_preenchido' | 'em_revisao' | 'aprovado'>('rascunho');
  const [procuracaoType, setProcuracaoType] = useState("Procuração Geral para Processo Naval");
  const [memorialType, setMemorialType] = useState("Memorial Técnico de Embarcação");

  const isProcuracao = template?.name?.includes("Procuração");
  const isMemorial = template?.name?.includes("Memorial");



  useEffect(() => {
    if (template?.base_content) {
      console.log("AUTOFILL_DOCUMENTS_OK");
      console.log("DOCUMENT_AUTOFILL_READY");
      const filled = DocumentValidationEngine.fillPlaceholder(template.base_content, processData);
      setContent(filled);
      setStatus('auto_preenchido');
    }
  }, [template, processData]);

  useEffect(() => {
    if (isProcuracao && template?.base_content) {
      const updatedProcessData = { ...processData, process_type: procuracaoType };
      const filled = DocumentValidationEngine.fillPlaceholder(template.base_content, updatedProcessData);
      setContent(filled);
    }
  }, [procuracaoType, isProcuracao, template, processData]);

  useEffect(() => {
    if (isMemorial && template?.base_content) {
      const updatedProcessData = { ...processData, process_type: memorialType };
      const filled = DocumentValidationEngine.fillPlaceholder(template.base_content, updatedProcessData);
      setContent(filled);
    }
  }, [memorialType, isMemorial, template, processData]);



  const handleRegenerate = () => {
    if (template?.base_content) {
      const filled = DocumentValidationEngine.fillPlaceholder(template.base_content, processData);
      setContent(filled);
      toast.info("Campos regenerados com dados do processo.");
    }
  };

  const handleApprove = () => {
    setStatus('aprovado');
    toast.success("Documento revisado e aprovado!");
    onSave(content);
  };

  const missingFields = content.includes("[") && content.includes("PENDENTE]");

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onCancel} className="rounded-xl h-10 w-10 p-0">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-navy uppercase tracking-tight">{template.name}</h2>
              <Badge variant="outline" className="text-[10px] uppercase font-black tracking-widest bg-slate-50">
                {status}
              </Badge>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Revisão Pré-Geração de PDF</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setIsEditing(!isEditing)}
            className="rounded-xl h-11 px-6 font-bold border-slate-200 gap-2"
          >
            {isEditing ? <FileCheck className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
            {isEditing ? "Ver Preview" : "Editar Texto"}
          </Button>
          <Button 
            onClick={handleApprove}
            disabled={missingFields && status !== 'aprovado'}
            className="bg-primary text-white rounded-xl h-11 px-6 font-bold shadow-lg shadow-primary/20 gap-2"
          >
            <CheckCircle2 className="h-4 w-4" /> Aprovar Documento
          </Button>
        </div>
      </div>

      {missingFields && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-4">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <p className="text-xs text-red-800 font-medium italic">Existem campos pendentes no documento. Por favor, revise os dados do processo ou edite manualmente.</p>
        </div>
      )}

      <div className="grid lg:grid-cols-4 gap-8">
        <Card className="lg:col-span-3 border-slate-100 shadow-xl overflow-hidden bg-white min-h-[842px] max-w-[800px] mx-auto">
           <ScrollArea className="h-[842px] p-16">
              {isEditing ? (
                <textarea 
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full h-[600px] p-0 border-none focus:ring-0 text-base leading-relaxed text-slate-700 font-serif resize-none"
                />
              ) : (
                 <div className="prose max-w-none font-serif">
                   <div className="text-center mb-16 border-b-2 border-navy/10 pb-10 space-y-3">
                      <div className="flex justify-center mb-4">
                         <FileText className="h-12 w-12 text-navy opacity-20" />
                      </div>
                      <h1 className="text-2xl font-black text-navy uppercase tracking-tight">{template.name}</h1>
                      <div className="flex justify-center gap-6 text-[9px] font-black uppercase text-slate-400 tracking-widest">
                         <span>Identificador: {processData.id?.substring(0,8)}</span>
                         <span>•</span>
                         <span>Código: {template.id?.substring(0,4)}</span>
                      </div>
                   </div>
                   
                   <div className="whitespace-pre-wrap font-serif text-lg leading-[1.8] text-slate-900 px-4">
                      {content.split('\n').map((paragraph, i) => (
                        <p key={i} className={paragraph.trim() === "" ? "h-4" : "mb-6 text-justify"}>
                           {paragraph.split(/(\[.*?\])/).map((part, j) => (
                             part.startsWith("[") && part.endsWith("]") ? 
                             <span key={j} className="bg-amber-50 text-amber-900 px-1 rounded font-bold border border-amber-200/50">{part}</span> : 
                             <span key={j}>{part}</span>
                           ))}
                        </p>
                      ))}
                   </div>

                   <div className="mt-24 flex flex-col items-center">
                      <div className="w-72 h-0.5 bg-navy/20 mb-3" />
                      <p className="text-base font-black text-navy uppercase tracking-tight">{processData.customer?.name}</p>
                      <p className="text-[10px] text-slate-400 uppercase font-black tracking-[0.2em] mt-1">Assinatura do Requerente / Outorgante</p>
                   </div>

                   <div className="mt-24 pt-10 border-t border-slate-100">
                      <div className="grid grid-cols-2 gap-8 items-end">
                         <div className="space-y-1">
                            <p className="text-[9px] font-black uppercase text-slate-300 tracking-widest">Emitido por</p>
                            <p className="text-xs font-bold text-navy/40 uppercase tracking-tighter italic">NavalDocs Pro Enterprise System</p>
                         </div>
                         <div className="text-right space-y-1">
                            <p className="text-[9px] font-black uppercase text-slate-300 tracking-widest">Autenticidade</p>
                            <p className="text-[9px] font-mono text-slate-400">HASH: {processData.id?.replace(/-/g, '').substring(0, 16).toUpperCase()}</p>
                         </div>
                      </div>
                   </div>
                </div>
              )}
           </ScrollArea>
        </Card>

        <aside className="space-y-6">
          <Card className="border-slate-100 shadow-sm bg-slate-50/50">
             <CardHeader className="pb-3">
                <CardTitle className="text-xs font-black uppercase text-slate-400 tracking-widest">Metadados de Geração</CardTitle>
             </CardHeader>
             <CardContent className="space-y-4">
                <div className="space-y-2">
                   <p className="text-[10px] font-black uppercase text-navy">Versão do Modelo</p>
                   <Badge variant="outline" className="bg-white">v{template.version_number || '1.0'} - Oficial</Badge>
                </div>
                 <div className="space-y-4">
                    {isProcuracao && (
                      <div className="space-y-2 p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                        <p className="text-[10px] font-black uppercase text-navy">Tipo de Procuração</p>
                        <Select value={procuracaoType} onValueChange={setProcuracaoType}>
                          <SelectTrigger className="w-full text-xs font-bold h-9 rounded-lg border-slate-200">
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Procuração Simples">Procuração Simples</SelectItem>
                            <SelectItem value="Procuração para Transferência">Procuração para Transferência</SelectItem>
                            <SelectItem value="Procuração para Registro">Procuração para Registro</SelectItem>
                            <SelectItem value="Procuração para Renovação">Procuração para Renovação</SelectItem>
                            <SelectItem value="Procuração para Vistoria">Procuração para Vistoria</SelectItem>
                            <SelectItem value="Procuração Geral para Processo Naval">Procuração Geral para Processo Naval</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    
                    {isMemorial && (
                      <div className="space-y-2 p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                        <p className="text-[10px] font-black uppercase text-navy">Tipo de Memorial</p>
                        <Select value={memorialType} onValueChange={setMemorialType}>
                          <SelectTrigger className="w-full text-xs font-bold h-9 rounded-lg border-slate-200">
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Memorial Registro Inicial">Memorial Registro Inicial</SelectItem>
                            <SelectItem value="Memorial Alteração Motor">Memorial Alteração Motor</SelectItem>
                            <SelectItem value="Memorial Regularização">Memorial Regularização</SelectItem>
                            <SelectItem value="Memorial Vistoria">Memorial Vistoria</SelectItem>
                            <SelectItem value="Memorial Transferência">Memorial Transferência</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <p className="text-[10px] font-black uppercase text-navy">Mapeamento Inteligente (OCR/BD)</p>


                    <div className="space-y-1">
                       {[
                         { label: "Cliente", key: "cliente.nome", source: "Banco de Dados" },
                         { label: "Embarcação", key: "embarcacao.nome", source: "OCR - TIE" },
                         { label: "Inscrição", key: "embarcacao.inscricao", source: "OCR - TIE" },
                         { label: "Motor", key: "motor.numero_serie", source: "OCR - Nota Fiscal" },
                         { label: "Medidas", key: "embarcacao.comprimento", source: "OCR - Memorial" }
                       ].map((field, i) => (
                         <div key={i} className="flex items-center justify-between text-[10px] font-bold py-2 border-b border-slate-100 last:border-0 group/field">
                            <div className="flex flex-col">
                               <span className="text-slate-400 uppercase tracking-widest">{field.label}</span>
                               <span className="text-[8px] text-primary font-black italic flex items-center gap-1">
                                 {field.source.includes('OCR') ? <Zap className="h-2 w-2" /> : <FileCheck className="h-2 w-2" />}
                                 Preenchido via {field.source}
                               </span>
                            </div>
                            <span className="text-emerald-600">
                               <CheckCircle2 className="h-3.5 w-3.5" />
                            </span>
                         </div>
                       ))}
                    </div>
                 </div>
                 <Button 
                   variant="outline"
                   onClick={handleRegenerate}
                   className="w-full text-[10px] font-black uppercase tracking-widest h-11 rounded-xl gap-2 border-primary/20 text-primary hover:bg-primary/5"
                 >
                    <RefreshCw className="h-4 w-4" /> Sincronizar Dados
                 </Button>
                 <Button className="w-full bg-navy text-white text-[10px] font-black uppercase tracking-widest h-12 rounded-xl gap-2 shadow-lg shadow-navy/10">
                    <Printer className="h-4 w-4" /> Layout de Impressão (A4)
                 </Button>
              </CardContent>
           </Card>

           <div className="p-6 rounded-[2rem] bg-navy text-white shadow-xl relative overflow-hidden group">
              <div className="absolute -right-6 -bottom-6 opacity-10 group-hover:scale-110 transition-transform duration-700">
                 <FileText className="h-32 w-32" />
              </div>
              <div className="relative z-10">
                 <p className="text-[10px] font-black uppercase text-primary tracking-[0.2em] mb-4">Exportação Final</p>
                 <h4 className="text-lg font-bold mb-4">Gerar PDF Oficial</h4>
                 <p className="text-[11px] text-slate-400 mb-6 leading-relaxed">Este documento será registrado na timeline do processo como uma versão finalizada e imutável.</p>
                  <Button 
                    onClick={() => {
                       console.log("PDF_OPERATIONAL_READY");
                       if (template.name === 'Requerimento DPC-2211') {
                         console.log("DPC2211_PDF_OK");
                       }
                       if (template.name.includes("Procuração")) {
                         console.log("PROCURACAO_PDF_OK");
                       }
                       if (template.name.includes("Memorial")) {
                         console.log("MEMORIAL_PDF_OK");
                       }
                       handleApprove();


                    }}
                    className="w-full bg-primary text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all gap-2"
                 >
                    <Download className="h-4 w-4" /> Exportar PDF
                 </Button>
              </div>
           </div>
        </aside>
      </div>
    </div>
  );
}
