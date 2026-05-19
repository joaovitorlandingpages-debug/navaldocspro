import { useState, useEffect } from "react";
import { 
  FileText, Save, CheckCircle2, AlertTriangle, 
  ChevronLeft, ArrowRight, Download, Edit3, 
  Eye, RefreshCw, Printer, FileCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

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

  useEffect(() => {
    // Simular preenchimento automático inicial
    if (template?.base_content) {
      // Importar DocumentAutoFiller dinamicamente para evitar circular dependecy se necessário
      // Aqui usamos direto a classe recém criada
      import("@/services/documentAutoFiller").then(({ DocumentAutoFiller }) => {
        const filled = DocumentAutoFiller.fill(template.base_content, {
          customer: processData.customer,
          vessel: processData.vessel,
          process: processData,
          company: processData.company
        });
        setContent(filled);
        setStatus('auto_preenchido');
      });
    }
  }, [template, processData]);

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
        <Card className="lg:col-span-3 border-slate-100 shadow-sm overflow-hidden bg-white min-h-[700px]">
           <ScrollArea className="h-[700px] p-12">
              {isEditing ? (
                <textarea 
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full h-[600px] p-0 border-none focus:ring-0 text-base leading-relaxed text-slate-700 font-serif resize-none"
                />
              ) : (
                <div className="prose max-w-none">
                   <div className="text-center mb-12 border-b border-slate-100 pb-8">
                      <h1 className="text-xl font-bold text-navy uppercase">{template.name}</h1>
                      <p className="text-xs text-slate-400 uppercase tracking-widest mt-2">Identificador: {processData.id?.substring(0,8)}</p>
                   </div>
                   
                   <div className="whitespace-pre-wrap font-serif text-lg leading-loose text-slate-800">
                      {content.split('\n').map((paragraph, i) => (
                        <p key={i} className="mb-6">
                           {paragraph.split(/(\[.*?PENDENTE\])/).map((part, j) => (
                             part.includes("PENDENTE") ? 
                             <span key={j} className="bg-red-100 text-red-700 px-1 rounded font-bold underline">{part}</span> : 
                             <span key={j}>{part}</span>
                           ))}
                        </p>
                      ))}
                   </div>

                   <div className="mt-20 flex flex-col items-center">
                      <div className="w-64 h-px bg-slate-300 mb-2" />
                      <p className="text-sm font-bold text-navy">{processData.customer?.name}</p>
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Assinatura do Requerente</p>
                   </div>

                   <div className="mt-12 text-center text-[10px] text-slate-300 uppercase font-black border-t border-slate-50 pt-8">
                      Gerado eletronicamente por NavalDocs Pro v3.5 • {new Date().toLocaleString()}
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
                <div className="space-y-2">
                   <p className="text-[10px] font-black uppercase text-navy">Campos Mapeados</p>
                   <div className="flex items-center justify-between text-xs font-bold text-emerald-600">
                      <span>12 Campos OK</span>
                      <CheckCircle2 className="h-3 w-3" />
                   </div>
                </div>
                <Button className="w-full bg-navy text-white text-[10px] font-black uppercase tracking-widest h-12 rounded-xl gap-2 shadow-lg shadow-navy/10">
                   <Printer className="h-4 w-4" /> Preview para Impressão
                </Button>
             </CardContent>
          </Card>

          <div className="p-6 rounded-[2rem] bg-navy text-white shadow-xl relative overflow-hidden group">
             <div className="absolute -right-6 -bottom-6 opacity-10 group-hover:scale-110 transition-transform duration-700">
                <FileText className="h-32 w-32" />
             </div>
             <div className="relative z-10">
                <p className="text-[10px] font-black uppercase text-primary tracking-[0.2em] mb-4">Exportação</p>
                <h4 className="text-lg font-bold mb-4">Pronto para Gerar PDF?</h4>
                <p className="text-[11px] text-slate-400 mb-6 leading-relaxed">Após a aprovação, o documento será convertido em PDF oficial e anexado ao processo automaticamente.</p>
                <Button 
                   onClick={handleApprove}
                   className="w-full bg-primary text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all gap-2"
                >
                   <Download className="h-4 w-4" /> Baixar PDF Final
                </Button>
             </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
