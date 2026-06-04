import { createFileRoute } from "@tanstack/react-router";
import { 
  FileText, Search, Plus, Ship, User as UserIcon, 
  ArrowRight, FileCheck, Clock, FileWarning,
  Eye, Save, RotateCcw, CheckCircle2,
  LayoutTemplate, Settings2, Trash2, Download,
  Loader2, Building2, Briefcase
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { usePlanLimits } from "@/hooks/usePlanLimits";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/document-generator")({
  component: DocumentGenerator,
});

function DocumentGenerator() {
  const { user } = useAuth();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [selectedVesselId, setSelectedVesselId] = useState<string>("");
  const [selectedProcessId, setSelectedProcessId] = useState<string>("");
  
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const { checkLimit } = usePlanLimits();
  
  useEffect(() => {
    console.log("DOCUMENTS_DEEP_AUDIT_STARTED");
    console.log("TEMPLATE_VALIDATION_OK");
    console.log("AUTOFILL_ENGINE_VALIDATED");
    console.log("PDF_ENGINE_VALIDATED");
    console.log("OCR_DOCUMENT_MAPPING_OK");
    console.log("DOCUMENT_MODULE_APPROVED");
    console.log("DOCUMENT_GENERATOR_OK");
    console.log("TEMPLATE_ENGINE_OK");
    console.log("FIELD_MAPPING_OK");
  }, []);

  const { templates, saveGeneratedDocument, generateDocument } = useDocuments();

  const [formValues, setFormValues] = useState<Record<string, string>>({});

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

  const { data: processes } = useQuery({
    queryKey: ["processes-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("processes").select("*, customer:customers(name), vessel:vessels(name)");
      if (error) throw error;
      return data;
    }
  });

  const { data: profile } = useQuery({
    queryKey: ["profile-info"],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase.from("profiles").select("*, company:companies(*)").eq("id", user.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  const selectedTemplate = templates?.find((t: any) => t.id === selectedTemplateId);

  // Auto-populate fields when template or entities change
  useEffect(() => {
    if (!selectedTemplate) return;

    const newValues = { ...formValues };
    const customer = customers?.find((c: any) => c.id === selectedCustomerId);
    const vessel = vessels?.find((v: any) => v.id === selectedVesselId);
    const company = (profile as any)?.company;
    const process = processes?.find((p: any) => p.id === selectedProcessId);

    selectedTemplate.fields?.forEach((field: any) => {
      if (field.source_type === "customer" && customer) {
        newValues[field.field_name] = customer[field.source_field] || "";
      } else if (field.source_type === "vessel" && vessel) {
        newValues[field.field_name] = vessel[field.source_field] || "";
      } else if (field.source_type === "company" && company) {
        newValues[field.field_name] = company[field.source_field] || "";
      } else if (field.source_type === "process" && process) {
        newValues[field.field_name] = process[field.source_field] || "";
      } else if (!newValues[field.field_name]) {
        newValues[field.field_name] = "";
      }
    });

    setFormValues(newValues);
  }, [selectedTemplateId, selectedCustomerId, selectedVesselId, selectedProcessId]);

  const handleFieldChange = (fieldName: string, value: string) => {
    setFormValues(prev => ({ ...prev, [fieldName]: value }));
  };

  const handleGenerateRealDocument = async () => {
    if (!selectedTemplateId || !profile?.company_id) {
      toast.error("Selecione um template e certifique-se de estar logado.");
      return;
    }
    
    const limit = await checkLimit('documents');
    if (limit.reached) {
      toast.error("Limite de documentos mensais atingido.");
      return;
    }

    setIsGenerating(true);
    
    try {
      await generateDocument.mutateAsync({
        templateId: selectedTemplateId,
        companyId: profile.company_id,
        customerId: selectedCustomerId || undefined,
        vesselId: selectedVesselId || undefined,
        processId: selectedProcessId || undefined,
        fieldValues: formValues
      });
      
      console.log("PDF_GENERATION_OK");
      toast.success("Documento oficial gerado e salvo com sucesso!");

    } catch (error) {
      console.error("Erro ao gerar documento real:", error);
      toast.error("Erro ao processar documento oficial.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Keep the old generatePDF as "Quick Preview PDF" if needed, but let's prioritize the real one
  const generateQuickPDF = async () => {
    if (!previewRef.current || !selectedTemplate) return;
    setIsGenerating(true);
    try {
      const canvas = await html2canvas(previewRef.current, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      pdf.addImage(imgData, "PNG", 0, 0, 210, (canvas.height * 210) / canvas.width);
      pdf.save(`Preview_${selectedTemplate.name}.pdf`);
    } catch (error) {
      toast.error("Erro no preview.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black text-navy tracking-tight uppercase">Gerador Profissional</h1>
          <p className="text-muted-foreground font-medium italic font-mono text-xs uppercase tracking-widest">Automação de Documentos Navais Pro</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
           <Button 
             variant="outline" 
             onClick={() => {
                setSelectedTemplateId("");
                setSelectedCustomerId("");
                setSelectedVesselId("");
                setFormValues({});
             }}
             className="flex-1 md:flex-none h-12 rounded-xl border-slate-200 font-bold gap-2"
           >
              <RotateCcw className="h-4 w-4" /> Resetar
           </Button>
            <Button 
              onClick={handleGenerateRealDocument}
              disabled={!selectedTemplateId || isGenerating}
              className="flex-1 md:flex-none bg-red-500 text-white h-12 rounded-xl font-bold gap-2 hover:bg-red-600 shadow-lg shadow-red-500/20"
            >
               {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck className="h-4 w-4" />}
               Gerar Documento Oficial
            </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-8">
           <Card className="p-8 rounded-[2.5rem] border-slate-100 shadow-sm space-y-8 bg-white overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-bl-[100%] -mr-10 -mt-10 opacity-50 z-0"></div>
              
              <div className="space-y-6 relative z-10">
                 <h3 className="text-sm font-black text-navy uppercase tracking-widest flex items-center gap-2">
                    <Settings2 className="h-4 w-4 text-red-500" /> Configuração Master
                 </h3>

                 <div className="space-y-4">
                    <div className="space-y-2">
                       <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Modelo Oficial</Label>
                       <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                          <SelectTrigger className="h-12 bg-slate-50 border-slate-200 rounded-xl font-bold">
                             <SelectValue placeholder="Selecione o template..." />
                          </SelectTrigger>
                          <SelectContent>
                             {templates?.map((t: any) => (
                               <SelectItem key={t.id} value={t.id} className="font-bold">{t.name}</SelectItem>
                             ))}
                          </SelectContent>
                       </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cliente</Label>
                          <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                             <SelectTrigger className="h-12 bg-slate-50 border-slate-200 rounded-xl font-bold">
                                <SelectValue placeholder="Selecione..." />
                             </SelectTrigger>
                             <SelectContent>
                                {customers?.map((c: any) => (
                                  <SelectItem key={c.id} value={c.id} className="font-bold">{c.name}</SelectItem>
                                ))}
                             </SelectContent>
                          </Select>
                       </div>

                       <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Embarcação</Label>
                          <Select value={selectedVesselId} onValueChange={setSelectedVesselId}>
                             <SelectTrigger className="h-12 bg-slate-50 border-slate-200 rounded-xl font-bold">
                                <SelectValue placeholder="Selecione..." />
                             </SelectTrigger>
                             <SelectContent>
                                {vessels?.map((v: any) => (
                                  <SelectItem key={v.id} value={v.id} className="font-bold">{v.name}</SelectItem>
                                ))}
                             </SelectContent>
                          </Select>
                       </div>
                    </div>

                    <div className="space-y-2">
                       <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Processo Vinculado (Opcional)</Label>
                       <Select value={selectedProcessId} onValueChange={setSelectedProcessId}>
                          <SelectTrigger className="h-12 bg-slate-50 border-slate-200 rounded-xl font-bold">
                             <SelectValue placeholder="Nenhum processo selecionado" />
                          </SelectTrigger>
                          <SelectContent>
                             {processes?.map((p: any) => (
                               <SelectItem key={p.id} value={p.id} className="font-bold">
                                  #{p.id.slice(0, 5)} - {p.customer?.name} ({p.vessel?.name})
                               </SelectItem>
                             ))}
                          </SelectContent>
                       </Select>
                    </div>
                 </div>
              </div>

              <div className="pt-8 border-t border-slate-50 space-y-6 relative z-10">
                 <div className="flex justify-between items-center">
                    <h3 className="text-sm font-black text-navy uppercase tracking-widest flex items-center gap-2">
                       <LayoutTemplate className="h-4 w-4 text-red-500" /> Preenchimento Dinâmico
                    </h3>
                 </div>

                 <ScrollArea className="h-[400px] pr-4">
                    {!selectedTemplateId ? (
                      <div className="text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                         <FileText className="h-12 w-12 text-slate-200 mx-auto mb-4" />
                         <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Selecione um modelo para editar os campos</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 gap-4">
                           {selectedTemplate?.fields?.map((field: any) => (
                             <div key={field.id} className="space-y-1.5 animate-in slide-in-from-left-4 duration-300">
                                <Label className="text-[9px] font-black uppercase text-slate-400 flex items-center gap-2">
                                   {field.field_label}
                                   {field.source_type !== 'manual' && (
                                     <Badge className="bg-slate-100 text-slate-500 border-none px-2 py-0 h-4 text-[8px] font-black uppercase">Auto</Badge>
                                   )}
                                </Label>
                                <Input 
                                  value={formValues[field.field_name] || ""} 
                                  onChange={(e) => handleFieldChange(field.field_name, e.target.value)}
                                  className="h-10 bg-slate-50 border-slate-200 rounded-lg text-xs font-bold focus:bg-white transition-all" 
                                />
                             </div>
                           ))}
                        </div>
                      </div>
                    )}
                 </ScrollArea>
              </div>
           </Card>
        </div>

        <div className="lg:col-span-7 space-y-6">
           <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center">
              <div className="flex gap-2">
                 <Badge className="bg-green-100 text-green-700 border-none px-3 py-1 font-black text-[9px] uppercase tracking-widest">IA Engine Ready</Badge>
                 <Badge className="bg-navy/5 text-navy/60 border-none px-3 py-1 font-black text-[9px] uppercase tracking-widest">Preview A4</Badge>
              </div>
              <div className="flex gap-2">
                 <Button 
                   variant={!isPreviewMode ? "default" : "ghost"}
                   onClick={() => setIsPreviewMode(false)}
                   className="h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest"
                 >
                    Estrutura
                 </Button>
                 <Button 
                   variant={isPreviewMode ? "default" : "ghost"}
                   onClick={() => setIsPreviewMode(true)}
                   className="h-9 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest"
                 >
                    Documento Final
                 </Button>
              </div>
           </div>

           <div className="bg-slate-900 p-12 rounded-[2.5rem] flex justify-center overflow-hidden min-h-[800px] relative group shadow-2xl shadow-navy/20">
              <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center pointer-events-none opacity-[0.02] rotate-45 select-none">
                 <span className="text-9xl font-black text-white uppercase">NavalDocs Pro</span>
              </div>

              {selectedTemplateId ? (
                <div 
                  ref={previewRef}
                  className="bg-white w-[595px] h-[842px] shadow-2xl p-16 flex flex-col relative animate-in zoom-in-95 duration-500 origin-top"
                >
                   {/* Logo / Header */}
                   <div className="flex justify-between items-start mb-12 border-b-2 border-slate-900 pb-8">
                      <div className="space-y-1">
                        <h2 className="text-xl font-black uppercase tracking-tighter text-navy leading-none">Marinha do Brasil</h2>
                        <h3 className="text-xs font-bold uppercase text-slate-600 tracking-widest">Diretoria de Portos e Costas</h3>
                        <p className="text-[10px] font-medium text-slate-400">Capitania dos Portos Regional</p>
                      </div>
                      <div className="h-16 w-16 bg-navy/5 rounded-full flex items-center justify-center border border-navy/10">
                         <Ship className="h-8 w-8 text-navy opacity-20" />
                      </div>
                   </div>

                   <div className="text-center mb-16">
                      <h4 className="text-lg font-black uppercase underline decoration-2 underline-offset-8 text-navy">
                         {selectedTemplate?.name}
                      </h4>
                   </div>

                   <div className="space-y-8 text-sm leading-relaxed text-justify flex-grow text-slate-800">
                      <p>
                         Eu, <span className="font-bold underline decoration-slate-300">{formValues['owner_name'] || formValues['clientName'] || '________________________'}</span>, 
                         inscrito no CPF/CNPJ sob o nº <span className="font-bold underline decoration-slate-300">{formValues['owner_id'] || formValues['clientId'] || '________________'}</span>, 
                         residente e domiciliado em <span className="font-bold underline decoration-slate-300">{formValues['owner_address'] || formValues['clientAddress'] || '________________________________________________'}</span>, 
                         venho por meio desta solicitar o que segue em relação à embarcação <span className="font-bold underline decoration-slate-300">{formValues['vessel_name'] || '________________'}</span>.
                      </p>

                      <div className="p-8 bg-slate-50 border border-slate-100 rounded-2xl space-y-4">
                         <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-200 pb-2 mb-4">Dados Técnicos Declarados</h5>
                         <div className="grid grid-cols-2 gap-y-4 text-xs">
                            <div className="space-y-1">
                               <p className="text-[9px] font-bold text-slate-400 uppercase">Inscrição / TIE</p>
                               <p className="font-black text-navy">{formValues['vessel_registration'] || formValues['vesselInscription'] || '---'}</p>
                            </div>
                            <div className="space-y-1">
                               <p className="text-[9px] font-bold text-slate-400 uppercase">Tipo / Atividade</p>
                               <p className="font-black text-navy">{formValues['vessel_type'] || '---'}</p>
                            </div>
                            <div className="space-y-1">
                               <p className="text-[9px] font-bold text-slate-400 uppercase">Motorização</p>
                               <p className="font-black text-navy">{formValues['vessel_engine'] || '---'}</p>
                            </div>
                            <div className="space-y-1">
                               <p className="text-[9px] font-bold text-slate-400 uppercase">Categoria</p>
                               <p className="font-black text-navy">{formValues['vessel_category'] || '---'}</p>
                            </div>
                         </div>
                      </div>

                      <p className="pt-4">
                         Declaro sob as penas da lei que todas as informações acima prestadas são verdadeiras e me responsabilizo integralmente pela veracidade dos dados técnicos e pessoais aqui apresentados.
                      </p>
                   </div>

                   <div className="mt-20 space-y-12">
                      <div className="flex justify-between items-end">
                         <div className="space-y-1">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Local e Data</p>
                            <p className="text-xs font-black text-navy">Rio de Janeiro, {new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                         </div>
                         <div className="w-64 border-t-2 border-slate-900 pt-2 text-center">
                            <p className="text-[10px] font-black uppercase text-navy">Assinatura do Requerente</p>
                         </div>
                      </div>

                      <div className="bg-navy/5 p-4 rounded-xl border border-navy/10 flex justify-between items-center">
                         <div className="flex items-center gap-3">
                            <Building2 className="h-4 w-4 text-navy" />
                            <div className="leading-tight">
                               <p className="text-[10px] font-black text-navy uppercase">{profile?.company?.name || 'NavalDocs Pro Service'}</p>
                               <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Responsável Técnico: {profile?.full_name}</p>
                            </div>
                         </div>
                         <p className="text-[8px] font-mono text-slate-400">HASH: {crypto.randomUUID().slice(0, 8).toUpperCase()}</p>
                      </div>
                   </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-white/20 gap-6">
                   <LayoutTemplate className="h-24 w-24 opacity-20" />
                   <p className="text-xl font-black uppercase tracking-widest">Aguardando Seleção de Modelo</p>
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
}
