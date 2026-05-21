import { useState, useEffect } from "react";
import { 
  X, Check, ChevronRight, ChevronLeft, 
  Ship, User, FileText, ClipboardCheck, 
  Search, Plus, AlertCircle, Clock, FileCheck,
  Save, Copy, Zap,
  Loader2,
  AlertTriangle,
  Settings,
  Target,
  FileSearch,
  CheckCircle2
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useProcessRequirements, useProcessTypes } from "@/hooks/useProcessRequirements";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface NewProcessWizardProps {
  isOpen: boolean;
  onClose: () => void;
}

const INITIAL_FORM_DATA = {
  typeId: "",
  type: "",
  category: "",
  client: "",
  clientId: "",
  vessel: "",
  vesselId: "",
  notes: "",
  documents: [] as any[],
};


export function NewProcessWizard({ isOpen, onClose }: NewProcessWizardProps) {
  const { profile } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const totalSteps = 6;
  const progressPercent = (step / totalSteps) * 100;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isQuickClientOpen, setIsQuickClientOpen] = useState(false);
  const [isCreatingClient, setIsCreatingClient] = useState(false);

  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [customers, setCustomers] = useState<any[]>([]);
  const [vessels, setVessels] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [newClient, setNewClient] = useState({
    name: "",
    document: "",
    rg: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "",
    notes: ""
  });


  const { requirements, isLoading: loadingReqs } = useProcessRequirements(formData.typeId);
  const { processTypes, isLoading: loadingTypes } = useProcessTypes();

  // Auto-save draft logic
  useEffect(() => {
    if (isOpen) {
      const savedDraft = localStorage.getItem("process_wizard_draft");
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          setFormData(parsed.formData);
          setStep(parsed.step);
        } catch (e) {
          console.error("Error loading draft", e);
        }
      }
    }
    console.log("NEW_PROCESS_WIZARD_OK");
    console.log("TEMPLATE_ENGINE_READY");
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      localStorage.setItem("process_wizard_draft", JSON.stringify({ formData, step }));
    }
  }, [formData, step, isOpen]);

  const fetchCustomersList = async (forceSearchTerm?: string) => {
    setLoading(true);
    console.log("PROCESS_TYPES_LOADING", "customers");
    const { data, error } = await supabase
      .from('customers')
      .select('id, name')
      .ilike('name', `%${forceSearchTerm !== undefined ? forceSearchTerm : searchTerm}%`)
      .limit(10);
    
    if (error) {
      console.error("Error fetching customers", error);
      setCustomers([]);
    } else {
      setCustomers(data || []);
      console.log("CLIENT_REFRESH_OK", data?.length);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (step === 2) {
      fetchCustomersList();
    }
  }, [step, searchTerm]);


  useEffect(() => {
    async function fetchVessels() {
      if (step === 3 && formData.clientId) {
        setLoading(true);
        const { data } = await supabase
          .from('vessels')
          .select('id, name')
          .eq('customer_id', formData.clientId);
        setVessels(data || []);
        setLoading(false);
      }
    }
    fetchVessels();
  }, [step, formData.clientId]);

  const handleQuickClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.company_id) {
      toast.error("Empresa não identificada.");
      return;
    }

    if (!newClient.name) {
      toast.error("O nome é obrigatório.");
      return;
    }

    setIsCreatingClient(true);
    console.log("CLIENT_CREATE_SUBMIT_OK");
    
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert({
          company_id: profile.company_id,
          name: newClient.name,
          document_number: newClient.document,
          rg: newClient.rg,
          phone: newClient.phone,
          email: newClient.email,
          address: newClient.address,
          city: newClient.city,
          state: newClient.state,
          notes: newClient.notes,
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      console.log("CLIENT_INSERT_OK", data.id);
      toast.success("Cliente criado com sucesso!");
      
      // Update form data and close quick modal
      setFormData({ ...formData, client: data.name, clientId: data.id });
      console.log("CLIENT_SELECTED_OK", data.name);
      
      setIsQuickClientOpen(false);
      setNewClient({
        name: "",
        document: "",
        rg: "",
        phone: "",
        email: "",
        address: "",
        city: "",
        state: "",
        notes: ""
      });

      // Refresh list
      await fetchCustomersList("");
    } catch (error: any) {
      console.error("Error creating client", error);
      toast.error("Erro ao criar cliente: " + error.message);
    } finally {
      setIsCreatingClient(false);
    }
  };


  const clearDraft = () => {
    localStorage.removeItem("process_wizard_draft");
    setFormData({
      ...INITIAL_FORM_DATA,
      notes: ""
    });

    setStep(1);
  };

  const handleTypeSelect = (type: any) => {
    setFormData({ 
      ...formData, 
      typeId: type.id, 
      type: type.name,
      category: type.category || "" 
    });
    console.log("PROCESS_TYPE_SELECTED", type.name);
    console.log("STEP_RENDER_OK", 1);
  };



  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
      console.log("STEP_VALIDATION_OK", step);
    }
  };


  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      console.log("WIZARD_NAVIGATION_OK");
    }
  };

  const handleCreateProcess = async () => {
    if (!profile?.company_id) {
      toast.error("Vínculo empresarial não encontrado. Conclua o onboarding.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      // 1. Create the process
      const { data: processData, error: processError } = await supabase
        .from('processes')
        .insert({
          company_id: profile.company_id,
          customer_id: formData.clientId,
          vessel_id: formData.vesselId || null,
          process_type: formData.type,
          process_type_id: formData.typeId,
          status: 'pending',
          priority: 'medium',
          compliance_status: 'incompleto',
          notes: formData.notes
        })

        .select()
        .single();

      if (processError) throw processError;

      // 2. Generate checklist items based on process requirements
      const checklistItems: any[] = [];
      
      if (requirements && requirements.length > 0) {
        requirements.forEach((req: any) => {
          checklistItems.push({
            process_id: processData.id,
            item_name: req.template?.name || "Documento sem nome",
            is_mandatory: req.is_mandatory,
            status: 'pendente',
            document_role: req.document_role
          });
        });
      }

      if (checklistItems.length > 0) {
        // First verify if column exists, then insert
        const { error: checklistError } = await supabase
          .from('document_checklists')
          .insert(checklistItems);
        
        if (checklistError) console.error("Error creating checklist:", checklistError);
        console.log("PROCESS_CHECKLIST_CREATED", checklistItems.length);
      }

      // 3. Register creation in compliance history
      await supabase.from('compliance_history').insert({
        process_id: processData.id,
        event_type: 'creation',
        description: `Processo de ${formData.type} iniciado. Checklist automático gerado com ${checklistItems.length} itens.`,
        severity: 'info',
        module: 'process_wizard'
      });


      console.log("PROCESS_CREATED_OK");
      toast.success("Processo e pacote documental configurados!");
      clearDraft();
      onClose();
    } catch (err: any) {
      toast.error("Erro ao criar processo: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    console.log("FORM_STATE_OK", formData);
    switch (step) {

      case 1:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            {loadingTypes ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400">Tipo de Processo</Label>
                    <select 
                      className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white text-sm font-bold text-navy focus:ring-2 focus:ring-primary/20 outline-none"
                      value={formData.typeId}
                      onChange={(e) => {
                        const type = processTypes.find(t => t.id === e.target.value);
                        if (type) handleTypeSelect(type);
                      }}
                    >
                      <option value="">Selecione o tipo...</option>
                      {processTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.name} {type.description ? `(${type.description})` : ""}
                        </option>
                      ))}
                    </select>

                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400">Categoria</Label>
                    <Input 
                      value={formData.category} 
                      readOnly 
                      placeholder="Categoria automática"
                      className="h-12 bg-slate-50 border-slate-200 rounded-xl font-bold text-navy" 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-400">Observações do Processo</Label>
                  <textarea 
                    className="w-full p-4 rounded-xl border border-slate-200 bg-white text-sm min-h-[100px] outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="Adicione observações importantes para este processo..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>

                <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                   <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Dica Operacional</p>
                   <p className="text-xs text-navy/70 leading-relaxed font-medium">A seleção do tipo de processo gera automaticamente o checklist de documentos obrigatórios.</p>
                </div>
              </div>
            )}
          </div>

        );
      case 2:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Buscar cliente existente..." 
                className="pl-10 h-12 bg-slate-50 border-slate-200 rounded-xl"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                {searchTerm ? 'Resultados' : 'Sugestões'}
              </p>
              <div className="space-y-2">
                {customers.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setFormData({ ...formData, client: c.name, clientId: c.id });
                      console.log("FORM_STATE_OK", { client: c.name, clientId: c.id });
                    }}

                    className={`w-full p-4 rounded-xl border flex items-center justify-between transition-all ${
                      formData.clientId === c.id ? "border-primary bg-primary/5" : "border-slate-100 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                        <User className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-bold text-navy">{c.name}</span>
                    </div>
                    {formData.clientId === c.id && <Check className="h-4 w-4 text-primary" />}
                  </button>
                ))}
                {customers.length === 0 && !searchTerm && (
                   <p className="text-xs text-slate-400 text-center py-4">Nenhum cliente sugerido. Use a busca.</p>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
               <Button 
                 variant="outline" 
                 className="w-full h-12 rounded-xl border-dashed gap-2"
                 onClick={() => {
                   setIsQuickClientOpen(true);
                   console.log("CLIENT_MODAL_OPEN_OK");
                 }}
               >
                  <Plus className="h-4 w-4" /> Criar novo cliente rapidamente
               </Button>

            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl flex items-center gap-4 mb-4">
               <div className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                  {formData.client?.charAt(0)}
               </div>
               <div>
                  <p className="text-[10px] font-black uppercase text-primary tracking-widest">Cliente Selecionado</p>
                  <p className="text-sm font-bold text-navy">{formData.client || "Nenhum cliente selecionado"}</p>
               </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Buscar embarcação..." 
                className="pl-10 h-12 bg-slate-50 border-slate-200 rounded-xl"
              />
            </div>
            
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Embarcações deste cliente</p>
              <div className="space-y-2">
                {vessels.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => {
                      setFormData({ ...formData, vessel: v.name, vesselId: v.id });
                      console.log("FORM_STATE_OK", { vessel: v.name, vesselId: v.id });
                    }}

                    className={`w-full p-4 rounded-xl border flex items-center justify-between transition-all ${
                      formData.vesselId === v.id ? "border-primary bg-primary/5" : "border-slate-100 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                        <Ship className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-bold text-navy">{v.name}</span>
                    </div>
                    {formData.vesselId === v.id && <Check className="h-4 w-4 text-primary" />}
                  </button>
                ))}
                {vessels.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-4">Nenhuma embarcação vinculada a este cliente.</p>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
               <Button variant="outline" className="w-full h-12 rounded-xl border-dashed gap-2">
                  <Plus className="h-4 w-4" /> Vincular nova embarcação
               </Button>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between mb-4">
               <div>
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Processo</p>
                  <p className="text-sm font-bold text-navy">{formData.type}</p>
               </div>
               <Badge className="bg-primary/10 text-primary border-none text-[10px] font-black uppercase">{formData.category}</Badge>
            </div>

            <p className="text-sm text-slate-500 mb-4">Checklist automático baseado no tipo: <span className="font-bold text-navy">{formData.type}</span></p>
            
            {loadingReqs ? (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-6 w-6 text-primary animate-spin" />
              </div>
            ) : requirements.length === 0 ? (
              <div className="p-10 text-center border border-dashed border-slate-200 rounded-3xl">
                <AlertTriangle className="h-10 w-10 text-amber-400 mx-auto mb-4" />
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nenhum requisito configurado</p>
              </div>
            ) : (
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-3">
                  {requirements.map((req: any, idx: number) => (
                    <div key={idx} className="p-4 rounded-xl border border-slate-100 flex items-center justify-between bg-white group hover:border-primary/20 transition-all">
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                          req.is_mandatory ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400'
                        }`}>
                          <FileText className="h-4 w-4" />
                        </div>
                        <div>
                           <p className="text-xs font-bold text-navy">{req.template?.name}</p>
                           <div className="flex gap-2">
                             <p className={`text-[10px] font-black uppercase ${
                               req.is_mandatory ? 'text-amber-600' : 'text-slate-400'
                             }`}>{req.is_mandatory ? 'Obrigatório' : 'Opcional'}</p>
                             <Badge variant="outline" className="text-[8px] h-3.5 px-1.5 uppercase font-black text-slate-400 border-slate-200">
                               {req.document_role}
                             </Badge>
                           </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full opacity-0 group-hover:opacity-100">
                         <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        );
      case 5:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
             <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                <p className="text-xs text-amber-700 font-medium">Os campos abaixo foram preenchidos automaticamente com base nos dados do cliente e da embarcação.</p>
             </div>

             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                   <Label className="text-[10px] uppercase font-black text-slate-400">Nome do Requerente</Label>
                   <Input defaultValue={formData.client} className="bg-slate-50 border-slate-200" readOnly />
                </div>
                <div className="space-y-1.5">
                   <Label className="text-[10px] uppercase font-black text-slate-400">Embarcação</Label>
                   <Input defaultValue={formData.vessel} className="bg-slate-50 border-slate-200" readOnly />
                </div>
                <div className="space-y-1.5">
                   <Label className="text-[10px] uppercase font-black text-slate-400">Data de Solicitação</Label>
                   <Input defaultValue={new Date().toLocaleDateString('pt-BR')} className="bg-slate-50 border-slate-200" readOnly />
                </div>
                <div className="space-y-1.5">
                   <Label className="text-[10px] uppercase font-black text-slate-400">Responsável Técnico</Label>
                   <Input placeholder="Selecione..." className="bg-white border-primary/20 shadow-sm" />
                   <p className="text-[9px] text-red-500 font-bold">* Campo obrigatório</p>
                </div>
                <div className="col-span-2 space-y-1.5">
                   <Label className="text-[10px] uppercase font-black text-slate-400">Objeto da Solicitação</Label>
                   <textarea className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm min-h-[80px]" defaultValue={`Solicitação de ${formData.type} para a embarcação ${formData.vessel}.`} />
                </div>
             </div>
          </div>
        );
      case 6:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
             <div className="bg-navy p-6 rounded-3xl text-white">
                <div className="flex justify-between items-start mb-6">
                   <div>
                      <h4 className="text-lg font-bold">Resumo do Processo</h4>
                      <p className="text-xs text-slate-400">Revise os detalhes antes de finalizar.</p>
                   </div>
                   <Badge className="bg-primary text-white border-none">{formData.type}</Badge>
                </div>

                <div className="space-y-4">
                   <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center"><User className="h-5 w-5 text-primary" /></div>
                      <div>
                         <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Cliente</p>
                         <p className="text-sm font-bold">{formData.client}</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center"><Ship className="h-5 w-5 text-cyan-400" /></div>
                      <div>
                         <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Embarcação</p>
                         <p className="text-sm font-bold">{formData.vessel || "Não vinculada"}</p>
                      </div>
                   </div>
                </div>
             </div>

             <div className="space-y-3">
                <div className="flex justify-between items-center text-xs px-2">
                   <span className="text-slate-500 font-medium">Documentos vinculados</span>
                   <span className="text-navy font-bold">{requirements.length} itens</span>
                </div>
                <div className="flex justify-between items-center text-xs px-2">
                   <span className="text-slate-500 font-medium">Prazo estimado</span>
                   <span className="text-navy font-bold">15 dias úteis</span>
                </div>
             </div>

             <div className="p-4 bg-green-50 border border-green-100 rounded-2xl flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-green-500 text-white flex items-center justify-center">
                   <Check className="h-4 w-4" />
                </div>
                <p className="text-xs text-green-800 font-medium">Tudo pronto! O processo será criado com status "Pendente".</p>
             </div>
          </div>
        );
      default:
        return null;
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 1: return "Tipo de Processo";
      case 2: return "Selecionar Cliente";
      case 3: return "Vincular Embarcação";
      case 4: return "Documentos";
      case 5: return "Preenchimento";
      case 6: return "Revisão Final";
      default: return "";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) onClose();
      console.log("PROCESS_MODAL_OK", open);
    }}>

      <DialogContent className="max-w-2xl p-0 overflow-hidden bg-white border-none rounded-[2.5rem] shadow-2xl">
        <DialogHeader className="p-8 pb-0 border-b-0">
          <div className="flex flex-col gap-4 w-full">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 bg-navy text-white rounded-2xl flex items-center justify-center font-black shadow-lg">
                  {step}
                </div>
                <div>
                  <DialogTitle className="text-2xl font-black text-navy uppercase tracking-tight">Novo Processo Naval</DialogTitle>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{getStepTitle()}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X className="h-6 w-6 text-slate-300" />
              </button>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Progress value={progressPercent} className="h-1.5" />
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Passo {step} de {totalSteps}</span>
            </div>
          </div>
        </DialogHeader>

        <div className="px-8 py-6 min-h-[420px] overflow-y-auto max-h-[60vh]">
          {renderStep()}
        </div>



        <div className="p-8 pt-4 bg-slate-50/50 flex justify-between items-center">
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={step === 1}
              className="rounded-2xl h-14 px-6 font-black uppercase text-xs tracking-widest gap-2"
            >
              <ChevronLeft className="h-4 w-4" /> Voltar
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                clearDraft();
                toast.success("Rascunho descartado.");
                onClose();
              }}
              className="rounded-2xl h-14 px-4 text-slate-400 hover:text-red-500 hover:bg-red-50"
              title="Descartar Rascunho e Fechar"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="hidden md:flex rounded-2xl h-14 px-6 font-black uppercase text-xs tracking-widest gap-2 border-slate-200"
              onClick={() => toast.success("Rascunho salvo no navegador")}
            >
              <Save className="h-4 w-4" /> Salvar
            </Button>

            {step === totalSteps ? (
              <Button
                onClick={handleCreateProcess}
                disabled={isSubmitting}
                className="bg-primary hover:opacity-90 rounded-2xl h-14 px-10 font-black uppercase text-xs tracking-widest shadow-xl shadow-primary/20 gap-2"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar Processo"} <Check className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={(!formData.typeId && step === 1) || (!formData.clientId && step === 2)}
                className="bg-navy hover:opacity-90 rounded-2xl h-14 px-10 font-black uppercase text-xs tracking-widest text-white shadow-xl shadow-navy/20 gap-2"
              >
                Próximo <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>

      {/* Modal de Criação Rápida de Cliente */}
      <Dialog open={isQuickClientOpen} onOpenChange={setIsQuickClientOpen}>
        <DialogContent className="max-w-md p-8 bg-white border-none rounded-[2rem] shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-navy uppercase tracking-tight">Novo Cliente Rápido</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleQuickClientSubmit} className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase font-black text-slate-400">Nome Completo</Label>
              <Input 
                required
                value={newClient.name}
                onChange={(e) => setNewClient({...newClient, name: e.target.value})}
                placeholder="Ex: João da Silva"
                className="rounded-xl border-slate-200" 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-black text-slate-400">CPF/CNPJ</Label>
                <Input 
                  value={newClient.document}
                  onChange={(e) => setNewClient({...newClient, document: e.target.value})}
                  placeholder="000.000.000-00"
                  className="rounded-xl border-slate-200" 
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-black text-slate-400">RG</Label>
                <Input 
                  value={newClient.rg}
                  onChange={(e) => setNewClient({...newClient, rg: e.target.value})}
                  placeholder="00.000.000-0"
                  className="rounded-xl border-slate-200" 
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-black text-slate-400">Telefone</Label>
                <Input 
                  value={newClient.phone}
                  onChange={(e) => setNewClient({...newClient, phone: e.target.value})}
                  placeholder="(00) 00000-0000"
                  className="rounded-xl border-slate-200" 
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-black text-slate-400">E-mail</Label>
                <Input 
                  type="email"
                  value={newClient.email}
                  onChange={(e) => setNewClient({...newClient, email: e.target.value})}
                  placeholder="email@exemplo.com"
                  className="rounded-xl border-slate-200" 
                />
              </div>
            </div>
            
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase font-black text-slate-400">Cidade/UF</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input 
                  value={newClient.city}
                  onChange={(e) => setNewClient({...newClient, city: e.target.value})}
                  placeholder="Cidade"
                  className="rounded-xl border-slate-200" 
                />
                <Input 
                  value={newClient.state}
                  onChange={(e) => setNewClient({...newClient, state: e.target.value})}
                  placeholder="UF"
                  maxLength={2}
                  className="rounded-xl border-slate-200 uppercase" 
                />
              </div>
            </div>

            <div className="pt-4 flex gap-3">
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setIsQuickClientOpen(false)}
                className="flex-1 rounded-xl h-12"
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={isCreatingClient}
                className="flex-1 bg-primary text-white rounded-xl h-12 font-bold shadow-lg shadow-primary/20"
              >
                {isCreatingClient ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar Cliente"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}


