import { createFileRoute } from "@tanstack/react-router";
import { 
  FileText, Search, Plus, Ship, User, 
  ArrowRight, FileCheck, Clock, FileWarning,
  Eye, Save, RotateCcw, CheckCircle2,
  LayoutTemplate, Settings2, Trash2
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

export const Route = createFileRoute("/document-generator")({
  component: DocumentGenerator,
});

function DocumentGenerator() {
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState("");
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  const docTypes = [
    { id: "req-inscricao", title: "Requerimento de Inscrição", icon: <FileText className="h-4 w-4" /> },
    { id: "transf-prop", title: "Transferência de Propriedade", icon: <User className="h-4 w-4" /> },
    { id: "procuracao", title: "Procuração", icon: <FileCheck className="h-4 w-4" /> },
    { id: "decl-resp", title: "Declaração de Responsabilidade", icon: <CheckCircle2 className="h-4 w-4" /> },
    { id: "solic-vistoria", title: "Solicitação de Vistoria", icon: <Search className="h-4 w-4" /> },
    { id: "guia-gru", title: "Guia / GRU", icon: <FileText className="h-4 w-4" /> },
  ];

  const autoFields = {
    client: {
      name: "Eng. Ricardo Almeida",
      id: "123.456.789-00",
      email: "ricardo@almeida.eng.br",
      phone: "(21) 98888-7777",
      address: "Rua do Porto, 100 - Centro, Rio de Janeiro"
    },
    vessel: {
      name: "Phoenix",
      inscription: "9876543-2",
      type: "Petroleiro",
      engine: "Wärtsilä 6R32",
      category: "Mar Aberto"
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black text-navy tracking-tight uppercase">Gerador de Documentos</h1>
          <p className="text-muted-foreground font-medium">Automação inteligente de documentação técnica naval.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
           <Button variant="outline" className="flex-1 md:flex-none h-12 rounded-xl border-slate-200 font-bold gap-2">
              <RotateCcw className="h-4 w-4" /> Limpar Tudo
           </Button>
           <Button className="flex-1 md:flex-none bg-primary text-white h-12 rounded-xl font-bold gap-2 hover:opacity-90 shadow-lg shadow-primary/20">
              <Save className="h-4 w-4" /> Salvar Rascunho
           </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        {/* Left Column - Configuration */}
        <div className="lg:col-span-5 space-y-8">
           <Card className="p-8 rounded-[2.5rem] border-slate-100 shadow-sm space-y-8">
              <div className="space-y-6">
                 <h3 className="text-sm font-black text-navy uppercase tracking-widest flex items-center gap-2">
                    <Settings2 className="h-4 w-4 text-primary" /> Configuração do Documento
                 </h3>

                 <div className="space-y-4">
                    <div className="space-y-2">
                       <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tipo de Documento</Label>
                       <Select onValueChange={setSelectedType}>
                          <SelectTrigger className="h-12 bg-slate-50 border-slate-200 rounded-xl font-bold">
                             <SelectValue placeholder="Selecione o modelo..." />
                          </SelectTrigger>
                          <SelectContent>
                             {docTypes.map(t => (
                               <SelectItem key={t.id} value={t.id} className="font-bold">{t.title}</SelectItem>
                             ))}
                          </SelectContent>
                       </Select>
                    </div>

                    <div className="space-y-2">
                       <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cliente</Label>
                       <Select defaultValue="ricardo">
                          <SelectTrigger className="h-12 bg-slate-50 border-slate-200 rounded-xl font-bold">
                             <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                             <SelectItem value="ricardo" className="font-bold">Eng. Ricardo Almeida</SelectItem>
                             <SelectItem value="marinha" className="font-bold">Marinha Mercante Ltda</SelectItem>
                          </SelectContent>
                       </Select>
                    </div>

                    <div className="space-y-2">
                       <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Embarcação</Label>
                       <Select defaultValue="phoenix">
                          <SelectTrigger className="h-12 bg-slate-50 border-slate-200 rounded-xl font-bold">
                             <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                             <SelectItem value="phoenix" className="font-bold">Phoenix (Petroleiro)</SelectItem>
                             <SelectItem value="titan" className="font-bold">Titan (Rebocador)</SelectItem>
                          </SelectContent>
                       </Select>
                    </div>
                 </div>
              </div>

              <div className="pt-8 border-t border-slate-50 space-y-6">
                 <div className="flex justify-between items-center">
                    <h3 className="text-sm font-black text-navy uppercase tracking-widest flex items-center gap-2">
                       <LayoutTemplate className="h-4 w-4 text-primary" /> Campos do Modelo
                    </h3>
                    <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase text-primary">Recarregar Dados</Button>
                 </div>

                 <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-6">
                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                             <Label className="text-[9px] font-black uppercase text-slate-400">Nome Requerente</Label>
                             <Input defaultValue={autoFields.client.name} className="h-10 bg-slate-50 border-slate-200 rounded-lg text-xs font-bold" />
                          </div>
                          <div className="space-y-1.5">
                             <Label className="text-[9px] font-black uppercase text-slate-400">CPF / CNPJ</Label>
                             <Input defaultValue={autoFields.client.id} className="h-10 bg-slate-50 border-slate-200 rounded-lg text-xs font-bold" />
                          </div>
                          <div className="col-span-2 space-y-1.5">
                             <Label className="text-[9px] font-black uppercase text-slate-400">Endereço Completo</Label>
                             <Input defaultValue={autoFields.client.address} className="h-10 bg-slate-50 border-slate-200 rounded-lg text-xs font-bold" />
                          </div>
                          <div className="space-y-1.5">
                             <Label className="text-[9px] font-black uppercase text-slate-400">Embarcação</Label>
                             <Input defaultValue={autoFields.vessel.name} className="h-10 bg-slate-50 border-slate-200 rounded-lg text-xs font-bold" />
                          </div>
                          <div className="space-y-1.5">
                             <Label className="text-[9px] font-black uppercase text-slate-400">Inscrição / IMO</Label>
                             <Input defaultValue={autoFields.vessel.inscription} className="h-10 bg-slate-50 border-slate-200 rounded-lg text-xs font-bold" />
                          </div>
                          <div className="space-y-1.5">
                             <Label className="text-[9px] font-black uppercase text-slate-400">Motorização</Label>
                             <Input defaultValue={autoFields.vessel.engine} className="h-10 bg-slate-50 border-slate-200 rounded-lg text-xs font-bold" />
                          </div>
                          <div className="space-y-1.5">
                             <Label className="text-[9px] font-black uppercase text-slate-400">Data Atual</Label>
                             <Input defaultValue="12 de Maio de 2026" className="h-10 bg-slate-50 border-slate-200 rounded-lg text-xs font-bold" />
                          </div>
                       </div>
                       
                       <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                          <div className="flex items-center gap-2 mb-2">
                             <FileWarning className="h-4 w-4 text-amber-500" />
                             <span className="text-[10px] font-black uppercase text-amber-700 tracking-widest">Aviso de Preenchimento</span>
                          </div>
                          <p className="text-[11px] text-amber-600 font-medium">Os campos em cinza foram importados automaticamente do cadastro do cliente/embarcação.</p>
                       </div>
                    </div>
                 </ScrollArea>
              </div>
           </Card>
        </div>

        {/* Right Column - Preview */}
        <div className="lg:col-span-7 space-y-6">
           <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center">
              <div className="flex gap-2">
                 <Badge className="bg-green-100 text-green-700 border-none px-3 py-1 font-black text-[9px] uppercase tracking-widest">Validado</Badge>
                 <Badge className="bg-blue-100 text-blue-700 border-none px-3 py-1 font-black text-[9px] uppercase tracking-widest">Versão 2.1</Badge>
              </div>
              <div className="flex gap-2">
                 <Button 
                   variant={!isPreviewMode ? "default" : "ghost"}
                   onClick={() => setIsPreviewMode(false)}
                   className="h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest"
                 >
                    Editor
                 </Button>
                 <Button 
                   variant={isPreviewMode ? "default" : "ghost"}
                   onClick={() => setIsPreviewMode(true)}
                   className="h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest"
                 >
                    Visualizar A4
                 </Button>
              </div>
           </div>

           {/* A4 Sheet Preview */}
           <div className="bg-slate-200/50 p-12 rounded-[2.5rem] flex justify-center overflow-hidden min-h-[800px] relative group">
              <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center pointer-events-none opacity-[0.03] rotate-45 select-none">
                 <span className="text-9xl font-black uppercase">PRÉVIA</span>
              </div>

              <div className="bg-white w-[595px] h-[842px] shadow-2xl p-16 flex flex-col relative animate-in zoom-in-95 duration-500 origin-top">
                 {/* Header do Documento */}
                 <div className="text-center space-y-2 mb-12 border-b-2 border-slate-900 pb-8">
                    <h2 className="text-xl font-black uppercase tracking-tight">Marinha do Brasil</h2>
                    <h3 className="text-lg font-bold uppercase">Diretoria de Portos e Costas</h3>
                    <p className="text-sm font-medium">Capitania dos Portos do Rio de Janeiro</p>
                 </div>

                 {/* Título do Documento */}
                 <div className="text-center mb-12">
                    <h4 className="text-lg font-black uppercase underline decoration-2 underline-offset-8">
                       {selectedType ? docTypes.find(t => t.id === selectedType)?.title : "Requerimento de Inscrição"}
                    </h4>
                 </div>

                 {/* Corpo do Documento */}
                 <div className="space-y-6 text-sm leading-relaxed text-justify flex-grow">
                    <p>
                       Eu, <span className="font-bold underline">{autoFields.client.name}</span>, inscrito no CPF sob o nº <span className="font-bold underline">{autoFields.client.id}</span>, 
                       residente e domiciliado em <span className="font-bold underline">{autoFields.client.address}</span>, venho mui respeitosamente requerer a V.Sª. o que segue abaixo:
                    </p>

                    <p className="font-bold italic">
                       Solicito a inscrição inicial da embarcação denominada <span className="underline">{autoFields.vessel.name}</span>, de tipo <span className="underline">{autoFields.vessel.type}</span>, 
                       equipada com motorização <span className="underline">{autoFields.vessel.engine}</span>, para navegação em categoria de <span className="underline">{autoFields.vessel.category}</span>.
                    </p>

                    <p>
                       Declaro, sob as penas da lei, que as informações acima prestadas são a expressão da verdade, assumindo total responsabilidade pelas mesmas perante esta autoridade marítima.
                    </p>

                    <p className="pt-12">
                       Nestes termos, <br />
                       Pede deferimento.
                    </p>
                 </div>

                 {/* Footer / Assinatura */}
                 <div className="mt-auto space-y-12">
                    <div className="text-right">
                       <p className="text-sm font-medium">Rio de Janeiro, 12 de Maio de 2026</p>
                    </div>

                    <div className="flex flex-col items-center">
                       <div className="w-64 border-t border-slate-900 pt-2 text-center">
                          <p className="text-sm font-bold uppercase">{autoFields.client.name}</p>
                          <p className="text-[10px] font-medium text-slate-500 uppercase tracking-widest mt-1">Requerente / Outorgante</p>
                       </div>
                    </div>
                 </div>

                 {/* Overlay de edição em cima do A4 quando não for preview */}
                 {!isPreviewMode && (
                   <div className="absolute inset-0 bg-primary/5 border-4 border-dashed border-primary/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <div className="bg-primary text-white px-6 py-3 rounded-full font-black text-xs uppercase tracking-[0.2em] shadow-xl">
                         Modo de Edição Ativo
                      </div>
                   </div>
                 )}
              </div>
           </div>

           <div className="flex justify-end gap-3 pt-4">
              <Button size="lg" className="bg-navy text-white h-14 px-10 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-navy/20 gap-3">
                 <Eye className="h-5 w-5" /> Validar Documento
              </Button>
              <Button size="lg" className="bg-primary text-white h-14 px-10 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-primary/20 gap-3">
                 <FileText className="h-5 w-5" /> Gerar PDF
              </Button>
           </div>
        </div>
      </div>
    </div>
  );
}
