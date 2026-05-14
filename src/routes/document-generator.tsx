import { createFileRoute } from "@tanstack/react-router";
import { 
  FileText, Search, Plus, Ship, User as UserIcon, 
  ArrowRight, FileCheck, Clock, FileWarning,
  Eye, Save, RotateCcw, CheckCircle2,
  LayoutTemplate, Settings2, Trash2, Download,
  Loader2
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
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
import { useDocuments } from "@/hooks/useDocuments";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { toast } from "sonner";

const docTypes = [
  { id: "req-inscricao", title: "Requerimento de Inscrição", icon: <FileText className="h-4 w-4" /> },
  { id: "transf-prop", title: "Transferência de Propriedade", icon: <UserIcon className="h-4 w-4" /> },
  { id: "procuracao", title: "Procuração", icon: <FileCheck className="h-4 w-4" /> },
  { id: "decl-resp", title: "Declaração de Responsabilidade", icon: <CheckCircle2 className="h-4 w-4" /> },
  { id: "solic-vistoria", title: "Solicitação de Vistoria", icon: <Search className="h-4 w-4" /> },
  { id: "guia-gru", title: "Guia / GRU", icon: <FileText className="h-4 w-4" /> },
];

export const Route = createFileRoute("/document-generator")({
  component: DocumentGenerator,
});

function DocumentGenerator() {
  const [selectedType, setSelectedType] = useState("");
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const { saveGeneratedDocument } = useDocuments();

  const { data: customers } = useQuery({
    queryKey: ["customers-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("customers").select("*");
      if (error) throw error;
      return data;
    }
  });

  const { data: vessels } = useQuery({
    queryKey: ["vessels-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("vessels").select("*");
      if (error) throw error;
      return data;
    }
  });

  const [formFields, setFormFields] = useState({
    clientName: "Eng. Ricardo Almeida",
    clientId: "123.456.789-00",
    clientAddress: "Rua do Porto, 100 - Centro, Rio de Janeiro",
    vesselName: "Phoenix",
    vesselInscription: "9876543-2",
    vesselEngine: "Wärtsilä 6R32",
    vesselType: "Petroleiro",
    vesselCategory: "Mar Aberto",
    currentDate: new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
  });

  const handleFieldChange = (field: string, value: string) => {
    setFormFields(prev => ({ ...prev, [field]: value }));
  };

  const handleCustomerSelect = (customerId: string) => {
    const customer = customers?.find(c => c.id === customerId);
    if (customer) {
      setFormFields(prev => ({
        ...prev,
        clientName: customer.name,
        clientId: customer.cpf_cnpj || "",
        clientAddress: customer.address || ""
      }));
    }
  };

  const handleVesselSelect = (vesselId: string) => {
    const vessel = vessels?.find(v => v.id === vesselId);
    if (vessel) {
      setFormFields(prev => ({
        ...prev,
        vesselName: vessel.name,
        vesselInscription: vessel.registration_number || "",
        vesselType: vessel.vessel_type || "",
        vesselEngine: vessel.engine || "",
        vesselCategory: vessel.category || ""
      }));
    }
  };

  const generatePDF = async () => {
    if (!previewRef.current) return;
    setIsGenerating(true);
    
    try {
      // Ensure we are in preview mode temporarily for better capture if needed
      const canvas = await html2canvas(previewRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff"
      });
      
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
      
      const pdfBlob = pdf.output("blob");
      const pdfFile = new File([pdfBlob], `documento-${Date.now()}.pdf`, { type: "application/pdf" });
      
      await saveGeneratedDocument.mutateAsync({
        name: selectedType ? docTypes.find(t => t.id === selectedType)?.title || "Documento" : "Documento",
        status: "completed",
        file: pdfFile,
        metadata: { formFields }
      });

      pdf.save(`NavalDocs_${Date.now()}.pdf`);
      toast.success("Documento gerado com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Erro ao gerar o documento.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 max-w-7xl mx-auto">
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
                       <Select onValueChange={handleCustomerSelect}>
                          <SelectTrigger className="h-12 bg-slate-50 border-slate-200 rounded-xl font-bold">
                             <SelectValue placeholder="Selecione o cliente..." />
                          </SelectTrigger>
                          <SelectContent>
                             {customers?.map(c => (
                               <SelectItem key={c.id} value={c.id} className="font-bold">{c.name}</SelectItem>
                             ))}
                          </SelectContent>
                       </Select>
                    </div>

                    <div className="space-y-2">
                       <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Embarcação</Label>
                       <Select onValueChange={handleVesselSelect}>
                          <SelectTrigger className="h-12 bg-slate-50 border-slate-200 rounded-xl font-bold">
                             <SelectValue placeholder="Selecione a embarcação..." />
                          </SelectTrigger>
                          <SelectContent>
                             {vessels?.map(v => (
                               <SelectItem key={v.id} value={v.id} className="font-bold">{v.name}</SelectItem>
                             ))}
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
                             <Input 
                               value={formFields.clientName} 
                               onChange={(e) => handleFieldChange("clientName", e.target.value)}
                               className="h-10 bg-slate-50 border-slate-200 rounded-lg text-xs font-bold" 
                             />
                          </div>
                          <div className="space-y-1.5">
                             <Label className="text-[9px] font-black uppercase text-slate-400">CPF / CNPJ</Label>
                             <Input 
                               value={formFields.clientId} 
                               onChange={(e) => handleFieldChange("clientId", e.target.value)}
                               className="h-10 bg-slate-50 border-slate-200 rounded-lg text-xs font-bold" 
                             />
                          </div>
                          <div className="col-span-2 space-y-1.5">
                             <Label className="text-[9px] font-black uppercase text-slate-400">Endereço Completo</Label>
                             <Input 
                               value={formFields.clientAddress} 
                               onChange={(e) => handleFieldChange("clientAddress", e.target.value)}
                               className="h-10 bg-slate-50 border-slate-200 rounded-lg text-xs font-bold" 
                             />
                          </div>
                          <div className="space-y-1.5">
                             <Label className="text-[9px] font-black uppercase text-slate-400">Embarcação</Label>
                             <Input 
                               value={formFields.vesselName} 
                               onChange={(e) => handleFieldChange("vesselName", e.target.value)}
                               className="h-10 bg-slate-50 border-slate-200 rounded-lg text-xs font-bold" 
                             />
                          </div>
                          <div className="space-y-1.5">
                             <Label className="text-[9px] font-black uppercase text-slate-400">Inscrição / IMO</Label>
                             <Input 
                               value={formFields.vesselInscription} 
                               onChange={(e) => handleFieldChange("vesselInscription", e.target.value)}
                               className="h-10 bg-slate-50 border-slate-200 rounded-lg text-xs font-bold" 
                             />
                          </div>
                          <div className="space-y-1.5">
                             <Label className="text-[9px] font-black uppercase text-slate-400">Motorização</Label>
                             <Input 
                               value={formFields.vesselEngine} 
                               onChange={(e) => handleFieldChange("vesselEngine", e.target.value)}
                               className="h-10 bg-slate-50 border-slate-200 rounded-lg text-xs font-bold" 
                             />
                          </div>
                          <div className="space-y-1.5">
                             <Label className="text-[9px] font-black uppercase text-slate-400">Data Atual</Label>
                             <Input 
                               value={formFields.currentDate} 
                               onChange={(e) => handleFieldChange("currentDate", e.target.value)}
                               className="h-10 bg-slate-50 border-slate-200 rounded-lg text-xs font-bold" 
                             />
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

           <div className="bg-slate-200/50 p-12 rounded-[2.5rem] flex justify-center overflow-hidden min-h-[800px] relative group">
              <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center pointer-events-none opacity-[0.03] rotate-45 select-none">
                 <span className="text-9xl font-black uppercase">PRÉVIA</span>
              </div>

              <div 
                ref={previewRef}
                className="bg-white w-[595px] h-[842px] shadow-2xl p-16 flex flex-col relative animate-in zoom-in-95 duration-500 origin-top"
              >
                 <div className="text-center space-y-2 mb-12 border-b-2 border-slate-900 pb-8">
                    <h2 className="text-xl font-black uppercase tracking-tight">Marinha do Brasil</h2>
                    <h3 className="text-lg font-bold uppercase">Diretoria de Portos e Costas</h3>
                    <p className="text-sm font-medium">Capitania dos Portos do Rio de Janeiro</p>
                 </div>

                 <div className="text-center mb-12">
                    <h4 className="text-lg font-black uppercase underline decoration-2 underline-offset-8">
                       {selectedType ? docTypes.find(t => t.id === selectedType)?.title : "Requerimento de Inscrição"}
                    </h4>
                 </div>

                 <div className="space-y-6 text-sm leading-relaxed text-justify flex-grow">
                    <p>
                       Eu, <span className="font-bold underline">{formFields.clientName}</span>, inscrito no CPF sob o nº <span className="font-bold underline">{formFields.clientId}</span>, 
                       residente e domiciliado em <span className="font-bold underline">{formFields.clientAddress}</span>, venho mui respeitosamente requerer a V.Sª. o que segue abaixo:
                    </p>

                    <p className="font-bold italic">
                       Solicito a inscrição inicial da embarcação denominada <span className="underline">{formFields.vesselName}</span>, de tipo <span className="underline">{formFields.vesselType}</span>, 
                       equipada com motorização <span className="underline">{formFields.vesselEngine}</span>, para navegação em categoria de <span className="underline">{formFields.vesselCategory}</span>.
                    </p>

                    <p>
                       Declaro, sob as penas da lei, que as informações acima prestadas são a expressão da verdade, assumindo total responsabilidade pelas mesmas perante esta autoridade marítima.
                    </p>

                    <p className="pt-12">
                       Nestes termos, <br />
                       Pede deferimento.
                    </p>
                 </div>

                 <div className="mt-auto space-y-12">
                    <div className="text-right">
                       <p className="text-sm font-medium">Rio de Janeiro, {formFields.currentDate}</p>
                    </div>

                    <div className="flex flex-col items-center">
                       <div className="w-64 border-t border-slate-900 pt-2 text-center">
                          <p className="text-sm font-bold uppercase">{formFields.clientName}</p>
                          <p className="text-[10px] font-medium text-slate-500 uppercase tracking-widest mt-1">Requerente / Outorgante</p>
                       </div>
                    </div>
                 </div>

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
              <Button 
                size="lg" 
                className="bg-navy text-white h-14 px-10 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-navy/20 gap-3"
              >
                 <Eye className="h-5 w-5" /> Validar Documento
              </Button>
              <Button 
                onClick={generatePDF}
                disabled={isGenerating || !selectedType}
                size="lg" 
                className="bg-primary text-white h-14 px-10 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-xl shadow-primary/20 gap-3"
              >
                 {isGenerating ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileText className="h-5 w-5" />}
                 Gerar PDF
              </Button>
           </div>
        </div>
      </div>
    </div>
  );
}
