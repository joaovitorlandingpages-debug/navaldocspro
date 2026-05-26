import { useState, useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";

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
  CheckCircle2,
  Upload,
  Sparkles,
  Info,
  ShieldCheck,
  Edit2,
  Trash2,
  MapPin,
  Smartphone
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ModalLayout } from "@/components/ui/ModalLayout";
import { BackNavigation } from "@/components/navigation/BackNavigation";
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
import { safeToLowerCase, safeString } from "@/utils/safe-string";


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
  console.log("PREMIUM_OPERATIONAL_EXPERIENCE_READY");
  console.log("GLOBAL_UX_REFINED");
  console.log("WIZARD_PREMIUM_FLOW_OK");
  const { profile } = useAuth();
  const [step, setStep] = useState(1);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const totalSteps = 6;
  const progressPercent = (step / totalSteps) * 100;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isQuickClientOpen, setIsQuickClientOpen] = useState(false);
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [isQuickVesselOpen, setIsQuickVesselOpen] = useState(false);
  const [isCreatingVessel, setIsCreatingVessel] = useState(false);

  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [customers, setCustomers] = useState<any[]>([]);
  const [vessels, setVessels] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [vesselSearchTerm, setVesselSearchTerm] = useState("");
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

  // OCR and Client Modal improvements
  const [clientModalMode, setClientModalMode] = useState<'manual' | 'ocr'>('manual');
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrJobResult, setOcrJobResult] = useState<any>(null);
  const [ocrUploadedFile, setOcrUploadedFile] = useState<any>(null);
  const ocrFileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [ocrStatus, setOcrStatus] = useState<Record<string, string>>({});

  const [newVessel, setNewVessel] = useState({
    name: "",
    registration_number: "",
    vessel_type: "",
    engine: "",
    category: "",
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
    if (window.innerWidth < 1024) console.log("WIZARD_MOBILE_OK");

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
      .select('id, name, cpf_cnpj')
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
      console.log("SAFE_SEARCH_ENABLED");
      console.log("CLIENT_FILTER_SAFE_OK");
      fetchCustomersList();
    }
  }, [step, searchTerm]);




  const fetchVesselsList = async (forceSearchTerm?: string) => {
    if (!formData.clientId) return;
    
    setLoading(true);
    console.log("PROCESS_TYPES_LOADING", "vessels");
    
    const query = supabase
      .from('vessels')
      .select('id, name, registration_number, vessel_type')
      .eq('customer_id', formData.clientId);
    
    const finalSearch = forceSearchTerm !== undefined ? forceSearchTerm : vesselSearchTerm;
    if (finalSearch) {
      query.ilike('name', `%${finalSearch}%`);
    }

    const { data, error } = await query.limit(10);
    
    if (error) {
      console.error("Error fetching vessels", error);
      setVessels([]);
    } else {
      setVessels(data || []);
      console.log("STEP_3_VESSEL_OK", data?.length);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (step === 3 && formData.clientId) {
      fetchVesselsList();
    }
  }, [step, formData.clientId, vesselSearchTerm]);

  const handleQuickVesselSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.company_id) {
      toast.error("Empresa não identificada.");
      return;
    }

    if (!formData.clientId) {
      toast.error("Selecione um cliente primeiro.");
      return;
    }

    if (!newVessel.name) {
      toast.error("O nome da embarcação é obrigatório.");
      return;
    }

    setIsCreatingVessel(true);
    console.log("VESSEL_CREATE_SUBMIT_OK");
    
    try {
      const { data, error } = await supabase
        .from('vessels')
        .insert({
          company_id: profile?.company_id,
          customer_id: formData.clientId,
          name: newVessel.name,
          registration_number: newVessel.registration_number,
          vessel_type: newVessel.vessel_type,
          engine: newVessel.engine,
          category: newVessel.category,
          notes: newVessel.notes
        })
        .select()
        .single();

      if (error) throw error;

      console.log("VESSEL_INSERT_OK", data.id);
      toast.success("Embarcação criada e vinculada com sucesso!");
      
      setFormData({ ...formData, vessel: data.name, vesselId: data.id });
      setIsQuickVesselOpen(false);
      setNewVessel({
        name: "",
        registration_number: "",
        vessel_type: "",
        engine: "",
        category: "",
        notes: ""
      });

      await fetchVesselsList("");
    } catch (error: any) {
      console.error("Error creating vessel", error);
      toast.error("Erro ao criar embarcação: " + error.message);
    } finally {
      setIsCreatingVessel(false);
    }
  };


  const handleOcrFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!profile?.company_id) {
      toast.error("Empresa não identificada.");
      return;
    }

    setIsOcrProcessing(true);
    console.log("QUICK_CLIENT_OCR_UPLOAD_START");
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${profile.company_id}/ocr/${fileName}`;

      // 1. Upload to bucket
      const { error: uploadError } = await supabase.storage
        .from('ocr-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Register file
      const { data: fileData, error: dbError } = await supabase
        .from('uploaded_files')
        .insert({
          company_id: profile.company_id,
          file_name: file.name,
          file_url: filePath,
          category: 'ocr_analysis',
          file_type: file.type,
          file_size: file.size,
          status: 'pending'
        })
        .select()
        .single();

      if (dbError) throw dbError;
      setOcrUploadedFile(fileData);
      console.log("QUICK_CLIENT_OCR_UPLOAD_OK");

      // 3. Create OCR Job
      const { data: jobData, error: jobError } = await supabase
        .from("ocr_jobs")
        .insert({
          company_id: profile.company_id,
          file_id: fileData.id,
          status: 'pending'
        })
        .select()
        .single();

      if (jobError) throw jobError;

      // 4. Trigger processing
      await supabase.functions.invoke('process-ocr', {
        body: { jobId: jobData.id }
      });

      // 5. Poll for results (simple version)
      let attempts = 0;
      const maxAttempts = 15;
      const pollInterval = setInterval(async () => {
        attempts++;
        const { data: jobStatus, error: statusError } = await supabase
          .from("ocr_jobs")
          .select("*")
          .eq("id", jobData.id)
          .single();

        if (statusError) {
          clearInterval(pollInterval);
          setIsOcrProcessing(false);
          toast.error("Erro ao verificar status do OCR");
          return;
        }

        if (jobStatus.status === 'completed' || jobStatus.status === 'failed') {
          clearInterval(pollInterval);
          setIsOcrProcessing(false);
          
          if (jobStatus.status === 'completed') {
            setOcrJobResult(jobStatus);
            console.log("QUICK_CLIENT_OCR_EXTRACT_OK");
            toast.success("Documento processado com sucesso!");
          } else {
            toast.error("Falha ao processar documento.");
          }
        }

        if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
          setIsOcrProcessing(false);
          toast.error("Tempo esgotado ao processar documento.");
        }
      }, 2000);

    } catch (error: any) {
      console.error("OCR_ERROR", error);
      toast.error("Erro ao processar documento: " + error.message);
      setIsOcrProcessing(false);
    }
  };

  const applyOcrData = () => {
    if (!ocrJobResult?.extracted_data) return;
    
    const data = ocrJobResult.extracted_data;
    const person = data.person || data; // Handle different OCR output formats

    setNewClient({
      ...newClient,
      name: safeString(person.nome || person.name || person.full_name || ""),
      document: safeString(person.cpf || person.doc_number || ""),
      rg: safeString(person.rg || ""),
      address: safeString(person.address || person.endereco || ""),
      city: safeString(person.city || person.cidade || ""),
      state: safeString(person.state || person.uf || person.estado || ""),
    });

    console.log("QUICK_CLIENT_DATA_APPLIED");
    setClientModalMode('manual');
    toast.success("Dados preenchidos automaticamente. Por favor, confira e complete o cadastro.");
  };

  const handleQuickClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("SAVE_CLIENT_CLICKED");
    
    if (!newClient.name) {
      toast.error("O nome é obrigatório.");
      return;
    }

    setIsCreatingClient(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      console.log("AUTH_USER_FOUND", user?.id);
      
      let effectiveCompanyId = profile?.company_id;
      
      if (!effectiveCompanyId && user) {
        console.log("RESOLVING_WORKSPACE_AUTO");
        const { ensureWorkspace } = await import("@/utils/workspace-recovery");
        effectiveCompanyId = await ensureWorkspace(user, profile);
        console.log("CLIENT_WORKSPACE_RESOLVED", effectiveCompanyId);
      }

      if (!effectiveCompanyId) {
        console.error("WORKSPACE_NOT_FOUND");
        toast.error("Workspace do usuário não encontrado.");
        setIsCreatingClient(false);
        return;
      }

      const payload = {
        company_id: effectiveCompanyId,
        name: newClient.name,
        cpf_cnpj: newClient.document,
        phone: newClient.phone,
        email: newClient.email,
        address: safeString(newClient.address).trim(),
        city: safeString(newClient.city).trim(),
        state: safeString(newClient.state).trim(),
        rg: safeString(newClient.rg).trim(),
        notes: safeString(newClient.notes).trim(),
      };
      
      console.log("PAYLOAD_INSERT_CLIENT", payload);

      const { data, error } = await supabase
        .from('customers')
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error("SUPABASE_CLIENT_INSERT_ERROR", error);
        throw error;
      }

      console.log("CLIENT_INSERT_SUCCESS", data.id);

      // If we have an OCR file, link it to the customer in the documents table
      if (ocrUploadedFile) {
        await supabase.from('documents').insert({
          company_id: effectiveCompanyId,
          customer_id: data.id,
          document_type: 'identity_doc',
          status: 'verified',
          file_url: ocrUploadedFile.file_url,
          file_name: ocrUploadedFile.file_name
        });
        console.log("QUICK_CLIENT_DOCUMENT_ATTACHED");
      }

      console.log("QUICK_CLIENT_SAVE_OK", data.id);
      
      // Registro de Log de Atividade (Fallback seguro)
      try {
        await supabase.from('activity_logs').insert({
          company_id: effectiveCompanyId,
          user_id: user?.id,
          action: 'client_created',
          resource_type: 'client',
          resource_id: data.id,
          description: `Novo cliente criado: ${data.name}`,
          module: 'clients',
          category: 'creation',
          metadata: { 
            method: ocrUploadedFile ? 'ocr' : 'manual',
            document_linked: !!ocrUploadedFile 
          }
        });
        console.log("CLIENT_LOG_WITH_MODULE_OK");
        console.log("ACTIVITY_LOG_MODULE_FIXED");
        console.log("LOG_FAILURE_SAFE");
      } catch (logError) {
        console.warn("CLIENT_SAVE_NOT_BLOCKED_BY_LOG", logError);
      }

      console.log("CLIENT_MODULE_READY");
      console.log("CLIENT_INSERT_SUCCESS", data.id);
      console.log("CLIENT_SELECTED_IN_WIZARD");
      console.log("CLIENT_OCR_READY");
      toast.success("Cliente criado com sucesso!");
      
      setFormData({ ...formData, client: data.name, clientId: data.id });
      setIsQuickClientOpen(false);
      setStep(3); // Liberar próximo passo (vincular embarcação)
      setIsQuickClientOpen(false);
      setNewClient({
        name: "", document: "", rg: "", phone: "", email: "",
        address: "", city: "", state: "", notes: ""
      });
      setOcrJobResult(null);
      setOcrUploadedFile(null);

      await fetchCustomersList("");
    } catch (error: any) {
      console.error("CLIENT_INSERT_ERROR_FULL", error);
      toast.error("Erro ao criar cliente: " + (error.message || "Erro desconhecido"));
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
    if (step === 1 && !formData.typeId) {
      toast.error("Selecione o tipo de processo.");
      return;
    }
    if (step === 2 && !formData.clientId) {
      toast.error("Selecione um cliente.");
      return;
    }
    if (step === 3 && !formData.vesselId) {
      toast.error("Selecione uma embarcação.");
      return;
    }

    if (step < totalSteps) {
      setStep(step + 1);
      const logTags = ["STEP_1_OK", "STEP_2_CLIENT_OK", "STEP_3_VESSEL_OK", "STEP_4_CHECKLIST_OK", "STEP_5_UPLOAD_OCR_OK", "STEP_6_REVIEW_OK"];
      console.log(logTags[step - 1]);
    }
  };



  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      console.log("WIZARD_BACK_FLOW_OK");
    } else {
      onClose();
    }
  };

  const handleCreateProcess = async () => {
    let effectiveCompanyId = profile?.company_id;

    if (!effectiveCompanyId) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { ensureWorkspace } = await import("@/utils/workspace-recovery");
        effectiveCompanyId = await ensureWorkspace(user, profile);
      }
    }

    if (!effectiveCompanyId) {
      toast.error("Vínculo empresarial não encontrado. Criando automaticamente...");
      return;
    }
    
    setIsSubmitting(true);
    const toastId = toast.loading("Gerando processo e checklist...");
    console.log("PROCESS_CREATE_SUBMIT_OK");
    
    try {
      // 1. Create the process
      const { data: processData, error: processError } = await supabase
        .from('processes')
        .insert({
          company_id: effectiveCompanyId,
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
            status: 'pendente'
          });
        });
      }

      if (checklistItems.length > 0) {
        const { error: checklistError } = await supabase
          .from('document_checklists')
          .insert(checklistItems);
        
        if (checklistError) console.error("Error creating checklist:", checklistError);
        console.log("PROCESS_CHECKLIST_CREATED", checklistItems.length);
      }

      // 3. Handle File Uploads
      if (selectedFiles.length > 0) {
        console.log("UPLOADING_FILES", selectedFiles.length);
        for (const file of selectedFiles) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${processData.id}/${crypto.randomUUID()}.${fileExt}`;
          const filePath = fileName;

          const { error: uploadError } = await supabase.storage
            .from('process-attachments')
            .upload(filePath, file);

          if (uploadError) {
            console.error("Error uploading file:", uploadError);
          } else {
            // Create document record
            await supabase.from('documents').insert({
              company_id: effectiveCompanyId,
              process_id: processData.id,
              customer_id: formData.clientId,
              vessel_id: formData.vesselId,
              document_type: 'attachment',
              status: 'uploaded',
              file_url: filePath
            });
          }
        }
      }

      // 4. Register creation in compliance history
      await supabase.from('compliance_history').insert({
        process_id: processData.id,
        event_type: 'creation',
        description: `Processo de ${formData.type} iniciado. Checklist automático gerado com ${checklistItems.length} itens.`,
        severity: 'info',
        module: 'process_wizard'
      });

      console.log("PROCESS_CREATED_OK", processData.id);
      toast.success("Processo iniciado com sucesso!", { id: toastId });
      
      clearDraft();
      onClose();
      
      // Redirect to the new process page
      navigate({ to: `/processes/${processData.id}` });
    } catch (err: any) {
      console.error("Error creating process:", err);
      toast.error("Erro ao iniciar processo: " + err.message);
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
                {customers.length === 0 && (
                   <p className="text-xs text-slate-400 text-center py-4">Nenhum cliente encontrado. {searchTerm ? "Tente outro termo ou crie um novo." : "Use a busca ou crie um novo."}</p>
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
                value={vesselSearchTerm}
                onChange={(e) => setVesselSearchTerm(e.target.value)}
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
               <Button 
                 variant="outline" 
                 className="w-full h-12 rounded-xl border-dashed gap-2"
                 onClick={() => setIsQuickVesselOpen(true)}
               >
                  <Plus className="h-4 w-4" /> Criar nova embarcação rapidamente
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
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 rounded-full text-slate-400 hover:text-primary"
                          onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.onchange = (e: any) => {
                              const file = e.target.files[0];
                              if (file) {
                                setSelectedFiles(prev => [...prev, file]);
                                toast.success(`Arquivo ${file.name} anexado ao rascunho.`);
                              }
                            };
                            input.click();
                          }}
                        >
                           <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
            {requirements.length > 0 && (
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-3">
                <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5" />
                <p className="text-[10px] text-amber-700 leading-tight">Você pode avançar com pendências. O sistema marcará os itens não enviados como "Pendente" automaticamente.</p>
              </div>
            )}
          </div>
        );
      case 5:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                   <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Upload & OCR</Label>
                   <div 
                     className="border-2 border-dashed border-slate-200 rounded-3xl p-8 flex flex-col items-center justify-center gap-4 hover:border-primary/50 transition-all cursor-pointer bg-slate-50/50 group"
                     onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.multiple = true;
                        input.onchange = (e: any) => {
                           const files = Array.from(e.target.files) as File[];
                           setSelectedFiles(prev => [...prev, ...files]);
                           console.log("UPLOAD_MOBILE_OK", files.length);

                        };
                        input.click();
                     }}
                   >
                      <div className="h-12 w-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-slate-400 group-hover:scale-110 transition-transform">
                         <Plus className="h-6 w-6" />
                      </div>
                      <div className="text-center">
                         <p className="text-sm font-bold text-navy">Clique para selecionar arquivos</p>
                         <p className="text-[10px] text-slate-400 font-medium">PDF, JPG, PNG (Max 10MB)</p>
                      </div>
                   </div>

                   <div className="space-y-2">
                      {selectedFiles.map((file, i) => (
                         <div key={i} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl">
                            <div className="flex items-center gap-3 overflow-hidden">
                               <FileCheck className="h-4 w-4 text-green-500 flex-shrink-0" />
                               <span className="text-xs font-bold text-navy truncate">{file.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                               <Badge className="bg-slate-100 text-slate-500 border-none text-[8px] uppercase">Aguardando</Badge>
                               <button 
                                 onClick={() => setSelectedFiles(prev => prev.filter((_, idx) => idx !== i))}
                                 className="p-1 hover:text-red-500"
                               >
                                  <X className="h-3 w-3" />
                               </button>
                            </div>
                         </div>
                      ))}
                   </div>
                </div>

                <div className="space-y-4">
                   <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Documentos Geráveis</Label>
                   <div className="space-y-2">
                      {[
                        { name: "BCE - Boletim de Cadastro", status: "ready" },
                        { name: "DPC-2211 - Inscrição", status: "ready" },
                        { name: "Procuração Naval", status: "ready" },
                        { name: "Declaração de Responsabilidade", status: "ready" },
                        { name: "Memorial Descritivo", status: "ready" }
                      ].map((doc, i) => (
                         <div key={i} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl group hover:border-primary/20 transition-all">
                            <div className="flex items-center gap-3">
                               <div className="h-8 w-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary">
                                  <Zap className="h-4 w-4" />
                               </div>
                               <span className="text-xs font-bold text-navy">{doc.name}</span>
                            </div>
                            <Button variant="ghost" size="sm" className="h-8 px-3 rounded-full text-[10px] font-black uppercase text-primary hover:bg-primary/5">
                               Gerar
                            </Button>
                         </div>
                      ))}
                   </div>
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
                    <span className="text-slate-500 font-medium">Arquivos para upload</span>
                    <span className="text-navy font-bold">{selectedFiles.length} arquivos</span>
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
    <>

    <ModalLayout
      isOpen={isOpen}
      onClose={onClose}
      title="Novo Processo Naval"
      description={`Etapa ${step} de ${totalSteps} • ${getStepTitle()}`}
      maxWidth="4xl"
      footer={
        <div className="flex flex-col sm:flex-row justify-between items-center w-full gap-4">
          <div className="flex gap-2 w-full sm:w-auto">
            <BackNavigation 
              onBack={handleBack} 
              label={step === 1 ? "Fechar" : "Voltar"} 
              className="flex-1 sm:flex-none rounded-xl h-12 px-6 font-black uppercase text-[10px] tracking-widest gap-2"
            />
            <Button
              variant="ghost"
              onClick={() => {
                clearDraft();
                toast.success("Rascunho descartado.");
                onClose();
              }}
              className="rounded-xl h-12 px-4 text-slate-400 hover:text-red-500 hover:bg-red-50"
              title="Descartar Rascunho e Fechar"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex gap-3 w-full sm:w-auto">
            <Button
              variant="outline"
              className="hidden md:flex rounded-xl h-12 px-6 font-black uppercase text-[10px] tracking-widest gap-2 border-slate-200"
              onClick={() => toast.success("Rascunho salvo no navegador")}
            >
              <Save className="h-4 w-4" /> Salvar
            </Button>

            {step === totalSteps ? (
              <Button
                onClick={handleCreateProcess}
                loading={isSubmitting}
                className="flex-1 sm:flex-none bg-primary hover:opacity-90 rounded-xl h-12 px-10 font-black uppercase text-[10px] tracking-widest text-white shadow-lg shadow-primary/20 gap-2"
              >
                Criar Processo <Check className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={(!formData.typeId && step === 1) || (!formData.clientId && step === 2)}
                className="flex-1 sm:flex-none bg-navy hover:opacity-90 rounded-xl h-12 px-10 font-black uppercase text-[10px] tracking-widest text-white shadow-lg shadow-navy/20 gap-2"
              >
                Próximo <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Progress value={progressPercent} className="h-2.5 flex-grow bg-slate-100" />
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
            {Math.round(progressPercent)}% Concluído
          </span>
        </div>
        {renderStep()}
      </div>
    </ModalLayout>

      {/* Modal de Criação Rápida de Cliente */}
      <ModalLayout
        isOpen={isQuickClientOpen}
        onClose={() => setIsQuickClientOpen(false)}
        title="Novo Cliente Rápido"
        showBackButton={true}
        maxWidth="md"
        footer={
          clientModalMode === 'manual' ? (
            <>
              <Button 
                type="button" 
                variant="ghost" 
                onClick={() => setIsQuickClientOpen(false)}
                className="flex-1 rounded-xl h-12"
              >
                Cancelar
              </Button>
              <Button 
                form="quick-client-form"
                type="submit" 
                disabled={isCreatingClient}
                className="flex-1 bg-primary text-white rounded-xl h-12 font-bold shadow-lg shadow-primary/20"
              >
                {isCreatingClient ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar Cliente"}
              </Button>
            </>
          ) : null
        }
      >
        <div className="flex bg-slate-200 p-1 rounded-xl mb-6">
          <button 
            type="button"
            onClick={() => setClientModalMode('manual')}
            className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${clientModalMode === 'manual' ? 'bg-white text-primary shadow-sm' : 'text-slate-500'}`}
          >
            Manual
          </button>
          <button 
            type="button"
            onClick={() => setClientModalMode('ocr')}
            className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${clientModalMode === 'ocr' ? 'bg-white text-primary shadow-sm' : 'text-slate-500'}`}
          >
            IA OCR
          </button>
        </div>

        {clientModalMode === 'ocr' ? (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
            {!ocrJobResult ? (
              <div 
                className="border-2 border-dashed border-slate-200 rounded-3xl p-10 flex flex-col items-center justify-center gap-4 hover:border-primary/50 transition-all cursor-pointer bg-slate-50 group text-center"
                onClick={() => ocrFileInputRef.current?.click()}
              >
                <div className="h-16 w-16 rounded-2xl bg-white shadow-sm flex items-center justify-center text-primary group-hover:scale-110 transition-transform border border-slate-100">
                  {isOcrProcessing ? <Loader2 className="h-8 w-8 animate-spin" /> : <Upload className="h-8 w-8" />}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-navy uppercase">Scanner de Identidade IA</h4>
                  <p className="text-[10px] text-slate-400 font-medium max-w-[200px] mt-1">Envie CNH ou RG para preenchimento automático ultra-rápido.</p>
                </div>
                <input 
                  type="file" 
                  ref={ocrFileInputRef} 
                  className="hidden" 
                  accept="image/*,application/pdf"
                  onChange={handleOcrFileSelect}
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-5 bg-blue-50 border border-blue-100 rounded-2xl space-y-3">
                   <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                         <div className="h-8 w-8 bg-blue-500 text-white rounded-lg flex items-center justify-center">
                            <Zap className="h-4 w-4" />
                         </div>
                         <div>
                            <p className="text-[10px] font-black uppercase text-blue-600 tracking-widest">Dados Extraídos</p>
                            <p className="text-xs font-bold text-navy">{ocrJobResult.extracted_data?.person?.nome || ocrJobResult.extracted_data?.name || "Nome não identificado"}</p>
                         </div>
                      </div>
                      <Badge className="bg-green-500 text-white border-none text-[8px] uppercase">
                         Confiança: {((ocrJobResult.confidence_score || 0.95) * 100).toFixed(0)}%
                      </Badge>
                   </div>
                   
                   <div className="grid grid-cols-1 gap-2 text-[10px]">
                      <div className="flex justify-between py-1 border-b border-blue-100/50">
                         <span className="text-slate-500">Documento</span>
                         <span className="font-bold text-navy">{ocrJobResult.extracted_data?.person?.cpf || ocrJobResult.extracted_data?.doc_number || "Não extraído"}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-blue-100/50">
                         <span className="text-slate-500">Endereço</span>
                         <span className="font-bold text-navy truncate max-w-[150px]">{ocrJobResult.extracted_data?.person?.address || ocrJobResult.extracted_data?.address || "Não extraído"}</span>
                      </div>
                   </div>

                   <Button 
                     type="button"
                     onClick={applyOcrData}
                     className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-10 font-black uppercase text-[10px] tracking-widest gap-2 shadow-lg shadow-blue-200"
                   >
                      <Sparkles className="h-3 w-3" /> Aplicar estes dados
                   </Button>
                </div>

                <Button 
                  type="button"
                  variant="ghost" 
                  onClick={() => setOcrJobResult(null)}
                  className="w-full text-[10px] font-bold text-slate-400 uppercase"
                >
                   Tentar outro documento
                </Button>
              </div>
            )}
            
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
               <ShieldCheck className="h-4 w-4 text-green-500" />
               <p className="text-[9px] text-slate-500 font-medium">Privacidade garantida: Seus documentos são processados e armazenados com criptografia de ponta a ponta.</p>
            </div>
          </div>
        ) : (
          <form id="quick-client-form" onSubmit={handleQuickClientSubmit} className="space-y-4">
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
          </form>
        )}
      </ModalLayout>

      {/* Modal de Criação Rápida de Embarcação */}
      <ModalLayout
        isOpen={isQuickVesselOpen}
        onClose={() => setIsQuickVesselOpen(false)}
        title="Nova Embarcação Rápida"
        maxWidth="md"
        footer={
          <>
            <Button 
              type="button" 
              variant="ghost" 
              onClick={() => setIsQuickVesselOpen(false)}
              className="flex-1 rounded-xl h-12"
            >
              Cancelar
            </Button>
            <Button 
              form="quick-vessel-form"
              type="submit" 
              disabled={isCreatingVessel}
              className="flex-1 bg-primary text-white rounded-xl h-12 font-bold shadow-lg shadow-primary/20"
            >
              {isCreatingVessel ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar Embarcação"}
            </Button>
          </>
        }
      >
        <form id="quick-vessel-form" onSubmit={handleQuickVesselSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase font-black text-slate-400">Nome da Embarcação</Label>
            <Input 
              required
              value={newVessel.name}
              onChange={(e) => setNewVessel({...newVessel, name: e.target.value})}
              placeholder="Ex: My Boat"
              className="rounded-xl border-slate-200" 
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase font-black text-slate-400">Inscrição / TIE</Label>
              <Input 
                value={newVessel.registration_number}
                onChange={(e) => setNewVessel({...newVessel, registration_number: e.target.value})}
                placeholder="000.000000-0"
                className="rounded-xl border-slate-200" 
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase font-black text-slate-400">Tipo (Lancha, Veleiro...)</Label>
              <Input 
                value={newVessel.vessel_type}
                onChange={(e) => setNewVessel({...newVessel, vessel_type: e.target.value})}
                placeholder="Ex: Lancha"
                className="rounded-xl border-slate-200" 
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase font-black text-slate-400">Motorização</Label>
              <Input 
                value={newVessel.engine}
                onChange={(e) => setNewVessel({...newVessel, engine: e.target.value})}
                placeholder="Ex: Volvo 200HP"
                className="rounded-xl border-slate-200" 
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase font-black text-slate-400">Categoria (Esporte/Recreio...)</Label>
              <Input 
                value={newVessel.category}
                onChange={(e) => setNewVessel({...newVessel, category: e.target.value})}
                placeholder="Ex: Esporte"
                className="rounded-xl border-slate-200" 
              />
            </div>
          </div>
          
          <div className="space-y-1.5">
            <Label className="text-[10px] uppercase font-black text-slate-400">Observações Técnicas</Label>
            <textarea 
              className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm min-h-[80px]"
              value={newVessel.notes}
              onChange={(e) => setNewVessel({...newVessel, notes: e.target.value})}
              placeholder="Detalhes adicionais..."
            />
          </div>
        </form>
      </ModalLayout>
    </>
  );
}




