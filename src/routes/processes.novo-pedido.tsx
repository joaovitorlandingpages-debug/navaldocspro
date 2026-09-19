import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import {
  ArrowLeft, Search, Check, Ship, ArrowLeftRight, FileText,
  Wrench, FileCheck, CheckCircle2, ChevronRight, X, Info,
  AlertCircle, Upload, Sparkles, User, Award, FileSpreadsheet,
  UserCheck, Anchor, Loader2, ArrowRight, Pencil, ChevronDown,
  ChevronUp, Plus, Building2, CheckSquare, Eye, Clock, AlertTriangle,
  FolderOpen, ExternalLink, RefreshCw, Layers
} from "lucide-react";
import { useState, useMemo, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DashboardLayout } from "@/routes/dashboard";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/processes/novo-pedido")({
  validateSearch: (search: Record<string, unknown>) => ({
    customerId: (search.customerId as string) || undefined,
    vesselId: (search.vesselId as string) || undefined,
    preview: (search.preview as string) || undefined,
    step: (search.step as string) || undefined,
  }),
  component: () => (
    <ProtectedRoute>
      <DashboardLayout>
        <NovoPedidoPage />
      </DashboardLayout>
    </ProtectedRoute>
  ),
});

// Catálogo de serviços oficial do NavalDocs Pro
interface ServiceItem {
  id: string;
  name: string;
  shortName: string;
  description: string;
  icon: any;
  requiresVessel: boolean;
  category: "maritimo" | "pessoal" | "tecnico";
}

const SERVICES_CATALOG: ServiceItem[] = [
  {
    id: "inscricao",
    name: "Inscrição de embarcação",
    shortName: "Inscrição",
    description: "Cadastrar uma embarcação no sistema.",
    icon: Ship,
    requiresVessel: true,
    category: "maritimo",
  },
  {
    id: "transferencia",
    name: "Transferência de propriedade",
    shortName: "Transferência",
    description: "Registrar a mudança de proprietário.",
    icon: ArrowLeftRight,
    requiresVessel: true,
    category: "maritimo",
  },
  {
    id: "renovacao",
    name: "Renovação de documento",
    shortName: "Renovação",
    description: "Renovar um documento existente.",
    icon: FileText,
    requiresVessel: true,
    category: "maritimo",
  },
  {
    id: "alteracao_motor",
    name: "Alteração de motor",
    shortName: "Alteração de motor",
    description: "Atualizar dados do motor da embarcação.",
    icon: Wrench,
    requiresVessel: true,
    category: "maritimo",
  },
  {
    id: "vistoria",
    name: "Vistoria",
    shortName: "Vistoria",
    description: "Organizar a solicitação de vistoria.",
    icon: Search,
    requiresVessel: true,
    category: "maritimo",
  },
  {
    id: "segunda_via",
    name: "Segunda via de documento",
    shortName: "Segunda via",
    description: "Emitir uma segunda via.",
    icon: FileCheck,
    requiresVessel: true,
    category: "maritimo",
  },
  // Serviços adicionais do catálogo
  {
    id: "habilitacao_cha",
    name: "Emissão / Renovação de CHA",
    shortName: "Habilitação náutica",
    description: "Carteira de Habilitação de Amador (Arrais, Mestre ou Capitão).",
    icon: Award,
    requiresVessel: false,
    category: "pessoal",
  },
  {
    id: "laudo_engenharia",
    name: "Laudo Técnico Pericial",
    shortName: "Laudo técnico",
    description: "Perícia de estabilidade, arqueação e engenharia naval.",
    icon: FileSpreadsheet,
    requiresVessel: true,
    category: "tecnico",
  },
  {
    id: "alteracao_cadastral",
    name: "Alteração Cadastral",
    shortName: "Alteração cadastral",
    description: "Atualização de endereço ou dados do proprietário.",
    icon: UserCheck,
    requiresVessel: false,
    category: "pessoal",
  },
  {
    id: "despacho_porto",
    name: "Despacho de Saída / Entrada",
    shortName: "Despacho",
    description: "Comunicação de tráfego e autorização na Capitania.",
    icon: Anchor,
    requiresVessel: true,
    category: "maritimo",
  },
];

// Dados mock para o modo preview (idênticos à referência visual)
const PREVIEW_CUSTOMERS = [
  { id: "prev-c1", name: "Marina Costa", document_number: "042.819.330-12", email: "marina@costa.com.br", phone: "(11) 98765-4321", type: "PF" },
  { id: "prev-c2", name: "Carlos Eduardo Ramos", document_number: "192.834.721-09", email: "carlos.ramos@empresa.com", phone: "(21) 99876-1234", type: "PF" },
  { id: "prev-c3", name: "Roberto Alencar", document_number: "554.218.990-44", email: "roberto@nautica.com", phone: "(13) 97654-8899", type: "PF" },
  { id: "prev-c4", name: "Oceanic Brasil Navegação LTDA", document_number: "12.345.678/0001-90", email: "contato@oceanic.com.br", phone: "(11) 3344-5566", type: "PJ" },
];

const PREVIEW_VESSELS = [
  { id: "prev-v1", name: "Mar Azul", vessel_type: "Lancha", customer_id: "prev-c1", customer_name: "Marina Costa", registration_number: "381-000123" },
  { id: "prev-v2", name: "Vento Forte", vessel_type: "Veleiro", customer_id: "prev-c1", customer_name: "Marina Costa", registration_number: "381-000456" },
  { id: "prev-v3", name: "Estrela do Mar", vessel_type: "Iate", customer_id: "prev-c2", customer_name: "Carlos Eduardo Ramos", registration_number: "381-000789" },
];

export interface ExtractedFieldItem {
  id: string;
  label: string;
  value: string;
  confidence: number;
  page: number;
  isCritical?: boolean;
}

export interface OrderDocumentRequirement {
  id: string;
  name: string;
  fileName: string | null;
  fileSize?: string;
  usedInLabel: string;
  status: "recebido" | "conferir" | "falta_enviar";
  targetServiceIds: string[];
  personOrVessel: string;
  whyNeeded: string;
  outputDocuments: string[];
  extractedFields?: ExtractedFieldItem[];
}

const DEFAULT_ORDER_REQUIREMENTS: OrderDocumentRequirement[] = [
  {
    id: "doc-embarcacao",
    name: "Documento da embarcação",
    fileName: "documento-mar-azul.pdf",
    fileSize: "2.4 MB",
    usedInLabel: "Usado em 3 serviços",
    status: "recebido",
    targetServiceIds: ["transferencia", "renovacao", "alteracao_motor"],
    personOrVessel: "Embarcação Mar Azul",
    whyNeeded: "Comprova a inscrição atual, características técnicas e regularidade perante a Capitania dos Portos.",
    outputDocuments: [
      "Requerimento de Transferência de Propriedade",
      "Requerimento de Renovação de TIE",
      "Requerimento de Alteração de Dados Cadastrais (Motor)"
    ],
    extractedFields: [
      { id: "tie", label: "Nº de Inscrição (TIE)", value: "381-000123", confidence: 99, page: 1, isCritical: true },
      { id: "nome_emb", label: "Nome da Embarcação", value: "Mar Azul", confidence: 98, page: 1 },
      { id: "prop_atual", label: "Proprietário Atual", value: "Marina Costa", confidence: 97, page: 1 },
      { id: "motor_atual", label: "Motor Registrado", value: "Mercury Verado 250 HP", confidence: 94, page: 2 },
    ]
  },
  {
    id: "doc-comprador",
    name: "Documento do comprador",
    fileName: "documento-comprador.pdf",
    fileSize: "1.1 MB",
    usedInLabel: "Transferência",
    status: "conferir",
    targetServiceIds: ["transferencia"],
    personOrVessel: "Carlos Eduardo Ramos (Comprador)",
    whyNeeded: "Identificação civil obrigatória para emissão do novo título de propriedade.",
    outputDocuments: ["Requerimento de Transferência de Propriedade"],
    extractedFields: [
      { id: "nome_comp", label: "Nome Completo", value: "Carlos Eduardo Ramos", confidence: 98, page: 1, isCritical: true },
      { id: "cpf_comp", label: "CPF", value: "192.834.721-09", confidence: 99, page: 1, isCritical: true },
      { id: "rg_comp", label: "RG", value: "24.512.980-X SSP/SP", confidence: 95, page: 1 },
      { id: "papel", label: "Papel no Pedido", value: "Comprador / Novo Adquirente", confidence: 99, page: 1, isCritical: true },
    ]
  },
  {
    id: "doc-motor",
    name: "Comprovante do novo motor",
    fileName: null,
    usedInLabel: "Alteração de motor",
    status: "falta_enviar",
    targetServiceIds: ["alteracao_motor"],
    personOrVessel: "Motor Novo (Mercury 300 HP)",
    whyNeeded: "Nota fiscal de aquisição ou declaração com número de série para averbação do novo motor.",
    outputDocuments: ["Requerimento de Alteração de Dados Cadastrais (Motor)", "Termo de Responsabilidade Técnica"],
  },
  {
    id: "doc-vendedor",
    name: "Documento do vendedor",
    fileName: "documento-vendedor.pdf",
    fileSize: "980 KB",
    usedInLabel: "Transferência",
    status: "recebido",
    targetServiceIds: ["transferencia"],
    personOrVessel: "Marina Costa (Vendedora)",
    whyNeeded: "Identificação civil do vendedor transmitente cadastrado perante a Capitania dos Portos.",
    outputDocuments: ["Requerimento de Transferência de Propriedade"],
    extractedFields: [
      { id: "nome_vend", label: "Nome Completo", value: "Marina Costa", confidence: 99, page: 1 },
      { id: "cpf_vend", label: "CPF", value: "042.819.330-12", confidence: 99, page: 1 },
      { id: "papel_vend", label: "Papel no Pedido", value: "Vendedora / Atual Proprietária", confidence: 99, page: 1 },
    ]
  },
];

const WORKSPACE_PREVIEW_DOCS = [
  { id: "ws-1", name: "RG e CPF - Marina Costa.pdf", size: "1.2 MB", origin: "Cadastro do Cliente (Marina Costa)", date: "14/09/2026" },
  { id: "ws-2", name: "TIE Mar Azul 381-000123.pdf", size: "2.4 MB", origin: "Cadastro da Embarcação (Mar Azul)", date: "10/09/2026" },
  { id: "ws-3", name: "Nota Fiscal Motor Mercury 300 HP.pdf", size: "850 KB", origin: "Cofre de Documentos da Marina", date: "16/09/2026", targetReqId: "doc-motor" },
  { id: "ws-4", name: "Comprovante de Residência - Marina Costa.pdf", size: "640 KB", origin: "Cadastro do Cliente", date: "12/09/2026" },
];

function PdfBadgeIcon({ className }: { className?: string }) {
  return (
    <div className={cn("h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-red-600 text-white flex flex-col items-center justify-center font-bold shrink-0 shadow-2xs select-none", className)}>
      <span className="text-[9px] font-black tracking-tighter leading-none">PDF</span>
    </div>
  );
}

function NovoPedidoPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/processes/novo-pedido" });
  const { profile } = useAuth();
  const isPreview = (search && search.preview === "true") || (typeof window !== "undefined" && window.location.search.includes("preview=true"));

  // Etapa atual: 1 = Serviços, 2 = Dados, 3 = Documentos, 4 = Revisão e geração
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(() => {
    if (search.step === "2" || (typeof window !== "undefined" && window.location.search.includes("step=2"))) {
      return 2;
    }
    if (search.step === "3" || (typeof window !== "undefined" && window.location.search.includes("step=3"))) {
      return 3;
    }
    if (search.step === "4" || (typeof window !== "undefined" && window.location.search.includes("step=4"))) {
      return 4;
    }
    return 1;
  });

  // Seleção múltipla de serviços (armazena os IDs selecionados)
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(() => {
    if (isPreview) {
      return ["transferencia", "renovacao", "alteracao_motor"];
    }
    // Tenta recuperar do localStorage se existir rascunho anterior
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("navaldocs_pedido_draft_services");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch {
          // ignore
        }
      }
    }
    return [];
  });

  // Busca de serviços
  const [serviceSearchTerm, setServiceSearchTerm] = useState("");
  // Controle para exibir mais serviços do catálogo
  const [showAllServices, setShowAllServices] = useState(false);

  // Lista de clientes e embarcações do workspace
  const [customers, setCustomers] = useState<any[]>(() => isPreview ? PREVIEW_CUSTOMERS : []);
  const [vessels, setVessels] = useState<any[]>(() => isPreview ? PREVIEW_VESSELS : []);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dados do pedido (Etapa 2)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(() => {
    if (search.customerId) return search.customerId;
    if (isPreview) return "prev-c1";
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("navaldocs_pedido_draft_customer");
      if (saved) return saved;
    }
    return "";
  });

  const [selectedVesselId, setSelectedVesselId] = useState<string>(() => {
    if (search.vesselId) return search.vesselId;
    if (isPreview) return "prev-v1";
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("navaldocs_pedido_draft_vessel");
      if (saved) return saved;
    }
    return "";
  });

  const [orderNotes, setOrderNotes] = useState("");

  // Dados específicos de cada serviço
  const [transferData, setTransferData] = useState({
    vendedorId: isPreview ? "prev-c1" : "",
    compradorId: "",
    compradorNome: "",
  });

  const [renovacaoData, setRenovacaoData] = useState({
    tipoDocumento: "TIE (Título de Inscrição de Embarcação)",
    numeroDocumento: isPreview ? "381-000123" : "",
    validadeAtual: isPreview ? "2025-11-20" : "",
  });

  const [motorData, setMotorData] = useState({
    motorAtualPotencia: "250 HP",
    motorAtualMarca: "Mercury Verado",
    motorAtualSerie: isPreview ? "MV-892182" : "",
    novoMotorPotencia: "",
    novoMotorMarca: "",
    novoMotorSerie: "",
    novoMotorCombustivel: "Gasolina",
  });

  // Controle de expansão das seções específicas (Transferência aberta por padrão, como na imagem)
  const [expandedAccordions, setExpandedAccordions] = useState<Record<string, boolean>>({
    transferencia: true,
    renovacao: false,
    alteracao_motor: false,
  });

  const toggleAccordion = (id: string) => {
    setExpandedAccordions(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Modais de cadastro in-context
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [isNewVesselModalOpen, setIsNewVesselModalOpen] = useState(false);
  const [isNewBuyerModalOpen, setIsNewBuyerModalOpen] = useState(false);

  // Estados da Etapa 3: Documentos
  const [requirements, setRequirements] = useState<OrderDocumentRequirement[]>(DEFAULT_ORDER_REQUIREMENTS);
  const [documentFilter, setDocumentFilter] = useState<"todos" | "recebidos" | "falta_enviar" | "conferir">("todos");
  const [showOutputFiles, setShowOutputFiles] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedReviewReq, setSelectedReviewReq] = useState<OrderDocumentRequirement | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedViewReq, setSelectedViewReq] = useState<OrderDocumentRequirement | null>(null);
  const [isRegisteredDocsModalOpen, setIsRegisteredDocsModalOpen] = useState(false);
  const [targetUploadReqId, setTargetUploadReqId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Manipulador de upload de arquivos (simula processamento e extração OCR)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    toast.loading(`Processando e realizando OCR de ${file.name}...`, { id: "upload-ocr" });

    setTimeout(() => {
      setRequirements(prev => {
        // Se houver um requisito alvo explícito
        if (targetUploadReqId) {
          return prev.map(req => {
            if (req.id === targetUploadReqId) {
              return {
                ...req,
                fileName: file.name,
                fileSize: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
                status: "recebido",
              };
            }
            return req;
          });
        }

        // Senão, preenche o primeiro que estiver com "falta_enviar"
        let filled = false;
        return prev.map(req => {
          if (!filled && req.status === "falta_enviar") {
            filled = true;
            return {
              ...req,
              fileName: file.name,
              fileSize: `${(file.size / 1024 / 1024).toFixed(1)} MB`,
              status: "recebido",
            };
          }
          return req;
        });
      });

      toast.success(`Arquivo ${file.name} recebido e conferido com sucesso!`, { id: "upload-ocr" });
      setTargetUploadReqId(null);
      if (e.target) e.target.value = "";
    }, 900);
  };

  // Confirmar dados revisados no modal de conferência
  const handleConfirmExtractedData = (reqId: string, updatedFields: ExtractedFieldItem[]) => {
    setRequirements(prev =>
      prev.map(r => {
        if (r.id === reqId) {
          return {
            ...r,
            status: "recebido",
            extractedFields: updatedFields,
          };
        }
        return r;
      })
    );
    toast.success("Dados conferidos e aprovados para geração dos documentos!");
    setReviewModalOpen(false);
    setSelectedReviewReq(null);
  };

  // Vincular documento do cofre / cadastrado
  const handleLinkRegisteredDoc = (vaultDoc: any) => {
    setRequirements(prev =>
      prev.map(r => {
        if (r.id === "doc-motor" || r.status === "falta_enviar") {
          return {
            ...r,
            fileName: vaultDoc.name,
            fileSize: vaultDoc.size,
            status: "recebido",
          };
        }
        return r;
      })
    );
    toast.success(`Documento "${vaultDoc.name}" vinculado com sucesso aos requisitos do pedido!`);
    setIsRegisteredDocsModalOpen(false);
  };

  // Salva rascunho das seleções no localStorage para evitar perda em navegação acidental
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("navaldocs_pedido_draft_services", JSON.stringify(selectedServiceIds));
      if (selectedCustomerId) localStorage.setItem("navaldocs_pedido_draft_customer", selectedCustomerId);
      if (selectedVesselId) localStorage.setItem("navaldocs_pedido_draft_vessel", selectedVesselId);
    }
  }, [selectedServiceIds, selectedCustomerId, selectedVesselId]);

  // Carrega clientes e embarcações reais da empresa no Supabase
  useEffect(() => {
    if (!profile?.company_id) return;

    const loadWorkspaceEntities = async () => {
      try {
        const [cRes, vRes] = await Promise.all([
          supabase.from("customers").select("id, name, document_number, email, phone").eq("company_id", profile.company_id).order("name"),
          supabase.from("vessels").select("id, name, customer_id, registration_number, tie_number, vessel_type").eq("company_id", profile.company_id).order("name"),
        ]);
        if (cRes.data && cRes.data.length > 0) {
          setCustomers(cRes.data);
        } else if (isPreview) {
          setCustomers(PREVIEW_CUSTOMERS);
        }
        if (vRes.data && vRes.data.length > 0) {
          setVessels(vRes.data);
        } else if (isPreview) {
          setVessels(PREVIEW_VESSELS);
        }
      } catch (err) {
        console.error("Erro ao carregar clientes/embarcações:", err);
      }
    };

    loadWorkspaceEntities();
  }, [profile?.company_id, isPreview]);

  // Lista unificada de clientes
  const allCustomers = useMemo(() => {
    if (customers.length > 0) return customers;
    return isPreview ? PREVIEW_CUSTOMERS : [];
  }, [customers, isPreview]);

  // Lista unificada de embarcações
  const allVessels = useMemo(() => {
    if (vessels.length > 0) return vessels;
    return isPreview ? PREVIEW_VESSELS : [];
  }, [vessels, isPreview]);

  // Filtra embarcações pelo cliente selecionado se aplicável, priorizando as dele
  const filteredVessels = useMemo(() => {
    if (!selectedCustomerId) return allVessels;
    const clientVessels = allVessels.filter(v => v.customer_id === selectedCustomerId);
    return clientVessels.length > 0 ? clientVessels : allVessels;
  }, [allVessels, selectedCustomerId]);

  // Dados da embarcação selecionada
  const currentVessel = useMemo(() => {
    return allVessels.find(v => v.id === selectedVesselId);
  }, [allVessels, selectedVesselId]);

  // Proprietário registrado da embarcação selecionada
  const currentVesselOwnerName = useMemo(() => {
    if (!currentVessel) return "";
    if (currentVessel.customer_name) return currentVessel.customer_name;
    const owner = allCustomers.find(c => c.id === currentVessel.customer_id);
    return owner?.name || "Marina Costa";
  }, [currentVessel, allCustomers]);

  // Nome do cliente e embarcação ativos para exibição no cabeçalho
  const currentCustomerName = useMemo(() => {
    return allCustomers.find(c => c.id === selectedCustomerId)?.name || "Marina Costa";
  }, [allCustomers, selectedCustomerId]);

  const currentVesselName = useMemo(() => {
    return allVessels.find(v => v.id === selectedVesselId)?.name || "Mar Azul";
  }, [allVessels, selectedVesselId]);

  // Contadores de documentos da Etapa 3
  const receivedCount = useMemo(() => requirements.filter(r => r.status === "recebido").length, [requirements]);
  const needsReviewCount = useMemo(() => requirements.filter(r => r.status === "conferir").length, [requirements]);
  const pendingCount = useMemo(() => requirements.filter(r => r.status === "falta_enviar").length, [requirements]);

  const filteredRequirements = useMemo(() => {
    if (documentFilter === "recebidos") return requirements.filter(r => r.status === "recebido");
    if (documentFilter === "conferir") return requirements.filter(r => r.status === "conferir");
    if (documentFilter === "falta_enviar") return requirements.filter(r => r.status === "falta_enviar");
    return requirements;
  }, [requirements, documentFilter]);

  // Sincroniza o vendedor padrão da transferência com o proprietário cadastrado da embarcação
  useEffect(() => {
    if (currentVessel && !transferData.vendedorId) {
      setTransferData(prev => ({
        ...prev,
        vendedorId: currentVessel.customer_id || selectedCustomerId || "prev-c1",
      }));
    }
  }, [currentVessel, selectedCustomerId, transferData.vendedorId]);

  // Serviços selecionados completos
  const selectedServices = useMemo(() => {
    return SERVICES_CATALOG.filter(s => selectedServiceIds.includes(s.id));
  }, [selectedServiceIds]);

  // Total de arquivos previstos a serem gerados no pedido
  const totalOutputFilesCount = useMemo(() => {
    let count = 0;
    selectedServices.forEach(s => {
      if (s.id === "transferencia") count += 2;
      else if (s.id === "renovacao") count += 1;
      else if (s.id === "alteracao_motor") count += 2;
      else count += 1;
    });
    return count || 5;
  }, [selectedServices]);

  // Verifica se algum serviço selecionado exige embarcação
  const requiresVessel = useMemo(() => {
    return selectedServices.some(s => s.requiresVessel);
  }, [selectedServices]);

  // Alterna a seleção de um serviço
  const toggleService = (serviceId: string) => {
    setSelectedServiceIds(prev => {
      if (prev.includes(serviceId)) {
        return prev.filter(id => id !== serviceId);
      }
      return [...prev, serviceId];
    });
  };

  // Remove um serviço pela etiqueta
  const removeService = (serviceId: string) => {
    setSelectedServiceIds(prev => prev.filter(id => id !== serviceId));
  };

  // Lista de serviços visíveis considerando a busca e o botão "Ver todos os serviços"
  const visibleServices = useMemo(() => {
    const term = serviceSearchTerm.trim().toLowerCase();
    let list = SERVICES_CATALOG;

    if (!showAllServices && !term) {
      list = SERVICES_CATALOG.slice(0, 6);
    }

    if (term) {
      list = SERVICES_CATALOG.filter(
        s => s.name.toLowerCase().includes(term) || s.description.toLowerCase().includes(term)
      );
    }

    return list;
  }, [serviceSearchTerm, showAllServices]);

  // Ação "Salvar e sair" da etapa 2
  const handleSaveAndExit = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("navaldocs_pedido_draft_services", JSON.stringify(selectedServiceIds));
      localStorage.setItem("navaldocs_pedido_draft_customer", selectedCustomerId);
      localStorage.setItem("navaldocs_pedido_draft_vessel", selectedVesselId);
    }
    toast.success("Rascunho do pedido salvo com sucesso!");
    navigate({ to: "/processes" });
  };

  // Ação "Continuar para documentos"
  const handleContinueToDocuments = () => {
    if (!selectedCustomerId && allCustomers.length > 0) {
      toast.info("Selecione o cliente do pedido para continuar.");
      return;
    }
    if (requiresVessel && !selectedVesselId && allVessels.length > 0) {
      toast.info("Selecione a embarcação associada para os serviços marítimos.");
      return;
    }
    setCurrentStep(3);
  };

  // Finalizar e criar os processos do pedido (Etapa 4)
  const handleCreateOrderProcesses = async () => {
    if (!profile?.company_id && !isPreview) {
      toast.error("Você precisa estar em um espaço de trabalho ativo.");
      return;
    }

    if (selectedServices.length === 0) {
      toast.error("Selecione pelo menos um serviço.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (profile?.company_id) {
        const inserts = selectedServices.map(service => ({
          company_id: profile.company_id,
          customer_id: selectedCustomerId || null,
          vessel_id: service.requiresVessel ? (selectedVesselId || null) : null,
          title: `${service.name}${selectedVesselId ? ` - ${allVessels.find(v => v.id === selectedVesselId)?.name || ""}` : ""}`,
          process_type: service.id,
          status: "waiting_docs",
          priority: "normal",
          notes: orderNotes || `Pedido com ${selectedServices.length} serviço(s) unificado(s).`,
        }));

        const { error } = await supabase.from("processes").insert(inserts);
        if (error) {
          console.error("Erro ao criar processos do pedido:", error);
          toast.error("Não foi possível criar os processos. Tente novamente.");
          return;
        }
      }

      // Limpa rascunho
      if (typeof window !== "undefined") {
        localStorage.removeItem("navaldocs_pedido_draft_services");
        localStorage.removeItem("navaldocs_pedido_draft_customer");
        localStorage.removeItem("navaldocs_pedido_draft_vessel");
      }

      window.dispatchEvent(new CustomEvent("processes:changed"));
      toast.success(`Pedido com ${selectedServices.length} processo(s) criado com sucesso!`);
      navigate({ to: "/processes" });
    } catch (err) {
      console.error("Exceção na criação do pedido:", err);
      toast.error("Erro inesperado ao registrar pedido.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-300 max-w-5xl mx-auto space-y-6 pb-20">
      {/* 1. CABEÇALHO DA TELA & VOLTAR */}
      <div>
        <Link
          to="/processes"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1868db] hover:underline mb-2 cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Voltar aos processos</span>
        </Link>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0f1d36] tracking-tight">
          Novo pedido
        </h1>
        <p className="text-slate-500 text-sm sm:text-base mt-1 font-normal">
          {currentStep === 1
            ? "Prepare um ou vários serviços de uma só vez."
            : currentStep === 2
            ? "Informe os dados uma vez para os serviços selecionados."
            : currentStep === 3
            ? "Envie uma vez. Reaproveite nos serviços deste pedido."
            : "Confira os detalhes e gere os documentos do pedido."}
        </p>
      </div>

      {/* 2. STEPPER DE ETAPAS */}
      {/* Desktop Stepper */}
      <div className="hidden sm:flex items-center gap-3 py-2 select-none">
        {[
          { num: 1, label: "Serviços" },
          { num: 2, label: "Dados" },
          { num: 3, label: "Documentos" },
          { num: 4, label: "Revisão e geração" },
        ].map((step, idx) => {
          const isActive = currentStep === step.num;
          const isDone = currentStep > step.num;

          return (
            <div key={step.num} className="flex items-center gap-3 flex-1 last:flex-initial">
              <button
                type="button"
                onClick={() => {
                  if (step.num > 1 && selectedServiceIds.length === 0) {
                    toast.info("Selecione pelo menos um serviço para avançar.");
                    return;
                  }
                  setCurrentStep(step.num as any);
                }}
                className={cn(
                  "flex items-center gap-2 text-xs font-semibold transition-colors cursor-pointer",
                  isActive
                    ? "text-[#1868db]"
                    : isDone
                    ? "text-slate-700"
                    : "text-slate-400"
                )}
              >
                <div
                  className={cn(
                    "h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 transition-colors",
                    isActive
                      ? "bg-[#1868db] text-white"
                      : isDone
                      ? "bg-blue-100 text-[#1868db]"
                      : "bg-slate-100 text-slate-400"
                  )}
                >
                  {isDone ? <Check className="h-3.5 w-3.5 stroke-[3]" /> : step.num}
                </div>
                <span className={cn(isActive && "border-b-2 border-[#1868db] pb-0.5 font-bold")}>
                  {step.label}
                </span>
              </button>

              {idx < 3 && (
                <div className="flex-1 h-px bg-slate-200" />
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile Stepper (indicador compacto + barra em 4 segmentos) */}
      <div className="sm:hidden space-y-2 select-none">
        <div className="flex items-center justify-between text-xs font-bold text-[#0f1d36]">
          <span>Etapa {currentStep} de 4 · {
            currentStep === 1 ? "Serviços" :
            currentStep === 2 ? "Dados" :
            currentStep === 3 ? "Documentos" : "Revisão e geração"
          }</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full">
          <div className={cn("rounded-full", currentStep >= 1 ? "bg-[#1868db]" : "bg-slate-200")} />
          <div className={cn("rounded-full", currentStep >= 2 ? "bg-[#1868db]" : "bg-slate-200")} />
          <div className={cn("rounded-full", currentStep >= 3 ? "bg-[#1868db]" : "bg-slate-200")} />
          <div className={cn("rounded-full", currentStep >= 4 ? "bg-[#1868db]" : "bg-slate-200")} />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. CONTEÚDO DA ETAPA 1: SERVIÇOS */}
      {/* ========================================================================= */}
      {currentStep === 1 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-7 shadow-2xs space-y-6">
          {/* Título & Descrição da Seleção */}
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#0f1d36]">
              O que você precisa preparar?
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
              Selecione os serviços para o mesmo cliente e embarcação.
            </p>
          </div>

          {/* Campo de Busca de Serviços */}
          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-[#1868db] transition-colors" />
            <input
              type="text"
              value={serviceSearchTerm}
              onChange={(e) => setServiceSearchTerm(e.target.value)}
              placeholder="Buscar serviço..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200/80 text-xs sm:text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1868db]/20 focus:border-[#1868db] transition-all"
            />
            {serviceSearchTerm && (
              <button
                type="button"
                onClick={() => setServiceSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-full"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Grid de Cartões de Serviço com Checkboxes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {visibleServices.map((service) => {
              const isSelected = selectedServiceIds.includes(service.id);
              const IconComp = service.icon;

              return (
                <div
                  key={service.id}
                  onClick={() => toggleService(service.id)}
                  role="checkbox"
                  aria-checked={isSelected}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === " " || e.key === "Enter") {
                      e.preventDefault();
                      toggleService(service.id);
                    }
                  }}
                  className={cn(
                    "p-4 sm:p-5 rounded-2xl border-2 transition-all flex items-center justify-between gap-3 cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-[#1868db]/30",
                    isSelected
                      ? "border-[#1868db] bg-blue-50/20 shadow-2xs"
                      : "border-slate-200/80 hover:border-slate-300 bg-white"
                  )}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className={cn(
                      "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                      isSelected ? "text-[#1868db] bg-blue-50" : "text-[#0f1d36] bg-slate-50"
                    )}>
                      <IconComp className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                      <h3 className="font-bold text-xs sm:text-sm text-[#0f1d36] leading-snug">
                        {service.name}
                      </h3>
                      <p className="text-[11px] sm:text-xs text-slate-500 line-clamp-1 mt-0.5">
                        {service.description}
                      </p>
                    </div>
                  </div>

                  {/* Checkbox customizado acessível */}
                  <div className="shrink-0 pl-1">
                    <div
                      className={cn(
                        "h-5 w-5 rounded-md flex items-center justify-center transition-all",
                        isSelected
                          ? "bg-[#1868db] border-2 border-[#1868db] text-white"
                          : "border-2 border-slate-300 bg-white"
                      )}
                    >
                      {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Link "Ver todos os serviços" */}
          {!serviceSearchTerm && (
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => setShowAllServices(!showAllServices)}
                className="text-xs font-semibold text-[#1868db] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>{showAllServices ? "Ver menos serviços" : "Ver todos os serviços"}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* RESUMO: Contador Dinâmico + Etiquetas Removíveis */}
          <div className="pt-2 space-y-3">
            <h4 className="font-bold text-xs sm:text-sm text-[#0f1d36]">
              {selectedServiceIds.length === 1
                ? "1 serviço selecionado"
                : `${selectedServiceIds.length} serviços selecionados`}
            </h4>

            {selectedServices.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {selectedServices.map((service) => (
                  <span
                    key={service.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-50 text-[#1868db] border border-blue-100/80 animate-in fade-in-50 duration-150"
                  >
                    <span>{service.shortName}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeService(service.id);
                      }}
                      aria-label={`Remover serviço ${service.name}`}
                      className="h-4 w-4 rounded-full hover:bg-blue-200/60 text-[#1868db] inline-flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 font-medium italic">
                Nenhum serviço selecionado ainda. Marque um ou mais cartões acima.
              </p>
            )}
          </div>

          {/* Bloco Informativo */}
          <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100/70 flex items-start gap-3 text-xs text-slate-700">
            <Info className="h-4 w-4 text-[#1868db] shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-800">
                Preencha os dados uma vez. Os documentos comuns serão reaproveitados.
              </p>
              <p className="text-slate-500 text-[11px] sm:text-xs mt-0.5">
                Ao final, confira e baixe os arquivos por serviço ou em um único ZIP.
              </p>
            </div>
          </div>

          {/* Botões de Ação da Etapa 1 */}
          <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate({ to: "/processes" })}
              className="w-full sm:w-auto h-11 px-6 rounded-xl border-slate-200 text-slate-700 font-semibold text-xs sm:text-sm hover:bg-slate-50 cursor-pointer"
            >
              Cancelar
            </Button>

            <Button
              type="button"
              disabled={selectedServiceIds.length === 0}
              onClick={() => setCurrentStep(2)}
              className={cn(
                "w-full sm:w-auto h-11 px-7 rounded-xl font-semibold text-xs sm:text-sm shadow-sm transition-all",
                selectedServiceIds.length > 0
                  ? "bg-[#1868db] hover:bg-[#1456b8] text-white cursor-pointer"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              )}
            >
              <span>
                {selectedServiceIds.length === 0
                  ? "Selecione pelo menos um serviço"
                  : selectedServiceIds.length === 1
                  ? "Continuar com 1 serviço →"
                  : `Continuar com ${selectedServiceIds.length} serviços →`}
              </span>
            </Button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. CONTEÚDO DA ETAPA 2: DADOS (REFERÊNCIA VISUAL COMPLETA) */}
      {/* ========================================================================= */}
      {currentStep === 2 && (
        <div className="space-y-4">
          {/* BARRA DE RESUMO COM SERVIÇOS SELECIONADOS + "Editar serviços" */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-bold text-xs sm:text-sm text-[#0f1d36] shrink-0">
                {selectedServices.length} {selectedServices.length === 1 ? "serviço neste pedido" : "serviços neste pedido"}
              </span>

              <div className="flex items-center gap-2 flex-wrap">
                {selectedServices.map(s => (
                  <span
                    key={s.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-[#1868db] border border-blue-100/80 animate-in fade-in duration-150"
                  >
                    <span>{s.shortName}</span>
                    <button
                      type="button"
                      onClick={() => removeService(s.id)}
                      aria-label={`Remover ${s.name}`}
                      className="hover:text-red-500 transition-colors cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1868db] hover:underline cursor-pointer self-start sm:self-auto shrink-0"
            >
              <Pencil className="h-3.5 w-3.5" />
              <span>Editar serviços</span>
            </button>
          </div>

          {/* CARD 1: CLIENTE E EMBARCAÇÃO */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-7 shadow-2xs space-y-6">
            <h2 className="text-base sm:text-lg font-bold text-[#0f1d36]">
              Cliente e embarcação
            </h2>

            {/* Campo: Cliente do pedido */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">
                  Cliente do pedido
                </label>
                {/* Mobile "+ Novo cliente" link */}
                <button
                  type="button"
                  onClick={() => setIsNewCustomerModalOpen(true)}
                  className="sm:hidden text-xs font-bold text-[#1868db] hover:underline cursor-pointer"
                >
                  + Novo cliente
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full pl-10 pr-10 py-3 bg-white border border-slate-200/80 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1868db]/20 focus:border-[#1868db] transition-all appearance-none cursor-pointer"
                  >
                    <option value="">Selecione o cliente...</option>
                    {allCustomers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.document_number ? `· ${c.document_number}` : ""}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                </div>

                {/* Desktop "+ Novo cliente" button */}
                <button
                  type="button"
                  onClick={() => setIsNewCustomerModalOpen(true)}
                  className="hidden sm:inline-flex items-center justify-center h-11 px-4 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold shrink-0 cursor-pointer shadow-2xs transition-colors"
                >
                  + Novo cliente
                </button>
              </div>

              <p className="text-[11px] sm:text-xs text-slate-500 flex items-center gap-1.5 pt-0.5">
                <Info className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span>Dados do cadastro serão reaproveitados.</span>
              </p>
            </div>

            {/* Campo: Embarcação (quando serviços exigirem) */}
            {requiresVessel && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">
                    Embarcação
                  </label>
                  {/* Mobile "+ Nova embarcação" link */}
                  <button
                    type="button"
                    onClick={() => setIsNewVesselModalOpen(true)}
                    className="sm:hidden text-xs font-bold text-[#1868db] hover:underline cursor-pointer"
                  >
                    + Nova embarcação
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <Ship className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <select
                      value={selectedVesselId}
                      onChange={(e) => setSelectedVesselId(e.target.value)}
                      className="w-full pl-10 pr-10 py-3 bg-white border border-slate-200/80 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1868db]/20 focus:border-[#1868db] transition-all appearance-none cursor-pointer"
                    >
                      <option value="">Selecione a embarcação...</option>
                      {filteredVessels.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.name} {v.vessel_type ? `· ${v.vessel_type}` : ""} {v.registration_number ? `(${v.registration_number})` : ""}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>

                  {/* Desktop "+ Nova embarcação" button */}
                  <button
                    type="button"
                    onClick={() => setIsNewVesselModalOpen(true)}
                    className="hidden sm:inline-flex items-center justify-center h-11 px-4 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold shrink-0 cursor-pointer shadow-2xs transition-colors"
                  >
                    + Nova embarcação
                  </button>
                </div>

                {/* Sub-barra: Proprietária cadastrada */}
                {selectedVesselId && (
                  <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-slate-50/70 border border-slate-100 text-xs">
                    <div className="flex items-center gap-2 text-slate-700 min-w-0">
                      <Ship className="h-4 w-4 text-slate-400 shrink-0" />
                      <span className="truncate">
                        Proprietária cadastrada: <strong className="text-[#0f1d36]">{currentVesselOwnerName}</strong>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => toast.info(`Cadastro da embarcação: proprietária registrada como ${currentVesselOwnerName}.`)}
                      className="text-xs font-bold text-[#1868db] hover:underline shrink-0 ml-2 cursor-pointer"
                    >
                      Conferir cadastro →
                    </button>
                  </div>
                )}

                <p className="text-[11px] sm:text-xs text-slate-500 flex items-center gap-1.5 pt-0.5">
                  <Info className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span>O cliente do pedido pode ser diferente do proprietário.</span>
                </p>
              </div>
            )}
          </div>

          {/* CARD 2: DADOS ESPECÍFICOS DOS SERVIÇOS */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-7 shadow-2xs space-y-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#0f1d36]">
                Dados específicos dos serviços
              </h2>
              <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
                Complete apenas o que muda neste pedido.
              </p>
            </div>

            <div className="space-y-3 pt-1">
              {/* 1. SEÇÃO: Transferência de propriedade */}
              {selectedServiceIds.includes("transferencia") && (
                <div className="rounded-2xl border border-slate-200/80 overflow-hidden bg-white transition-all shadow-2xs">
                  <button
                    type="button"
                    onClick={() => toggleAccordion("transferencia")}
                    className="w-full p-4 sm:p-4.5 flex items-center justify-between hover:bg-slate-50/60 text-left transition-colors cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3">
                      <ArrowLeftRight className="h-4 w-4 text-slate-700" />
                      <h3 className="text-xs sm:text-sm font-bold text-[#0f1d36]">
                        Transferência de propriedade
                      </h3>
                    </div>
                    {expandedAccordions.transferencia ? (
                      <ChevronUp className="h-4 w-4 text-slate-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-500" />
                    )}
                  </button>

                  {expandedAccordions.transferencia && (
                    <div className="p-4 sm:p-5 pt-0 border-t border-slate-100 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3.5">
                        {/* Proprietário atual / vendedor */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-700">
                            Proprietário atual / vendedor
                          </label>
                          <div className="relative">
                            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <select
                              value={transferData.vendedorId}
                              onChange={(e) => setTransferData(prev => ({ ...prev, vendedorId: e.target.value }))}
                              className="w-full pl-10 pr-9 py-2.5 bg-white border border-slate-200/80 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1868db]/20 appearance-none cursor-pointer"
                            >
                              <option value="">Selecione vendedor...</option>
                              {allCustomers.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                          </div>
                        </div>

                        {/* Novo proprietário / comprador */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-bold text-slate-700">
                              Novo proprietário / comprador
                            </label>
                            <button
                              type="button"
                              onClick={() => setIsNewBuyerModalOpen(true)}
                              className="sm:hidden text-[11px] font-bold text-[#1868db] hover:underline cursor-pointer"
                            >
                              + Cadastrar pessoa
                            </button>
                          </div>

                          <div className="flex items-center gap-2.5">
                            <div className="relative flex-1">
                              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                              <select
                                value={transferData.compradorId}
                                onChange={(e) => setTransferData(prev => ({ ...prev, compradorId: e.target.value }))}
                                className="w-full pl-10 pr-9 py-2.5 bg-white border border-slate-200/80 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1868db]/20 appearance-none cursor-pointer"
                              >
                                <option value="">Selecionar pessoa ou empresa</option>
                                {allCustomers.map(c => (
                                  <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                              </select>
                              <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                            </div>

                            <button
                              type="button"
                              onClick={() => setIsNewBuyerModalOpen(true)}
                              className="hidden sm:inline-flex text-xs font-bold text-[#1868db] hover:underline shrink-0 whitespace-nowrap cursor-pointer"
                            >
                              + Cadastrar pessoa
                            </button>
                          </div>
                        </div>
                      </div>

                      <p className="text-[11px] sm:text-xs text-slate-500 flex items-center gap-1.5">
                        <Info className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>O cadastro de propriedade só será atualizado no momento adequado do processo.</span>
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* 2. SEÇÃO: Renovação de documento */}
              {selectedServiceIds.includes("renovacao") && (
                <div className="rounded-2xl border border-slate-200/80 overflow-hidden bg-white transition-all shadow-2xs">
                  <button
                    type="button"
                    onClick={() => toggleAccordion("renovacao")}
                    className="w-full p-4 sm:p-4.5 flex items-center justify-between hover:bg-slate-50/60 text-left transition-colors cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-slate-700" />
                      <div>
                        <h3 className="text-xs sm:text-sm font-bold text-[#0f1d36]">
                          Renovação de documento
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {renovacaoData.tipoDocumento || "Selecionar documento"}
                        </p>
                      </div>
                    </div>
                    {expandedAccordions.renovacao ? (
                      <ChevronUp className="h-4 w-4 text-slate-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-500" />
                    )}
                  </button>

                  {expandedAccordions.renovacao && (
                    <div className="p-4 sm:p-5 pt-0 border-t border-slate-100 space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3.5">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-700">Documento a renovar</label>
                          <select
                            value={renovacaoData.tipoDocumento}
                            onChange={(e) => setRenovacaoData(prev => ({ ...prev, tipoDocumento: e.target.value }))}
                            className="w-full px-3 py-2.5 bg-white border border-slate-200/80 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1868db]/20"
                          >
                            <option value="TIE (Título de Inscrição de Embarcação)">TIE (Título de Inscrição)</option>
                            <option value="TIEM (Título de Inscrição de Embarcação Miúda)">TIEM (Miúda)</option>
                            <option value="CHA (Habilitação Náutica)">CHA (Habilitação Náutica)</option>
                            <option value="Procuração da Capitania">Procuração da Capitania</option>
                          </select>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-700">Número do documento</label>
                          <input
                            type="text"
                            value={renovacaoData.numeroDocumento}
                            onChange={(e) => setRenovacaoData(prev => ({ ...prev, numeroDocumento: e.target.value }))}
                            placeholder="Ex: 381-000123"
                            className="w-full px-3 py-2.5 bg-white border border-slate-200/80 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1868db]/20"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-700">Validade anterior</label>
                          <input
                            type="date"
                            value={renovacaoData.validadeAtual}
                            onChange={(e) => setRenovacaoData(prev => ({ ...prev, validadeAtual: e.target.value }))}
                            className="w-full px-3 py-2.5 bg-white border border-slate-200/80 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1868db]/20"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 3. SEÇÃO: Alteração de motor */}
              {selectedServiceIds.includes("alteracao_motor") && (
                <div className="rounded-2xl border border-slate-200/80 overflow-hidden bg-white transition-all shadow-2xs">
                  <button
                    type="button"
                    onClick={() => toggleAccordion("alteracao_motor")}
                    className="w-full p-4 sm:p-4.5 flex items-center justify-between hover:bg-slate-50/60 text-left transition-colors cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3">
                      <Wrench className="h-4 w-4 text-slate-700" />
                      <div>
                        <h3 className="text-xs sm:text-sm font-bold text-[#0f1d36]">
                          Alteração de motor
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {motorData.novoMotorMarca ? `${motorData.novoMotorMarca} ${motorData.novoMotorPotencia}` : "Informar dados do motor"}
                        </p>
                      </div>
                    </div>
                    {expandedAccordions.alteracao_motor ? (
                      <ChevronUp className="h-4 w-4 text-slate-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-500" />
                    )}
                  </button>

                  {expandedAccordions.alteracao_motor && (
                    <div className="p-4 sm:p-5 pt-0 border-t border-slate-100 space-y-4">
                      <div className="pt-3.5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Motor atual */}
                        <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/70 space-y-2">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                            Motor atual cadastrado
                          </span>
                          <div className="text-xs font-bold text-[#0f1d36]">
                            {motorData.motorAtualMarca} ({motorData.motorAtualPotencia})
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            Série: {motorData.motorAtualSerie || "MV-892182"}
                          </div>
                        </div>

                        {/* Novo motor */}
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-slate-700">Nova Potência (HP)</label>
                              <input
                                type="text"
                                value={motorData.novoMotorPotencia}
                                onChange={(e) => setMotorData(prev => ({ ...prev, novoMotorPotencia: e.target.value }))}
                                placeholder="Ex: 300 HP"
                                className="w-full px-3 py-2 bg-white border border-slate-200/80 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#1868db]/20"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-slate-700">Nova Marca/Modelo</label>
                              <input
                                type="text"
                                value={motorData.novoMotorMarca}
                                onChange={(e) => setMotorData(prev => ({ ...prev, novoMotorMarca: e.target.value }))}
                                placeholder="Ex: Yamaha V8"
                                className="w-full px-3 py-2 bg-white border border-slate-200/80 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#1868db]/20"
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-700">Nº de Série / Nota Fiscal</label>
                            <input
                              type="text"
                              value={motorData.novoMotorSerie}
                              onChange={(e) => setMotorData(prev => ({ ...prev, novoMotorSerie: e.target.value }))}
                              placeholder="Ex: NF-e 001.234 / Série 987654"
                              className="w-full px-3 py-2 bg-white border border-slate-200/80 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#1868db]/20"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Informational Banner */}
            <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-100/70 flex items-center gap-2.5 text-xs text-slate-700">
              <Info className="h-4 w-4 text-[#1868db] shrink-0" />
              <span>Você pode completar as informações e conferir tudo na revisão.</span>
            </div>
          </div>

          {/* BOTÕES DE AÇÃO DA ETAPA 2 */}
          {/* Desktop Footer */}
          <div className="hidden sm:flex items-center justify-between pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCurrentStep(1)}
              className="h-11 px-6 rounded-xl border-slate-200 text-slate-700 font-semibold text-xs sm:text-sm hover:bg-slate-50 cursor-pointer"
            >
              Voltar
            </Button>

            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleSaveAndExit}
                className="h-11 px-6 rounded-xl border-slate-200 text-slate-700 font-semibold text-xs sm:text-sm hover:bg-slate-50 cursor-pointer"
              >
                Salvar e sair
              </Button>

              <Button
                type="button"
                onClick={handleContinueToDocuments}
                className="h-11 px-7 rounded-xl bg-[#1868db] hover:bg-[#1456b8] text-white font-semibold text-xs sm:text-sm shadow-sm cursor-pointer"
              >
                Continuar para documentos →
              </Button>
            </div>
          </div>

          {/* Mobile Footer */}
          <div className="sm:hidden space-y-3 pt-2">
            <div className="text-center">
              <button
                type="button"
                onClick={handleSaveAndExit}
                className="text-xs font-bold text-[#1868db] hover:underline cursor-pointer"
              >
                Salvar e sair
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep(1)}
                className="h-11 rounded-xl border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 cursor-pointer"
              >
                Voltar
              </Button>

              <Button
                type="button"
                onClick={handleContinueToDocuments}
                className="h-11 rounded-xl bg-[#1868db] hover:bg-[#1456b8] text-white font-semibold text-xs shadow-sm cursor-pointer"
              >
                Continuar →
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. CONTEÚDO DA ETAPA 3: DOCUMENTOS (CENTRAL INTELIGENTE DE PREPARAÇÃO) */}
      {/* ========================================================================= */}
      {currentStep === 3 && (
        <div className="space-y-4">
          {/* SUB-CABEÇALHO DE CONTEXTO: CLIENTE · EMBARCAÇÃO | SERVIÇOS DO PEDIDO */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 text-xs font-semibold text-slate-700 py-0.5">
            <div className="flex items-center gap-2 text-[#0f1d36]">
              <User className="h-4 w-4 text-[#1868db] shrink-0" />
              <span>{currentCustomerName} · {currentVesselName}</span>
            </div>

            <span className="hidden sm:inline text-slate-300 font-light">|</span>

            <div className="flex items-center gap-2 text-slate-600">
              <Layers className="h-4 w-4 text-[#1868db] shrink-0" />
              <span>
                {selectedServices.length === 1
                  ? "1 serviço: "
                  : `${selectedServices.length} serviços: `}
                {selectedServices.map(s => s.shortName).join(", ").replace(/, ([^,]*)$/, " e $1")}
              </span>
            </div>
          </div>

          {/* CARD PRINCIPAL: DOCUMENTOS DO PEDIDO */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-7 shadow-2xs space-y-5">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#0f1d36]">
                Documentos do pedido
              </h2>
              <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
                A lista se adapta aos serviços selecionados.
              </p>
            </div>

            {/* ÁREA DE ENVIO: DROPZONE DESKTOP & BOTÕES MOBILE */}
            {/* Desktop Dropzone (área pontilhada) */}
            <div className="hidden sm:flex border-2 border-dashed border-slate-200/90 hover:border-[#1868db]/40 rounded-2xl p-6 flex-col items-center justify-center text-center bg-slate-50/30 hover:bg-blue-50/20 transition-all">
              <div className="h-11 w-11 rounded-xl bg-blue-50 text-[#1868db] flex items-center justify-center mb-2.5 shadow-2xs">
                <Upload className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-sm text-[#0f1d36]">
                Arraste os arquivos aqui
              </h3>
              <p className="text-xs text-slate-500 mt-0.5 mb-4">
                ou selecione no seu computador
              </p>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  onClick={() => {
                    setTargetUploadReqId(null);
                    fileInputRef.current?.click();
                  }}
                  className="h-10 px-5 rounded-xl bg-[#1868db] hover:bg-[#1456b8] text-white font-semibold text-xs shadow-sm cursor-pointer"
                >
                  Selecionar arquivos
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsRegisteredDocsModalOpen(true)}
                  className="h-10 px-5 rounded-xl border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 cursor-pointer inline-flex items-center gap-2"
                >
                  <FileText className="h-4 w-4 text-slate-500" />
                  <span>Usar documentos cadastrados</span>
                </Button>
              </div>
              <p className="text-[11px] text-slate-500 mt-3 inline-flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-[#1868db]" />
                <span>Confira os dados extraídos antes de continuar.</span>
              </p>
            </div>

            {/* Mobile Dropzone (botões empilhados de largura total) */}
            <div className="sm:hidden space-y-2.5">
              <Button
                type="button"
                onClick={() => {
                  setTargetUploadReqId(null);
                  fileInputRef.current?.click();
                }}
                className="w-full h-11 rounded-xl bg-[#1868db] hover:bg-[#1456b8] text-white font-semibold text-xs shadow-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <Upload className="h-4 w-4" />
                <span>Enviar arquivos</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => setIsRegisteredDocsModalOpen(true)}
                className="w-full h-11 rounded-xl border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                <FileText className="h-4 w-4 text-slate-500" />
                <span>Usar documentos cadastrados</span>
              </Button>

              <p className="text-[11px] text-slate-500 text-center flex items-center justify-center gap-1.5 pt-0.5">
                <Info className="h-3.5 w-3.5 text-[#1868db] shrink-0" />
                <span>Confira os dados extraídos antes de continuar.</span>
              </p>
            </div>

            {/* Input oculto de upload de arquivos */}
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              multiple
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={handleFileUpload}
            />

            {/* SEÇÃO EXPANSÍVEL: O QUE SERÁ GERADO */}
            <div className="border border-slate-200/80 rounded-xl overflow-hidden bg-slate-50/40">
              <button
                type="button"
                onClick={() => setShowOutputFiles(!showOutputFiles)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-100/60 transition-colors cursor-pointer text-left select-none"
              >
                <div className="flex items-center gap-2.5">
                  <FileSpreadsheet className="h-4 w-4 text-[#1868db]" />
                  <span className="font-bold text-xs sm:text-sm text-[#0f1d36]">
                    O que será gerado neste pedido ({totalOutputFilesCount} arquivos previstos)
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[#1868db] font-semibold">
                  <span>{showOutputFiles ? "Ocultar" : "Ver arquivos"}</span>
                  {showOutputFiles ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </button>

              {showOutputFiles && (
                <div className="p-4 pt-2 border-t border-slate-200/80 space-y-3 bg-white text-xs animate-in fade-in-50 duration-150">
                  <p className="text-[11px] text-slate-500">
                    Com base nos serviços selecionados e dados confirmados, os seguintes documentos oficiais serão montados para protocolo:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {selectedServices.map((service) => (
                      <div key={service.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5">
                        <h5 className="font-bold text-xs text-[#0f1d36] flex items-center gap-1.5">
                          <service.icon className="h-3.5 w-3.5 text-[#1868db]" />
                          <span>{service.shortName}</span>
                        </h5>
                        <ul className="text-[11px] text-slate-600 space-y-1 pl-1">
                          {service.id === "transferencia" && (
                            <>
                              <li>• Requerimento de Transferência</li>
                              <li>• Termo de Entrega e Responsabilidade</li>
                            </>
                          )}
                          {service.id === "renovacao" && (
                            <>
                              <li>• Requerimento de Renovação TIE/TIEM</li>
                            </>
                          )}
                          {service.id === "alteracao_motor" && (
                            <>
                              <li>• Requerimento de Alteração de Dados</li>
                              <li>• Termo de Responsabilidade Técnica</li>
                            </>
                          )}
                          {!["transferencia", "renovacao", "alteracao_motor"].includes(service.id) && (
                            <li>• Requerimento Padronizado Capitania</li>
                          )}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ABAS DE FILTRO (DESKTOP) E RESUMO TEXTUAL (MOBILE) */}
            {/* Desktop Filter Pills */}
            <div className="hidden sm:flex items-center gap-2 pt-1 select-none">
              <button
                type="button"
                onClick={() => setDocumentFilter("todos")}
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all inline-flex items-center gap-1.5 cursor-pointer",
                  documentFilter === "todos"
                    ? "bg-[#1868db] text-white shadow-xs"
                    : "bg-slate-100 hover:bg-slate-200/70 text-slate-600"
                )}
              >
                <span>Todos</span>
                <span className={cn(
                  "h-4 min-w-[16px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center",
                  documentFilter === "todos" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                )}>
                  {requirements.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setDocumentFilter("recebidos")}
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all inline-flex items-center gap-1.5 cursor-pointer",
                  documentFilter === "recebidos"
                    ? "bg-[#1868db] text-white shadow-xs"
                    : "bg-slate-100 hover:bg-slate-200/70 text-slate-600"
                )}
              >
                <span>Recebidos</span>
                <span className={cn(
                  "h-4 min-w-[16px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center",
                  documentFilter === "recebidos" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                )}>
                  {receivedCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setDocumentFilter("falta_enviar")}
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all inline-flex items-center gap-1.5 cursor-pointer",
                  documentFilter === "falta_enviar"
                    ? "bg-[#1868db] text-white shadow-xs"
                    : "bg-slate-100 hover:bg-slate-200/70 text-slate-600"
                )}
              >
                <span>Falta enviar</span>
                <span className={cn(
                  "h-4 min-w-[16px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center",
                  documentFilter === "falta_enviar" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                )}>
                  {pendingCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setDocumentFilter("conferir")}
                className={cn(
                  "px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all inline-flex items-center gap-1.5 cursor-pointer",
                  documentFilter === "conferir"
                    ? "bg-[#1868db] text-white shadow-xs"
                    : "bg-slate-100 hover:bg-slate-200/70 text-slate-600"
                )}
              >
                <span>Conferir</span>
                <span className={cn(
                  "h-4 min-w-[16px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center",
                  documentFilter === "conferir" ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                )}>
                  {needsReviewCount}
                </span>
              </button>
            </div>

            {/* Mobile Summary Line */}
            <div className="sm:hidden pt-1 text-xs font-semibold text-slate-700 select-none">
              <span>{receivedCount} recebidos · {needsReviewCount} para conferir · {pendingCount} pendente</span>
            </div>

            {/* TABELA DE REQUISITOS (DESKTOP) */}
            <div className="hidden sm:block overflow-x-auto -mx-5 sm:mx-0">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400">
                    <th className="py-2.5 px-3 font-semibold">Documento</th>
                    <th className="py-2.5 px-3 font-semibold">Arquivo</th>
                    <th className="py-2.5 px-3 font-semibold">Usado em</th>
                    <th className="py-2.5 px-3 font-semibold">Status</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRequirements.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/40 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-3">
                          <PdfBadgeIcon />
                          <div>
                            <span className="font-bold text-xs sm:text-sm text-[#0f1d36] block">{req.name}</span>
                            <span className="text-[11px] text-slate-400 block">{req.personOrVessel}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className={cn("text-xs font-medium", req.fileName ? "text-slate-600" : "text-slate-400")}>
                          {req.fileName || "—"}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="text-xs text-slate-600 font-medium">{req.usedInLabel}</span>
                      </td>
                      <td className="py-3 px-3">
                        {req.status === "recebido" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                            <span>Recebido</span>
                          </span>
                        )}
                        {req.status === "conferir" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/80">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                            <span>Conferir dados</span>
                          </span>
                        )}
                        {req.status === "falta_enviar" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-orange-50 text-orange-700 border border-orange-200/80">
                            <Clock className="h-3.5 w-3.5 text-orange-600" />
                            <span>Falta enviar</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {req.status === "recebido" && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setSelectedViewReq(req);
                              setViewModalOpen(true);
                            }}
                            className="h-8 px-3 rounded-lg border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5 text-slate-500" />
                            <span>Visualizar</span>
                          </Button>
                        )}
                        {req.status === "conferir" && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setSelectedReviewReq(req);
                              setReviewModalOpen(true);
                            }}
                            className="h-8 px-4 rounded-lg border-slate-200 hover:bg-slate-50 text-slate-800 text-xs font-semibold cursor-pointer shadow-2xs"
                          >
                            Conferir
                          </Button>
                        )}
                        {req.status === "falta_enviar" && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setTargetUploadReqId(req.id);
                              fileInputRef.current?.click();
                            }}
                            className="h-8 px-4 rounded-lg border-slate-200 hover:bg-slate-50 text-slate-800 text-xs font-semibold cursor-pointer shadow-2xs"
                          >
                            Enviar
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* LISTA DE CARTÕES (MOBILE) */}
            <div className="sm:hidden space-y-3">
              {filteredRequirements.map((req) => (
                <div key={req.id} className="p-3.5 rounded-xl border border-slate-200/90 bg-white flex items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-start gap-3 min-w-0">
                    <PdfBadgeIcon className="h-7 w-7 mt-0.5" />
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs text-[#0f1d36] truncate">{req.name}</h4>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">{req.fileName || "—"}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{req.usedInLabel}</p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {req.status === "recebido" && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                        <Check className="h-3 w-3 text-emerald-600" />
                        <span>Recebido</span>
                      </span>
                    )}
                    {req.status === "conferir" && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/80">
                        <AlertTriangle className="h-3 w-3 text-amber-600" />
                        <span>Conferir dados</span>
                      </span>
                    )}
                    {req.status === "falta_enviar" && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-50 text-orange-700 border border-orange-200/80">
                        <Clock className="h-3 w-3 text-orange-600" />
                        <span>Falta enviar</span>
                      </span>
                    )}

                    {req.status === "recebido" && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedViewReq(req);
                          setViewModalOpen(true);
                        }}
                        className="h-7 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-[11px] font-semibold cursor-pointer"
                      >
                        Visualizar
                      </button>
                    )}
                    {req.status === "conferir" && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedReviewReq(req);
                          setReviewModalOpen(true);
                        }}
                        className="h-7 px-3.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-800 text-[11px] font-semibold cursor-pointer shadow-2xs"
                      >
                        Conferir
                      </button>
                    )}
                    {req.status === "falta_enviar" && (
                      <button
                        type="button"
                        onClick={() => {
                          setTargetUploadReqId(req.id);
                          fileInputRef.current?.click();
                        }}
                        className="h-7 px-3.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-800 text-[11px] font-semibold cursor-pointer shadow-2xs"
                      >
                        Enviar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* NOTA DE RODAPÉ DA TABELA */}
            <p className="text-[11px] text-slate-400 font-normal select-none">
              Lista ilustrativa; requisitos variam conforme o serviço.
            </p>

            {/* BANNER DE ALERTA: ARQUIVO PRECISA DE CONFERÊNCIA */}
            {needsReviewCount > 0 ? (
              <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100 flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-blue-100 text-[#1868db] flex items-center justify-center shrink-0 mt-0.5 font-bold text-xs">
                  ⓘ
                </div>
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-[#0f1d36]">
                    {needsReviewCount === 1 ? "1 arquivo precisa de conferência" : `${needsReviewCount} arquivos precisam de conferência`}
                  </h4>
                  <p className="text-slate-500 text-[11px] sm:text-xs mt-0.5">
                    Abra o documento e confirme as informações identificadas.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100 flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-emerald-900">
                    Todos os arquivos recebidos foram conferidos
                  </h4>
                  <p className="text-emerald-700/80 text-[11px] sm:text-xs mt-0.5">
                    Os dados foram validados e estão prontos para a geração dos documentos oficiais.
                  </p>
                </div>
              </div>
            )}

            {/* BOTÕES DE NAVEGAÇÃO DO RODAPÉ (DESKTOP) */}
            <div className="pt-2 hidden sm:flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep(2)}
                className="h-11 px-6 rounded-xl border-slate-200 text-slate-700 font-semibold text-xs sm:text-sm hover:bg-slate-50 cursor-pointer"
              >
                Voltar
              </Button>

              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSaveAndExit}
                  className="h-11 px-6 rounded-xl border-slate-200 text-slate-700 font-semibold text-xs sm:text-sm hover:bg-slate-50 cursor-pointer"
                >
                  Salvar e sair
                </Button>

                <Button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="h-11 px-7 rounded-xl bg-[#1868db] hover:bg-[#1456b8] text-white font-semibold text-xs sm:text-sm cursor-pointer shadow-sm"
                >
                  Continuar para revisão →
                </Button>
              </div>
            </div>
            <p className="hidden sm:flex text-[11px] text-slate-400 items-center gap-1.5 pt-0.5">
              <Info className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span>Você pode continuar e revisar as pendências antes de gerar.</span>
            </p>

            {/* BOTÕES DE NAVEGAÇÃO DO RODAPÉ (MOBILE) */}
            <div className="sm:hidden space-y-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleSaveAndExit}
                className="w-full h-11 rounded-xl border-slate-200 text-slate-700 font-semibold text-xs cursor-pointer"
              >
                Salvar e sair
              </Button>

              <div className="grid grid-cols-2 gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep(2)}
                  className="w-full h-11 rounded-xl border-slate-200 text-slate-700 font-semibold text-xs cursor-pointer"
                >
                  Voltar
                </Button>

                <Button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="w-full h-11 rounded-xl bg-[#1868db] hover:bg-[#1456b8] text-white font-semibold text-xs cursor-pointer shadow-sm"
                >
                  Revisar →
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. CONTEÚDO DA ETAPA 4: REVISÃO E GERAÇÃO */}
      {/* ========================================================================= */}
      {currentStep === 4 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-7 shadow-2xs space-y-6">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#0f1d36]">
              Revisão e confirmação do pedido
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
              Confira os serviços a serem criados. Cada processo terá controle, prazo e histórico independentes.
            </p>
          </div>

          {/* Resumo dos Serviços do Pedido */}
          <div className="space-y-3">
            {selectedServices.map((serv) => (
              <div key={serv.id} className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/40 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-blue-50 text-[#1868db] flex items-center justify-center shrink-0">
                    <serv.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-[#0f1d36]">{serv.name}</h4>
                    <span className="text-[11px] text-slate-500">
                      {serv.requiresVessel ? "Vinculado à embarcação" : "Serviço pessoal"}
                    </span>
                  </div>
                </div>

                <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
                  Pronto para gerar
                </Badge>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
            <p className="font-semibold text-[#0f1d36]">
              Cliente: {allCustomers.find(c => c.id === selectedCustomerId)?.name || "Não informado"}
            </p>
            {requiresVessel && (
              <p>
                Embarcação: {allVessels.find(v => v.id === selectedVesselId)?.name || "Não informada"}
              </p>
            )}
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCurrentStep(3)}
              className="w-full sm:w-auto h-11 px-6 rounded-xl border-slate-200 text-slate-700 font-semibold text-xs sm:text-sm cursor-pointer"
            >
              ← Voltar aos documentos
            </Button>

            <Button
              type="button"
              disabled={isSubmitting}
              onClick={handleCreateOrderProcesses}
              className="w-full sm:w-auto h-11 px-8 rounded-xl bg-[#1868db] hover:bg-[#1456b8] text-white font-semibold text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Criando processos...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Confirmar e criar {selectedServices.length} processos</span>
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. MODAIS DE CADASTRO NO CONTEXTO DA TELA */}
      {/* ========================================================================= */}
      {/* Modal: Novo Cliente */}
      <ModalNovoCliente
        isOpen={isNewCustomerModalOpen}
        onClose={() => setIsNewCustomerModalOpen(false)}
        companyId={profile?.company_id}
        onSuccess={(newCustomer) => {
          setCustomers(prev => [newCustomer, ...prev]);
          setSelectedCustomerId(newCustomer.id);
          setIsNewCustomerModalOpen(false);
          toast.success(`Cliente ${newCustomer.name} adicionado e selecionado!`);
        }}
      />

      {/* Modal: Nova Embarcação */}
      <ModalNovaEmbarcacao
        isOpen={isNewVesselModalOpen}
        onClose={() => setIsNewVesselModalOpen(false)}
        companyId={profile?.company_id}
        currentCustomerId={selectedCustomerId}
        onSuccess={(newVessel) => {
          setVessels(prev => [newVessel, ...prev]);
          setSelectedVesselId(newVessel.id);
          setIsNewVesselModalOpen(false);
          toast.success(`Embarcação ${newVessel.name} cadastrada e associada!`);
        }}
      />

      {/* Modal: Cadastrar Comprador / Pessoa */}
      <ModalNovoCliente
        isOpen={isNewBuyerModalOpen}
        onClose={() => setIsNewBuyerModalOpen(false)}
        companyId={profile?.company_id}
        title="Cadastrar Novo Comprador"
        onSuccess={(newPerson) => {
          setCustomers(prev => [newPerson, ...prev]);
          setTransferData(prev => ({ ...prev, compradorId: newPerson.id, compradorNome: newPerson.name }));
          setIsNewBuyerModalOpen(false);
          toast.success(`Comprador ${newPerson.name} registrado para o pedido!`);
        }}
      />

      {/* Modal da Etapa 3: Conferência de Dados Extraídos (OCR / Validação) */}
      <ModalConferenciaDocumento
        isOpen={reviewModalOpen}
        onClose={() => {
          setReviewModalOpen(false);
          setSelectedReviewReq(null);
        }}
        requirement={selectedReviewReq}
        onConfirm={handleConfirmExtractedData}
      />

      {/* Modal da Etapa 3: Visualizar Documento */}
      <ModalVisualizarDocumento
        isOpen={viewModalOpen}
        onClose={() => {
          setViewModalOpen(false);
          setSelectedViewReq(null);
        }}
        requirement={selectedViewReq}
      />

      {/* Modal da Etapa 3: Usar Documentos Cadastrados */}
      <ModalDocumentosCadastrados
        isOpen={isRegisteredDocsModalOpen}
        onClose={() => setIsRegisteredDocsModalOpen(false)}
        onSelectDoc={handleLinkRegisteredDoc}
      />
    </div>
  );
}

// ----------------------------------------------------------------------
// SUB-MODAIS DA ETAPA 3: CONFERÊNCIA, VISUALIZAÇÃO E DOCUMENTOS CADASTRADOS
// ----------------------------------------------------------------------
function ModalConferenciaDocumento({
  isOpen,
  onClose,
  requirement,
  onConfirm,
}: {
  isOpen: boolean;
  onClose: () => void;
  requirement: OrderDocumentRequirement | null;
  onConfirm: (reqId: string, updatedFields: ExtractedFieldItem[]) => void;
}) {
  const [fields, setFields] = useState<ExtractedFieldItem[]>([]);
  const [activeTabMobile, setActiveTabMobile] = useState<"documento" | "dados">("dados");

  useEffect(() => {
    if (requirement?.extractedFields) {
      setFields(requirement.extractedFields);
    } else if (requirement) {
      setFields([
        { id: "nome", label: "Nome Identificado", value: "Carlos Eduardo Ramos", confidence: 98, page: 1, isCritical: true },
        { id: "doc", label: "Documento (CPF)", value: "192.834.721-09", confidence: 99, page: 1, isCritical: true },
        { id: "rg", label: "RG", value: "24.512.980-X SSP/SP", confidence: 95, page: 1 },
        { id: "papel", label: "Papel no Pedido", value: "Comprador / Novo Adquirente", confidence: 99, page: 1, isCritical: true },
      ]);
    }
  }, [requirement]);

  if (!requirement) return null;

  const handleFieldChange = (id: string, newVal: string) => {
    setFields(prev => prev.map(f => f.id === id ? { ...f, value: newVal } : f));
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-4xl w-[95vw] max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl">
        <DialogHeader className="p-4 sm:p-5 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <DialogTitle className="text-base sm:text-lg font-bold text-[#0f1d36]">
                Conferência de dados extraídos
              </DialogTitle>
              <Badge className="bg-blue-50 text-[#1868db] border-blue-100 text-[10px]">
                OCR 98% de precisão
              </Badge>
            </div>
            <DialogDescription className="text-xs text-slate-500 mt-0.5">
              {requirement.name} · {requirement.fileName || "documento.pdf"}
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* Mobile Switch Tabs */}
        <div className="sm:hidden flex border-b border-slate-200 bg-slate-50 px-4 pt-2">
          <button
            type="button"
            onClick={() => setActiveTabMobile("dados")}
            className={cn(
              "flex-1 py-2 text-xs font-bold border-b-2 text-center transition-colors cursor-pointer",
              activeTabMobile === "dados" ? "border-[#1868db] text-[#1868db]" : "border-transparent text-slate-500"
            )}
          >
            Dados extraídos ({fields.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTabMobile("documento")}
            className={cn(
              "flex-1 py-2 text-xs font-bold border-b-2 text-center transition-colors cursor-pointer",
              activeTabMobile === "documento" ? "border-[#1868db] text-[#1868db]" : "border-transparent text-slate-500"
            )}
          >
            Visualizar documento
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Coluna 1: Prévia do Documento com marcação de evidência */}
            <div className={cn("space-y-3", activeTabMobile === "dados" ? "hidden md:block" : "block")}>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="font-semibold text-slate-700">Evidência no documento</span>
                <span>Página 1 de 1</span>
              </div>
              <div className="relative rounded-xl border border-slate-200 bg-slate-100/70 p-4 min-h-[320px] flex flex-col items-center justify-center text-center shadow-inner">
                {/* Mock da CNH / Documento Escaneado */}
                <div className="w-full max-w-[280px] bg-white rounded-lg border border-slate-300 p-4 shadow-sm text-left space-y-2.5">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                    <span className="text-[9px] font-black text-slate-700 tracking-wider uppercase">REPÚBLICA FEDERATIVA DO BRASIL</span>
                    <span className="text-[8px] bg-emerald-100 text-emerald-800 px-1 rounded font-bold">VÁLIDO</span>
                  </div>
                  
                  {/* Destaque Bounding Box */}
                  <div className="p-2 rounded border-2 border-[#1868db] bg-blue-50/40 relative">
                    <div className="absolute -top-2 right-2 px-1 rounded bg-[#1868db] text-[8px] font-bold text-white">
                      OCR DETECTADO
                    </div>
                    <div className="space-y-1">
                      <div>
                        <span className="text-[8px] text-slate-400 block uppercase">Nome</span>
                        <span className="text-[10px] font-bold text-slate-800">CARLOS EDUARDO RAMOS</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 pt-0.5">
                        <div>
                          <span className="text-[8px] text-slate-400 block uppercase">CPF</span>
                          <span className="text-[9px] font-bold text-slate-800">192.834.721-09</span>
                        </div>
                        <div>
                          <span className="text-[8px] text-slate-400 block uppercase">RG</span>
                          <span className="text-[9px] font-bold text-slate-800">24.512.980-X SSP/SP</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-[8px] text-slate-400 pt-1 border-t border-slate-100 flex items-center justify-between">
                    <span>Emissão: 12/04/2022</span>
                    <span>Documento verificado</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 mt-3">
                  Documento digitalizado com nitidez adequada (300 DPI).
                </p>
              </div>
            </div>

            {/* Coluna 2: Formulário de Conferência dos Campos */}
            <div className={cn("space-y-4", activeTabMobile === "documento" ? "hidden md:block" : "block")}>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">Campos identificados</span>
                <span className="text-emerald-600 font-semibold text-[11px] flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Alta confiança
                </span>
              </div>

              <div className="space-y-3">
                {fields.map((field) => (
                  <div key={field.id} className="space-y-1 bg-slate-50/70 p-3 rounded-xl border border-slate-200/80">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700">
                        {field.label}
                      </label>
                      <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                        {field.confidence}% precisão
                      </span>
                    </div>
                    <Input
                      value={field.value}
                      onChange={(e) => handleFieldChange(field.id, e.target.value)}
                      className="bg-white text-xs h-9 font-medium"
                    />
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 flex items-start gap-2.5 text-xs text-slate-600">
                <Info className="h-4 w-4 text-[#1868db] shrink-0 mt-0.5" />
                <span>
                  Confira se os dados coincidem com a via original. Ao confirmar, estes valores serão inseridos nos formulários oficiais da Capitania.
                </span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/40 flex flex-col-reverse sm:flex-row items-center justify-between gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="w-full sm:w-auto h-10 px-5 rounded-xl border-slate-200 text-slate-700 font-semibold text-xs cursor-pointer"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            onClick={() => onConfirm(requirement.id, fields)}
            className="w-full sm:w-auto h-10 px-6 rounded-xl bg-[#1868db] hover:bg-[#1456b8] text-white font-semibold text-xs shadow-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>Confirmar dados conferidos</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ModalVisualizarDocumento({
  isOpen,
  onClose,
  requirement,
}: {
  isOpen: boolean;
  onClose: () => void;
  requirement: OrderDocumentRequirement | null;
}) {
  if (!requirement) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-xl w-[95vw] rounded-2xl p-0 overflow-hidden">
        <DialogHeader className="p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <PdfBadgeIcon className="h-9 w-9" />
            <div>
              <DialogTitle className="text-base font-bold text-[#0f1d36]">
                {requirement.name}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                {requirement.fileName || "documento.pdf"} · {requirement.fileSize || "1.8 MB"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-5 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <div>
              <span className="text-slate-400 block text-[11px]">Vínculo</span>
              <span className="font-bold text-slate-800">{requirement.personOrVessel}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Utilização</span>
              <span className="font-bold text-slate-800">{requirement.usedInLabel}</span>
            </div>
            <div className="col-span-2 pt-2 border-t border-slate-200">
              <span className="text-slate-400 block text-[11px]">Por que é necessário?</span>
              <span className="text-slate-600 mt-0.5 block">{requirement.whyNeeded}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="font-bold text-slate-700">Documentos de saída atendidos por este arquivo:</span>
            <ul className="space-y-1 pl-1 text-slate-600">
              {requirement.outputDocuments.map((doc, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-[#1868db]" />
                  <span>{doc}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Arquivo íntegro e validado pelo sistema de armazenamento privado.</span>
          </div>
        </div>

        <DialogFooter className="p-4 border-t border-slate-100 bg-slate-50/50">
          <Button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto h-10 px-6 rounded-xl bg-[#1868db] text-white font-semibold text-xs cursor-pointer"
          >
            Fechar visualização
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ModalDocumentosCadastrados({
  isOpen,
  onClose,
  onSelectDoc,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelectDoc: (doc: any) => void;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-xl w-[95vw] rounded-2xl p-0 overflow-hidden">
        <DialogHeader className="p-5 border-b border-slate-100">
          <DialogTitle className="text-base sm:text-lg font-bold text-[#0f1d36] flex items-center gap-2">
            <FolderOpen className="h-5 w-5 text-[#1868db]" />
            <span>Documentos cadastrados no espaço</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 mt-0.5">
            Selecione um arquivo já existente nos cadastros de clientes ou embarcações para reaproveitar.
          </DialogDescription>
        </DialogHeader>

        <div className="p-5 space-y-3 max-h-[60vh] overflow-y-auto">
          {WORKSPACE_PREVIEW_DOCS.map((doc) => (
            <div
              key={doc.id}
              className="p-3.5 rounded-xl border border-slate-200 hover:border-[#1868db]/40 bg-white hover:bg-blue-50/20 transition-all flex items-center justify-between gap-3 shadow-2xs"
            >
              <div className="flex items-center gap-3 min-w-0">
                <PdfBadgeIcon className="h-8 w-8" />
                <div className="min-w-0">
                  <h4 className="font-bold text-xs sm:text-sm text-[#0f1d36] truncate">{doc.name}</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">{doc.origin} · {doc.size}</p>
                </div>
              </div>

              <Button
                type="button"
                onClick={() => onSelectDoc(doc)}
                className="h-8 px-3 rounded-lg bg-[#1868db] hover:bg-[#1456b8] text-white font-semibold text-xs shrink-0 cursor-pointer shadow-2xs"
              >
                Vincular
              </Button>
            </div>
          ))}
        </div>

        <DialogFooter className="p-4 border-t border-slate-100 bg-slate-50/50">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="w-full sm:w-auto h-10 px-6 rounded-xl border-slate-200 text-slate-700 font-semibold text-xs cursor-pointer"
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ----------------------------------------------------------------------
// SUB-MODAIS INTERNOS PARA CADASTRO IN-CONTEXT
// ----------------------------------------------------------------------
function ModalNovoCliente({
  isOpen,
  onClose,
  companyId,
  title = "Cadastrar Novo Cliente",
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  companyId?: string;
  title?: string;
  onSuccess: (customer: any) => void;
}) {
  const [name, setName] = useState("");
  const [doc, setDoc] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [type, setType] = useState<"PF" | "PJ">("PF");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Informe o nome do cliente.");
      return;
    }

    setIsLoading(true);
    try {
      const newCustomerObj = {
        id: `c_${Date.now()}`,
        name: name.trim(),
        document_number: doc.trim(),
        email: email.trim(),
        phone: phone.trim(),
        type,
      };

      if (companyId) {
        const { data, error } = await supabase.from("customers").insert({
          company_id: companyId,
          name: name.trim(),
          document_number: doc.trim() || null,
          email: email.trim() || null,
          phone: phone.trim() || null,
        }).select().single();

        if (error) {
          console.error("Erro ao inserir cliente:", error);
          toast.error("Erro ao salvar cliente no banco.");
          setIsLoading(false);
          return;
        }
        if (data) {
          onSuccess(data);
          return;
        }
      }

      onSuccess(newCustomerObj);
    } catch (err) {
      console.error(err);
      toast.error("Erro inesperado ao salvar cliente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md p-6 bg-white rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-[#0f1d36]">
            {title}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Cadastre a pessoa ou empresa para utilização neste pedido.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Tipo PF / PJ */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setType("PF")}
              className={cn(
                "flex-1 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer",
                type === "PF"
                  ? "border-[#1868db] bg-blue-50/50 text-[#1868db]"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              )}
            >
              Pessoa Física (CPF)
            </button>
            <button
              type="button"
              onClick={() => setType("PJ")}
              className={cn(
                "flex-1 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer",
                type === "PJ"
                  ? "border-[#1868db] bg-blue-50/50 text-[#1868db]"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              )}
            >
              Pessoa Jurídica (CNPJ)
            </button>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">
              {type === "PF" ? "Nome Completo *" : "Razão Social *"}
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={type === "PF" ? "Ex: Marina Costa" : "Ex: Náutica Sul LTDA"}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#1868db]/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">
                {type === "PF" ? "CPF" : "CNPJ"}
              </label>
              <input
                type="text"
                value={doc}
                onChange={(e) => setDoc(e.target.value)}
                placeholder={type === "PF" ? "000.000.000-00" : "00.000.000/0000-00"}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#1868db]/20"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Telefone / WhatsApp</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(00) 00000-0000"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#1868db]/20"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="cliente@email.com"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#1868db]/20"
            />
          </div>

          <DialogFooter className="pt-2 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="rounded-xl border-slate-200 text-xs cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-[#1868db] hover:bg-[#1456b8] text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              {isLoading ? "Salvando..." : "Salvar e Vincular"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ModalNovaEmbarcacao({
  isOpen,
  onClose,
  companyId,
  currentCustomerId,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  companyId?: string;
  currentCustomerId?: string;
  onSuccess: (vessel: any) => void;
}) {
  const [name, setName] = useState("");
  const [vesselType, setVesselType] = useState("Lancha");
  const [regNumber, setRegNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Informe o nome da embarcação.");
      return;
    }

    setIsLoading(true);
    try {
      const newVesselObj = {
        id: `v_${Date.now()}`,
        name: name.trim(),
        vessel_type: vesselType,
        registration_number: regNumber.trim() || "381-P99999",
        customer_id: currentCustomerId || null,
      };

      if (companyId) {
        const { data, error } = await supabase.from("vessels").insert({
          company_id: companyId,
          name: name.trim(),
          vessel_type: vesselType,
          registration_number: regNumber.trim() || null,
          customer_id: currentCustomerId || null,
        }).select().single();

        if (error) {
          console.error("Erro ao inserir embarcação:", error);
          toast.error("Erro ao salvar embarcação no banco.");
          setIsLoading(false);
          return;
        }
        if (data) {
          onSuccess(data);
          return;
        }
      }

      onSuccess(newVesselObj);
    } catch (err) {
      console.error(err);
      toast.error("Erro inesperado ao salvar embarcação.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md p-6 bg-white rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-[#0f1d36]">
            Cadastrar Embarcação
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Adicione uma nova embarcação associada ao cliente do pedido.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Nome da Embarcação *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Mar Azul"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#1868db]/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Tipo de Embarcação</label>
              <select
                value={vesselType}
                onChange={(e) => setVesselType(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#1868db]/20"
              >
                <option value="Lancha">Lancha</option>
                <option value="Veleiro">Veleiro</option>
                <option value="Moto Aquática">Moto Aquática (Jet Ski)</option>
                <option value="Iate">Iate</option>
                <option value="Bote / Inflável">Bote / Inflável</option>
                <option value="Barco de Pesca">Barco de Pesca</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Nº de Inscrição / TIE</label>
              <input
                type="text"
                value={regNumber}
                onChange={(e) => setRegNumber(e.target.value)}
                placeholder="Ex: 381-000123"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#1868db]/20"
              />
            </div>
          </div>

          <DialogFooter className="pt-2 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="rounded-xl border-slate-200 text-xs cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-[#1868db] hover:bg-[#1456b8] text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              {isLoading ? "Salvando..." : "Salvar Embarcação"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
