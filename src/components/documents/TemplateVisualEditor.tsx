import { useState, useRef, useEffect } from "react";
import { Rnd } from "react-rnd";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

import { 
  ChevronLeft, ChevronRight, Plus, 
  Save, Trash2, Settings2, 
  ZoomIn, ZoomOut, Loader2, Database, Type,
  Layout, GripHorizontal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DocumentField, useDocuments } from "@/hooks/useDocuments";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Worker configuration for pdf.js
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface TemplateVisualEditorProps {
  templateId: string;
  onClose: () => void;
}

const SOURCE_TYPES = [
  { value: "manual", label: "Manual", icon: <Type className="h-3 w-3" /> },
  { value: "customer", label: "Cliente", icon: <Database className="h-3 w-3" /> },
  { value: "vessel", label: "Embarcação", icon: <Database className="h-3 w-3" /> },
  { value: "company", label: "Empresa", icon: <Database className="h-3 w-3" /> },
  { value: "process", label: "Processo", icon: <Database className="h-3 w-3" /> },
];

const SOURCE_FIELDS = {
  customer: ["name", "cpf_cnpj", "rg", "address", "phone", "email"],
  vessel: ["name", "registration_number", "vessel_type", "engine_power", "length"],
  company: ["name", "cnpj", "phone", "email", "address"],
  process: ["process_type", "status", "created_at"],
};

export function TemplateVisualEditor({ templateId, onClose }: TemplateVisualEditorProps) {
  const { templates, templateFields, upsertTemplateFields, getSignedUrl } = useDocuments();
  const [fields, setFields] = useState<DocumentField[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentTemplate = templates?.find((t: any) => t.id === templateId);

  // Mock data for simulation
  const mockData: Record<string, string> = {
    name: "JOÃO DA SILVA SAURO",
    cpf_cnpj: "123.456.789-00",
    rg: "12.345.678-9",
    address: "Rua das Marinas, 123 - Angra dos Reis/RJ",
    phone: "(24) 99999-9999",
    email: "joao@exemplo.com.br",
    registration_number: "381.123456-7",
    vessel_type: "LANCHA",
    engine_power: "250 HP",
    length: "24 PÉS",
    cnpj: "12.345.678/0001-90",
    process_type: "INSCRIÇÃO INICIAL",
    status: "EM ANDAMENTO",
    created_at: new Date().toLocaleDateString(),
  };

  useEffect(() => {
    async function loadPdf() {
      if (!currentTemplate?.template_file_url) return;
      
      try {
        setIsLoading(true);
        const path = currentTemplate.template_file_url.split('/').slice(-2).join('/');
        const url = await getSignedUrl('document-templates', path);
        
        const loadingTask = pdfjsLib.getDocument({
          url,
          isEvalSupported: false, // Security: prevent script execution inside PDF
          disableFontFace: false,
        });

        const pdf = await loadingTask.promise;
        setNumPages(pdf.numPages);
        await renderPage(pdf, currentPage, scale);
      } catch (error) {
        console.error("Error loading PDF:", error);
        toast.error("Erro ao carregar o PDF");
      } finally {
        setIsLoading(false);
      }
    }

    loadPdf();
  }, [currentTemplate, currentPage, scale]);

  useEffect(() => {
    if (templateFields) {
      const filtered = templateFields
        .filter((f: any) => f.template_id === templateId)
        .map((f: any) => ({
          ...f,
          id: f.id || Math.random().toString(36).substr(2, 9),
          // Store raw points from DB, we'll scale them in the UI
          position_x: f.position_x || 0,
          position_y: f.position_y || 0,
          width: f.width || 150,
          height: f.height || 30,
        }));
      setFields(filtered);
    }
  }, [templateFields, templateId]);

  const renderPage = async (pdf: any, pageNum: number, currentScale: number) => {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: currentScale });
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const context = canvas.getContext("2d");
    if (!context) return;
    
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    };
    
    await page.render(renderContext).promise;
  };

  const addField = () => {
    const newField: DocumentField = {
      id: Math.random().toString(36).substr(2, 9),
      template_id: templateId,
      field_name: `campo_${fields.length + 1}`,
      field_label: `Novo Campo ${fields.length + 1}`,
      field_type: "text",
      source_type: "manual",
      required: false,
      page_number: currentPage,
      position_x: 50, // These are in points
      position_y: 50,
      width: 150,
      height: 25,
      font_size: 12,
      alignment: 'left'
    };
    setFields([...fields, newField]);
    setSelectedFieldId(newField.id!);
  };

  const updateField = (id: string, updates: Partial<DocumentField>) => {
    setFields(fields.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const deleteField = (id: string) => {
    setFields(fields.filter(f => f.id !== id));
    if (selectedFieldId === id) setSelectedFieldId(null);
  };

  const handleSave = async () => {
    try {
      await upsertTemplateFields.mutateAsync({ templateId, fields });
    } catch (error) {
      // toast handled in hook
    }
  };

  const selectedField = fields.find(f => f.id === selectedFieldId);

  return (
    <div className="flex h-full w-full bg-slate-950 rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
      {/* Sidebar - Tools & Field List */}
      <div className="w-80 border-r border-white/10 flex flex-col bg-slate-900/50 backdrop-blur-xl">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
            <Layout className="h-5 w-5 text-red-500" /> Editor de Template
          </h2>
          <p className="text-[10px] text-slate-500 font-mono mt-1 uppercase tracking-widest italic">
            Configuração de campos dinâmicos
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
          <Button 
            onClick={addField} 
            className="w-full bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 h-12 font-bold gap-2"
          >
            <Plus className="h-4 w-4" /> Novo Campo
          </Button>

          <div className="space-y-2">
            <Label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Campos na Página {currentPage}</Label>
            {fields.filter(f => f.page_number === currentPage).length === 0 ? (
              <div className="py-8 text-center border border-dashed border-white/5 rounded-2xl">
                <p className="text-[10px] text-slate-600 italic">Nenhum campo nesta página</p>
              </div>
            ) : (
              fields.filter(f => f.page_number === currentPage).map(field => (
                <div 
                  key={field.id}
                  onClick={() => setSelectedFieldId(field.id!)}
                  className={cn(
                    "p-3 rounded-xl border transition-all cursor-pointer group flex items-center justify-between",
                    selectedFieldId === field.id 
                      ? "bg-red-500/10 border-red-500/50 text-white" 
                      : "bg-white/5 border-white/5 text-slate-400 hover:bg-white/10"
                  )}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className={cn(
                      "h-8 w-8 rounded-lg flex items-center justify-center border",
                      selectedFieldId === field.id ? "bg-red-500 border-red-500/50 text-white" : "bg-black/20 border-white/5"
                    )}>
                      {SOURCE_TYPES.find(t => t.value === field.source_type)?.icon || <Type className="h-3 w-3" />}
                    </div>
                    <div className="truncate">
                      <p className="text-[11px] font-bold truncate">{field.field_label}</p>
                      <p className="text-[9px] font-mono opacity-50 truncate">{field.field_name}</p>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteField(field.id!); }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 rounded-lg text-red-500 transition-all"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))
            )}
          </div>

          {selectedField && (
            <div className="pt-6 border-t border-white/10 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-2 text-red-400">
                <Settings2 className="h-4 w-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Configuração do Campo</span>
              </div>
              
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-[9px] font-bold text-slate-500 uppercase">Rótulo do Formulário</Label>
                  <Input 
                    value={selectedField.field_label}
                    onChange={(e) => updateField(selectedField.id!, { field_label: e.target.value })}
                    className="bg-black/40 border-white/10 text-white h-9 rounded-lg text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[9px] font-bold text-slate-500 uppercase">Chave no Template</Label>
                  <Input 
                    value={selectedField.field_name}
                    onChange={(e) => updateField(selectedField.id!, { field_name: e.target.value })}
                    className="bg-black/40 border-white/10 text-white h-9 rounded-lg font-mono text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[9px] font-bold text-slate-500 uppercase">Origem do Dado</Label>
                  <Select 
                    value={selectedField.source_type}
                    onValueChange={(v) => updateField(selectedField.id!, { source_type: v, source_field: undefined })}
                  >
                    <SelectTrigger className="bg-black/40 border-white/10 text-white h-9 rounded-lg text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-white/10 text-white">
                      {SOURCE_TYPES.map(t => (
                        <SelectItem key={t.value} value={t.value} className="text-xs">
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedField.source_type !== "manual" && (
                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-bold text-slate-500 uppercase">Campo de Origem</Label>
                    <Select 
                      value={selectedField.source_field}
                      onValueChange={(v) => updateField(selectedField.id!, { source_field: v })}
                    >
                      <SelectTrigger className="bg-black/40 border-white/10 text-white h-9 rounded-lg text-xs">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-white/10 text-white">
                        {SOURCE_FIELDS[selectedField.source_type as keyof typeof SOURCE_FIELDS]?.map(f => (
                          <SelectItem key={f} value={f} className="text-xs uppercase">{f}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-bold text-slate-500 uppercase">Fonte (pt)</Label>
                    <Input 
                      type="number"
                      value={selectedField.font_size}
                      onChange={(e) => updateField(selectedField.id!, { font_size: Number(e.target.value) })}
                      className="bg-black/40 border-white/10 text-white h-9 rounded-lg text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-bold text-slate-500 uppercase">Alinhamento</Label>
                    <Select 
                      value={selectedField.alignment}
                      onValueChange={(v) => updateField(selectedField.id!, { alignment: v })}
                    >
                      <SelectTrigger className="bg-black/40 border-white/10 text-white h-9 rounded-lg text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-white/10 text-white">
                        <SelectItem value="left" className="text-xs">Esquerda</SelectItem>
                        <SelectItem value="center" className="text-xs">Centro</SelectItem>
                        <SelectItem value="right" className="text-xs">Direita</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-white/10 bg-black/20 flex gap-2">
          <Button variant="ghost" onClick={onClose} className="flex-1 text-slate-400 hover:text-white rounded-xl">Fechar</Button>
          <Button 
            onClick={handleSave} 
            disabled={upsertTemplateFields.isPending}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl gap-2 shadow-lg shadow-red-500/20"
          >
            {upsertTemplateFields.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            Salvar
          </Button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col bg-slate-950 relative overflow-hidden">
        {/* Toolbar */}
        <div className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-slate-900/30 backdrop-blur-md z-10">
          <div className="flex items-center gap-4">
            <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage <= 1}
                className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 transition-all"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="px-4 flex items-center gap-2">
                <span className="text-[10px] font-black text-white">{currentPage}</span>
                <span className="text-[8px] text-slate-600 font-bold">DE</span>
                <span className="text-[10px] font-black text-slate-500">{numPages}</span>
              </div>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(numPages, prev + 1))}
                disabled={currentPage >= numPages}
                className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 transition-all"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="h-8 w-px bg-white/5 mx-2" />

            <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
              <button onClick={() => setScale(s => Math.max(0.5, s - 0.1))} className="p-1.5 text-slate-400 hover:text-white"><ZoomOut className="h-4 w-4" /></button>
              <div className="px-3 flex items-center">
                <span className="text-[9px] font-black text-slate-500">{Math.round(scale * 100)}%</span>
              </div>
              <button onClick={() => setScale(s => Math.min(3, s + 0.1))} className="p-1.5 text-slate-400 hover:text-white"><ZoomIn className="h-4 w-4" /></button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
              <button 
                onClick={() => setIsSimulating(!isSimulating)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                  isSimulating ? "bg-red-500 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
                )}
              >
                {isSimulating ? "Dados Simulados" : "Mock Off"}
              </button>
            </div>
            <div className="px-3 py-1 bg-green-500/10 text-green-500 border border-green-500/20 rounded text-[9px] tracking-widest uppercase font-mono">
              Modo Edição
            </div>
          </div>
        </div>

        {/* Viewport */}
        <div 
          className="flex-1 overflow-auto p-12 flex justify-center bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 to-black scrollbar-hide"
        >
          <div className="relative shadow-[0_0_100px_rgba(0,0,0,0.5)]">
            {isLoading && (
              <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/50 backdrop-blur-sm rounded-lg">
                <Loader2 className="h-10 w-10 animate-spin text-red-500 mb-4" />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Renderizando Documento...</p>
              </div>
            )}
            
            <canvas ref={canvasRef} className="rounded-sm border border-white/5" />
            
            {/* Fields Overlay */}
            {!isLoading && fields
              .filter(f => f.page_number === currentPage)
              .map(field => (
                <Rnd
                  key={field.id}
                  size={{ 
                    width: (field.width || 150) * scale, 
                    height: (field.height || 25) * scale 
                  }}
                  position={{ 
                    x: (field.position_x || 0) * scale, 
                    y: (field.position_y || 0) * scale 
                  }}
                  onDragStop={(e, d) => {
                    updateField(field.id!, { 
                      position_x: d.x / scale, 
                      position_y: d.y / scale 
                    });
                  }}
                  onResizeStop={(e, direction, ref, delta, position) => {
                    updateField(field.id!, {
                      width: parseInt(ref.style.width) / scale,
                      height: parseInt(ref.style.height) / scale,
                      position_x: position.x / scale,
                      position_y: position.y / scale,
                    });
                  }}
                  bounds="parent"
                  onClick={() => setSelectedFieldId(field.id!)}
                  className={cn(
                    "group flex flex-col justify-center px-3 border-2 transition-all backdrop-blur-sm",
                    selectedFieldId === field.id 
                      ? "bg-red-500/20 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)] z-20" 
                      : "bg-white/5 border-white/20 border-dashed hover:border-red-500/50 z-10"
                  )}
                >
                  <div className="flex items-center justify-between gap-2 overflow-hidden pointer-events-none w-full">
                    {isSimulating ? (
                      <span className="text-[10px] font-bold text-white/90 truncate">
                        {field.source_type === 'manual' ? field.field_label : (mockData[field.source_field as string] || field.field_label)}
                      </span>
                    ) : (
                      <span className={cn(
                        "text-[10px] font-black truncate uppercase tracking-tight",
                        selectedFieldId === field.id ? "text-white" : "text-slate-400"
                      )}>
                        {field.field_label}
                      </span>
                    )}
                    {!isSimulating && <GripHorizontal className="h-3 w-3 text-white/20 shrink-0" />}
                  </div>
                  
                  {selectedFieldId === field.id && (
                    <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-900" />
                  )}
                </Rnd>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}