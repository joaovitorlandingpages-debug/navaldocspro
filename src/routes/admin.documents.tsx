import { createFileRoute, Link } from "@tanstack/react-router";
import { 
  Shield, FilePlus, Settings, History, 
  CheckCircle2, AlertCircle, PlayCircle, 
  ArrowLeft, Plus, Edit3, ToggleLeft, 
  ToggleRight, Eye, Database
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";

export const Route = createFileRoute("/admin/documents")({
  component: AdminDocuments,
});

function AdminDocuments() {
  const [models, setModels] = useState([
    { id: 1, name: "Requerimento de Inscrição", version: "2.4", status: "Ativo", fields: 12, usage: 450, lastUpdate: "10/05/2026" },
    { id: 2, name: "Transferência de Propriedade", version: "1.8", status: "Ativo", fields: 18, usage: 230, lastUpdate: "08/05/2026" },
    { id: 3, name: "Procuração Padrão", version: "3.1", status: "Ativo", fields: 8, usage: 1240, lastUpdate: "11/05/2026" },
    { id: 4, name: "Vistoria Especial", version: "1.0", status: "Inativo", fields: 25, usage: 0, lastUpdate: "01/05/2026" },
  ]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center gap-4">
        <Link to="/admin" className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all">
          <ArrowLeft className="h-5 w-5 text-navy" />
        </Link>
        <div>
          <h1 className="text-3xl font-black text-navy tracking-tight uppercase">Modelos de Documentos</h1>
          <p className="text-muted-foreground font-medium">Gerenciamento master de templates e campos automáticos.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
         <div className="lg:col-span-2 space-y-6">
            <Card className="rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden">
               <div className="p-8 border-b flex justify-between items-center bg-slate-50/50">
                  <h3 className="text-sm font-black text-navy uppercase tracking-widest flex items-center gap-2">
                     <Database className="h-4 w-4 text-primary" /> Templates Ativos
                  </h3>
                  <Button className="bg-primary text-white rounded-xl h-10 px-6 font-black uppercase text-[10px] tracking-widest gap-2">
                     <Plus className="h-4 w-4" /> Novo Modelo
                  </Button>
               </div>
               <div className="p-4">
                  <ScrollArea className="h-[500px]">
                     <div className="space-y-3 p-2">
                        {models.map((model) => (
                           <div key={model.id} className="p-6 rounded-2xl border border-slate-50 hover:bg-slate-50/50 transition-all flex items-center justify-between group">
                              <div className="flex items-center gap-6">
                                 <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                                    <FilePlus className="h-6 w-6" />
                                 </div>
                                 <div>
                                    <div className="flex items-center gap-3 mb-1">
                                       <h4 className="font-bold text-navy">{model.name}</h4>
                                       <Badge className="bg-slate-100 text-slate-500 border-none font-black text-[9px] uppercase tracking-widest">v{model.version}</Badge>
                                    </div>
                                    <div className="flex items-center gap-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                       <span>{model.fields} Campos</span>
                                       <span className="h-1 w-1 bg-slate-200 rounded-full" />
                                       <span>{model.usage} Usos</span>
                                       <span className="h-1 w-1 bg-slate-200 rounded-full" />
                                       <span>Editado em {model.lastUpdate}</span>
                                    </div>
                                 </div>
                              </div>
                              <div className="flex items-center gap-3">
                                 <Badge className={`border-none font-black text-[9px] uppercase px-2.5 py-1 ${model.status === 'Ativo' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {model.status}
                                 </Badge>
                                 <Button variant="ghost" size="sm" className="h-10 w-10 p-0 rounded-xl">
                                    <Edit3 className="h-4 w-4" />
                                 </Button>
                                 <Button variant="ghost" size="sm" className="h-10 w-10 p-0 rounded-xl text-red-400">
                                    <Trash2 className="h-4 w-4" />
                                 </Button>
                              </div>
                           </div>
                        ))}
                     </div>
                  </ScrollArea>
               </div>
            </Card>
         </div>

         <div className="space-y-6">
            <Card className="p-8 rounded-[2rem] border-slate-100 shadow-sm bg-navy text-white">
               <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 mb-6">
                  <Settings className="h-4 w-4 text-primary" /> Regras Globais
               </h3>
               <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                     <div>
                        <p className="text-xs font-bold uppercase tracking-widest">IA Auto-fill</p>
                        <p className="text-[10px] text-slate-400 font-medium">Preenchimento semântico ativo</p>
                     </div>
                     <ToggleRight className="h-8 w-8 text-primary" />
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                     <div>
                        <p className="text-xs font-bold uppercase tracking-widest">Validação OCR</p>
                        <p className="text-[10px] text-slate-400 font-medium">Verificar docs por imagem</p>
                     </div>
                     <ToggleRight className="h-8 w-8 text-primary" />
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                     <div>
                        <p className="text-xs font-bold uppercase tracking-widest">Watermark Beta</p>
                        <p className="text-[10px] text-slate-400 font-medium">Carimbo visual em prévias</p>
                     </div>
                     <ToggleLeft className="h-8 w-8 text-slate-500" />
                  </div>
               </div>
            </Card>

            <Card className="p-8 rounded-[2rem] border-slate-100 shadow-sm">
               <h3 className="text-sm font-black text-navy uppercase tracking-widest flex items-center gap-2 mb-6">
                  <History className="h-4 w-4 text-primary" /> Log de Erros
               </h3>
               <div className="space-y-4">
                  {[
                    { doc: "Procuração", error: "Campo CPF vazio", time: "10m ago" },
                    { doc: "Vistoria", error: "Modelo v1.0 depreciado", time: "1h ago" },
                    { doc: "Inscrição", error: "Erro no mapeamento IMO", time: "3h ago" },
                  ].map((log, i) => (
                    <div key={i} className="flex gap-3 p-3 rounded-xl border border-red-50 hover:bg-red-50/30 transition-all cursor-pointer">
                       <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
                       <div>
                          <p className="text-xs font-bold text-navy">{log.doc}</p>
                          <p className="text-[10px] text-red-500 font-medium">{log.error}</p>
                          <p className="text-[9px] text-slate-400 font-black uppercase mt-1">{log.time}</p>
                       </div>
                    </div>
                  ))}
               </div>
               <Button variant="ghost" className="w-full mt-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Ver Relatório Completo</Button>
            </Card>
         </div>
      </div>
    </div>
  );
}
