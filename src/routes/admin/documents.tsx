import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { OfficialDocumentPreviewModal, type OfficialPreviewDocInfo } from "@/components/admin/OfficialDocumentPreviewModal";
import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  FileText, Search, List, Filter, Eye, Download, 
  Signature, ExternalLink, MoreVertical, LayoutGrid,
  FileDown, ArrowRight, Loader2, Calendar, User, Ship,
  Wrench, Zap, Compass, Anchor, AlertTriangle, CheckCircle2,
  Plus, Edit3, Trash2, Clock, Phone, Mail, RotateCcw,
  ShieldCheck, Calculator, RefreshCw, Send, Check, Save
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Serviços auxiliares de engenharia e admin
import {
  getCapitanias,
  saveCapitanias,
  addCapitania,
  updateCapitania,
  deleteCapitania,
  resetCapitaniasToDefaults,
  CapitaniaOM,
} from "@/services/admin/capitaniasService";
import {
  getExigencias,
  saveExigencias,
  addExigencia,
  updateExigencia,
  deleteExigencia,
  getDiasRestantes,
  ExigenciaMarinha,
  StatusExigencia,
} from "@/services/admin/exigenciasService";
import {
  validateHullHinCode,
  calculateArqueacaoSimplificada,
  calculateSalvatagemRequerida,
  HinValidationResult,
  ArqueacaoCalculada,
  SalvatagemCalculada,
} from "@/services/admin/navalEngineeringService";
import {
  getDocumentOverrideById,
  saveDocumentOverride,
  regenerateOverriddenPdf,
  triggerPdfDownload,
  DocumentManualOverride,
} from "@/services/admin/documentOverrideService";
import { 
  getCustomizedOutputDocsCatalog, 
  saveCustomizedOutputDocsCatalog, 
  resetOutputDocsCatalogToDefaults 
} from "@/services/documents/adminRequirementsStorage";
import { OutputDocumentConfig, OutputDocRequirementItem } from "@/routes/processes.novo-pedido";
import { buildBrandedDocumentPdf } from "@/services/brandedPdfBuilder";

export const Route = createFileRoute("/admin/documents")({
  component: DocumentVault,
  head: () => ({
    meta: [
      { title: "Central de Documentos & Engenharia Naval | NavalDocs Pro" },
      { name: "description", content: "Cofre, reparo manual de documentos, emissão avulsa e ferramentas de engenharia náutica." },
    ],
  }),
});

interface DocumentWithRelations {
  id: string;
  name: string;
  status: string;
  created_at: string;
  process_id: string | null;
  customer_id: string | null;
  processes: {
    id: string;
    title: string;
    vessels: {
      id: string;
      name: string;
    } | null;
  } | null;
  profiles: {
    id: string;
    full_name: string | null;
  } | null;
}

function DocumentVault() {
  const [activeTab, setActiveTab] = useState("vault");

  // Estado do Cofre de Documentos
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");

  // Modal de Reparo Técnico Manual ("Caneta Vermelha")
  const [repairModalOpen, setRepairModalOpen] = useState(false);
  const [selectedDocForRepair, setSelectedDocForRepair] = useState<DocumentWithRelations | null>(null);
  const [repairCustomerName, setRepairCustomerName] = useState("");
  const [repairCustomerDoc, setRepairCustomerDoc] = useState("");
  const [repairVesselName, setRepairVesselName] = useState("");
  const [repairVesselInscricao, setRepairVesselInscricao] = useState("");
  const [repairVesselLength, setRepairVesselLength] = useState("");
  const [repairVesselBeam, setRepairVesselBeam] = useState("");
  const [repairVesselDepth, setRepairVesselDepth] = useState("");
  const [repairEngineDetails, setRepairEngineDetails] = useState("");
  const [repairCustomText, setRepairCustomText] = useState("");
  const [repairEngineerName, setRepairEngineerName] = useState("Eng. Naval Douglas Faresi");
  const [repairEngineerCrea, setRepairEngineerCrea] = useState("CREA-SP 50698124");
  const [repairReason, setRepairReason] = useState("Correção cadastral e conformidade com vistoria da Capitania");
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Estado da Emissão Expressa Avulsa
  const [quickDocId, setQuickDocId] = useState("doc_procuracao");
  const [quickClientName, setQuickClientName] = useState("Carlos Eduardo Ramos");
  const [quickClientDoc, setQuickClientDoc] = useState("123.456.789-00");
  const [quickClientAddress, setQuickClientAddress] = useState("Avenida Beira Mar, 1500, Santos/SP");
  const [quickVesselName, setQuickVesselName] = useState("MAR AZUL IV");
  const [quickVesselInscricao, setQuickVesselInscricao] = useState("381-098231-9");
  const [quickVesselLength, setQuickVesselLength] = useState("12.50 m");
  const [quickVesselEngine, setQuickVesselEngine] = useState("Volvo Penta D6 400HP");
  const [isGeneratingQuick, setIsGeneratingQuick] = useState(false);

  // Estado de Capitanias (OMs)
  const [capitanias, setCapitanias] = useState<CapitaniaOM[]>([]);
  const [capitaniaSearch, setCapitaniaSearch] = useState("");
  const [capitaniaModalOpen, setCapitaniaModalOpen] = useState(false);
  const [editingCapitania, setEditingCapitania] = useState<CapitaniaOM | null>(null);
  const [capFormNome, setCapFormNome] = useState("");
  const [capFormSigla, setCapFormSigla] = useState("");
  const [capFormCidade, setCapFormCidade] = useState("");
  const [capFormUf, setCapFormUf] = useState("SP");
  const [capFormEndereco, setCapFormEndereco] = useState("");
  const [capFormTelefones, setCapFormTelefones] = useState("");
  const [capFormEmailProtocolo, setCapFormEmailProtocolo] = useState("");
  const [capFormPeculiaridades, setCapFormPeculiaridades] = useState("");

  // Estado das Exigências da Capitania
  const [exigencias, setExigencias] = useState<ExigenciaMarinha[]>([]);
  const [exigenciaModalOpen, setExigenciaModalOpen] = useState(false);
  const [exigFormCodigo, setExigFormCodigo] = useState("NAV-2026-");
  const [exigFormCliente, setExigFormCliente] = useState("");
  const [exigFormTelefone, setExigFormTelefone] = useState("");
  const [exigFormEmbarcacao, setExigFormEmbarcacao] = useState("");
  const [exigFormCapitania, setExigFormCapitania] = useState("CPSP - Santos");
  const [exigFormMotivo, setExigFormMotivo] = useState("");
  const [exigFormPrazoDias, setExigFormPrazoDias] = useState(30);

  // Estado da Ferramenta de Engenharia Naval
  const [hinInput, setHinInput] = useState("BR-ABC12345D424");
  const [hinResult, setHinResult] = useState<HinValidationResult | null>(null);

  const [arqComprimento, setArqComprimento] = useState(12.8);
  const [arqBoca, setArqBoca] = useState(3.65);
  const [arqPontal, setArqPontal] = useState(1.85);
  const [arqResult, setArqResult] = useState<ArqueacaoCalculada | null>(null);

  const [salvTripulantes, setSalvTripulantes] = useState(1);
  const [salvPassageiros, setSalvPassageiros] = useState(11);
  const [salvArea, setSalvArea] = useState<"interior" | "costeira" | "oceanica">("costeira");
  const [salvResult, setSalvResult] = useState<SalvatagemCalculada | null>(null);

  // Catálogo dinâmico de documentos oficiais e requisitos
  const [docsCatalog, setDocsCatalog] = useState<OutputDocumentConfig[]>([]);
  const [reqSearch, setReqSearch] = useState("");
  const [reqSelectedService, setReqSelectedService] = useState<string>("all");

  // Modais de Requisitos de Anexos
  const [isReqModalOpen, setIsReqModalOpen] = useState(false);
  const [reqModalMode, setReqModalMode] = useState<"add" | "edit">("add");
  const [selectedDocIdForReq, setSelectedDocIdForReq] = useState<string | null>(null);
  const [editingReqId, setEditingReqId] = useState<string | null>(null);
  const [reqName, setReqName] = useState("");
  const [reqWhy, setReqWhy] = useState("");
  const [reqIsProtocolOnly, setReqIsProtocolOnly] = useState(false);

  // Estado do Visualizador Oficial de Folha A4
  const [previewDocInfo, setPreviewDocInfo] = useState<OfficialPreviewDocInfo | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  const handlePreviewDoc = (doc: OutputDocumentConfig) => {
    setPreviewDocInfo({
      id: doc.id,
      name: doc.name,
      serviceName: doc.serviceName,
      officialSource: doc.officialSource,
      documentType: doc.documentType,
      signersRole: doc.signerRole || "Proprietário / Requerente Legal",
      legalPurpose: doc.purpose,
      templates: [
        {
          name: doc.name,
          templateCode: `DPC_${doc.id.toUpperCase()}`,
          status: "ready",
        },
      ],
    });
    setIsPreviewModalOpen(true);
  };

  const handlePreviewIssuedDoc = (doc: DocumentWithRelations) => {
    setPreviewDocInfo({
      id: doc.id,
      name: doc.name,
      serviceName: doc.processes?.title || "Processo Náutico",
      officialSource: "NORMAM-211/DPC",
      documentType: "official_form",
      signersRole: "Proprietário / Requerente Legal",
      legalPurpose: `Homologação pericial do documento ${doc.name}`,
      templates: [
        {
          name: doc.name,
          templateCode: `EMITIDO_${doc.id.substring(0, 8)}`,
          status: "ready",
        },
      ],
    });
    setIsPreviewModalOpen(true);
  };

  // Modal Novo Documento no Catálogo Geral
  const [isNewDocModalOpen, setIsNewDocModalOpen] = useState(false);
  const [newDocName, setNewDocName] = useState("");
  const [newDocServiceId, setNewDocServiceId] = useState("inscricao");
  const [newDocOfficialSource, setNewDocOfficialSource] = useState("");
  const [newDocPurpose, setNewDocPurpose] = useState("");
  const [newDocSignerRole, setNewDocSignerRole] = useState("Proprietário Requerente");

  // Modal Editar Documento Existente
  const [isEditDocModalOpen, setIsEditDocModalOpen] = useState(false);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editDocName, setEditDocName] = useState("");
  const [editDocServiceId, setEditDocServiceId] = useState("inscricao");
  const [editDocOfficialSource, setEditDocOfficialSource] = useState("");
  const [editDocPurpose, setEditDocPurpose] = useState("");
  const [editDocSignerRole, setEditDocSignerRole] = useState("Proprietário Requerente");

  // Carregar dados no mount
  useEffect(() => {
    setDocsCatalog(getCustomizedOutputDocsCatalog());
    setCapitanias(getCapitanias());
    setExigencias(getExigencias());
    setHinResult(validateHullHinCode(hinInput));
    setArqResult(calculateArqueacaoSimplificada(arqComprimento, arqBoca, arqPontal));
    setSalvResult(calculateSalvatagemRequerida(salvTripulantes, salvPassageiros, salvArea, arqComprimento));
  }, []);

  // Query dos documentos do banco
  const { data: documents = [], isLoading, refetch: refetchDocuments } = useQuery({
    queryKey: ["document-vault"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("generated_documents")
        .select(`
          id,
          name,
          status,
          created_at,
          process_id,
          customer_id,
          processes (
            id,
            title,
            vessels (
              id,
              name
            )
          ),
          profiles:customer_id (
            id,
            full_name
          )
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("Erro ao buscar generated_documents do Supabase, usando lista local:", error.message);
        return [];
      }
      return (data as unknown) as DocumentWithRelations[];
    },
  });

  // Filtragem de documentos
  const filteredDocs = useMemo(() => {
    return (documents || []).filter((doc: DocumentWithRelations) => {
      const matchesSearch = 
        doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doc.profiles?.full_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doc.processes?.title || "").toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || doc.status === statusFilter;
      const matchesClient = clientFilter === "all" || doc.profiles?.id === clientFilter;

      return matchesSearch && matchesStatus && matchesClient;
    });
  }, [documents, searchTerm, statusFilter, clientFilter]);

  const uniqueClients = useMemo(() => {
    return documents 
      ? Array.from(new Set(documents.map(d => d.profiles?.id).filter(Boolean))).map(id => {
          return documents.find(d => d.profiles?.id === id)?.profiles;
        }).filter(Boolean)
      : [];
  }, [documents]);

  // ==========================================
  // ==========================================
  // HANDLERS: REQUISITOS E ANEXOS POR DOCUMENTO
  // ==========================================
  const handleOpenAddRequirement = (docId: string) => {
    setSelectedDocIdForReq(docId);
    setReqModalMode("add");
    setEditingReqId(null);
    setReqName("");
    setReqWhy("");
    setReqIsProtocolOnly(false);
    setIsReqModalOpen(true);
  };

  const handleOpenEditRequirement = (docId: string, req: OutputDocRequirementItem) => {
    setSelectedDocIdForReq(docId);
    setReqModalMode("edit");
    setEditingReqId(req.id);
    setReqName(req.name);
    setReqWhy(req.why || "");
    setReqIsProtocolOnly(!!req.isProtocolOnly);
    setIsReqModalOpen(true);
  };

  const handleSaveRequirement = () => {
    if (!reqName.trim()) {
      toast.error("Informe o nome do documento/anexo necessário.");
      return;
    }
    if (!selectedDocIdForReq) return;

    let updatedCatalog: OutputDocumentConfig[];

    if (reqModalMode === "add") {
      const newReq: OutputDocRequirementItem = {
        id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: reqName.trim(),
        why: reqWhy.trim() || "Exigência regulamentar perante a Capitania dos Portos",
        isProtocolOnly: reqIsProtocolOnly,
      };

      updatedCatalog = docsCatalog.map((doc) => {
        if (doc.id === selectedDocIdForReq) {
          return {
            ...doc,
            attachments: [...doc.attachments, newReq],
          };
        }
        return doc;
      });
      toast.success("Documento necessário adicionado com sucesso!");
    } else {
      updatedCatalog = docsCatalog.map((doc) => {
        if (doc.id === selectedDocIdForReq) {
          return {
            ...doc,
            attachments: doc.attachments.map((a) => {
              if (a.id === editingReqId) {
                return {
                  ...a,
                  name: reqName.trim(),
                  why: reqWhy.trim() || a.why,
                  isProtocolOnly: reqIsProtocolOnly,
                };
              }
              return a;
            }),
          };
        }
        return doc;
      });
      toast.success("Requisito de anexo atualizado!");
    }

    setDocsCatalog(updatedCatalog);
    saveCustomizedOutputDocsCatalog(updatedCatalog);
    setIsReqModalOpen(false);
  };

  const handleDeleteRequirement = (docId: string, reqId: string) => {
    if (!confirm("Tem certeza que deseja excluir este documento necessário do catálogo?")) return;

    const updatedCatalog = docsCatalog.map((doc) => {
      if (doc.id === docId) {
        return {
          ...doc,
          attachments: doc.attachments.filter((a) => a.id !== reqId),
        };
      }
      return doc;
    });

    setDocsCatalog(updatedCatalog);
    saveCustomizedOutputDocsCatalog(updatedCatalog);
    toast.success("Documento necessário removido com sucesso!");
  };

  const handleSaveNewOutputDoc = () => {
    if (!newDocName.trim()) {
      toast.error("Informe o nome do documento oficial.");
      return;
    }

    const serviceLabels: Record<string, string> = {
      inscricao: "Inscrição de embarcação",
      transferencia: "Transferência de propriedade",
      renovacao: "Renovação de documento",
      segunda_via: "Segunda via de documento",
      vistoria: "Vistoria",
      laudo_engenharia: "Laudo técnico pericial",
      alteracao_cadastral: "Alteração Cadastral",
      despacho_porto: "Despacho de Saída / Entrada",
    };

    const newDoc: OutputDocumentConfig = {
      id: `doc_custom_${Date.now()}`,
      name: newDocName.trim(),
      serviceId: newDocServiceId,
      serviceName: serviceLabels[newDocServiceId] || "Serviço Náutico Especial",
      documentType: "official_form",
      officialSource: newDocOfficialSource.trim() || "NORMAM-211/DPC (Diretoria de Portos e Costas)",
      sourceUrl: "https://www.marinha.mil.br/dpc/normam-211",
      editionDate: `Portaria DPC/MB ${new Date().getFullYear()}`,
      purpose: newDocPurpose.trim() || "Formalização perante a Autoridade Marítima.",
      signerRole: newDocSignerRole.trim() || "Proprietário Requerente",
      personalDataFields: [{ name: "Qualificação do Titular", found: true }],
      vesselDataFields: [{ name: "Dados da Embarcação", found: true }],
      attachments: [],
    };

    const updated = [...docsCatalog, newDoc];
    setDocsCatalog(updated);
    saveCustomizedOutputDocsCatalog(updated);
    setIsNewDocModalOpen(false);
    setNewDocName("");
    setNewDocOfficialSource("");
    setNewDocPurpose("");
    toast.success(`Documento oficial "${newDoc.name}" cadastrado no catálogo!`);
  };

  const handleResetCatalogToDefaults = () => {
    if (!confirm("Deseja restaurar todos os documentos e requisitos para o padrão oficial da Marinha do Brasil? Quaisquer alterações locais serão substituídas.")) return;
    const def = resetOutputDocsCatalogToDefaults();
    setDocsCatalog(def);
    toast.success("Catálogo restaurado para os padrões oficiais da NORMAM-211/DPC!");
  };

  const handleOpenEditDoc = (doc: OutputDocumentConfig) => {
    setEditingDocId(doc.id);
    setEditDocName(doc.name);
    setEditDocServiceId(doc.serviceId);
    setEditDocOfficialSource(doc.officialSource);
    setEditDocPurpose(doc.purpose);
    setEditDocSignerRole(doc.signerRole || "Proprietário Requerente");
    setIsEditDocModalOpen(true);
  };

  const handleSaveEditDoc = () => {
    if (!editingDocId || !editDocName.trim()) {
      toast.error("O nome do documento é obrigatório.");
      return;
    }

    const serviceLabels: Record<string, string> = {
      inscricao: "Inscrição de embarcação",
      transferencia: "Transferência de propriedade",
      renovacao: "Renovação de documento",
      segunda_via: "Segunda via de documento",
      vistoria: "Vistoria",
      laudo_engenharia: "Laudo técnico pericial",
      alteracao_cadastral: "Alteração Cadastral",
      despacho_porto: "Despacho de Saída / Entrada",
      habilitacao_cha: "Habilitação náutica (CHA)",
    };

    const updatedCatalog = docsCatalog.map((doc) => {
      if (doc.id === editingDocId) {
        return {
          ...doc,
          name: editDocName.trim(),
          serviceId: editDocServiceId,
          serviceName: serviceLabels[editDocServiceId] || doc.serviceName,
          officialSource: editDocOfficialSource.trim() || doc.officialSource,
          purpose: editDocPurpose.trim() || doc.purpose,
          signerRole: editDocSignerRole.trim() || doc.signerRole,
        };
      }
      return doc;
    });

    setDocsCatalog(updatedCatalog);
    saveCustomizedOutputDocsCatalog(updatedCatalog);
    setIsEditDocModalOpen(false);
    toast.success(`Documento "${editDocName.trim()}" atualizado com sucesso!`);
  };

  const handleDeleteDoc = (docId: string, docName: string) => {
    if (!confirm(`Tem certeza que deseja excluir o documento "${docName}" do catálogo? Esta ação removerá o documento dos fluxos de geração.`)) {
      return;
    }

    const updatedCatalog = docsCatalog.filter((doc) => doc.id !== docId);
    setDocsCatalog(updatedCatalog);
    saveCustomizedOutputDocsCatalog(updatedCatalog);
    toast.success(`Documento "${docName}" excluído do catálogo.`);
  };

  // OPERAÇÕES DE REPARO MANUAL
  // ==========================================
  const handleOpenRepairModal = (doc: DocumentWithRelations) => {
    setSelectedDocForRepair(doc);
    const existingOverride = getDocumentOverrideById(doc.id);

    const defaultCustomer = doc.profiles?.full_name || "Carlos Eduardo Ramos";
    const defaultVessel = doc.processes?.vessels?.name || "MAR AZUL IV";

    if (existingOverride) {
      setRepairCustomerName(existingOverride.customerName);
      setRepairCustomerDoc(existingOverride.customerDoc);
      setRepairVesselName(existingOverride.vesselName);
      setRepairVesselInscricao(existingOverride.vesselInscricao);
      setRepairVesselLength(existingOverride.vesselLength);
      setRepairVesselBeam(existingOverride.vesselBeam);
      setRepairVesselDepth(existingOverride.vesselDepth);
      setRepairEngineDetails(existingOverride.engineDetails);
      setRepairCustomText(existingOverride.customBodyText);
      setRepairEngineerName(existingOverride.engineerName);
      setRepairEngineerCrea(existingOverride.engineerCrea);
      setRepairReason(existingOverride.rectificationReason);
    } else {
      setRepairCustomerName(defaultCustomer);
      setRepairCustomerDoc("123.456.789-00");
      setRepairVesselName(defaultVessel);
      setRepairVesselInscricao("381-098231-9");
      setRepairVesselLength("12.80 m");
      setRepairVesselBeam("3.65 m");
      setRepairVesselDepth("1.85 m");
      setRepairEngineDetails("VOLVO-D6 400HP (Nº Série: VOL-98213)");
      setRepairCustomText(`Solicito a juntada e retificação documental do processo referente à embarcação ${defaultVessel}, de propriedade de ${defaultCustomer}, perante a Capitania dos Portos.`);
      setRepairEngineerName("Eng. Naval Douglas Faresi");
      setRepairEngineerCrea("CREA-SP 50698124");
      setRepairReason("Correção cadastral de dados técnicos para atendimento de exigência da Capitania");
    }

    setRepairModalOpen(true);
  };

  const handleSaveAndRegeneratePdf = async () => {
    if (!selectedDocForRepair) return;
    setIsRegenerating(true);

    try {
      const overrideData: DocumentManualOverride = {
        documentId: selectedDocForRepair.id,
        documentName: selectedDocForRepair.name,
        customerName: repairCustomerName,
        customerDoc: repairCustomerDoc,
        vesselName: repairVesselName,
        vesselInscricao: repairVesselInscricao,
        vesselLength: repairVesselLength,
        vesselBeam: repairVesselBeam,
        vesselDepth: repairVesselDepth,
        engineDetails: repairEngineDetails,
        customBodyText: repairCustomText,
        engineerName: repairEngineerName,
        engineerCrea: repairEngineerCrea,
        rectificationReason: repairReason,
        modifiedAt: new Date().toISOString(),
        modifiedBy: repairEngineerName,
      };

      saveDocumentOverride(overrideData);

      // Regenera o PDF e dispara o download imediato
      const { bytes, fileName } = await regenerateOverriddenPdf(overrideData);
      triggerPdfDownload(bytes, fileName);

      toast.success(`PDF retificado e regenerado com sucesso! Arquivo: ${fileName}`);
      setRepairModalOpen(false);
    } catch (err: any) {
      toast.error("Erro ao regenerar PDF: " + (err?.message || "falha interna"));
    } finally {
      setIsRegenerating(false);
    }
  };

  // ==========================================
  // OPERAÇÕES DE EMISSÃO RÁPIDA AVULSA
  // ==========================================
  const handleGenerateQuickDoc = async () => {
    const selectedTemplate = docsCatalog.find(d => d.id === quickDocId);
    const docName = selectedTemplate?.name || "Documento Oficial da Marinha";

    setIsGeneratingQuick(true);
    try {
      const content = [
        `${selectedTemplate?.officialSource || "NORMAM-211/DPC"}`,
        `${docName.toUpperCase()}`,
        `DOCUMENTO OFICIAL EMITIDO VIA NAVALDOCS PRO (EMISSÃO EXPRESSA)`,
        ``,
        `REQUERENTE / DECLARANTE: ${quickClientName}`,
        `CPF/CNPJ: ${quickClientDoc}`,
        `ENDEREÇO: ${quickClientAddress}`,
        ``,
        `EMBARCAÇÃO VINCULADA: ${quickVesselName}`,
        `INSCRIÇÃO SISGEMB: ${quickVesselInscricao}`,
        `COMPRIMENTO: ${quickVesselLength}          PROPULSÃO: ${quickVesselEngine}`,
        ``,
        `FINALIDADE LEGAL:`,
        `${selectedTemplate?.purpose || "Formalização perante a Capitania dos Portos nos termos da NORMAM-211/DPC."}`,
        ``,
        `Local e Data: Santos/SP, ${new Date().toLocaleDateString("pt-BR")}`,
        ``,
        `___________________________________________________________________________`,
        `Assinatura do Requerente (${quickClientName} - CPF: ${quickClientDoc})`,
        ``,
        `Assinado digitalmente nos termos da Lei Federal nº 14.063/2020 e Portaria DPC.`,
      ].join("\n");

      const pdf = await buildBrandedDocumentPdf({
        docName,
        content,
        branding: null,
        isOfficialForm: true,
        hideSignatureBlock: true,
      });

      const fileName = `${docName.toLowerCase().replace(/[^a-z0-9]/g, "_")}_avulso_${Date.now()}.pdf`;
      triggerPdfDownload(pdf.bytes, fileName);

      toast.success(`Documento oficial "${docName}" gerado e baixado com sucesso!`);
    } catch (err: any) {
      toast.error("Erro ao emitir documento rápido: " + (err?.message || ""));
    } finally {
      setIsGeneratingQuick(false);
    }
  };

  // ==========================================
  // OPERAÇÕES DE CAPITANIAS (OMs)
  // ==========================================
  const handleOpenNewCapitania = () => {
    setEditingCapitania(null);
    setCapFormNome("");
    setCapFormSigla("");
    setCapFormCidade("");
    setCapFormUf("SP");
    setCapFormEndereco("");
    setCapFormTelefones("");
    setCapFormEmailProtocolo("");
    setCapFormPeculiaridades("");
    setCapitaniaModalOpen(true);
  };

  const handleOpenEditCapitania = (cap: CapitaniaOM) => {
    setEditingCapitania(cap);
    setCapFormNome(cap.nome);
    setCapFormSigla(cap.sigla);
    setCapFormCidade(cap.cidade);
    setCapFormUf(cap.uf);
    setCapFormEndereco(cap.endereco);
    setCapFormTelefones(cap.telefones);
    setCapFormEmailProtocolo(cap.emailProtocolo);
    setCapFormPeculiaridades(cap.peculiaridadesBalcao);
    setCapitaniaModalOpen(true);
  };

  const handleSaveCapitaniaModal = () => {
    if (!capFormNome.trim() || !capFormSigla.trim()) {
      toast.error("Nome e sigla da Capitania são obrigatórios.");
      return;
    }

    if (editingCapitania) {
      updateCapitania(editingCapitania.id, {
        nome: capFormNome.trim(),
        sigla: capFormSigla.trim(),
        cidade: capFormCidade.trim(),
        uf: capFormUf.trim(),
        endereco: capFormEndereco.trim(),
        telefones: capFormTelefones.trim(),
        emailProtocolo: capFormEmailProtocolo.trim(),
        peculiaridadesBalcao: capFormPeculiaridades.trim(),
      });
      toast.success(`Capitania "${capFormSigla.trim()}" atualizada com sucesso!`);
    } else {
      addCapitania({
        nome: capFormNome.trim(),
        sigla: capFormSigla.trim(),
        cidade: capFormCidade.trim(),
        uf: capFormUf.trim(),
        endereco: capFormEndereco.trim(),
        cep: "00000-000",
        telefones: capFormTelefones.trim(),
        emailProtocolo: capFormEmailProtocolo.trim(),
        emailSetorEmbarcacoes: capFormEmailProtocolo.trim(),
        titularAtual: "Capitão dos Portos / Delegado",
        jurisdicaoDescricao: `Jurisdição marítima e fluvial de ${capFormCidade.trim()}/${capFormUf.trim()}.`,
        peculiaridadesBalcao: capFormPeculiaridades.trim(),
        chavePixGru: "Tesouro Nacional / Marinha do Brasil",
        isAtiva: true,
      });
      toast.success(`Nova Capitania/Delegacia "${capFormSigla.trim()}" cadastrada!`);
    }

    setCapitanias(getCapitanias());
    setCapitaniaModalOpen(false);
  };

  const handleDeleteCapitania = (id: string, sigla: string) => {
    deleteCapitania(id);
    setCapitanias(getCapitanias());
    toast.success(`Capitania ${sigla} excluída do cadastro.`);
  };

  const filteredCapitanias = useMemo(() => {
    return capitanias.filter(c =>
      c.nome.toLowerCase().includes(capitaniaSearch.toLowerCase()) ||
      c.sigla.toLowerCase().includes(capitaniaSearch.toLowerCase()) ||
      c.cidade.toLowerCase().includes(capitaniaSearch.toLowerCase()) ||
      c.peculiaridadesBalcao.toLowerCase().includes(capitaniaSearch.toLowerCase())
    );
  }, [capitanias, capitaniaSearch]);

  // ==========================================
  // OPERAÇÕES DE EXIGÊNCIAS DA MARINHA
  // ==========================================
  const handleOpenNewExigencia = () => {
    setExigFormCodigo(`NAV-2026-${Math.floor(1000 + Math.random() * 9000)}`);
    setExigFormCliente("");
    setExigFormTelefone("");
    setExigFormEmbarcacao("");
    setExigFormCapitania("CPSP - Santos");
    setExigFormMotivo("");
    setExigFormPrazoDias(30);
    setExigenciaModalOpen(true);
  };

  const handleSaveExigencia = () => {
    if (!exigFormCliente.trim() || !exigFormMotivo.trim()) {
      toast.error("Cliente e motivo da exigência são obrigatórios.");
      return;
    }

    const hoje = new Date();
    const dataLimiteDate = new Date();
    dataLimiteDate.setDate(hoje.getDate() + exigFormPrazoDias);
    const dataLimiteStr = dataLimiteDate.toISOString().slice(0, 10);

    addExigencia({
      codigoProcesso: exigFormCodigo.trim(),
      nomeCliente: exigFormCliente.trim(),
      telefoneCliente: exigFormTelefone.trim() || "5513987654321",
      nomeEmbarcacao: exigFormEmbarcacao.trim() || "Embarcação em Regularização",
      omCapitania: exigFormCapitania,
      dataNotificacao: hoje.toISOString().slice(0, 10),
      prazoDias: exigFormPrazoDias,
      dataLimite: dataLimiteStr,
      vistoriadorResponsavel: "Avaliador Naval da Capitania",
      motivoExigencia: exigFormMotivo.trim(),
      documentosSolicitados: ["Documentação complementar solicitada"],
      status: "pendente",
      notasInternas: "Cadastrado no painel administrativo de exigências.",
    });

    setExigencias(getExigencias());
    setExigenciaModalOpen(false);
    toast.success("Exigência da Capitania cadastrada! O prazo de cumprimento começou a contar.");
  };

  const handleUpdateExigenciaStatus = (id: string, newStatus: StatusExigencia) => {
    updateExigencia(id, { status: newStatus });
    setExigencias(getExigencias());
    toast.success("Status da exigência atualizado!");
  };

  const handleNotifyWhatsappClient = (ex: ExigenciaMarinha) => {
    const dias = getDiasRestantes(ex.dataLimite);
    const msg = `Olá ${ex.nomeCliente}! Notificação urgente da Capitania dos Portos (${ex.omCapitania}) para o processo ${ex.codigoProcesso} da embarcação ${ex.nomeEmbarcacao}: "${ex.motivoExigencia}". Temos ${dias} dias para cumprir o prazo fatal (até ${ex.dataLimite}). Por favor nos envie o documento solicitado o quanto antes!`;
    const cleanPhone = ex.telefoneCliente.replace(/\D/g, "");
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
    toast.success("Abrindo WhatsApp para envio da cobrança ao cliente!");
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-8 lg:p-10 space-y-6 antialiased">
      <div className="max-w-[1600px] mx-auto space-y-6">
        
        {/* CABEÇALHO DA ESTAÇÃO DO ENGENHEIRO / ADMIN */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B1739] tracking-tight">
                Central de Documentos & Engenharia Naval
              </h1>
              <Badge className="bg-blue-50 text-[#075BFF] border-blue-200 text-xs font-bold px-2.5 py-0.5">
                Módulo Sócio / Engenheiro
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Cofre auditado, reparo manual de documentos, emissão expressa, contatos das Capitanias e calculadoras regulamentares da NORMAM-211.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => setActiveTab("quick_docs")}
              className="h-9 px-3.5 text-xs font-bold bg-[#075BFF] hover:bg-blue-600 text-white rounded-xl shadow-xs"
            >
              <Zap className="h-4 w-4 mr-1.5" />
              Emissão Expressa
            </Button>
          </div>
        </div>

        {/* NAVEGAÇÃO DE ABAS */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
          <TabsList className="bg-slate-100/80 p-1 rounded-2xl h-auto flex flex-wrap border border-slate-200/80 gap-1">
            <TabsTrigger
              value="vault"
              className="rounded-xl px-4 py-2 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-[#075BFF] data-[state=active]:shadow-2xs flex items-center gap-1.5"
            >
              <FileText className="h-3.5 w-3.5" />
              Cofre & Reparo Manual
            </TabsTrigger>

            <TabsTrigger
              value="requirements"
              className="rounded-xl px-4 py-2 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-[#075BFF] data-[state=active]:shadow-2xs flex items-center gap-1.5"
            >
              <List className="h-3.5 w-3.5 text-blue-600" />
              Documentos & Requisitos ({docsCatalog.length})
            </TabsTrigger>

            <TabsTrigger
              value="quick_docs"
              className="rounded-xl px-4 py-2 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-[#075BFF] data-[state=active]:shadow-2xs flex items-center gap-1.5"
            >
              <Zap className="h-3.5 w-3.5" />
              Emissão Expressa Avulsa
            </TabsTrigger>

            <TabsTrigger
              value="capitanias"
              className="rounded-xl px-4 py-2 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-[#075BFF] data-[state=active]:shadow-2xs flex items-center gap-1.5"
            >
              <Anchor className="h-3.5 w-3.5" />
              Capitanias & Delegacias ({capitanias.length})
            </TabsTrigger>

            <TabsTrigger
              value="exigencias"
              className="rounded-xl px-4 py-2 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-[#075BFF] data-[state=active]:shadow-2xs flex items-center gap-1.5"
            >
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
              Exigências da Marinha ({exigencias.length})
            </TabsTrigger>

            <TabsTrigger
              value="engineering"
              className="rounded-xl px-4 py-2 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-[#075BFF] data-[state=active]:shadow-2xs flex items-center gap-1.5"
            >
              <Compass className="h-3.5 w-3.5 text-indigo-500" />
              Calculadoras de Engenharia
            </TabsTrigger>
          </TabsList>

          {/* ========================================================= */}
          {/* ABA: DOCUMENTOS E REQUISITOS NECESSÁRIOS (NORMAM-211/212/201) */}
          {/* ========================================================= */}
          <TabsContent value="requirements" className="focus-visible:ring-0 mt-0 space-y-6">
            {/* Header com Ações Rápidas */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <div>
                <h3 className="text-sm font-bold text-[#0B1739] flex items-center gap-2">
                  <List className="h-4 w-4 text-[#075BFF]" />
                  Matriz Regulamentar de Documentos Oficiais & Anexos Necessários
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Gerencie visualmente cada documento emitido perante a Capitania dos Portos e sua lista de comprovantes/anexos exigidos. Adicione, edite ou exclua requisitos sem encostar em código.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetCatalogToDefaults}
                  className="h-9 rounded-xl text-xs font-semibold text-slate-600 border-slate-200 hover:bg-slate-50 gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Restaurar Padrões DPC
                </Button>
                <Button
                  size="sm"
                  onClick={() => setIsNewDocModalOpen(true)}
                  className="h-9 rounded-xl text-xs font-bold bg-[#075BFF] hover:bg-blue-600 text-white gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  Novo Documento no Catálogo
                </Button>
              </div>
            </div>

            {/* Filtros de Busca e Serviço */}
            <Card className="border-slate-200 shadow-2xs rounded-2xl bg-white">
              <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Pesquisar por nome do documento, código ou fonte da Marinha..."
                    value={reqSearch}
                    onChange={(e) => setReqSearch(e.target.value)}
                    className="pl-10 h-10 bg-slate-50/70 border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div className="w-full sm:w-[240px]">
                  <Select value={reqSelectedService} onValueChange={setReqSelectedService}>
                    <SelectTrigger className="h-10 bg-slate-50/70 border-slate-200 rounded-xl text-xs">
                      <SelectValue placeholder="Filtrar por serviço" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl text-xs">
                      <SelectItem value="all">Todos os Serviços</SelectItem>
                      <SelectItem value="inscricao">Inscrição de embarcação</SelectItem>
                      <SelectItem value="transferencia">Transferência</SelectItem>
                      <SelectItem value="renovacao">Renovação</SelectItem>
                      <SelectItem value="segunda_via">Segunda via</SelectItem>
                      <SelectItem value="alteracao_motor">Alteração de motor</SelectItem>
                      <SelectItem value="vistoria">Vistoria</SelectItem>
                      <SelectItem value="habilitacao_cha">Habilitação náutica (CHA)</SelectItem>
                      <SelectItem value="alteracao_cadastral">Alteração Cadastral</SelectItem>
                      <SelectItem value="despacho_porto">Despacho de Saída</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Listagem dos Documentos e seus Anexos */}
            <div className="space-y-4">
              {docsCatalog
                .filter((doc) => {
                  const matchSearch =
                    !reqSearch ||
                    doc.name.toLowerCase().includes(reqSearch.toLowerCase()) ||
                    doc.serviceName.toLowerCase().includes(reqSearch.toLowerCase()) ||
                    doc.officialSource.toLowerCase().includes(reqSearch.toLowerCase()) ||
                    doc.purpose.toLowerCase().includes(reqSearch.toLowerCase());
                  const matchService = reqSelectedService === "all" || doc.serviceId === reqSelectedService;
                  return matchSearch && matchService;
                })
                .map((doc) => (
                  <Card key={doc.id} className="border-slate-200 shadow-2xs rounded-2xl overflow-hidden bg-white">
                    <CardHeader className="p-4 bg-slate-50/80 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h4 className="text-sm font-bold text-[#0B1739]">{doc.name}</h4>
                          <Badge variant="outline" className="text-[10px] font-semibold bg-blue-50 text-[#075BFF] border-blue-200">
                            {doc.serviceName}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] font-semibold bg-slate-100 text-slate-700">
                            {doc.documentType === "official_form" ? "Formulário Oficial DPC" : "Documento da Plataforma"}
                          </Badge>
                          <Badge className="text-[10px] font-bold bg-slate-800 text-white">
                            {doc.attachments.length} {doc.attachments.length === 1 ? "anexo necessário" : "anexos necessários"}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500 font-mono">
                          {doc.officialSource}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePreviewDoc(doc)}
                          className="h-8 rounded-xl text-xs font-semibold text-[#075BFF] bg-blue-50/70 hover:bg-blue-100/70 border-blue-200 gap-1 cursor-pointer"
                          title={`Visualizar layout oficial A4 de ${doc.name}`}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Prévia A4
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEditDoc(doc)}
                          className="h-8 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 gap-1 border-slate-200 cursor-pointer"
                          title={`Editar dados de ${doc.name}`}
                        >
                          <Edit3 className="h-3.5 w-3.5 text-slate-500" />
                          Editar
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteDoc(doc.id, doc.name)}
                          className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 border-slate-200 hover:border-red-200 rounded-xl cursor-pointer"
                          title={`Excluir documento ${doc.name} do catálogo`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>

                        <Button
                          size="sm"
                          onClick={() => handleOpenAddRequirement(doc.id)}
                          className="h-8 rounded-xl text-xs font-bold bg-[#075BFF] hover:bg-blue-600 text-white gap-1.5 shadow-2xs shrink-0 cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Adicionar Anexo Necessário
                        </Button>
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 space-y-3">
                      <p className="text-xs text-slate-600 bg-blue-50/40 p-2.5 rounded-xl border border-blue-100/60">
                        <strong className="text-slate-800">Finalidade Regulatória:</strong> {doc.purpose}
                      </p>

                      {/* Lista de Documentos Necessários / Anexos */}
                      {doc.attachments.length === 0 ? (
                        <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/40">
                          <p className="text-xs text-slate-500 font-medium">
                            Nenhum anexo adicional exigido para este documento.
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenAddRequirement(doc.id)}
                            className="mt-2 text-xs font-bold text-[#075BFF] hover:bg-blue-50 cursor-pointer"
                          >
                            + Cadastrar primeiro documento necessário
                          </Button>
                        </div>
                      ) : (
                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                          <Table>
                            <TableHeader className="bg-slate-50">
                              <TableRow className="hover:bg-transparent">
                                <TableHead className="text-xs font-semibold text-slate-700 py-2.5 w-[35%]">Documento / Anexo Necessário</TableHead>
                                <TableHead className="text-xs font-semibold text-slate-700 py-2.5 w-[45%]">Finalidade / Por que é exigido</TableHead>
                                <TableHead className="text-xs font-semibold text-slate-700 py-2.5 w-[10%]">Tipo</TableHead>
                                <TableHead className="text-xs font-semibold text-slate-700 py-2.5 w-[10%] text-right">Ações</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {doc.attachments.map((att) => (
                                <TableRow key={att.id} className="hover:bg-slate-50/60 border-slate-100">
                                  <TableCell className="py-2.5 font-semibold text-xs text-[#0B1739]">
                                    {att.name}
                                  </TableCell>
                                  <TableCell className="py-2.5 text-xs text-slate-600">
                                    {att.why || "Comprovação regulamentar perante a Capitania dos Portos"}
                                  </TableCell>
                                  <TableCell className="py-2.5">
                                    {att.isProtocolOnly ? (
                                      <Badge variant="outline" className="text-[10px] font-semibold bg-amber-50 text-amber-700 border-amber-200">
                                        Exclusivo Protocolo
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="text-[10px] font-semibold bg-indigo-50 text-indigo-700 border-indigo-200">
                                        Extração de Dados
                                      </Badge>
                                    )}
                                  </TableCell>
                                  <TableCell className="py-2.5 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleOpenEditRequirement(doc.id, att)}
                                        className="h-7 w-7 text-slate-500 hover:text-[#075BFF] hover:bg-blue-50 rounded-lg cursor-pointer"
                                        title="Editar requisito"
                                      >
                                        <Edit3 className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDeleteRequirement(doc.id, att.id)}
                                        className="h-7 w-7 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"
                                        title="Excluir requisito"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
            </div>
          </TabsContent>

                    {/* ========================================================= */}
          {/* ABA 1: COFRE & REPARO MANUAL DE DOCUMENTOS */}
          {/* ========================================================= */}
          <TabsContent value="vault" className="focus-visible:ring-0 mt-0 space-y-6">
            {/* Barra de Filtros e Busca */}
            <Card className="border-slate-200 shadow-2xs rounded-2xl bg-white">
              <CardContent className="p-4 flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <Input 
                    placeholder="Pesquisar por nome do documento, cliente ou processo..." 
                    className="pl-10 h-10 bg-slate-50/70 border-slate-200 rounded-xl text-xs"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={clientFilter} onValueChange={setClientFilter}>
                    <SelectTrigger className="w-[180px] h-10 text-xs rounded-xl">
                      <User className="h-3.5 w-3.5 mr-1 text-slate-400" />
                      <SelectValue placeholder="Cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Clientes</SelectItem>
                      {uniqueClients.map(client => (
                        <SelectItem key={client?.id} value={client?.id || ""}>{client?.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[150px] h-10 text-xs rounded-xl">
                      <Filter className="h-3.5 w-3.5 mr-1 text-slate-400" />
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos Status</SelectItem>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="generated">Gerado</SelectItem>
                      <SelectItem value="signed">Assinado</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refetchDocuments()}
                    className="h-10 px-3 rounded-xl border-slate-200"
                    title="Recarregar cofre"
                  >
                    <RefreshCw className="h-3.5 w-3.5 text-slate-600" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Listagem com Ação de Reparo Manual */}
            {isLoading ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-3 bg-white rounded-2xl border border-slate-200">
                <Loader2 className="h-8 w-8 animate-spin text-[#075BFF]" />
                <p className="text-xs font-semibold">Carregando cofre de documentos...</p>
              </div>
            ) : filteredDocs.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 border border-dashed border-slate-200 rounded-2xl bg-white space-y-2">
                <FileText className="h-10 w-10 text-slate-300" />
                <p className="text-xs font-semibold">Nenhum documento gerado encontrado com os filtros aplicados.</p>
              </div>
            ) : (
              <Card className="bg-white rounded-2xl border-slate-200/90 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50/80 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-100">
                        <th className="px-6 py-4">Documento Emitido</th>
                        <th className="px-6 py-4">Cliente / Titular</th>
                        <th className="px-6 py-4">Embarcação Vinculada</th>
                        <th className="px-6 py-4">Data de Emissão</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Ações Técnicas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredDocs.map((doc: DocumentWithRelations) => {
                        const hasOverride = !!getDocumentOverrideById(doc.id);
                        return (
                          <tr key={doc.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-xl bg-blue-50 text-[#075BFF] flex items-center justify-center shrink-0 border border-blue-100">
                                  <FileText className="h-4 w-4" />
                                </div>
                                <div>
                                  <span className="font-bold text-[#0B1739] block text-xs">
                                    {doc.name}
                                  </span>
                                  {hasOverride && (
                                    <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[9px] font-bold px-1.5 py-0 mt-0.5">
                                      Retificado pelo Engenheiro
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </td>

                            <td className="px-6 py-4 text-slate-700 font-medium">
                              {doc.profiles?.full_name || "Cliente Naval"}
                            </td>

                            <td className="px-6 py-4 text-slate-600">
                              {doc.processes?.vessels?.name || "MAR AZUL IV"}
                            </td>

                            <td className="px-6 py-4 text-slate-500 font-mono text-[11px]">
                              {new Date(doc.created_at).toLocaleDateString("pt-BR")}
                            </td>

                            <td className="px-6 py-4">
                              <Badge variant="outline" className="text-[10px] uppercase font-bold bg-slate-50 text-slate-600">
                                {doc.status}
                              </Badge>
                            </td>

                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handlePreviewIssuedDoc(doc)}
                                  className="h-8 px-2.5 text-xs font-bold text-[#075BFF] border-blue-200 bg-blue-50/50 hover:bg-blue-100/70 rounded-xl cursor-pointer"
                                  title="Visualizar layout oficial A4 retificado"
                                >
                                  <Eye className="h-3.5 w-3.5 mr-1" />
                                  Prévia A4
                                </Button>

                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenRepairModal(doc)}
                                  className="h-8 px-2.5 text-xs font-bold text-amber-700 border-amber-200 bg-amber-50/50 hover:bg-amber-100/70 rounded-xl cursor-pointer"
                                  title="Reparo técnico manual sem reiniciar processo"
                                >
                                  <Wrench className="h-3.5 w-3.5 mr-1" />
                                  Reparo Manual
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* ========================================================= */}
          {/* ABA 2: EMISSÃO EXPRESSA AVULSA DA MARINHA */}
          {/* ========================================================= */}
          <TabsContent value="quick_docs" className="focus-visible:ring-0 mt-0 space-y-6">
            <Card className="p-6 bg-white border-slate-200/90 rounded-2xl shadow-2xs space-y-5">
              <div>
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-[#075BFF]" />
                  <h3 className="text-base font-bold text-[#0B1739]">
                    Emissão Rápida de Documentos Oficiais (Sem Processo Prévio)
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Gere e baixe em menos de 1 minuto qualquer um dos documentos da NORMAM-211 sem precisar passar pelo funil de cadastro de cliente ou processo completo.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Selecione o Modelo Oficial *</Label>
                    <Select value={quickDocId} onValueChange={setQuickDocId}>
                      <SelectTrigger className="mt-1 h-10 text-xs rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {docsCatalog.map((doc) => (
                          <SelectItem key={doc.id} value={doc.id} className="text-xs">
                            {doc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Nome do Requerente / Titular *</Label>
                    <Input
                      value={quickClientName}
                      onChange={(e) => setQuickClientName(e.target.value)}
                      placeholder="Nome completo do proprietário"
                      className="mt-1 h-9 text-xs rounded-xl"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">CPF / CNPJ *</Label>
                      <Input
                        value={quickClientDoc}
                        onChange={(e) => setQuickClientDoc(e.target.value)}
                        placeholder="000.000.000-00"
                        className="mt-1 h-9 text-xs rounded-xl"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">Endereço com Cidade/UF</Label>
                      <Input
                        value={quickClientAddress}
                        onChange={(e) => setQuickClientAddress(e.target.value)}
                        placeholder="Rua, número, cidade/UF"
                        className="mt-1 h-9 text-xs rounded-xl"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Nome da Embarcação *</Label>
                    <Input
                      value={quickVesselName}
                      onChange={(e) => setQuickVesselName(e.target.value)}
                      placeholder="Ex: MAR AZUL IV"
                      className="mt-1 h-9 text-xs rounded-xl"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">Nº Inscrição (TIE/TIEM)</Label>
                      <Input
                        value={quickVesselInscricao}
                        onChange={(e) => setQuickVesselInscricao(e.target.value)}
                        placeholder="Ex: 381-098231-9"
                        className="mt-1 h-9 text-xs rounded-xl"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">Comprimento Total</Label>
                      <Input
                        value={quickVesselLength}
                        onChange={(e) => setQuickVesselLength(e.target.value)}
                        placeholder="Ex: 12.50 m"
                        className="mt-1 h-9 text-xs rounded-xl"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Marca e Potência dos Motores</Label>
                    <Input
                      value={quickVesselEngine}
                      onChange={(e) => setQuickVesselEngine(e.target.value)}
                      placeholder="Ex: 2x Volvo Penta D6 400HP"
                      className="mt-1 h-9 text-xs rounded-xl"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-100">
                <Button
                  onClick={handleGenerateQuickDoc}
                  disabled={isGeneratingQuick}
                  className="h-10 px-5 text-xs font-bold bg-[#075BFF] hover:bg-blue-600 text-white rounded-xl shadow-xs"
                >
                  <Download className="h-4 w-4 mr-1.5" />
                  {isGeneratingQuick ? "Compilando PDF Oficial..." : "Gerar e Baixar PDF Imediatamente"}
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* ========================================================= */}
          {/* ABA 3: CAPITANIAS & DELEGACIAS (OMs DA MARINHA) */}
          {/* ========================================================= */}
          <TabsContent value="capitanias" className="focus-visible:ring-0 mt-0 space-y-6">
            <Card className="p-6 bg-white border-slate-200/90 rounded-2xl shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-[#0B1739] uppercase tracking-wider">
                    Cadastro de Capitanias, Delegacias e Agências da Marinha
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Contatos diretos do GAP/SEMB, endereços de protocolo e peculiaridades de balcão de cada porto do Brasil.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const def = resetCapitaniasToDefaults();
                      setCapitanias(def);
                      toast.success("Capitanias restauradas para o cadastro oficial da Marinha.");
                    }}
                    className="h-9 text-xs rounded-xl border-slate-200"
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1" />
                    Padrões Oficiais
                  </Button>
                  <Button
                    onClick={handleOpenNewCapitania}
                    className="h-9 px-3.5 text-xs font-bold bg-[#075BFF] hover:bg-blue-600 text-white rounded-xl shadow-xs"
                  >
                    <Plus className="h-4 w-4 mr-1.5" />
                    Nova Capitania / Delegacia
                  </Button>
                </div>
              </div>

              <div className="relative">
                <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <Input
                  value={capitaniaSearch}
                  onChange={(e) => setCapitaniaSearch(e.target.value)}
                  placeholder="Pesquisar por Capitania, sigla, cidade ou peculiaridade..."
                  className="pl-10 h-10 text-xs rounded-xl"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {filteredCapitanias.map((cap) => (
                  <Card key={cap.id} className="p-4 bg-white border-slate-200 rounded-2xl shadow-2xs space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base font-extrabold text-[#0B1739]">{cap.sigla}</span>
                          <Badge variant="secondary" className="text-[10px] font-bold bg-blue-50 text-[#075BFF]">
                            {cap.cidade}/{cap.uf}
                          </Badge>
                        </div>
                        <h4 className="text-xs font-semibold text-slate-700 mt-0.5">{cap.nome}</h4>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEditCapitania(cap)}
                          className="h-7 w-7 p-0 text-slate-600 hover:bg-slate-100 rounded-lg"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteCapitania(cap.id, cap.sigla)}
                          className="h-7 w-7 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-600 pt-1">
                      <p className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span>{cap.telefones}</span>
                      </p>
                      <p className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="font-mono text-[11px] text-[#075BFF]">{cap.emailProtocolo}</span>
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {cap.endereco} - CEP: {cap.cep}
                      </p>
                    </div>

                    {cap.peculiaridadesBalcao && (
                      <div className="p-2.5 bg-amber-50/70 border border-amber-200/70 rounded-xl text-[11px] text-amber-900 leading-tight">
                        <strong>Exigências de Balcão:</strong> {cap.peculiaridadesBalcao}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* ========================================================= */}
          {/* ABA 4: EXIGÊNCIAS DA CAPITANIA (CONTROLE DE PRAZOS) */}
          {/* ========================================================= */}
          <TabsContent value="exigencias" className="focus-visible:ring-0 mt-0 space-y-6">
            <Card className="p-6 bg-white border-slate-200/90 rounded-2xl shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-[#0B1739] uppercase tracking-wider">
                    Controle de Exigências e Pendências da Capitania dos Portos
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Acompanhe os prazos fatais de 30 ou 60 dias das notificações da Autoridade Marítima para evitar o cancelamento de processos.
                  </p>
                </div>

                <Button
                  onClick={handleOpenNewExigencia}
                  className="h-9 px-3.5 text-xs font-bold bg-[#075BFF] hover:bg-blue-600 text-white rounded-xl shadow-xs"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Registrar Nova Exigência
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-3 pt-2">
                {exigencias.map((ex) => {
                  const diasRestantes = getDiasRestantes(ex.dataLimite);
                  const isUrgente = diasRestantes <= 7 && ex.status !== "deferido";

                  return (
                    <Card
                      key={ex.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isUrgente
                          ? "border-red-300 bg-red-50/30 ring-1 ring-red-200"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-bold text-[#075BFF]">
                              {ex.codigoProcesso}
                            </span>
                            <span className="text-sm font-bold text-[#0B1739]">
                              {ex.nomeCliente}
                            </span>
                            <Badge variant="outline" className="text-[10px] font-semibold">
                              {ex.omCapitania}
                            </Badge>

                            {ex.status === "deferido" ? (
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
                                Concluído / Deferido
                              </Badge>
                            ) : isUrgente ? (
                              <Badge className="bg-red-600 text-white text-[10px] font-bold animate-pulse">
                                Prazo Fatal: Restam {diasRestantes} dias!
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-50 text-amber-800 border-amber-200 text-[10px] font-bold">
                                Restam {diasRestantes} dias (até {ex.dataLimite})
                              </Badge>
                            )}
                          </div>

                          <p className="text-xs text-slate-700 font-medium">
                            <strong>Embarcação:</strong> {ex.nomeEmbarcacao}
                          </p>

                          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 space-y-1">
                            <p><strong>Exigência da Marinha:</strong> {ex.motivoExigencia}</p>
                            {ex.vistoriadorResponsavel && (
                              <p className="text-[11px] text-slate-500">Notificado por: {ex.vistoriadorResponsavel}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap md:flex-col items-end gap-2 shrink-0">
                          <Select
                            value={ex.status}
                            onValueChange={(val: any) => handleUpdateExigenciaStatus(ex.id, val)}
                          >
                            <SelectTrigger className="h-8 text-xs rounded-lg w-36">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pendente">Pendente</SelectItem>
                              <SelectItem value="em_cumprimento">Em Cumprimento</SelectItem>
                              <SelectItem value="protocolado">Protocolado na CP</SelectItem>
                              <SelectItem value="deferido">Deferido / Concluído</SelectItem>
                            </SelectContent>
                          </Select>

                          <Button
                            size="sm"
                            onClick={() => handleNotifyWhatsappClient(ex)}
                            className="h-8 px-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-xs"
                          >
                            <Send className="h-3.5 w-3.5 mr-1" />
                            Cobrar no WhatsApp
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              deleteExigencia(ex.id);
                              setExigencias(getExigencias());
                              toast.success("Exigência removida.");
                            }}
                            className="h-7 w-7 p-0 text-slate-400 hover:text-red-600 rounded-lg"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </Card>
          </TabsContent>

          {/* ========================================================= */}
          {/* ABA 5: CALCULADORAS & FERRAMENTAS DE ENGENHARIA NAVAL */}
          {/* ========================================================= */}
          <TabsContent value="engineering" className="focus-visible:ring-0 mt-0 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* FERRAMENTA 1: VALIDADOR DE HIN / CASCO */}
              <Card className="p-6 bg-white border-slate-200/90 rounded-2xl shadow-2xs space-y-4">
                <div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-[#075BFF]" />
                    <h3 className="text-sm font-bold text-[#0B1739] uppercase tracking-wider">
                      Validador de Código HIN / MIC de Casco
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Conforme ABNT NBR 14950 e NORMAM-211/DPC. Valida fabricante, série e ano modelo antes do protocolo.
                  </p>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">Digite o Chassi / HIN da Embarcação</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={hinInput}
                      onChange={(e) => {
                        setHinInput(e.target.value);
                        setHinResult(validateHullHinCode(e.target.value));
                      }}
                      placeholder="Ex: BR-ABC12345D424"
                      className="h-10 text-xs font-mono uppercase rounded-xl"
                    />
                  </div>
                </div>

                {hinResult && (
                  <div
                    className={`p-4 rounded-xl border space-y-2 text-xs ${
                      hinResult.isValid
                        ? "bg-emerald-50/70 border-emerald-200 text-emerald-950"
                        : "bg-red-50/70 border-red-200 text-red-950"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold">
                        {hinResult.isValid ? "Código HIN Conforme NORMAM!" : "Código Inválido ou Fora do Padrão"}
                      </span>
                      <Badge className={hinResult.isValid ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}>
                        {hinResult.isValid ? "Homologado" : "Rejeitado"}
                      </Badge>
                    </div>

                    <p className="text-[11px] leading-relaxed">{hinResult.feedbackMessage}</p>

                    {hinResult.isValid && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-emerald-200 text-[10px]">
                        <div><span className="text-slate-500 block">Estaleiro (MIC):</span><strong>{hinResult.mic}</strong></div>
                        <div><span className="text-slate-500 block">Nº Série:</span><strong>{hinResult.serial}</strong></div>
                        <div><span className="text-slate-500 block">Mês Fabricação:</span><strong>{hinResult.month}</strong></div>
                        <div><span className="text-slate-500 block">Ano Modelo:</span><strong>{hinResult.modelYear}</strong></div>
                      </div>
                    )}
                  </div>
                )}
              </Card>

              {/* FERRAMENTA 2: CALCULADORA OFICIAL DE ARQUEAÇÃO SIMPLIFICADA */}
              <Card className="p-6 bg-white border-slate-200/90 rounded-2xl shadow-2xs space-y-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-[#075BFF]" />
                    <h3 className="text-sm font-bold text-[#0B1739] uppercase tracking-wider">
                      Calculadora de Arqueação Simplificada (AB)
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Fórmula Oficial NORMAM-211 item 0303: <code>AB = (L x B x P x 0.50) / 2.83</code>
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Comprimento (m)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={arqComprimento}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0;
                        setArqComprimento(val);
                        setArqResult(calculateArqueacaoSimplificada(val, arqBoca, arqPontal));
                      }}
                      className="mt-1 h-9 text-xs rounded-xl"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Boca (m)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={arqBoca}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0;
                        setArqBoca(val);
                        setArqResult(calculateArqueacaoSimplificada(arqComprimento, val, arqPontal));
                      }}
                      className="mt-1 h-9 text-xs rounded-xl"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Pontal (m)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={arqPontal}
                      onChange={(e) => {
                        const val = Number(e.target.value) || 0;
                        setArqPontal(val);
                        setArqResult(calculateArqueacaoSimplificada(arqComprimento, arqBoca, val));
                      }}
                      className="mt-1 h-9 text-xs rounded-xl"
                    />
                  </div>
                </div>

                {arqResult && (
                  <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2 text-xs text-blue-950">
                    <div className="flex items-center justify-between">
                      <span className="font-bold">Arqueação Bruta Calculada (AB):</span>
                      <span className="text-base font-extrabold text-[#075BFF]">{arqResult.arqueacaoBruta}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-blue-200">
                      <div><span className="text-slate-500 block">Classificação de Porte:</span><strong>{arqResult.classificacaoLabel}</strong></div>
                      <div><span className="text-slate-500 block">Boletim Exigido:</span><strong className="text-[#075BFF]">{arqResult.documentoObrigatorio}</strong></div>
                    </div>

                    <div className="text-[10px] text-slate-600 pt-1">
                      {arqResult.exigeArtEngenheiro ? (
                        <span className="text-amber-800 font-bold">⚠️ Exige Memorial e ART de Engenheiro Naval no protocolo.</span>
                      ) : (
                        <span className="text-emerald-700 font-bold">✓ Dispensado de ART de Arqueação (Embarcação Miúda cadastrada via BSADE).</span>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* ========================================================= */}
        {/* MODAL DE REPARO TÉCNICO MANUAL ("CANETA VERMELHA") */}
        {/* ========================================================= */}
        <Dialog open={repairModalOpen} onOpenChange={setRepairModalOpen}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto p-6 rounded-2xl bg-white">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-amber-600" />
                <DialogTitle className="text-base font-bold text-[#0B1739]">
                  Reparo Técnico Manual do Documento
                </DialogTitle>
              </div>
              <DialogDescription className="text-xs text-slate-500">
                Retifique campos, dados técnicos ou texto de {selectedDocForRepair?.name} diretamente, sem precisar reiniciar o processo do cliente.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-tight">
                <strong>Responsabilidade Técnica:</strong> As alterações feitas nesta tela regeneram o PDF oficial, inserindo anotação de retificação com seu nome e registro profissional.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Nome do Titular / Requerente</Label>
                  <Input
                    value={repairCustomerName}
                    onChange={(e) => setRepairCustomerName(e.target.value)}
                    className="mt-1 h-9 text-xs rounded-xl"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">CPF / CNPJ do Titular</Label>
                  <Input
                    value={repairCustomerDoc}
                    onChange={(e) => setRepairCustomerDoc(e.target.value)}
                    className="mt-1 h-9 text-xs rounded-xl"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">Nome da Embarcação</Label>
                  <Input
                    value={repairVesselName}
                    onChange={(e) => setRepairVesselName(e.target.value)}
                    className="mt-1 h-9 text-xs rounded-xl"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">Nº de Inscrição SISGEMB</Label>
                  <Input
                    value={repairVesselInscricao}
                    onChange={(e) => setRepairVesselInscricao(e.target.value)}
                    className="mt-1 h-9 text-xs rounded-xl"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">Comprimento Total (m)</Label>
                  <Input
                    value={repairVesselLength}
                    onChange={(e) => setRepairVesselLength(e.target.value)}
                    className="mt-1 h-9 text-xs rounded-xl"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">Boca / Pontal (m)</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      value={repairVesselBeam}
                      onChange={(e) => setRepairVesselBeam(e.target.value)}
                      placeholder="Boca"
                      className="h-9 text-xs rounded-xl"
                    />
                    <Input
                      value={repairVesselDepth}
                      onChange={(e) => setRepairVesselDepth(e.target.value)}
                      placeholder="Pontal"
                      className="h-9 text-xs rounded-xl"
                    />
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Dados do Motor / Propulsão</Label>
                <Input
                  value={repairEngineDetails}
                  onChange={(e) => setRepairEngineDetails(e.target.value)}
                  placeholder="Ex: 2x Volvo Penta D6 400HP (VOL-98213)"
                  className="mt-1 h-9 text-xs rounded-xl"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Texto Livre do Requerimento / Declaração</Label>
                <Textarea
                  value={repairCustomText}
                  onChange={(e) => setRepairCustomText(e.target.value)}
                  className="mt-1 text-xs rounded-xl min-h-[80px]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Engenheiro Naval Responsável</Label>
                  <Input
                    value={repairEngineerName}
                    onChange={(e) => setRepairEngineerName(e.target.value)}
                    className="mt-1 h-9 text-xs rounded-xl"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">Registro CREA / ART</Label>
                  <Input
                    value={repairEngineerCrea}
                    onChange={(e) => setRepairEngineerCrea(e.target.value)}
                    className="mt-1 h-9 text-xs rounded-xl"
                  />
                </div>

                <div className="sm:col-span-2">
                  <Label className="text-xs font-semibold text-slate-700">Motivo da Retificação</Label>
                  <Input
                    value={repairReason}
                    onChange={(e) => setRepairReason(e.target.value)}
                    className="mt-1 h-9 text-xs rounded-xl"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRepairModalOpen(false)}
                className="h-9 rounded-xl text-xs"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleSaveAndRegeneratePdf}
                disabled={isRegenerating}
                className="h-9 rounded-xl text-xs font-bold bg-[#075BFF] hover:bg-blue-600 text-white"
              >
                <Save className="h-4 w-4 mr-1.5" />
                {isRegenerating ? "Regenerando PDF..." : "Regenerar e Baixar PDF Corrigido"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ========================================================= */}
        {/* ========================================================= */}
        {/* MODAL: ADICIONAR / EDITAR REQUISITO DE ANEXO */}
        {/* ========================================================= */}
        <Dialog open={isReqModalOpen} onOpenChange={setIsReqModalOpen}>
          <DialogContent className="sm:max-w-[500px] p-6 rounded-2xl bg-white">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-[#0B1739]">
                {reqModalMode === "add" ? "Adicionar Documento Necessário / Anexo" : "Editar Documento Necessário"}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                {reqModalMode === "add" 
                  ? "Vincule um novo comprovante ou anexo obrigatório exigido pela Capitania para emissão deste documento."
                  : "Modifique os detalhes ou a finalidade deste comprovante exigido pela Autoridade Marítima."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Nome do Anexo / Documento Necessário *</Label>
                <Input
                  value={reqName}
                  onChange={(e) => setReqName(e.target.value)}
                  placeholder="Ex: Fotografia da Popa em Alta Resolução"
                  className="mt-1 h-9 text-xs rounded-xl"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Finalidade / Por que é exigido?</Label>
                <Textarea
                  value={reqWhy}
                  onChange={(e) => setReqWhy(e.target.value)}
                  placeholder="Ex: Exigência exclusiva de balcão da CPSP para conferência do porto de inscrição e nome gravado no casco."
                  className="mt-1 text-xs rounded-xl min-h-[70px]"
                />
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-800">Exclusivo para Protocolo Físico / Conferência</p>
                  <p className="text-[11px] text-slate-500">Marque se não precisar de leitura de dados por OCR (ex: fotos da embarcação, GRU paga).</p>
                </div>
                <input
                  type="checkbox"
                  checked={reqIsProtocolOnly}
                  onChange={(e) => setReqIsProtocolOnly(e.target.checked)}
                  className="h-4 w-4 rounded text-[#075BFF] focus:ring-blue-500 border-slate-300 cursor-pointer"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsReqModalOpen(false)}
                className="h-9 rounded-xl text-xs cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleSaveRequirement}
                className="h-9 rounded-xl text-xs font-bold bg-[#075BFF] hover:bg-blue-600 text-white cursor-pointer"
              >
                {reqModalMode === "add" ? "Adicionar Anexo" : "Salvar Alterações"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ========================================================= */}
        {/* MODAL: NOVO DOCUMENTO NO CATÁLOGO OFICIAL */}
        {/* ========================================================= */}
        <Dialog open={isNewDocModalOpen} onOpenChange={setIsNewDocModalOpen}>
          <DialogContent className="sm:max-w-[500px] p-6 rounded-2xl bg-white">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-[#0B1739]">
                Cadastrar Novo Documento Oficial no Catálogo
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Adicione um novo anexo ou formulário regulamentar emitido perante a Capitania dos Portos.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Nome Oficial do Documento *</Label>
                <Input
                  value={newDocName}
                  onChange={(e) => setNewDocName(e.target.value)}
                  placeholder="Ex: Atestado de Estabilidade e Borda Livre"
                  className="mt-1 h-9 text-xs rounded-xl"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Serviço Náutico Vinculado</Label>
                <Select value={newDocServiceId} onValueChange={setNewDocServiceId}>
                  <SelectTrigger className="mt-1 h-9 text-xs rounded-xl">
                    <SelectValue placeholder="Selecione o serviço" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl text-xs">
                    <SelectItem value="inscricao">Inscrição de embarcação</SelectItem>
                    <SelectItem value="transferencia">Transferência</SelectItem>
                    <SelectItem value="renovacao">Renovação</SelectItem>
                    <SelectItem value="segunda_via">Segunda via</SelectItem>
                    <SelectItem value="vistoria">Vistoria</SelectItem>
                    <SelectItem value="laudo_engenharia">Laudo técnico pericial</SelectItem>
                    <SelectItem value="alteracao_cadastral">Alteração Cadastral</SelectItem>
                    <SelectItem value="despacho_porto">Despacho de Saída</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Fonte Oficial / Portaria da Marinha</Label>
                <Input
                  value={newDocOfficialSource}
                  onChange={(e) => setNewDocOfficialSource(e.target.value)}
                  placeholder="Ex: NORMAM-211/DPC, Anexo 2-M (Portaria DPC/MB nº 200/2026)"
                  className="mt-1 h-9 text-xs rounded-xl"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Finalidade / Objetivo Legal</Label>
                <Textarea
                  value={newDocPurpose}
                  onChange={(e) => setNewDocPurpose(e.target.value)}
                  placeholder="Ex: Formalizar comprovação técnica pericial de arqueação perante o setor de vistorias da Capitania."
                  className="mt-1 text-xs rounded-xl min-h-[70px]"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsNewDocModalOpen(false)}
                className="h-9 rounded-xl text-xs cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleSaveNewOutputDoc}
                className="h-9 rounded-xl text-xs font-bold bg-[#075BFF] hover:bg-blue-600 text-white cursor-pointer"
              >
                Cadastrar Documento
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL: EDITAR DOCUMENTO DO CATÁLOGO */}
        {/* ========================================================= */}
        <Dialog open={isEditDocModalOpen} onOpenChange={setIsEditDocModalOpen}>
          <DialogContent className="sm:max-w-[500px] p-6 rounded-2xl bg-white">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-[#0B1739]">
                Editar Documento Oficial do Catálogo
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Altere o nome, fonte regulamentar da Marinha e finalidade jurídica deste documento.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Nome Oficial do Documento *</Label>
                <Input
                  value={editDocName}
                  onChange={(e) => setEditDocName(e.target.value)}
                  placeholder="Nome oficial do formulário"
                  className="mt-1 h-9 text-xs rounded-xl"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Serviço Náutico Vinculado</Label>
                <Select value={editDocServiceId} onValueChange={setEditDocServiceId}>
                  <SelectTrigger className="mt-1 h-9 text-xs rounded-xl">
                    <SelectValue placeholder="Selecione o serviço" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl text-xs">
                    <SelectItem value="inscricao">Inscrição de embarcação</SelectItem>
                    <SelectItem value="transferencia">Transferência</SelectItem>
                    <SelectItem value="renovacao">Renovação</SelectItem>
                    <SelectItem value="segunda_via">Segunda via</SelectItem>
                    <SelectItem value="alteracao_motor">Alteração de motor</SelectItem>
                    <SelectItem value="vistoria">Vistoria</SelectItem>
                    <SelectItem value="laudo_engenharia">Laudo técnico pericial</SelectItem>
                    <SelectItem value="alteracao_cadastral">Alteração Cadastral</SelectItem>
                    <SelectItem value="despacho_porto">Despacho de Saída</SelectItem>
                    <SelectItem value="habilitacao_cha">Habilitação náutica (CHA)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Fonte Oficial / Portaria da Marinha</Label>
                <Input
                  value={editDocOfficialSource}
                  onChange={(e) => setEditDocOfficialSource(e.target.value)}
                  placeholder="Ex: NORMAM-211/DPC, Anexo 2-C"
                  className="mt-1 h-9 text-xs rounded-xl"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Papel do Signatário Requerente</Label>
                <Input
                  value={editDocSignerRole}
                  onChange={(e) => setEditDocSignerRole(e.target.value)}
                  placeholder="Ex: Proprietário Requerente ou Procurador"
                  className="mt-1 h-9 text-xs rounded-xl"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Finalidade / Objetivo Legal</Label>
                <Textarea
                  value={editDocPurpose}
                  onChange={(e) => setEditDocPurpose(e.target.value)}
                  placeholder="Finalidade do documento perante a Autoridade Marítima."
                  className="mt-1 text-xs rounded-xl min-h-[70px]"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditDocModalOpen(false)}
                className="h-9 rounded-xl text-xs cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleSaveEditDoc}
                className="h-9 rounded-xl text-xs font-bold bg-[#075BFF] hover:bg-blue-600 text-white cursor-pointer"
              >
                Salvar Alterações
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL: NOVA / EDITAR CAPITANIA (OM) */}
        {/* ========================================================= */}
        <Dialog open={capitaniaModalOpen} onOpenChange={setCapitaniaModalOpen}>
          <DialogContent className="sm:max-w-[500px] p-6 rounded-2xl bg-white">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-[#0B1739]">
                {editingCapitania ? "Editar Capitania / Delegacia" : "Nova Capitania / Delegacia"}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Cadastre os dados de contato e peculiaridades de balcão da OM da Marinha.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Sigla (OM) *</Label>
                  <Input
                    value={capFormSigla}
                    onChange={(e) => setCapFormSigla(e.target.value)}
                    placeholder="Ex: CPSP"
                    className="mt-1 h-9 text-xs rounded-xl uppercase"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Cidade / UF *</Label>
                  <Input
                    value={capFormCidade}
                    onChange={(e) => setCapFormCidade(e.target.value)}
                    placeholder="Ex: Santos/SP"
                    className="mt-1 h-9 text-xs rounded-xl"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Nome Oficial da OM *</Label>
                <Input
                  value={capFormNome}
                  onChange={(e) => setCapFormNome(e.target.value)}
                  placeholder="Ex: Capitania dos Portos de São Paulo"
                  className="mt-1 h-9 text-xs rounded-xl"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Endereço de Protocolo</Label>
                <Input
                  value={capFormEndereco}
                  onChange={(e) => setCapFormEndereco(e.target.value)}
                  placeholder="Rua, número e bairro"
                  className="mt-1 h-9 text-xs rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Telefones</Label>
                  <Input
                    value={capFormTelefones}
                    onChange={(e) => setCapFormTelefones(e.target.value)}
                    placeholder="(13) 3221-3455"
                    className="mt-1 h-9 text-xs rounded-xl"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-700">E-mail Protocolo</Label>
                  <Input
                    value={capFormEmailProtocolo}
                    onChange={(e) => setCapFormEmailProtocolo(e.target.value)}
                    placeholder="protocolo@marinha.mil.br"
                    className="mt-1 h-9 text-xs rounded-xl"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Peculiaridades / Exigências Locais</Label>
                <Textarea
                  value={capFormPeculiaridades}
                  onChange={(e) => setCapFormPeculiaridades(e.target.value)}
                  placeholder="Ex: Exige 2 fotos coloridas, agendamento prévio no portal..."
                  className="mt-1 text-xs rounded-xl min-h-[60px]"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCapitaniaModalOpen(false)}
                className="h-9 rounded-xl text-xs"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleSaveCapitaniaModal}
                className="h-9 rounded-xl text-xs font-bold bg-[#075BFF] hover:bg-blue-600 text-white"
              >
                Salvar Capitania
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ========================================================= */}
        {/* MODAL: NOVA EXIGÊNCIA DA CAPITANIA */}
        {/* ========================================================= */}
        <Dialog open={exigenciaModalOpen} onOpenChange={setExigenciaModalOpen}>
          <DialogContent className="sm:max-w-[500px] p-6 rounded-2xl bg-white">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-[#0B1739]">
                Registrar Nova Notificação / Exigência da Marinha
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Cadastre o prazo e a exigência apontada pela Capitania dos Portos.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Código do Processo</Label>
                  <Input
                    value={exigFormCodigo}
                    onChange={(e) => setExigFormCodigo(e.target.value)}
                    className="mt-1 h-9 text-xs rounded-xl font-mono"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Prazo em Dias</Label>
                  <Select
                    value={String(exigFormPrazoDias)}
                    onValueChange={(val) => setExigFormPrazoDias(Number(val))}
                  >
                    <SelectTrigger className="mt-1 h-9 text-xs rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 dias</SelectItem>
                      <SelectItem value="30">30 dias (Padrão)</SelectItem>
                      <SelectItem value="60">60 dias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Nome do Cliente *</Label>
                <Input
                  value={exigFormCliente}
                  onChange={(e) => setExigFormCliente(e.target.value)}
                  placeholder="Nome do cliente notificado"
                  className="mt-1 h-9 text-xs rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">WhatsApp do Cliente</Label>
                  <Input
                    value={exigFormTelefone}
                    onChange={(e) => setExigFormTelefone(e.target.value)}
                    placeholder="5513987654321"
                    className="mt-1 h-9 text-xs rounded-xl"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Embarcação</Label>
                  <Input
                    value={exigFormEmbarcacao}
                    onChange={(e) => setExigFormEmbarcacao(e.target.value)}
                    placeholder="Nome da embarcação"
                    className="mt-1 h-9 text-xs rounded-xl"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Capitania / OM Notificante</Label>
                <Select value={exigFormCapitania} onValueChange={setExigFormCapitania}>
                  <SelectTrigger className="mt-1 h-9 text-xs rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {capitanias.map((c) => (
                      <SelectItem key={c.id} value={`${c.sigla} - ${c.cidade}`}>
                        {c.sigla} - {c.cidade}/{c.uf}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Descrição da Exigência da Marinha *</Label>
                <Textarea
                  value={exigFormMotivo}
                  onChange={(e) => setExigFormMotivo(e.target.value)}
                  placeholder="Descreva exatamente o que a Capitania exigiu..."
                  className="mt-1 text-xs rounded-xl min-h-[70px]"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExigenciaModalOpen(false)}
                className="h-9 rounded-xl text-xs"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleSaveExigencia}
                className="h-9 rounded-xl text-xs font-bold bg-[#075BFF] hover:bg-blue-600 text-white"
              >
                Cadastrar Exigência
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
      {/* MODAL DO VISUALIZADOR OFICIAL DE FOLHA A4 */}
      <OfficialDocumentPreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        documentInfo={previewDocInfo}
      />
    </div>
  );
}
