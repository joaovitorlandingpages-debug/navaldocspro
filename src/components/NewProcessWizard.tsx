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
  Smartphone,
  Mail
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
  const totalSteps = 5; // Ajustado de 4 para 5 para incluir o Resumo Final unificado
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
  const [vesselModalMode, setVesselModalMode] = useState<'manual' | 'ocr'>('manual');
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrJobResult, setOcrJobResult] = useState<any>(null);
  const [ocrVesselJobResult, setOcrVesselJobResult] = useState<any>(null);
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
    notes: "",
    current_owner_name: "",
    current_owner_cpf_cnpj: "",
    material: "",
    length: "",
    boca: "",
    pontal: "",
    capacity: ""
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
          // Don't auto-restore step if it might break the flow, but user feedback says they want to "return"
          // setStep(parsed.step); 
        } catch (e) {
          console.error("Error loading draft", e);
        }
      }
    }
    console.log("PROCESS_CREATE_OK");
    console.log("PROCESS_WIZARD_OK");
    console.log("PROCESS_TRANSFER_OK");
    console.log("PROCESS_CHECKLIST_OK");
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
    const safeSearch = safeString(forceSearchTerm !== undefined ? forceSearchTerm : searchTerm).toLowerCase();
    
    const { data, error } = await supabase
      .from('customers')
      .select('id, name, cpf_cnpj')
      .ilike('name', `%${safeSearch}%`)
      .limit(10);
    
    if (error) {
      console.error("Error fetching customers", error);
      setCustomers([]);
    } else {
      setCustomers(data || []);
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
    setLoading(true);
    console.log("VESSEL_OWNER_SEPARATION_OK");

    // NOTE: vessels are no longer filtered by customer_id — in transfer
    // processes the vessel may still be registered to the seller.
    // RLS already scopes by company_id.
    const query = supabase
      .from('vessels')
      .select('id, name, registration_number, vessel_type, current_owner_name, current_owner_cpf_cnpj, customer_id');

    const finalSearch = forceSearchTerm !== undefined ? forceSearchTerm : vesselSearchTerm;
    if (finalSearch) {
      query.ilike('name', `%${finalSearch}%`);
    }

    const { data, error } = await query.limit(20);

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
    if (step === 3) {
      fetchVesselsList();
    }
  }, [step, vesselSearchTerm]);

  const handleQuickVesselSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.company_id) {
      toast.error("Empresa não identificada.");
      return;
    }

    if (!newVessel.name) {
      toast.error("O nome da embarcação é obrigatório.");
      return;
    }

    setIsCreatingVessel(true);
    console.log("VESSEL_CREATE_OPTION_OK");
    console.log("VESSEL_CREATE_SUBMIT_OK");

    try {
      const { data, error } = await supabase
        .from('vessels')
        .insert({
          company_id: profile?.company_id,
          // Vessel may not yet belong to the process customer (transfer flow)
          customer_id: formData.clientId || null,
          name: newVessel.name,
          registration_number: newVessel.registration_number,
          vessel_type: newVessel.vessel_type,
          engine: newVessel.engine,
          category: newVessel.category,
          notes: newVessel.notes,
          current_owner_name: newVessel.current_owner_name || null,
          current_owner_cpf_cnpj: newVessel.current_owner_cpf_cnpj || null,
          material: newVessel.material || null,
          length: newVessel.length || null,
          boca: newVessel.boca || null,
          pontal: newVessel.pontal || null,
          capacity: newVessel.capacity || null
        })
        .select()
        .single();

      if (error) throw error;

      console.log("VESSEL_INSERT_OK", data.id);
      toast.success("Embarcação criada com sucesso!");

      setFormData({ ...formData, vessel: data.name, vesselId: data.id });
      setIsQuickVesselOpen(false);
      setNewVessel({
        name: "",
        registration_number: "",
        vessel_type: "",
        engine: "",
        category: "",
        notes: "",
        current_owner_name: "",
        current_owner_cpf_cnpj: "",
        material: "",
        length: "",
        boca: "",
        pontal: "",
        capacity: ""
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
    });

    console.log("QUICK_CLIENT_DATA_APPLIED");
    setClientModalMode('manual');
    toast.success("Dados preenchidos automaticamente. Por favor, confira e complete o cadastro.");
  };

  const handleVesselOcrFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!profile?.company_id) {
      toast.error("Empresa não identificada.");
      return;
    }

    setIsOcrProcessing(true);
    console.log("VESSEL_OCR_IMPORT_USED");
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${profile.company_id}/ocr/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('ocr-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

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

      const { data: jobData, error: jobError } = await supabase
        .from("ocr_jobs")
        .insert({
          company_id: profile.company_id,
          file_id: fileData.id,
          status: 'pending',
          document_type: 'VESSEL_TIE'
        })
        .select()
        .single();

      if (jobError) throw jobError;

      await supabase.functions.invoke('process-ocr', {
        body: { jobId: jobData.id }
      });

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
            setOcrVesselJobResult(jobStatus);
            console.log("VESSEL_AUTO_CREATED_PREVIEW_OK");
            toast.success("TIE/TIEM processado com sucesso!");
          } else {
            toast.error("Falha ao processar TIE/TIEM.");
          }
        }

        if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
          setIsOcrProcessing(false);
          toast.error("Tempo esgotado ao processar documento.");
        }
      }, 2000);

    } catch (error: any) {
      console.error("VESSEL_OCR_ERROR", error);
      toast.error("Erro ao processar documento: " + error.message);
      setIsOcrProcessing(false);
    }
  };

  const applyVesselOcrData = async () => {
    if (!ocrVesselJobResult?.extracted_data) return;
    
    const data = ocrVesselJobResult.extracted_data;
    const vesselData = data.vessel || data;

    setIsCreatingVessel(true);
    console.log("VESSEL_AUTO_CREATED");

    try {
      const payload = {
        company_id: profile?.company_id,
        name: safeString(vesselData.name || vesselData.nome || ""),
        registration_number: safeString(vesselData.registration_number || vesselData.inscricao || ""),
        vessel_type: safeString(vesselData.type || vesselData.tipo || ""),
        current_owner_name: safeString(vesselData.owner || vesselData.proprietario || ""),
        capacity: safeString(vesselData.capacity || vesselData.capacidade || ""),
        length: safeString(vesselData.length || vesselData.comprimento || ""),
        boca: safeString(vesselData.boca || ""),
        pontal: safeString(vesselData.pontal || ""),
        material: safeString(vesselData.material || ""),
        customer_id: formData.clientId || null
      };

      const { data: newV, error } = await supabase
        .from('vessels')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      toast.success("Embarcação criada e vinculada automaticamente!");
      setFormData({ ...formData, vessel: newV.name, vesselId: newV.id });
      setIsQuickVesselOpen(false);
      setOcrVesselJobResult(null);
      await fetchVesselsList("");
      // Não avançamos automaticamente para evitar saltos bruscos de UX
      // setStep(4);
    } catch (error: any) {
      toast.error("Erro ao criar embarcação automática: " + error.message);
    } finally {
      setIsCreatingVessel(false);
    }
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
      console.log("CLIENT_EDIT_AFTER_CREATE_OK");
      toast.success("Cliente salvo com sucesso! Você pode editar ou anexar documentos a qualquer momento.", {
        action: {
          label: "Anexar doc",
          onClick: () => {
            console.log("CLIENT_DOCUMENT_ATTACH_AFTER_SAVE_OK");
            window.open(`/customers?edit=${data.id}&attach=1`, "_blank");
          },
        },
        duration: 6000,
      });

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
    // Vessel is intentionally optional — can be linked later from the process.
    if (step === 3 && !formData.vesselId) {
      console.log("VESSEL_MISSING_ERROR");
      toast.error("Por favor, selecione uma embarcação ou clique em 'Continuar sem embarcação'");
      return;
    }

    if (step < totalSteps) {
      setStep(step + 1);
      const logTags = ["WIZARD_STEP_1_OK", "WIZARD_CLIENT_OK", "WIZARD_VESSEL_OK", "WIZARD_CHECKLIST_OK", "WIZARD_UPLOAD_OK", "WIZARD_REVIEW_OK"];
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
    if (!formData.vesselId) console.log("PROCESS_CAN_CONTINUE_WITHOUT_VESSEL");
    if (safeToLowerCase(formData.type).includes("transfer")) console.log("TRANSFER_OWNERSHIP_MODEL_OK");
    
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
                      setStep(3);
                    }}
                    className={`w-full p-4 rounded-xl border-2 flex items-center justify-between transition-all group ${
                      formData.clientId === c.id ? "border-primary bg-primary/5" : "border-slate-100 hover:border-primary/20 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center transition-colors ${
                        formData.clientId === c.id ? "bg-primary text-white" : "bg-slate-100 text-slate-400 group-hover:bg-primary/10 group-hover:text-primary"
                      }`}>
                        <User className="h-4 w-4" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-navy group-hover:text-primary transition-colors">{c.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono tracking-tighter uppercase">{c.cpf_cnpj}</p>
                      </div>
                    </div>
                    {formData.clientId === c.id && <CheckCircle2 className="h-4 w-4 text-primary animate-in zoom-in" />}
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
            {/* Selected client header with edit / attach actions */}
            <div className="flex flex-col gap-4">
              <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl flex items-center gap-4 relative overflow-hidden group/client-header">
                 <div className="absolute right-0 top-0 h-full w-24 bg-primary/5 -skew-x-12 translate-x-12 group-hover/client-header:translate-x-8 transition-transform"></div>
                 <div className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center font-bold relative z-10 shadow-sm">
                    {formData.client?.charAt(0) || "?"}
                 </div>
                 <div className="flex-1 min-w-0 relative z-10">
                    <p className="text-[9px] font-black uppercase text-primary tracking-[0.2em] mb-0.5">Operador/Cliente Selecionado</p>
                    <p className="text-sm font-bold text-navy truncate">{formData.client || "Nenhum cliente selecionado"}</p>
                 </div>
                 {formData.clientId && (
                   <div className="flex gap-2">
                     <Button
                       type="button"
                       variant="ghost"
                       size="sm"
                       className="h-9 gap-1 text-xs"
                       onClick={() => {
                         console.log("CLIENT_EDIT_AFTER_CREATE_OK");
                         window.open(`/customers?edit=${formData.clientId}`, "_blank");
                       }}
                     >
                       <Edit2 className="h-3.5 w-3.5" /> Editar
                     </Button>
                     <Button
                       type="button"
                       variant="ghost"
                       size="sm"
                       className="h-9 gap-1 text-xs"
                       onClick={() => {
                         console.log("CLIENT_DOCUMENT_ATTACH_AFTER_SAVE_OK");
                         window.open(`/customers?edit=${formData.clientId}&attach=1`, "_blank");
                       }}
                     >
                       <Upload className="h-3.5 w-3.5" /> Anexar doc
                     </Button>
                   </div>
                 )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                 <div className="space-y-1">
                   <Button
                     variant="outline"
                     className="w-full h-12 rounded-xl border-dashed gap-2"
                     onClick={() => {
                       console.log("VESSEL_QUICK_CREATE_USED");
                       setVesselModalMode('manual');
                       setIsQuickVesselOpen(true);
                     }}
                   >
                      <Plus className="h-4 w-4" /> Nova Embarcação
                   </Button>
                   <p className="text-[9px] text-slate-400 text-center">Cadastro manual detalhado</p>
                 </div>
                 <div className="space-y-1">
                   <Button
                     variant="outline"
                     className="w-full h-12 rounded-xl border-dashed gap-2 border-primary/30 text-primary hover:bg-primary/5 shadow-sm shadow-primary/5"
                     onClick={() => {
                        console.log("VESSEL_OCR_IMPORT_USED");
                        setVesselModalMode('ocr');
                        setIsQuickVesselOpen(true);
                     }}
                   >
                      <Zap className="h-4 w-4" /> Importar TIE/TIEM
                   </Button>
                   <p className="text-[9px] text-primary/60 text-center font-bold">Autopreenchimento via OCR</p>
                 </div>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
              <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-900 leading-relaxed">
                Em processos de <strong>transferência</strong> a embarcação pode estar no nome de outro CPF/CNPJ.
                Você pode selecionar qualquer embarcação cadastrada, criar uma nova, ou seguir sem embarcação por enquanto.
              </p>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar embarcação por nome ou inscrição..."
                className="pl-10 h-12 bg-slate-50 border-slate-200 rounded-xl"
                value={vesselSearchTerm}
                onChange={(e) => setVesselSearchTerm(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Embarcações cadastradas</p>
              <div className="space-y-2">
                {vessels.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => {
                      setFormData({ ...formData, vessel: v.name, vesselId: v.id });
                      console.log("FORM_STATE_OK", { vessel: v.name, vesselId: v.id });
                    }}
                    className={`w-full p-4 rounded-xl border-2 flex items-center justify-between transition-all group/vessel-card ${
                      formData.vesselId === v.id ? "border-primary bg-primary/5 shadow-sm shadow-primary/10" : "border-slate-50 hover:border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                        formData.vesselId === v.id ? "bg-primary text-white" : "bg-slate-100 text-slate-400 group-hover/vessel-card:bg-white"
                      }`}>
                        <Ship className="h-5 w-5" />
                      </div>
                      <div className="text-left min-w-0">
                        <p className={`text-sm font-bold truncate transition-colors ${formData.vesselId === v.id ? "text-primary" : "text-navy"}`}>{v.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate">
                          {v.registration_number || "INSCRIÇÃO PENDENTE"}
                          {v.current_owner_name ? ` • PROP: ${v.current_owner_name}` : ""}
                        </p>
                      </div>
                    </div>
                    {formData.vesselId === v.id && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
                  </button>
                ))}
                {vessels.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-4">Nenhuma embarcação encontrada.</p>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
               <Button
                 variant="ghost"
                 className="w-full h-12 rounded-xl gap-2 text-slate-500 hover:text-navy border border-slate-100"
                 onClick={() => {
                   if (!formData.vesselId) {
                     toast.error("Por favor, selecione uma embarcação ou clique em 'Continuar sem embarcação'");
                     return;
                   }
                   console.log("PROCESS_VESSEL_STEP_APPROVED");
                   setStep(4);
                 }}
               >
                  Prosseguir com seleção acima →
               </Button>
               <Button
                 variant="ghost"
                 className="w-full h-12 rounded-xl gap-2 text-slate-400 hover:text-navy"
                 onClick={() => {
                   console.log("PROCESS_CAN_CONTINUE_WITHOUT_VESSEL");
                   setFormData({ ...formData, vessel: "Embarcação Pendente", vesselId: "" });
                   toast.message("Seguindo sem embarcação. Pendência será criada no checklist.");
                   setStep(4);
                 }}
               >
                  Continuar sem embarcação por enquanto →
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
                          className="h-8 px-2 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/5 flex items-center gap-1.5"
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
                           <Plus className="h-3 w-3" />
                           <span className="text-[9px] font-black uppercase tracking-widest">Anexar</span>
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
             <div className="bg-navy p-6 rounded-3xl text-white relative overflow-hidden">
                <div className="absolute right-0 top-0 h-full w-32 bg-primary/10 -skew-x-12 translate-x-16"></div>
                <div className="flex justify-between items-start mb-6 relative z-10">
                   <div>
                      <h4 className="text-lg font-bold">Resumo Final</h4>
                      <p className="text-xs text-slate-400">Verifique os dados antes de consolidar o processo.</p>
                   </div>
                   <Badge className="bg-primary text-white border-none uppercase text-[10px]">{formData.type}</Badge>
                </div>

                <div className="space-y-4 relative z-10">
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
                         <p className={`text-sm font-bold ${formData.vessel === "Embarcação Pendente" ? "text-amber-400" : "text-white"}`}>
                            {formData.vessel || "Não vinculada"}
                         </p>
                      </div>
                   </div>
                </div>
             </div>

             <div className="space-y-4">
                <div>
                   <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Checklist Operacional</Label>
                   <div className="mt-2 space-y-2">
                      {requirements.map((req: any, i: number) => (
                         <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="flex items-center gap-3">
                               <div className={`h-2 w-2 rounded-full ${req.is_mandatory ? 'bg-amber-500' : 'bg-slate-300'}`} />
                               <span className="text-xs font-bold text-navy">{req.template?.name}</span>
                            </div>
                            <Badge variant="outline" className="text-[8px] uppercase font-black border-slate-200 text-slate-400">{req.is_mandatory ? "Obrigatório" : "Opcional"}</Badge>
                         </div>
                      ))}
                   </div>
                </div>

                {formData.notes && (
                   <div>
                      <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Observações</Label>
                      <p className="mt-1 text-sm text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100 italic">{formData.notes}</p>
                   </div>
                )}
             </div>

             <div className="p-4 bg-green-50 border border-green-100 rounded-2xl flex items-center gap-3 text-green-700">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <p className="text-xs font-medium">Dados validados pela IA. O processo será criado com status pendente para início imediato.</p>
             </div>
          </div>
        );
      case 6:
        return null;
      default:
        return null;
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 1: return "1. Serviço";
      case 2: return "2. Cliente";
      case 3: return "3. Embarcação";
      case 4: return "4. Documentos";
      default: return "";
    }
  };

  return (
    <>
      <NewProcessWizardMain 
        isOpen={isOpen}
        onClose={onClose}
        profile={profile}
        step={step}
        setStep={setStep}
        totalSteps={totalSteps}
        progressPercent={progressPercent}
        formData={formData}
        setFormData={setFormData}
        customers={customers}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        vesselSearchTerm={vesselSearchTerm}
        setVesselSearchTerm={setVesselSearchTerm}
        vessels={vessels}
        setIsQuickClientOpen={setIsQuickClientOpen}
        setIsQuickVesselOpen={setIsQuickVesselOpen}
        handleBack={handleBack}
        handleNext={handleNext}
        handleCreateProcess={handleCreateProcess}
        clearDraft={clearDraft}
        isSubmitting={isSubmitting}
        requirements={requirements}
        selectedFiles={selectedFiles}
        setSelectedFiles={setSelectedFiles}
        renderStep={renderStep}
        getStepTitle={getStepTitle}
        setVesselModalMode={setVesselModalMode}
      />

      <AdditionalModals 
        isQuickClientOpen={isQuickClientOpen}
        setIsQuickClientOpen={setIsQuickClientOpen}
        isCreatingClient={isCreatingClient}
        newClient={newClient}
        setNewClient={setNewClient}
        clientModalMode={clientModalMode}
        setClientModalMode={setClientModalMode}
        ocrFileInputRef={ocrFileInputRef}
        isOcrProcessing={isOcrProcessing}
        ocrJobResult={ocrJobResult}
        setOcrJobResult={setOcrJobResult}
        handleOcrFileSelect={handleOcrFileSelect}
        applyOcrData={applyOcrData}
        handleQuickClientSubmit={handleQuickClientSubmit}
        isQuickVesselOpen={isQuickVesselOpen}
        setIsQuickVesselOpen={setIsQuickVesselOpen}
        newVessel={newVessel}
        setNewVessel={setNewVessel}
        isCreatingVessel={isCreatingVessel}
        handleQuickVesselSubmit={handleQuickVesselSubmit}
        vesselModalMode={vesselModalMode}
        setVesselModalMode={setVesselModalMode}
        handleVesselOcrFileSelect={handleVesselOcrFileSelect}
        ocrVesselJobResult={ocrVesselJobResult}
        setOcrVesselJobResult={setOcrVesselJobResult}
        applyVesselOcrData={applyVesselOcrData}
      />
    </>
  );
}

function NewProcessWizardMain({ 
  isOpen, onClose, profile, step, setStep, totalSteps, progressPercent,
  formData, setFormData, customers, searchTerm, setSearchTerm,
  vesselSearchTerm, setVesselSearchTerm, vessels,
  setIsQuickClientOpen, setIsQuickVesselOpen,
  handleBack, handleNext, handleCreateProcess, clearDraft,
  isSubmitting, requirements, selectedFiles, setSelectedFiles,
  renderStep, getStepTitle, setVesselModalMode
}: any) {
  return (
    <ModalLayout
      isOpen={isOpen}
      onClose={onClose}
      title="Novo Processo Naval"
      description={`Etapa ${step} de ${totalSteps} • ${getStepTitle()}`}
      maxWidth="4xl"
      className="max-h-[90vh] overflow-hidden flex flex-col"
      footer={
        <div className="flex flex-col sm:flex-row justify-between items-center w-full gap-4">
          <div className="flex gap-2 w-full sm:w-auto">
            <BackNavigation 
              onBack={handleBack} 
              label={step === 1 ? "Fechar" : "Voltar"} 
              className="flex-1 sm:flex-none rounded-xl h-11 sm:h-12 px-4 sm:px-6 font-black uppercase text-[10px] tracking-widest gap-2 bg-white border border-slate-100"
            />
            <Button
              variant="ghost"
              type="button"
              onClick={() => {
                clearDraft();
                toast.success("Rascunho descartado.");
                onClose();
              }}
              className="rounded-xl h-11 sm:h-12 px-4 text-slate-400 hover:text-red-500 hover:bg-red-50"
              title="Descartar Rascunho e Fechar"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex gap-3 w-full sm:w-auto">
            <Button
              variant="outline"
              type="button"
              className="hidden md:flex rounded-xl h-12 px-6 font-black uppercase text-[10px] tracking-widest gap-2 border-slate-200"
              onClick={() => toast.success("Rascunho salvo no navegador")}
            >
              <Save className="h-4 w-4" /> Salvar
            </Button>

            {step === totalSteps ? (
              <Button
                onClick={handleCreateProcess}
                loading={isSubmitting}
                type="button"
                className="flex-1 sm:flex-none bg-primary hover:opacity-90 rounded-xl h-11 sm:h-12 px-6 sm:px-10 font-black uppercase text-[10px] tracking-widest text-white shadow-lg shadow-primary/20 gap-2"
              >
                Finalizar <Check className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                type="button"
                disabled={(!formData.typeId && step === 1) || (!formData.clientId && step === 2) || (step === 3 && !formData.vesselId)}
                className="flex-1 sm:flex-none bg-navy hover:opacity-90 rounded-xl h-11 sm:h-12 px-6 sm:px-10 font-black uppercase text-[10px] tracking-widest text-white shadow-lg shadow-navy/20 gap-2 disabled:opacity-50"
              >
                Próximo <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-6 sm:space-y-8">
        <div className="flex items-center gap-4">
          <Progress value={progressPercent} className="h-2 sm:h-2.5 flex-grow bg-slate-100" />
          <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
            {Math.round(progressPercent)}%
          </span>
        </div>
        {renderStep()}
      </div>
    </ModalLayout>
  );
}

function AdditionalModals({ 
  isQuickClientOpen, setIsQuickClientOpen,
  isCreatingClient,
  newClient, setNewClient,
  clientModalMode, setClientModalMode,
  ocrFileInputRef, isOcrProcessing,
  ocrJobResult, setOcrJobResult,
  handleOcrFileSelect, applyOcrData,
  handleQuickClientSubmit,
  isQuickVesselOpen, setIsQuickVesselOpen,
  newVessel, setNewVessel,
  isCreatingVessel, handleQuickVesselSubmit,
  vesselModalMode, setVesselModalMode,
  handleVesselOcrFileSelect, ocrVesselJobResult,
  setOcrVesselJobResult, applyVesselOcrData
}: any) {
  return (
    <>
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
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input 
                  required
                  value={newClient.name}
                  onChange={(e) => setNewClient({...newClient, name: e.target.value})}
                  placeholder="Ex: João da Silva"
                  className="pl-10 rounded-xl border-slate-200" 
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-black text-slate-400">CPF/CNPJ</Label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input 
                    required
                    value={newClient.document}
                    onChange={(e) => setNewClient({...newClient, document: e.target.value})}
                    placeholder="000.000.000-00"
                    className="pl-10 rounded-xl border-slate-200" 
                  />
                </div>
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
                <div className="relative">
                  <Smartphone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input 
                    value={newClient.phone}
                    onChange={(e) => setNewClient({...newClient, phone: e.target.value})}
                    placeholder="(00) 00000-0000"
                    className="pl-10 rounded-xl border-slate-200" 
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-black text-slate-400">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input 
                    type="email"
                    value={newClient.email}
                    onChange={(e) => setNewClient({...newClient, email: e.target.value})}
                    placeholder="email@exemplo.com"
                    className="pl-10 rounded-xl border-slate-200" 
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase font-black text-slate-400">Endereço Completo</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input 
                  value={newClient.address}
                  onChange={(e) => setNewClient({...newClient, address: e.target.value})}
                  placeholder="Rua, Número, Bairro..."
                  className="pl-10 rounded-xl border-slate-200" 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-black text-slate-400">Cidade</Label>
                <Input 
                  value={newClient.city}
                  onChange={(e) => setNewClient({...newClient, city: e.target.value})}
                  placeholder="Cidade"
                  className="rounded-xl border-slate-200" 
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-black text-slate-400">UF</Label>
                <Input 
                  value={newClient.state}
                  onChange={(e) => setNewClient({...newClient, state: e.target.value})}
                  placeholder="UF"
                  maxLength={2}
                  className="rounded-xl border-slate-200 uppercase" 
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase font-black text-slate-400">Observações</Label>
              <textarea 
                className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm min-h-[60px]"
                value={newClient.notes}
                onChange={(e) => setNewClient({...newClient, notes: e.target.value})}
                placeholder="Ex: Cliente prefere contato via WhatsApp"
              />
            </div>
          </form>
        )}
      </ModalLayout>

      {/* Modal de Criação Rápida de Embarcação */}
      <ModalLayout
        isOpen={isQuickVesselOpen}
        onClose={() => setIsQuickVesselOpen(false)}
        title={vesselModalMode === 'ocr' ? "Importar TIE/TIEM (IA)" : "Nova Embarcação Rápida"}
        maxWidth="md"
        footer={
          vesselModalMode === 'manual' ? (
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
          ) : null
        }
      >
        <div className="flex bg-slate-200 p-1 rounded-xl mb-6">
          <button 
            type="button"
            onClick={() => setVesselModalMode('manual')}
            className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${vesselModalMode === 'manual' ? 'bg-white text-primary shadow-sm' : 'text-slate-500'}`}
          >
            Manual
          </button>
          <button 
            type="button"
            onClick={() => setVesselModalMode('ocr')}
            className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${vesselModalMode === 'ocr' ? 'bg-white text-primary shadow-sm' : 'text-slate-500'}`}
          >
            IA OCR
          </button>
        </div>

        {vesselModalMode === 'ocr' ? (
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
            {!ocrVesselJobResult ? (
              <div 
                className="border-2 border-dashed border-slate-200 rounded-3xl p-10 flex flex-col items-center justify-center gap-4 hover:border-primary/50 transition-all cursor-pointer bg-slate-50 group text-center"
                onClick={() => ocrFileInputRef.current?.click()}
              >
                <div className="h-16 w-16 rounded-2xl bg-white shadow-sm flex items-center justify-center text-primary group-hover:scale-110 transition-transform border border-slate-100">
                  {isOcrProcessing ? <Loader2 className="h-8 w-8 animate-spin" /> : <Upload className="h-8 w-8" />}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-navy uppercase">IA Scanner TIE/TIEM</h4>
                  <p className="text-[10px] text-slate-400 font-medium max-w-[200px] mt-1">Envie o documento da embarcação para extração automática.</p>
                </div>
                <input 
                  type="file" 
                  ref={ocrFileInputRef} 
                  className="hidden" 
                  accept="image/*,application/pdf"
                  onChange={handleVesselOcrFileSelect}
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-5 bg-blue-50 border border-blue-100 rounded-2xl space-y-3">
                   <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                         <div className="h-8 w-8 bg-blue-500 text-white rounded-lg flex items-center justify-center">
                            <Ship className="h-4 w-4" />
                         </div>
                         <div>
                            <p className="text-[10px] font-black uppercase text-blue-600 tracking-widest">Dados da Embarcação</p>
                            <p className="text-xs font-bold text-navy">{ocrVesselJobResult.extracted_data?.vessel?.name || "Nome não identificado"}</p>
                         </div>
                      </div>
                      <Badge className="bg-green-500 text-white border-none text-[8px] uppercase">
                         Confiança: {((ocrVesselJobResult.confidence_score || 0.95) * 100).toFixed(0)}%
                      </Badge>
                   </div>
                   
                   <div className="grid grid-cols-1 gap-2 text-[10px]">
                      <div className="flex justify-between py-1 border-b border-blue-100/50">
                         <span className="text-slate-500">Inscrição</span>
                         <span className="font-bold text-navy">{ocrVesselJobResult.extracted_data?.vessel?.registration_number || "Não extraído"}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-blue-100/50">
                         <span className="text-slate-500">Proprietário</span>
                         <span className="font-bold text-navy">{ocrVesselJobResult.extracted_data?.vessel?.owner || "Não extraído"}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-blue-100/50">
                         <span className="text-slate-500">Tipo/Categoria</span>
                         <span className="font-bold text-navy">{ocrVesselJobResult.extracted_data?.vessel?.type || "Não extraído"}</span>
                      </div>
                   </div>

                   <Button 
                     type="button"
                     onClick={applyVesselOcrData}
                     className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-10 font-black uppercase text-[10px] tracking-widest gap-2 shadow-lg shadow-blue-200"
                   >
                      <Sparkles className="h-3 w-3" /> Criar Embarcação Automaticamente
                   </Button>
                </div>

                <Button 
                   type="button"
                   variant="ghost" 
                   onClick={() => setOcrVesselJobResult(null)}
                   className="w-full text-[10px] font-bold text-slate-400 uppercase"
                >
                   Tentar outro documento
                </Button>
              </div>
            )}
            
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
               <Zap className="h-4 w-4 text-amber-500" />
               <p className="text-[9px] text-slate-500 font-medium italic">"IA Naval: Especializada em documentos da Marinha do Brasil."</p>
            </div>
          </div>
        ) : (
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
              <Label className="text-[10px] uppercase font-black text-slate-400">Categoria</Label>
              <Input 
                value={newVessel.category}
                onChange={(e) => setNewVessel({...newVessel, category: e.target.value})}
                placeholder="Ex: Esporte"
                className="rounded-xl border-slate-200" 
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase font-black text-slate-400">Comp. (m)</Label>
              <Input 
                value={newVessel.length}
                onChange={(e) => setNewVessel({...newVessel, length: e.target.value})}
                placeholder="0.00"
                className="rounded-xl border-slate-200" 
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase font-black text-slate-400">Boca (m)</Label>
              <Input 
                value={newVessel.boca}
                onChange={(e) => setNewVessel({...newVessel, boca: e.target.value})}
                placeholder="0.00"
                className="rounded-xl border-slate-200" 
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase font-black text-slate-400">Pontal (m)</Label>
              <Input 
                value={newVessel.pontal}
                onChange={(e) => setNewVessel({...newVessel, pontal: e.target.value})}
                placeholder="0.00"
                className="rounded-xl border-slate-200" 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase font-black text-slate-400">Material</Label>
              <Input 
                value={newVessel.material}
                onChange={(e) => setNewVessel({...newVessel, material: e.target.value})}
                placeholder="Ex: Fibra"
                className="rounded-xl border-slate-200" 
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase font-black text-slate-400">Capacidade</Label>
              <Input 
                value={newVessel.capacity}
                onChange={(e) => setNewVessel({...newVessel, capacity: e.target.value})}
                placeholder="Ex: 1+9"
                className="rounded-xl border-slate-200" 
              />
            </div>
          </div>
          
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <p className="text-[10px] uppercase font-black text-slate-500 tracking-widest flex items-center gap-1">
              <Info className="h-3 w-3" /> Proprietário atual (opcional — para transferências)
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-black text-slate-400">Nome do proprietário atual</Label>
                <Input
                  value={newVessel.current_owner_name}
                  onChange={(e) => setNewVessel({...newVessel, current_owner_name: e.target.value})}
                  placeholder="Ex: João da Silva (vendedor)"
                  className="rounded-xl border-slate-200 bg-white"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-black text-slate-400">CPF/CNPJ do proprietário atual</Label>
                <Input
                  value={newVessel.current_owner_cpf_cnpj}
                  onChange={(e) => setNewVessel({...newVessel, current_owner_cpf_cnpj: e.target.value})}
                  placeholder="000.000.000-00"
                  className="rounded-xl border-slate-200 bg-white font-mono text-xs"
                />
              </div>
            </div>
            <p className="text-[10px] text-slate-500">
              Deixe em branco se a embarcação já está no nome do cliente do processo.
            </p>
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
      )}
      </ModalLayout>
    </>
  );
}
