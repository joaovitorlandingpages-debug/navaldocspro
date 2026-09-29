import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/routes/dashboard";
import { 
  ArrowLeft, 
  Paperclip, 
  ChevronDown, 
  ChevronUp,
  Loader2, 
  FileUp, 
  Sparkles, 
  AlertCircle, 
  AlertTriangle,
  CheckCircle2,
  Ship,
  User,
  Plus,
  Search,
  Check,
  X
} from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  VesselDocumentUploadModal, 
  ExtractedVesselData, 
  UploadedVesselFile 
} from "@/components/vessels/VesselDocumentUploadModal";
import { QuickCustomerModal } from "@/components/customers/QuickCustomerModal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export const Route = createFileRoute("/vessels/novo")({
  validateSearch: (search: Record<string, unknown>): { customerId?: string; from?: string; category?: string; services?: string } => ({
    customerId: (search.customerId as string) || undefined,
    from: (search.from as string) || undefined,
    category: (search.category as string) || undefined,
    services: (search.services as string) || undefined,
  }),
  component: () => (
    <ProtectedRoute>
      <DashboardLayout>
        <NovaEmbarcacaoPage />
      </DashboardLayout>
    </ProtectedRoute>
  ),
});

const VESSEL_TYPES = [
  "Lancha",
  "Veleiro",
  "Moto Aquática (Jet Ski)",
  "Iate",
  "Bote Inflável",
  "Pesqueiro",
  "Rebocador",
  "Balsa",
  "Empurrador",
  "Catamarã",
  "Escuna",
  "Barco de Alumínio / Bote",
  "Lancha de Passageiros",
  "Outro",
];

const HULL_MATERIALS = [
  "Fibra de Vidro (PRFV)",
  "Alumínio",
  "Aço",
  "Madeira",
  "Polietileno",
  "Misto",
  "Outro",
];

const NAVIGATION_AREAS = [
  "Interior (Rios, Lagos, Canais e Baías abrigadas)",
  "Mar Aberto - Costeira (até 20 milhas da costa)",
  "Mar Aberto - Oceânica (sem restrição de afastamento)",
  "Apoio Portuário",
  "Apoio Marítimo",
];

function NovaEmbarcacaoPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/vessels/novo" });
  const { profile } = useAuth();
  const companyId = profile?.company_id;

  // Contexto de retorno aos Serviços
  const fromServicos = search.from === "servicos";
  const returnCategory = (search.category as "profissional" | "esporte_recreio") || "esporte_recreio";
  const returnServices = search.services;

  // Lista de clientes da empresa
  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);

  // Cliente Selecionado
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(search.customerId || "");
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const customerDropdownRef = useRef<HTMLDivElement>(null);

  // Modal de Cadastro Rápido de Cliente
  const [isQuickCustomerOpen, setIsQuickCustomerOpen] = useState(false);

  // Modal de Leitura de Documentos
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedVesselFile[]>([]);
  const [extractedBadge, setExtractedBadge] = useState(false);
  const [ownerDivergenceWarning, setOwnerDivergenceWarning] = useState<string | null>(null);

  // Seção Recolhível de Dados Complementares
  const [isComplementaryOpen, setIsComplementaryOpen] = useState(false);

  // Estado do Formulário
  const [formData, setFormData] = useState({
    // Principais
    name: "",
    category: "Embarcações de esporte e recreio",
    registration_number: "",
    vessel_type: "",
    construction_year: "",
    hull_material: "",
    length: "",
    navigation_area: "",
    // Complementares
    boca: "",
    pontal: "",
    hull_identifier: "",
    gross_tonnage: "",
    manufacturer: "",
    model: "",
    engine_power: "",
    engine_serial_number: "",
    engine_brand: "",
    engine_count: "",
    capacity: "",
    port_registration: "",
    notes: "",
  });

  // Validação e Erros
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [duplicateVessel, setDuplicateVessel] = useState<{ id: string; name: string; registration_number: string } | null>(null);

  // Carrega clientes da empresa
  useEffect(() => {
    const fetchCustomers = async () => {
      if (!companyId) return;
      setIsLoadingCustomers(true);
      try {
        const { data, error } = await supabase
          .from("customers")
          .select("id, name, cpf_cnpj, email, phone")
          .eq("company_id", companyId)
          .order("name", { ascending: true });

        if (error) throw error;
        setCustomers(data || []);

        if (search.customerId && data) {
          const found = data.find((c: any) => c.id === search.customerId);
          if (found) setSelectedCustomerId(found.id);
        }
      } catch (err) {
        console.error("Erro ao carregar clientes:", err);
      } finally {
        setIsLoadingCustomers(false);
      }
    };

    fetchCustomers();
  }, [companyId, search.customerId]);

  // Fecha dropdown de cliente ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target as Node)) {
        setIsCustomerDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Cliente atualmente selecionado
  const selectedCustomer = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  // Lista filtrada de clientes
  const filteredCustomers = useMemo(() => {
    if (!customerSearchQuery.trim()) return customers;
    const query = customerSearchQuery.toLowerCase().trim();
    return customers.filter(
      (c) =>
        c.name?.toLowerCase().includes(query) ||
        c.cpf_cnpj?.replace(/\D/g, "").includes(query.replace(/\D/g, ""))
    );
  }, [customers, customerSearchQuery]);

  // Detecta se há dados preenchidos para pedir confirmação ao sair
  const hasUnsavedChanges = useMemo(() => {
    return Boolean(
      formData.name ||
      formData.registration_number ||
      formData.construction_year ||
      formData.length ||
      selectedCustomerId
    );
  }, [formData, selectedCustomerId]);

  const handleBack = () => {
    if (hasUnsavedChanges) {
      setShowExitConfirm(true);
    } else if (fromServicos) {
      navigate({
        to: "/servicos/selecionar",
        search: {
          category: returnCategory,
          ...(search.customerId ? { customerId: search.customerId } : {}),
          ...(returnServices ? { services: returnServices } : {}),
        } as any,
      });
    } else {
      navigate({ to: "/vessels" });
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // Normaliza valores numéricos decimais (aceita vírgula)
  const parseDecimal = (val: string): number | null => {
    if (!val || !val.trim()) return null;
    const cleaned = val.trim().replace(",", ".");
    const num = parseFloat(cleaned);
    return isNaN(num) ? null : num;
  };

  // Extração OCR
  const handleDataExtracted = (extracted: ExtractedVesselData, files: UploadedVesselFile[]) => {
    if (files.length > 0) {
      setUploadedFiles((prev) => [...prev, ...files]);
    }

    // Verifica divergência de proprietário
    if (extracted.identified_owner_name && selectedCustomer?.name) {
      const docOwner = extracted.identified_owner_name.toLowerCase().trim();
      const currentClient = selectedCustomer.name.toLowerCase().trim();

      if (!docOwner.includes(currentClient) && !currentClient.includes(docOwner)) {
        setOwnerDivergenceWarning(
          `Atenção: O proprietário indicado no documento (${extracted.identified_owner_name}) difere do cliente selecionado (${selectedCustomer.name}). Verifique se trata-se de uma transferência de propriedade.`
        );
      } else {
        setOwnerDivergenceWarning(null);
      }
    }

    setFormData((prev) => ({
      ...prev,
      name: extracted.name || prev.name,
      registration_number: extracted.registration_number || prev.registration_number,
      vessel_type: extracted.vessel_type || prev.vessel_type,
      category: extracted.category || prev.category,
      construction_year: extracted.construction_year || prev.construction_year,
      hull_material: extracted.hull_material || prev.hull_material,
      length: extracted.length || prev.length,
      boca: extracted.boca || prev.boca,
      pontal: extracted.pontal || prev.pontal,
      hull_identifier: extracted.hull_identifier || prev.hull_identifier,
      gross_tonnage: extracted.gross_tonnage || prev.gross_tonnage,
      manufacturer: extracted.manufacturer || prev.manufacturer,
      model: extracted.model || prev.model,
      engine_power: extracted.engine_power || prev.engine_power,
      engine_serial_number: extracted.engine_serial_number || prev.engine_serial_number,
      engine_brand: extracted.engine_brand || prev.engine_brand,
      engine_count: extracted.engine_count || prev.engine_count,
      capacity: extracted.capacity || prev.capacity,
      port_registration: extracted.port_registration || prev.port_registration,
      navigation_area: extracted.navigation_area || prev.navigation_area,
    }));

    setExtractedBadge(true);
  };

  // Validação
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!selectedCustomerId) {
      newErrors.customer = "A seleção do cliente responsável é obrigatória.";
    }

    if (!formData.name.trim()) {
      newErrors.name = "Nome da embarcação é obrigatório.";
    }

    if (!formData.category) {
      newErrors.category = "Categoria é obrigatória.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Salvamento da Embarcação
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      toast.error("Por favor, selecione o cliente e preencha os campos obrigatórios.");
      return;
    }

    if (!companyId) {
      toast.error("Espaço de trabalho não identificado. Recarregue a página.");
      return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading("Verificando e salvando embarcação...");

    try {
      // 1. Verificação de duplicidade pelo número de inscrição (se informado)
      if (formData.registration_number.trim()) {
        const { data: existingVessel } = await supabase
          .from("vessels")
          .select("id, name, registration_number")
          .eq("company_id", companyId)
          .eq("registration_number", formData.registration_number.trim())
          .maybeSingle();

        if (existingVessel) {
          toast.dismiss(loadingToast);
          setIsSubmitting(false);
          setDuplicateVessel(existingVessel);
          return;
        }
      }

      // 2. Normalização dos campos
      const normalizedLength = parseDecimal(formData.length);
      const normalizedBoca = parseDecimal(formData.boca);
      const normalizedPontal = parseDecimal(formData.pontal);
      const normalizedCapacity = formData.capacity ? parseInt(formData.capacity, 10) || null : null;
      const normalizedYear = formData.construction_year ? parseInt(formData.construction_year, 10) || null : null;

      // 3. Inserção no banco de dados
      const { data: newVessel, error: insertError } = await supabase
        .from("vessels")
        .insert({
          company_id: companyId,
          customer_id: selectedCustomerId,
          name: formData.name.trim(),
          category: formData.category,
          registration_number: formData.registration_number.trim() || null,
          vessel_type: formData.vessel_type.trim() || null,
          construction_year: normalizedYear,
          material: formData.hull_material.trim() || null,
          length: normalizedLength,
          boca: normalizedBoca,
          pontal: normalizedPontal,
          capacity: normalizedCapacity,
          current_owner_name: selectedCustomer?.name || null,
          current_owner_cpf_cnpj: selectedCustomer?.cpf_cnpj || null,
          engine: formData.engine_brand
            ? `${formData.engine_brand}${formData.engine_power ? ` ${formData.engine_power} HP` : ""}`
            : null,
          engine_power: formData.engine_power.trim() || null,
          engine_serial_number: formData.engine_serial_number.trim() || null,
        } as any)
        .select()
        .single();

      if (insertError) throw insertError;

      // 4. Vincula arquivos anexados à embarcação
      if (uploadedFiles.length > 0 && newVessel?.id) {
        for (const uf of uploadedFiles) {
          try {
            await supabase.from("customer_documents").insert({
              customer_id: selectedCustomerId,
              company_id: companyId,
              file_name: uf.name,
              file_path: uf.path || "",
              file_type: uf.file?.type || "application/pdf",
              file_size: uf.size || 0,
            });
          } catch (docErr) {
            console.warn("Vínculo de documento da embarcação aviso:", docErr);
          }
        }
      }

      // 5. Registra log de atividade
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("activity_logs").insert({
            company_id: companyId,
            user_id: user.id,
            module: "vessels",
            action: "vessel_created",
            resource_type: "vessel",
            resource_id: newVessel.id,
            description: `Nova embarcação cadastrada: ${newVessel.name}`,
            metadata: {
              customer_id: selectedCustomerId,
              registration_number: newVessel.registration_number,
              vessel_type: newVessel.vessel_type,
            },
          });
        }
      } catch (logErr) {
        console.warn("Log de atividade:", logErr);
      }

      toast.dismiss(loadingToast);
      toast.success("Embarcação cadastrada com sucesso!");

      if (fromServicos && newVessel?.id) {
        navigate({
          to: "/servicos/selecionar",
          search: {
            category: returnCategory,
            customerId: selectedCustomerId,
            vesselId: newVessel.id,
            ...(returnServices ? { services: returnServices } : {}),
          } as any,
        });
      } else {
        navigate({ to: "/vessels" });
      }
    } catch (err: any) {
      console.error("Erro ao cadastrar embarcação:", err);
      toast.dismiss(loadingToast);
      toast.error(err.message || "Erro ao salvar embarcação.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-2 sm:py-6 px-2 sm:px-4">
      {/* 1. NAVEGAÇÃO VOLTAR */}
      <button
        type="button"
        onClick={handleBack}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#075BFF] hover:underline cursor-pointer mb-3 group"
        aria-label={fromServicos ? "Voltar aos serviços" : "Voltar para a relação de embarcações"}
      >
        <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
        <span>{fromServicos ? "Voltar aos serviços" : "Voltar"}</span>
      </button>

      {/* 2. TÍTULO E SUBTÍTULO */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#0B1739] tracking-tight">
          Cadastrar embarcação
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Vincule a embarcação a um cliente e preencha os dados.
        </p>
      </div>

      {/* 3. BLOCO 1: CLIENTE VINCULADO */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs mb-6" ref={customerDropdownRef}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-[#0B1739]">
            Cliente vinculado
          </h2>
          <button
            type="button"
            id="btn-quick-customer"
            onClick={() => setIsQuickCustomerOpen(true)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#075BFF] hover:text-blue-700 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Cadastrar cliente</span>
          </button>
        </div>

        {!isLoadingCustomers && customers.length === 0 && (
          <div className="mb-4 p-4 rounded-xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
              <span>Nenhum cliente cadastrado no seu escritório. Cadastre um cliente primeiro para vincular a embarcação.</span>
            </div>
            <button
              type="button"
              id="btn-cadastrar-cliente-primeiro"
              onClick={() => navigate({ to: "/customers/novo" })}
              className="shrink-0 px-3.5 py-1.5 bg-[#075BFF] hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors cursor-pointer text-xs"
            >
              Cadastrar cliente primeiro
            </button>
          </div>
        )}

        <div className="relative">
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Cliente responsável <span className="text-red-500">*</span>
          </label>

          {/* Trigger do Seletor */}
          <button
            type="button"
            id="customer-select-trigger"
            onClick={() => setIsCustomerDropdownOpen(!isCustomerDropdownOpen)}
            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border bg-white text-sm transition-all text-left cursor-pointer focus:outline-none focus:ring-2 ${
              errors.customer
                ? "border-red-400 focus:ring-red-200"
                : "border-slate-200 hover:border-slate-300 focus:ring-[#075BFF]/20 focus:border-[#075BFF]"
            }`}
            aria-expanded={isCustomerDropdownOpen}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <User className="h-4 w-4 text-slate-400 shrink-0" />
              {selectedCustomer ? (
                <span className="font-semibold text-slate-900 truncate">
                  {selectedCustomer.name}
                  <span className="text-slate-400 text-xs font-normal ml-2">
                    ({selectedCustomer.cpf_cnpj})
                  </span>
                </span>
              ) : (
                <span className="text-slate-400">
                  {isLoadingCustomers ? "Carregando clientes..." : "Selecione o cliente responsável"}
                </span>
              )}
            </div>
            <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isCustomerDropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {errors.customer && (
            <p className="text-[11px] text-red-500 mt-1 font-medium">{errors.customer}</p>
          )}

          {/* Dropdown com Campo de Busca */}
          {isCustomerDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 p-2 animate-in fade-in-50 duration-150">
              {/* Campo de Busca Interno */}
              <div className="relative mb-2 px-1">
                <Search className="absolute left-3.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={customerSearchQuery}
                  onChange={(e) => setCustomerSearchQuery(e.target.value)}
                  placeholder="Buscar por nome ou CPF/CNPJ..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#075BFF]"
                  autoFocus
                />
              </div>

              {/* Lista de Clientes */}
              <div className="max-h-56 overflow-y-auto space-y-1 custom-scrollbar">
                {isLoadingCustomers ? (
                  <div className="p-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-[#075BFF]" />
                    <span>Carregando lista...</span>
                  </div>
                ) : filteredCustomers.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">
                    Nenhum cliente encontrado.
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomerDropdownOpen(false);
                        setIsQuickCustomerOpen(true);
                      }}
                      className="block mx-auto mt-2 text-[#075BFF] font-semibold hover:underline"
                    >
                      + Cadastrar novo cliente
                    </button>
                  </div>
                ) : (
                  filteredCustomers.map((cust) => {
                    const isSelected = cust.id === selectedCustomerId;
                    return (
                      <button
                        key={cust.id}
                        type="button"
                        id={`customer-option-${cust.id}`}
                        data-customer-id={cust.id}
                        onClick={() => {
                          setSelectedCustomerId(cust.id);
                          setIsCustomerDropdownOpen(false);
                          if (errors.customer) setErrors((p) => ({ ...p, customer: "" }));
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors text-left cursor-pointer ${
                          isSelected
                            ? "bg-[#EEF4FF] text-[#075BFF] font-semibold"
                            : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                      >
                        <div className="truncate">
                          <p className="font-semibold text-slate-900 truncate">{cust.name}</p>
                          <p className="text-[10px] text-slate-400">{cust.cpf_cnpj}</p>
                        </div>
                        {isSelected && <Check className="h-4 w-4 text-[#075BFF] shrink-0 ml-2" />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        <p className="text-xs text-slate-400 mt-2">
          Esta embarcação e seus novos serviços ficarão vinculados ao cliente selecionado.
        </p>
      </div>

      {/* 4. BLOCO 2: PAINEL AZUL-CLARO "PREENCHER COM DOCUMENTOS" */}
      <div className="bg-[#EEF4FF] border border-[#D8E6FF] rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 shadow-2xs">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white text-[#075BFF] flex items-center justify-center shrink-0 border border-blue-100 shadow-xs">
            <FileUp className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#0B1739]">
              Preencher com documentos
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              Anexe os documentos da embarcação e revise os dados extraídos.
            </p>
          </div>
        </div>

        <div className="flex flex-col items-start sm:items-end shrink-0">
          <button
            type="button"
            onClick={() => setIsDocModalOpen(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[#075BFF] bg-white text-[#075BFF] hover:bg-blue-50 font-semibold text-xs transition-colors shadow-2xs"
          >
            <Paperclip className="h-4 w-4 rotate-[-45deg]" />
            <span>Anexar documentos</span>
          </button>
          <span className="text-[10px] text-slate-400 mt-1.5 pl-1 sm:pl-0">
            PDF, JPG ou PNG
          </span>
        </div>
      </div>

      {/* Banner Informativo se Dados Foram Extraídos */}
      {extractedBadge && (
        <div className="mb-6 p-3.5 rounded-xl bg-blue-50 border border-blue-200/80 flex items-center justify-between text-xs text-blue-900 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#075BFF] shrink-0" />
            <span>Confira todos os dados extraídos do documento. A leitura automática pode cometer erros. Corrija as informações antes de salvar.</span>
          </div>
          <button
            type="button"
            onClick={() => setExtractedBadge(false)}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Alerta de Divergência de Proprietário */}
      {ownerDivergenceWarning && (
        <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-3 animate-in fade-in duration-200">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 leading-relaxed">
            <p className="font-bold text-amber-950">Possível divergência no documento</p>
            <p className="mt-0.5 text-amber-800">{ownerDivergenceWarning}</p>
          </div>
        </div>
      )}

      {/* 5. BLOCO 3: FORMULÁRIO DADOS DA EMBARCAÇÃO */}
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
        <div>
          <h2 className="text-base font-bold text-[#0B1739] mb-4">
            Dados da embarcação
          </h2>

          <div className="space-y-4">
            {/* Grid 2 cols: Nome da embarcação + Categoria */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nome da embarcação <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="vessel-name"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="Digite o nome"
                  className={`w-full px-4 py-2.5 rounded-xl border text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all ${
                    errors.name
                      ? "border-red-400 focus:ring-red-200"
                      : "border-slate-200 focus:ring-[#075BFF]/20 focus:border-[#075BFF]"
                  }`}
                />
                {errors.name && (
                  <p className="text-[11px] text-red-500 mt-1 font-medium">{errors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Categoria <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    id="vessel-category"
                    value={formData.category}
                    onChange={(e) => handleChange("category", e.target.value)}
                    className="w-full appearance-none px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all pr-8"
                  >
                    <option value="Embarcações de esporte e recreio">Embarcações de esporte e recreio</option>
                    <option value="Embarcações profissionais">Embarcações profissionais</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Grid 2 cols: Número de inscrição + Tipo de embarcação */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Número de inscrição
                </label>
                <input
                  type="text"
                  id="vessel-registration"
                  value={formData.registration_number}
                  onChange={(e) => handleChange("registration_number", e.target.value)}
                  placeholder="Informe, se disponível"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tipo de embarcação
                </label>
                <div className="relative">
                  <select
                    value={formData.vessel_type}
                    onChange={(e) => handleChange("vessel_type", e.target.value)}
                    className="w-full appearance-none px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all pr-8"
                  >
                    <option value="">Selecione</option>
                    {VESSEL_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Grid 2 cols: Ano de construção + Material do casco */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Ano de construção
                </label>
                <input
                  type="text"
                  value={formData.construction_year}
                  onChange={(e) => handleChange("construction_year", e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="AAAA"
                  maxLength={4}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Material do casco
                </label>
                <div className="relative">
                  <select
                    value={formData.hull_material}
                    onChange={(e) => handleChange("hull_material", e.target.value)}
                    className="w-full appearance-none px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all pr-8"
                  >
                    <option value="">Informe o material</option>
                    {HULL_MATERIALS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Grid 2 cols: Comprimento (m) + Área de navegação */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Comprimento (m)
                </label>
                <input
                  type="text"
                  value={formData.length}
                  onChange={(e) => handleChange("length", e.target.value)}
                  placeholder="0,00"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Área de navegação
                </label>
                <div className="relative">
                  <select
                    value={formData.navigation_area}
                    onChange={(e) => handleChange("navigation_area", e.target.value)}
                    className="w-full appearance-none px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all pr-8"
                  >
                    <option value="">Selecione</option>
                    {NAVIGATION_AREAS.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* ACORDEÃO: DADOS COMPLEMENTARES */}
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsComplementaryOpen(!isComplementaryOpen)}
                className="w-full flex items-center justify-between py-2 text-xs font-bold text-slate-700 hover:text-slate-900 transition-colors"
                aria-expanded={isComplementaryOpen}
              >
                <span>Dados complementares</span>
                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isComplementaryOpen ? "rotate-180" : ""}`} />
              </button>

              {isComplementaryOpen && (
                <div className="pt-4 space-y-4 animate-in fade-in-50 duration-200">
                  {/* Boca + Pontal */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Boca moldada (m)
                      </label>
                      <input
                        type="text"
                        value={formData.boca}
                        onChange={(e) => handleChange("boca", e.target.value)}
                        placeholder="0,00"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Pontal moldado (m)
                      </label>
                      <input
                        type="text"
                        value={formData.pontal}
                        onChange={(e) => handleChange("pontal", e.target.value)}
                        placeholder="0,00"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF]"
                      />
                    </div>
                  </div>

                  {/* Chassi / HIN + Arqueação Bruta */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Identificação do casco / Chassi (HIN / CIN)
                      </label>
                      <input
                        type="text"
                        value={formData.hull_identifier}
                        onChange={(e) => handleChange("hull_identifier", e.target.value)}
                        placeholder="Ex: BR-ABC12345D607"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Arqueação bruta (AB)
                      </label>
                      <input
                        type="text"
                        value={formData.gross_tonnage}
                        onChange={(e) => handleChange("gross_tonnage", e.target.value)}
                        placeholder="Ex: 5,40"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF]"
                      />
                    </div>
                  </div>

                  {/* Fabricante + Modelo */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Fabricante / Estaleiro
                      </label>
                      <input
                        type="text"
                        value={formData.manufacturer}
                        onChange={(e) => handleChange("manufacturer", e.target.value)}
                        placeholder="Ex: Schaefer Yachts, Real Powerboats..."
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Modelo da embarcação
                      </label>
                      <input
                        type="text"
                        value={formData.model}
                        onChange={(e) => handleChange("model", e.target.value)}
                        placeholder="Ex: Phantom 303"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF]"
                      />
                    </div>
                  </div>

                  {/* Motorização: Potência + N° Série */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Potência do motor (HP / kW)
                      </label>
                      <input
                        type="text"
                        value={formData.engine_power}
                        onChange={(e) => handleChange("engine_power", e.target.value)}
                        placeholder="Ex: 300 HP"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Número de série do motor
                      </label>
                      <input
                        type="text"
                        value={formData.engine_serial_number}
                        onChange={(e) => handleChange("engine_serial_number", e.target.value)}
                        placeholder="Ex: 2B123456"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF]"
                      />
                    </div>
                  </div>

                  {/* Marca do motor + Qtd de motores */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Marca do motor
                      </label>
                      <input
                        type="text"
                        value={formData.engine_brand}
                        onChange={(e) => handleChange("engine_brand", e.target.value)}
                        placeholder="Ex: Mercury, Yamaha, Volvo Penta..."
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Quantidade de motores
                      </label>
                      <input
                        type="text"
                        value={formData.engine_count}
                        onChange={(e) => handleChange("engine_count", e.target.value.replace(/\D/g, ""))}
                        placeholder="Ex: 1 ou 2"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF]"
                      />
                    </div>
                  </div>

                  {/* Lotação + Porto de inscrição */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Lotação (Passageiros + Tripulação)
                      </label>
                      <input
                        type="text"
                        value={formData.capacity}
                        onChange={(e) => handleChange("capacity", e.target.value.replace(/\D/g, ""))}
                        placeholder="Ex: 8"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Porto / Capitania de inscrição
                      </label>
                      <input
                        type="text"
                        value={formData.port_registration}
                        onChange={(e) => handleChange("port_registration", e.target.value)}
                        placeholder="Ex: Capitania dos Portos de São Paulo"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF]"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 6. RODAPÉ DO FORMULÁRIO */}
        <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-xs text-slate-400">
            Revise as informações antes de salvar.
          </p>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleBack}
              className="px-6 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="submit"
              id="btn-save-vessel"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xs cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Salvando embarcação...</span>
                </>
              ) : (
                <span>Salvar embarcação</span>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* MODAL DE CADASTRO RÁPIDO DE CLIENTE */}
      <QuickCustomerModal
        isOpen={isQuickCustomerOpen}
        onClose={() => setIsQuickCustomerOpen(false)}
        companyId={companyId || null}
        onCustomerCreated={(newCust) => {
          setCustomers((prev) => [newCust, ...prev]);
          setSelectedCustomerId(newCust.id);
          if (errors.customer) setErrors((p) => ({ ...p, customer: "" }));
        }}
      />

      {/* MODAL DE LEITURA DE DOCUMENTOS DA EMBARCAÇÃO */}
      <VesselDocumentUploadModal
        isOpen={isDocModalOpen}
        onClose={() => setIsDocModalOpen(false)}
        companyId={companyId || null}
        onDataExtracted={handleDataExtracted}
      />

      {/* CONFIRMAÇÃO DE SAÍDA COM DADOS NÃO SALVOS */}
      <ConfirmDialog
        open={showExitConfirm}
        onOpenChange={setShowExitConfirm}
        title="Descartar alterações?"
        description="Você possui dados preenchidos que ainda não foram salvos. Tem certeza que deseja sair desta página?"
        confirmText="Sim, descartar e sair"
        cancelText="Continuar editando"
        variant="destructive"
        onConfirm={() => {
          setShowExitConfirm(false);
          if (fromServicos) {
            navigate({
              to: "/servicos/selecionar",
              search: {
                category: returnCategory,
                ...(search.customerId ? { customerId: search.customerId } : {}),
                ...(returnServices ? { services: returnServices } : {}),
              } as any,
            });
          } else {
            navigate({ to: "/vessels" });
          }
        }}
      />

      {/* ALERTA DE EMBARCAÇÃO JÁ CADASTRADA (DUPLICIDADE) */}
      <Dialog open={duplicateVessel !== null} onOpenChange={(open) => !open && setDuplicateVessel(null)}>
        <DialogContent className="max-w-md p-6 rounded-2xl bg-white border border-slate-150 shadow-xl">
          <DialogHeader>
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-2">
              <AlertCircle className="h-6 w-6" />
            </div>
            <DialogTitle className="text-lg font-bold text-[#0B1739]">
              Inscrição já cadastrada
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 mt-1">
              Já existe uma embarcação cadastrada com o número de inscrição ({duplicateVessel?.registration_number}) no seu espaço de trabalho: <strong>{duplicateVessel?.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 mt-4">
            <button
              type="button"
              onClick={() => setDuplicateVessel(null)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Corrigir inscrição
            </button>
            <button
              type="button"
              onClick={() => {
                setDuplicateVessel(null);
                navigate({ to: "/vessels" });
              }}
              className="px-4 py-2 rounded-xl bg-[#075BFF] text-white text-xs font-semibold hover:bg-blue-600"
            >
              Ver na relação de embarcações
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
