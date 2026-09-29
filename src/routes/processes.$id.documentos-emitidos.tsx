import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { 
  ArrowLeft, 
  Search, 
  Plus, 
  ChevronDown, 
  ChevronRight, 
  FileText, 
  Loader2, 
  AlertCircle, 
  Eye, 
  Download, 
  X, 
  Info,
  Calendar,
  Building2,
  Paperclip,
  ImageIcon,
  Award,
  Upload,
  Check,
  Edit2,
  RefreshCw,
  History,
  ShieldCheck,
  FileCheck2,
  Clock,
  AlertTriangle,
  HelpCircle,
  ExternalLink
} from "lucide-react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/routes/dashboard";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { openStoredFile, downloadStoredFile } from "@/utils/file-preview";
import { uploadToBucket } from "@/lib/storage";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/processes/$id/documentos-emitidos")({
  validateSearch: (search: Record<string, unknown>): { from?: string } => ({
    ...(search.from ? { from: search.from as string } : {}),
  }),
  component: () => (
    <ProtectedRoute>
      <DashboardLayout>
        <DocumentosEmitidosPage />
      </DashboardLayout>
    </ProtectedRoute>
  ),
});

export type ValidityType = "com_vencimento" | "sem_vencimento" | "nao_informada";

export type FilterTab = "all" | "with_expiration" | "no_expiration" | "expired";

export interface VersionHistoryEntry {
  version: number;
  file_name: string;
  file_url: string;
  file_size?: number;
  file_type?: string;
  replaced_at: string;
  replaced_by_name?: string;
  reason?: string | null;
}

export interface DocumentItem {
  id: string;
  company_id: string;
  process_id: string;
  customer_id: string | null;
  vessel_id: string | null;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  category: string;
  status: string;
  created_at: string;
  metadata?: {
    document_name?: string;
    document_type?: string;
    document_number?: string | null;
    issuing_agency?: string | null;
    issue_date?: string | null;
    validity_type?: ValidityType;
    expiration_date?: string | null;
    has_expiration?: boolean;
    status?: string;
    notes?: string | null;
    version?: number;
    version_history?: VersionHistoryEntry[];
    registered_by_name?: string;
    registered_by_id?: string;
    registered_at?: string;
    last_modified_at?: string;
  };
}

export const COMMON_DOCUMENT_TYPES = [
  { value: "tie", label: "TIE — Termo de Inscrição de Embarcação" },
  { value: "tiem", label: "TIEM — Termo de Inscrição de Embarcação Miúda" },
  { value: "csn", label: "CSN — Certificado de Segurança da Navegação" },
  { value: "cts", label: "CTS — Certificado de Tripulação de Segurança" },
  { value: "licenca_pesca", label: "Licença / Autorização de Pesca" },
  { value: "termo_vistoria", label: "Termo ou Laudo de Vistoria Oficial" },
  { value: "certidao_quitacao", label: "Certidão de Quitação ou Regularidade" },
  { value: "outro", label: "Outro documento oficial emitido" },
];

export function getDocumentTypeLabel(typeValue?: string): string {
  if (!typeValue) return "Documento oficial";
  const found = COMMON_DOCUMENT_TYPES.find((t) => t.value === typeValue);
  return found ? found.label.split(" — ")[0] : typeValue;
}

export function computeValidityInfo(meta?: DocumentItem["metadata"]) {
  const validityType = meta?.validity_type || (meta?.expiration_date ? "com_vencimento" : "nao_informada");
  const expirationDate = meta?.expiration_date;

  if (validityType === "sem_vencimento") {
    return {
      status: "no_expiration" as const,
      label: "Sem vencimento",
      displayDate: "Sem vencimento",
      isNearExpiry: false,
      isExpired: false,
    };
  }

  if (validityType === "nao_informada" || !expirationDate) {
    return {
      status: "unspecified" as const,
      label: "Vencimento não informado",
      displayDate: "Vencimento não informado",
      isNearExpiry: false,
      isExpired: false,
    };
  }

  // Parse safe local date YYYY-MM-DD
  const parts = expirationDate.split("T")[0].split("-");
  const expYear = parseInt(parts[0], 10);
  const expMonth = parseInt(parts[1], 10) - 1;
  const expDay = parseInt(parts[2], 10);

  const expDateObj = new Date(expYear, expMonth, expDay);
  expDateObj.setHours(0, 0, 0, 0);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = expDateObj.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const formattedDate = `${String(expDay).padStart(2, "0")}/${String(expMonth + 1).padStart(2, "0")}/${expYear}`;

  if (diffDays < 0) {
    return {
      status: "expired" as const,
      label: "Vencido",
      displayDate: formattedDate,
      isNearExpiry: false,
      isExpired: true,
      diffDays,
    };
  }

  if (diffDays <= 30) {
    return {
      status: "expiring_soon" as const,
      label: diffDays === 0 ? "Vence hoje" : `Vence em ${diffDays}d`,
      displayDate: formattedDate,
      isNearExpiry: true,
      isExpired: false,
      diffDays,
    };
  }

  return {
    status: "active" as const,
    label: "Vigente",
    displayDate: formattedDate,
    isNearExpiry: false,
    isExpired: false,
    diffDays,
  };
}

function DocumentosEmitidosPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const companyId = profile?.company_id;

  // Estados principais de contexto
  const [processData, setProcessData] = useState<any | null>(null);
  const [customer, setCustomer] = useState<any | null>(null);
  const [vessel, setVessel] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  // Lista de Documentos Emitidos
  const [issuedList, setIssuedList] = useState<DocumentItem[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");

  // IDs expandidos na lista
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Modal: Adicionar Documento Emitido
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    documentName: "",
    documentType: "tie",
    documentNumber: "",
    issuingAgency: "",
    issueDate: "",
    validityType: "nao_informada" as ValidityType,
    expirationDate: "",
    notes: "",
  });
  const [selectedAddFile, setSelectedAddFile] = useState<File | null>(null);
  const [isAddingSubmitting, setIsAddingSubmitting] = useState(false);
  const [addFormErrors, setAddFormErrors] = useState<Record<string, string>>({});

  // Modal: Editar Informações
  const [editDoc, setEditDoc] = useState<DocumentItem | null>(null);
  const [editForm, setEditForm] = useState({
    documentName: "",
    documentType: "tie",
    documentNumber: "",
    issuingAgency: "",
    issueDate: "",
    validityType: "nao_informada" as ValidityType,
    expirationDate: "",
    notes: "",
  });
  const [isEditingSubmitting, setIsEditingSubmitting] = useState(false);
  const [editFormErrors, setEditFormErrors] = useState<Record<string, string>>({});

  // Modal: Substituir Arquivo
  const [replaceDoc, setReplaceDoc] = useState<DocumentItem | null>(null);
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [replaceReason, setReplaceReason] = useState("");
  const [isReplacingSubmitting, setIsReplacingSubmitting] = useState(false);
  const [replaceError, setReplaceError] = useState<string | null>(null);

  // Modal: Histórico de Versões
  const [historyDoc, setHistoryDoc] = useState<DocumentItem | null>(null);

  // 1. Carregar Ocorrência do Processo / Serviço
  const loadProcessDetails = useCallback(async () => {
    if (!companyId || !id) return;
    setIsLoading(true);
    setIsError(false);

    try {
      const { data: proc, error: pError } = await supabase
        .from("processes")
        .select(`
          *,
          customer:customers!processes_customer_id_fkey(id, name, cpf_cnpj, email, phone),
          vessel:vessels!processes_vessel_id_fkey(id, name, registration_number, category, vessel_type)
        `)
        .eq("id", id)
        .eq("company_id", companyId)
        .maybeSingle();

      if (pError || !proc) {
        setIsError(true);
        setIsLoading(false);
        return;
      }

      setProcessData(proc);
      setCustomer(proc.customer || null);
      setVessel(proc.vessel || null);
    } catch (err) {
      console.error("Erro ao carregar detalhes do serviço:", err);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [companyId, id]);

  // 2. Carregar Registros de Documentos Emitidos (category: 'issued')
  const loadIssuedDocuments = useCallback(async () => {
    if (!companyId || !id) return;
    setIsLoadingDocs(true);

    try {
      const { data: filesData, error: fError } = await supabase
        .from("uploaded_files")
        .select("*")
        .eq("company_id", companyId)
        .eq("process_id", id)
        .eq("category", "issued")
        .order("created_at", { ascending: false });

      if (fError) throw fError;

      const docs = (filesData || []) as DocumentItem[];

      // Ordenação inicial:
      // Documentos com vencimento ordenados pelo vencimento mais próximo (crescente).
      // Documentos sem vencimento ou com vencimento não informado ficam ao final.
      docs.sort((a, b) => {
        const aMeta = a.metadata || {};
        const bMeta = b.metadata || {};

        const aHasExp = aMeta.validity_type === "com_vencimento" && Boolean(aMeta.expiration_date);
        const bHasExp = bMeta.validity_type === "com_vencimento" && Boolean(bMeta.expiration_date);

        if (aHasExp && bHasExp) {
          return (aMeta.expiration_date || "").localeCompare(bMeta.expiration_date || "");
        }
        if (aHasExp && !bHasExp) return -1;
        if (!aHasExp && bHasExp) return 1;

        // Ambos sem vencimento ou não informado: ordenação alfabética por nome
        const nameA = (aMeta.document_name || a.file_name || "").toLowerCase();
        const nameB = (bMeta.document_name || b.file_name || "").toLowerCase();
        return nameA.localeCompare(nameB);
      });

      setIssuedList(docs);

      // Se houver apenas 1 documento, expande-o automaticamente
      if (docs.length === 1) {
        setExpandedIds(new Set([docs[0].id]));
      }
    } catch (err) {
      console.error("Erro ao carregar documentos emitidos:", err);
    } finally {
      setIsLoadingDocs(false);
    }
  }, [companyId, id]);

  useEffect(() => {
    loadProcessDetails();
    loadIssuedDocuments();
  }, [loadProcessDetails, loadIssuedDocuments]);

  // Normalização do Título e Código do Processo
  const serviceTitle = useMemo(() => {
    return processData?.title || processData?.process_type || "Transferência de propriedade";
  }, [processData]);

  const protocolCode = useMemo(() => {
    return processData?.protocol_number || `PROC-${String(processData?.id || id).slice(0, 4).toUpperCase()}`;
  }, [processData, id]);

  const customerName = useMemo(() => {
    return customer?.fantasy_name || customer?.name || "Cliente";
  }, [customer]);

  const vesselName = useMemo(() => {
    return vessel?.name || "Embarcação";
  }, [vessel]);

  // Toggle de expansão de detalhes
  const toggleExpand = (itemId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  // Safe Date Formatter pt-BR
  const formatDateSafe = (dateStr: string | null | undefined) => {
    if (!dateStr) return "Não informada";
    try {
      const parts = dateStr.split("T")[0].split("-");
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return new Date(dateStr).toLocaleDateString("pt-BR");
    } catch {
      return dateStr;
    }
  };

  // Contadores para as tabs de filtro
  const counts = useMemo(() => {
    let withExp = 0;
    let noExp = 0;
    let expired = 0;
    let nearExpiry = 0;

    issuedList.forEach((doc) => {
      const v = computeValidityInfo(doc.metadata);
      if (v.status === "expired") {
        expired++;
        withExp++;
      } else if (v.status === "expiring_soon") {
        nearExpiry++;
        withExp++;
      } else if (v.status === "active") {
        withExp++;
      } else {
        noExp++;
      }
    });

    return {
      all: issuedList.length,
      withExpiration: withExp,
      noExpiration: noExp,
      expired,
      nearExpiry,
    };
  }, [issuedList]);

  // Filtragem e pesquisa
  const filteredDocuments = useMemo(() => {
    return issuedList.filter((doc) => {
      const meta = doc.metadata || {};
      const validityInfo = computeValidityInfo(meta);

      // Filtro por tab
      if (filterTab === "with_expiration") {
        if (validityInfo.status === "no_expiration" || validityInfo.status === "unspecified") {
          return false;
        }
      } else if (filterTab === "no_expiration") {
        if (validityInfo.status !== "no_expiration" && validityInfo.status !== "unspecified") {
          return false;
        }
      } else if (filterTab === "expired") {
        if (validityInfo.status !== "expired") {
          return false;
        }
      }

      // Filtro por termo de busca (nome, número ou órgão emissor)
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const name = (meta.document_name || doc.file_name || "").toLowerCase();
        const num = (meta.document_number || "").toLowerCase();
        const agency = (meta.issuing_agency || "").toLowerCase();
        const type = (meta.document_type || "").toLowerCase();
        const matches = name.includes(term) || num.includes(term) || agency.includes(term) || type.includes(term);
        if (!matches) return false;
      }

      return true;
    });
  }, [issuedList, filterTab, searchTerm]);

  // Manipulação de arquivo no modal de adição
  const handleAddFileSelect = (file: File | undefined | null) => {
    if (!file) return;

    const validTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    const validExts = [".pdf", ".png", ".jpg", ".jpeg"];

    if (!validTypes.includes(file.type) && !validExts.includes(ext)) {
      setAddFormErrors((prev) => ({
        ...prev,
        file: "Formato inválido. Selecione um arquivo PDF, JPG ou PNG.",
      }));
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setAddFormErrors((prev) => ({
        ...prev,
        file: "Arquivo muito grande. O limite máximo é de 10MB.",
      }));
      return;
    }

    setSelectedAddFile(file);
    setAddFormErrors((prev) => {
      const copy = { ...prev };
      delete copy.file;
      return copy;
    });
  };

  // Submissão do modal: Adicionar Documento Emitido
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!addForm.documentName.trim()) {
      errors.documentName = "Nome do documento é obrigatório.";
    }
    if (addForm.validityType === "com_vencimento" && !addForm.expirationDate) {
      errors.expirationDate = "Data de vencimento é obrigatória quando 'Com vencimento' está selecionado.";
    }
    if (!selectedAddFile) {
      errors.file = "É obrigatório anexar o arquivo do documento emitido.";
    }

    if (Object.keys(errors).length > 0) {
      setAddFormErrors(errors);
      return;
    }

    if (!selectedAddFile || !companyId || !id) return;

    setIsAddingSubmitting(true);
    try {
      const cleanFileName = selectedAddFile.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const storagePath = `${companyId}/${id}/issued_${Date.now()}_${cleanFileName}`;

      await uploadToBucket("process-attachments", storagePath, selectedAddFile, {
        allowedExtensions: [".pdf", ".png", ".jpg", ".jpeg"],
      });

      // Calcular status preparado para o Notificador
      const validityInfo = computeValidityInfo({
        validity_type: addForm.validityType,
        expiration_date: addForm.validityType === "com_vencimento" ? addForm.expirationDate : null,
      });

      const now = new Date().toISOString();
      const metadataPayload = {
        document_name: addForm.documentName.trim(),
        document_type: addForm.documentType || "outro",
        document_number: addForm.documentNumber.trim() || null,
        issuing_agency: addForm.issuingAgency.trim() || null,
        issue_date: addForm.issueDate || null,
        validity_type: addForm.validityType,
        expiration_date: addForm.validityType === "com_vencimento" ? addForm.expirationDate : null,
        has_expiration: addForm.validityType === "com_vencimento" && Boolean(addForm.expirationDate),
        status: validityInfo.status,
        notes: addForm.notes.trim() || null,
        version: 1,
        version_history: [],
        registered_by_name: profile?.name || "Usuário",
        registered_by_id: profile?.id,
        registered_at: now,
        last_modified_at: now,
      };

      const { error: insertError } = await supabase
        .from("uploaded_files")
        .insert({
          company_id: companyId,
          process_id: id,
          customer_id: customer?.id || null,
          vessel_id: vessel?.id || null,
          file_name: selectedAddFile.name,
          file_url: storagePath,
          file_type: selectedAddFile.type,
          file_size: selectedAddFile.size,
          category: "issued",
          status: "uploaded",
          metadata: metadataPayload,
          uploaded_by: profile?.id || null,
        });

      if (insertError) throw insertError;

      toast.success("Documento emitido adicionado com sucesso!");
      setIsAddModalOpen(false);
      setAddForm({
        documentName: "",
        documentType: "tie",
        documentNumber: "",
        issuingAgency: "",
        issueDate: "",
        validityType: "nao_informada",
        expirationDate: "",
        notes: "",
      });
      setSelectedAddFile(null);
      setAddFormErrors({});
      loadIssuedDocuments();
    } catch (err: any) {
      console.error("Erro ao adicionar documento emitido:", err);
      toast.error(err?.message || "Não foi possível salvar o documento emitido.");
    } finally {
      setIsAddingSubmitting(false);
    }
  };

  // Abrir Modal de Edição
  const openEditModal = (doc: DocumentItem) => {
    const meta = doc.metadata || {};
    setEditDoc(doc);
    setEditForm({
      documentName: meta.document_name || doc.file_name || "",
      documentType: meta.document_type || "outro",
      documentNumber: meta.document_number || "",
      issuingAgency: meta.issuing_agency || "",
      issueDate: meta.issue_date || "",
      validityType: (meta.validity_type as ValidityType) || (meta.expiration_date ? "com_vencimento" : "nao_informada"),
      expirationDate: meta.expiration_date || "",
      notes: meta.notes || "",
    });
    setEditFormErrors({});
  };

  // Submissão do Modal: Editar Informações (preserva arquivo e histórico)
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDoc || !companyId) return;

    const errors: Record<string, string> = {};
    if (!editForm.documentName.trim()) {
      errors.documentName = "Nome do documento é obrigatório.";
    }
    if (editForm.validityType === "com_vencimento" && !editForm.expirationDate) {
      errors.expirationDate = "Data de vencimento é obrigatória quando 'Com vencimento' está selecionado.";
    }

    if (Object.keys(errors).length > 0) {
      setEditFormErrors(errors);
      return;
    }

    setIsEditingSubmitting(true);
    try {
      const existingMeta = editDoc.metadata || {};
      const validityInfo = computeValidityInfo({
        validity_type: editForm.validityType,
        expiration_date: editForm.validityType === "com_vencimento" ? editForm.expirationDate : null,
      });

      const updatedMeta = {
        ...existingMeta,
        document_name: editForm.documentName.trim(),
        document_type: editForm.documentType,
        document_number: editForm.documentNumber.trim() || null,
        issuing_agency: editForm.issuingAgency.trim() || null,
        issue_date: editForm.issueDate || null,
        validity_type: editForm.validityType,
        expiration_date: editForm.validityType === "com_vencimento" ? editForm.expirationDate : null,
        has_expiration: editForm.validityType === "com_vencimento" && Boolean(editForm.expirationDate),
        status: validityInfo.status,
        notes: editForm.notes.trim() || null,
        last_modified_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from("uploaded_files")
        .update({
          metadata: updatedMeta,
        })
        .eq("id", editDoc.id)
        .eq("company_id", companyId);

      if (updateError) throw updateError;

      toast.success("Informações do documento atualizadas com sucesso!");
      setEditDoc(null);
      loadIssuedDocuments();
    } catch (err: any) {
      console.error("Erro ao atualizar informações do documento:", err);
      toast.error(err?.message || "Não foi possível atualizar o documento.");
    } finally {
      setIsEditingSubmitting(false);
    }
  };

  // Abrir Modal de Substituição de Arquivo
  const openReplaceModal = (doc: DocumentItem) => {
    setReplaceDoc(doc);
    setReplaceFile(null);
    setReplaceReason("");
    setReplaceError(null);
  };

  // Submissão do Modal: Substituir Arquivo (preserva o histórico de versões)
  const handleReplaceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replaceDoc || !companyId || !id) return;

    if (!replaceFile) {
      setReplaceError("Selecione um novo arquivo para substituir.");
      return;
    }

    setIsReplacingSubmitting(true);
    setReplaceError(null);

    try {
      const cleanFileName = replaceFile.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const storagePath = `${companyId}/${id}/issued_${Date.now()}_${cleanFileName}`;

      await uploadToBucket("process-attachments", storagePath, replaceFile, {
        allowedExtensions: [".pdf", ".png", ".jpg", ".jpeg"],
      });

      const currentMeta = replaceDoc.metadata || {};
      const currentVersion = currentMeta.version || 1;
      const historyList: VersionHistoryEntry[] = Array.isArray(currentMeta.version_history)
        ? [...currentMeta.version_history]
        : [];

      // Adicionar arquivo anterior ao histórico de versões
      historyList.push({
        version: currentVersion,
        file_name: replaceDoc.file_name,
        file_url: replaceDoc.file_url,
        file_size: replaceDoc.file_size || undefined,
        file_type: replaceDoc.file_type || undefined,
        replaced_at: new Date().toISOString(),
        replaced_by_name: profile?.name || "Usuário",
        reason: replaceReason.trim() || "Substituição de arquivo realizada no NavalDocs",
      });

      const newVersion = currentVersion + 1;
      const updatedMeta = {
        ...currentMeta,
        version: newVersion,
        version_history: historyList,
        last_modified_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from("uploaded_files")
        .update({
          file_name: replaceFile.name,
          file_url: storagePath,
          file_size: replaceFile.size,
          file_type: replaceFile.type,
          metadata: updatedMeta,
        })
        .eq("id", replaceDoc.id)
        .eq("company_id", companyId);

      if (updateError) throw updateError;

      toast.success(`Arquivo substituído com sucesso! (Nova versão: v${newVersion})`);
      setReplaceDoc(null);
      setReplaceFile(null);
      loadIssuedDocuments();
    } catch (err: any) {
      console.error("Erro ao substituir arquivo:", err);
      setReplaceError(err?.message || "Não foi possível substituir o arquivo.");
    } finally {
      setIsReplacingSubmitting(false);
    }
  };

  // Estados de Carregamento e Erro Inicial
  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto py-6 px-4 space-y-6">
        <div className="h-6 w-36 bg-slate-100 rounded-lg animate-pulse" />
        <div className="space-y-2">
          <div className="h-9 w-64 bg-slate-200 rounded-xl animate-pulse" />
          <div className="h-4 w-72 bg-slate-100 rounded-lg animate-pulse" />
        </div>
        <div className="h-28 bg-white border border-slate-200/90 rounded-2xl animate-pulse" />
        <div className="h-80 bg-white border border-slate-200/90 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (isError || !processData) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center space-y-4">
        <div className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto border border-red-100">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold text-[#0B1739]">Serviço não encontrado</h2>
        <p className="text-sm text-slate-500">
          A ocorrência deste serviço não existe ou você não possui permissão para visualizá-la nesta empresa.
        </p>
        <div className="pt-2">
          <Link
            to="/processes"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#075BFF] text-white text-xs font-semibold hover:bg-blue-600 transition-colors shadow-xs"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar para processos</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-2 sm:py-6 px-2 sm:px-4 space-y-6">
      {/* 1. NAVEGAÇÃO SUPERIOR: VOLTAR + BREADCRUMBS (Cliente → Embarcação → Serviço → Documentos emitidos) */}
      <div className="space-y-2">
        <div>
          <Link
            to="/processes/$id"
            params={{ id }}
            id="btn-voltar-ao-servico"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[#075BFF] hover:underline cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Voltar ao serviço</span>
          </Link>
        </div>

        {/* Caminho estruturado Cliente → Embarcação → Serviço → Documentos emitidos */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium overflow-x-auto whitespace-nowrap">
          {customer ? (
            <Link to="/customers/$id" params={{ id: customer.id }} className="hover:text-slate-600 hover:underline truncate max-w-[160px]">
              {customerName}
            </Link>
          ) : (
            <span>{customerName}</span>
          )}
          <span>/</span>
          {vessel ? (
            <Link to="/vessels/$id" params={{ id: vessel.id }} className="hover:text-slate-600 hover:underline truncate max-w-[160px] font-bold text-slate-700">
              {vesselName}
            </Link>
          ) : (
            <span className="font-bold text-slate-700">{vesselName}</span>
          )}
          <span>/</span>
          <Link to="/processes/$id" params={{ id }} className="hover:text-slate-600 hover:underline">
            {serviceTitle}
          </Link>
          <span>/</span>
          <span className="text-slate-700 font-semibold">Documentos emitidos</span>
        </div>
      </div>

      {/* 2. CABEÇALHO DA PÁGINA + AÇÃO PRINCIPAL */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold text-[#0B1739] tracking-tight">
              Documentos emitidos
            </h1>
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80">
              NavalDocs
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Certificados, termos e documentos oficiais emitidos ou recebidos após o atendimento deste serviço.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#075BFF] hover:bg-blue-600 text-white text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Adicionar documento emitido</span>
          </button>
        </div>
      </div>

      {/* 3. RESUMO DO CONTEXTO VINCULADO (4 COLUNAS: CLIENTE, EMBARCAÇÃO, SERVIÇO, PROCESSO) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
        {/* Cliente */}
        <div className="space-y-1">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Cliente
          </p>
          <p className="text-sm font-bold text-[#0B1739] truncate">
            {customerName}
          </p>
          {customer?.cpf_cnpj && (
            <p className="text-[11px] text-slate-400">{customer.cpf_cnpj}</p>
          )}
        </div>

        {/* Embarcação */}
        <div className="pt-3 sm:pt-0 sm:pl-6 space-y-1">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Embarcação vinculada
          </p>
          <p className="text-sm font-bold text-[#0B1739] truncate">
            {vesselName}
          </p>
          {vessel?.registration_number && (
            <p className="text-[11px] text-slate-400">Inscrição: {vessel.registration_number}</p>
          )}
        </div>

        {/* Serviço */}
        <div className="pt-3 sm:pt-0 sm:pl-6 space-y-1">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Serviço de origem
          </p>
          <p className="text-sm font-bold text-[#0B1739] truncate">
            {serviceTitle}
          </p>
        </div>

        {/* Processo */}
        <div className="pt-3 sm:pt-0 sm:pl-6 space-y-1">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Número do processo
          </p>
          <p className="text-sm font-bold text-[#0B1739]">
            {protocolCode}
          </p>
        </div>
      </div>

      {/* 4. CALLOUT DISCRETO DE DIFERENCIAÇÃO CLARA DOS TIPOS DE DOCUMENTO */}
      <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 text-xs text-slate-600 space-y-2">
        <div className="flex items-center gap-2 font-bold text-[#0B1739]">
          <ShieldCheck className="h-4 w-4 text-[#075BFF] shrink-0" />
          <span>Classificação dos documentos no NavalDocs Pro</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1 text-[11px] leading-relaxed">
          <div className="p-2.5 bg-white rounded-xl border border-slate-200/60 space-y-1">
            <span className="font-bold text-slate-700 block">1. Documentos Gerados</span>
            <p className="text-slate-500">Minutas, procurações e requerimentos gerados pelo sistema para instruir o processo.</p>
          </div>
          <div className="p-2.5 bg-white rounded-xl border border-slate-200/60 space-y-1">
            <span className="font-bold text-slate-700 block">2. Protocolos Apresentados</span>
            <p className="text-slate-500">Comprovantes de entrada e protocolização entregues aos órgãos e capitanias.</p>
          </div>
          <div className="p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-200/60 space-y-1">
            <span className="font-bold text-emerald-800 block">3. Documentos Emitidos (esta tela)</span>
            <p className="text-emerald-700">Documentos e certificados efetivamente emitidos ou recebidos após o atendimento.</p>
          </div>
        </div>
        <p className="text-[11px] text-slate-400 pt-0.5">
          * Um PDF gerado pelo sistema não aparece automaticamente aqui. Apenas documentos com emissão confirmada constam nesta relação.
        </p>
      </div>

      {/* 5. AVISO DISCRETO PARA PRAZOS PRÓXIMOS OU VENCIDOS */}
      {(counts.nearExpiry > 0 || counts.expired > 0) && (
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3.5 sm:p-4 flex items-start gap-3 text-xs text-amber-900">
          <Clock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold text-amber-950">
              Aviso de prazos da embarcação
            </p>
            <p className="text-amber-800 leading-relaxed">
              Existem {counts.expired > 0 && <strong>{counts.expired} documento(s) vencido(s)</strong>}
              {counts.expired > 0 && counts.nearExpiry > 0 && " e "}
              {counts.nearExpiry > 0 && <strong>{counts.nearExpiry} documento(s) com vencimento próximo (menos de 30 dias)</strong>} vinculados a esta embarcação. Verifique a necessidade de renovação ou acompanhamento junto ao cliente.
            </p>
          </div>
        </div>
      )}

      {/* 6. BARRA DE PESQUISA & FILTROS (TODOS, COM VENCIMENTO, SEM VENCIMENTO, VENCIDOS) */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Tabs de Filtro */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto text-xs font-semibold">
            <button
              type="button"
              onClick={() => setFilterTab("all")}
              className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                filterTab === "all"
                  ? "bg-white text-[#0B1739] shadow-xs"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Todos ({counts.all})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("with_expiration")}
              className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                filterTab === "with_expiration"
                  ? "bg-white text-[#0B1739] shadow-xs"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Com vencimento ({counts.withExpiration})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("no_expiration")}
              className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                filterTab === "no_expiration"
                  ? "bg-white text-[#0B1739] shadow-xs"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Sem vencimento ({counts.noExpiration})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("expired")}
              className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                filterTab === "expired"
                  ? "bg-white text-red-600 shadow-xs"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Vencidos ({counts.expired})
            </button>
          </div>

          {/* Campo de Busca por Nome ou Número */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar por nome ou número..."
              className="w-full pl-10 pr-9 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 7. LISTAGEM PRINCIPAL DE DOCUMENTOS EMITIDOS */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
        {/* Cabeçalho da Tabela em Desktop */}
        <div className="hidden lg:grid grid-cols-12 gap-3 px-6 py-3.5 bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          <div className="col-span-4">Documento / Tipo</div>
          <div className="col-span-2">Número / Órgão</div>
          <div className="col-span-2">Emissão</div>
          <div className="col-span-2">Vencimento & Situação</div>
          <div className="col-span-2 text-right">Ações</div>
        </div>

        {/* Conteúdo da Lista */}
        {isLoadingDocs ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2 text-xs text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin text-[#075BFF]" />
            <span>Carregando documentos emitidos da embarcação...</span>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="py-16 text-center space-y-3 px-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#075BFF] flex items-center justify-center mx-auto border border-blue-100">
              <Award className="h-7 w-7" />
            </div>
            <p className="font-bold text-slate-800 text-base">
              {issuedList.length === 0 
                ? "Nenhum documento emitido cadastrado neste serviço" 
                : "Nenhum documento encontrado para os filtros selecionados"}
            </p>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              {issuedList.length === 0
                ? "Esta embarcação ainda não possui documentos emitidos registrados para este atendimento. Quando o órgão marítimo emitir o documento final (ex: TIE, TIEM, certidão), adicione-o aqui."
                : "Tente ajustar o termo de pesquisa ou selecionar outra aba de filtro acima."}
            </p>
            <div className="pt-2 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-semibold shadow-xs cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Adicionar documento emitido</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredDocuments.map((doc) => {
              const meta = doc.metadata || {};
              const docName = meta.document_name || doc.file_name || "Documento emitido";
              const docTypeLabel = getDocumentTypeLabel(meta.document_type);
              const docNumber = meta.document_number || "Sem número informado";
              const agency = meta.issuing_agency || "Órgão não informado";
              const issueDate = formatDateSafe(meta.issue_date);
              const validityInfo = computeValidityInfo(meta);
              const isExpanded = expandedIds.has(doc.id);
              const currentVersion = meta.version || 1;
              const hasHistory = Array.isArray(meta.version_history) && meta.version_history.length > 0;
              const registeredBy = meta.registered_by_name || profile?.name || "Usuário";
              const registeredDate = formatDateSafe(meta.registered_at || doc.created_at);

              return (
                <div key={doc.id} className="transition-colors hover:bg-slate-50/40">
                  {/* Linha Principal da Tabela */}
                  <div className="p-4 sm:px-6 sm:py-4 grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
                    {/* Coluna 1: Documento & Tipo */}
                    <div className="lg:col-span-4 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#0B1739] truncate">
                          {docName}
                        </span>
                        {currentVersion > 1 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-50 text-[#075BFF] border border-blue-100">
                            v{currentVersion}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                        <span className="font-medium text-slate-600">{docTypeLabel}</span>
                        <span>•</span>
                        <span className="truncate">{vesselName}</span>
                      </div>
                    </div>

                    {/* Coluna 2: Número & Órgão */}
                    <div className="lg:col-span-2 text-xs text-slate-600 flex items-center justify-between lg:block">
                      <span className="lg:hidden text-[11px] font-semibold text-slate-400">Número / Órgão:</span>
                      <div>
                        <p className="font-semibold text-slate-800 truncate">{docNumber}</p>
                        <p className="text-[11px] text-slate-400 truncate">{agency}</p>
                      </div>
                    </div>

                    {/* Coluna 3: Emissão */}
                    <div className="lg:col-span-2 text-xs text-slate-600 flex items-center justify-between lg:block">
                      <span className="lg:hidden text-[11px] font-semibold text-slate-400">Emissão:</span>
                      <div>
                        <p className="font-medium text-slate-700">{issueDate}</p>
                        <p className="text-[10px] text-slate-400">{customerName}</p>
                      </div>
                    </div>

                    {/* Coluna 4: Vencimento & Situação */}
                    <div className="lg:col-span-2 text-xs flex items-center justify-between lg:block">
                      <span className="lg:hidden text-[11px] font-semibold text-slate-400">Validade:</span>
                      <div className="space-y-1">
                        <p className={`font-semibold ${
                          validityInfo.status === "expired" 
                            ? "text-red-600" 
                            : validityInfo.status === "expiring_soon"
                            ? "text-amber-600"
                            : "text-slate-800"
                        }`}>
                          {validityInfo.displayDate}
                        </p>
                        
                        {/* Badges de Situação */}
                        <div>
                          {validityInfo.status === "expired" && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                              <AlertCircle className="h-3 w-3" />
                              Vencido
                            </span>
                          )}
                          {validityInfo.status === "expiring_soon" && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="h-3 w-3" />
                              {validityInfo.label}
                            </span>
                          )}
                          {validityInfo.status === "active" && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Check className="h-3 w-3" />
                              Vigente
                            </span>
                          )}
                          {validityInfo.status === "no_expiration" && (
                            <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                              Sem vencimento
                            </span>
                          )}
                          {validityInfo.status === "unspecified" && (
                            <span className="inline-flex items-center text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-50/60 text-slate-500 border border-blue-100/60">
                              Vencimento não informado
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Coluna 5: Ações Rápidas & Expandir */}
                    <div className="lg:col-span-2 flex items-center justify-end gap-1.5 pt-2 lg:pt-0">
                      <button
                        type="button"
                        onClick={() => openStoredFile(doc)}
                        title="Visualizar arquivo"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-[#075BFF] hover:bg-blue-50 transition-colors cursor-pointer"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadStoredFile(doc, doc.file_name)}
                        title="Baixar arquivo"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-[#075BFF] hover:bg-blue-50 transition-colors cursor-pointer"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleExpand(doc.id)}
                        aria-expanded={isExpanded}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-blue-300 bg-white hover:bg-blue-50/40 text-slate-700 hover:text-[#075BFF] text-xs font-semibold transition-all cursor-pointer"
                      >
                        <span>Detalhes</span>
                        {isExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Painel Expansível de Detalhes e Ações de Edição/Substituição/Histórico */}
                  {isExpanded && (
                    <div className="px-4 sm:px-6 pb-5 pt-2 bg-[#F9FBFF] border-t border-slate-100 space-y-4">
                      {/* Linha de Ações: Editar Informações, Substituir Arquivo, Histórico */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-b border-slate-200/60 pb-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(doc)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                          >
                            <Edit2 className="h-3.5 w-3.5 text-slate-500" />
                            <span>Editar informações</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openReplaceModal(doc)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-200 bg-white hover:bg-blue-50 text-[#075BFF] text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            <span>Substituir arquivo</span>
                          </button>
                          {hasHistory && (
                            <button
                              type="button"
                              onClick={() => setHistoryDoc(doc)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-medium shadow-2xs transition-colors cursor-pointer"
                            >
                              <History className="h-3.5 w-3.5 text-slate-500" />
                              <span>Histórico de versões ({meta.version_history?.length})</span>
                            </button>
                          )}
                        </div>

                        <div className="text-[11px] text-slate-400">
                          ID: <span className="font-mono text-slate-500">{doc.id.slice(0, 8)}</span> • Última alteração: {formatDateSafe(meta.last_modified_at || doc.created_at)}
                        </div>
                      </div>

                      {/* Card do Arquivo Anexado Atual */}
                      <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-red-50 text-red-500 flex items-center justify-center shrink-0 border border-red-100">
                            {doc.file_type?.includes("image") ? (
                              <ImageIcon className="h-5 w-5 text-blue-500" />
                            ) : (
                              <FileText className="h-5 w-5" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-xs sm:text-sm text-[#0B1739] truncate">
                              {doc.file_name}
                            </p>
                            <div className="flex items-center gap-2 text-[11px] text-slate-400">
                              <span>{doc.file_size ? `${(doc.file_size / 1024).toFixed(0)} KB` : "Arquivo digital"}</span>
                              <span>•</span>
                              <span>Versão {currentVersion} {currentVersion === 1 ? "(Original)" : "(Atualizada)"}</span>
                              <span>•</span>
                              <span>Anexado por {registeredBy} em {registeredDate}</span>
                            </div>
                          </div>
                        </div>

                        {/* Botões de Ação do Arquivo */}
                        <div className="flex items-center gap-3 self-end sm:self-auto border-t sm:border-t-0 pt-2 sm:pt-0 w-full sm:w-auto justify-end">
                          <button
                            type="button"
                            onClick={() => openStoredFile(doc)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#075BFF] hover:underline cursor-pointer"
                          >
                            <Eye className="h-4 w-4" />
                            <span>Visualizar</span>
                          </button>
                          <div className="h-4 w-px bg-slate-200" />
                          <button
                            type="button"
                            onClick={() => downloadStoredFile(doc, doc.file_name)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#075BFF] hover:underline cursor-pointer"
                          >
                            <Download className="h-4 w-4" />
                            <span>Baixar</span>
                          </button>
                        </div>
                      </div>

                      {/* Observações do Documento */}
                      {meta.notes && (
                        <div className="p-3 bg-white border border-slate-200/80 rounded-xl text-xs space-y-1">
                          <p className="font-bold text-slate-700">Observações do documento:</p>
                          <p className="text-slate-600 leading-relaxed">{meta.notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 8. RODAPÉ INFORMATIVO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400 py-1 border-t border-slate-200/60">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-[#075BFF] shrink-0" />
          <span>Os documentos emitidos ficam permanentemente vinculados à empresa, ao cliente, à embarcação e ao serviço.</span>
        </div>
        <div className="text-[11px] text-slate-400">
          Total de registros: {issuedList.length}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: ADICIONAR DOCUMENTO EMITIDO */}
      {/* ========================================================================= */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl bg-white border border-slate-200">
          <DialogHeader className="p-5 sm:p-6 border-b border-slate-100 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#075BFF] flex items-center justify-center shrink-0 border border-blue-100">
                <Upload className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-[#0B1739]">
                  Adicionar documento emitido
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Anexe o documento recebido e registre suas informações oficiais.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleAddSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              {/* Contexto Fixo do Vínculo */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs text-slate-600 space-y-1">
                <p className="font-bold text-[#0B1739]">Vínculo do serviço e embarcação</p>
                <p>Cliente: <strong>{customerName}</strong> • Embarcação: <strong>{vesselName}</strong></p>
                <p>Serviço: <strong>{serviceTitle}</strong> ({protocolCode})</p>
              </div>

              {/* Arquivo do Documento (Obrigatório) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Arquivo do documento emitido (PDF, PNG ou JPG) <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  accept=".pdf,application/pdf,image/png,image/jpeg,image/jpg"
                  onChange={(e) => handleAddFileSelect(e.target.files?.[0])}
                  className={`w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-[#075BFF] hover:file:bg-blue-100 file:cursor-pointer border rounded-xl p-1.5 ${
                    addFormErrors.file ? "border-red-400 bg-red-50/20" : "border-slate-200"
                  }`}
                />
                {addFormErrors.file && (
                  <p className="text-[11px] text-red-500 mt-0.5">{addFormErrors.file}</p>
                )}

                {selectedAddFile && (
                  <div className="flex items-center justify-between p-2.5 bg-blue-50/50 border border-blue-100 rounded-xl text-xs">
                    <span className="font-semibold text-[#0B1739] truncate">{selectedAddFile.name}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedAddFile(null)}
                      className="text-slate-400 hover:text-red-500 p-1"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Nome do Documento */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome do documento <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={addForm.documentName}
                  onChange={(e) => setAddForm({ ...addForm, documentName: e.target.value })}
                  placeholder="Ex: TIE - Termo de Inscrição da Embarcação"
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all ${
                    addFormErrors.documentName ? "border-red-400 bg-red-50/20" : "border-slate-200"
                  }`}
                />
                {addFormErrors.documentName && (
                  <p className="text-[11px] text-red-500 mt-1">{addFormErrors.documentName}</p>
                )}
              </div>

              {/* Tipo do Documento & Número */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tipo do documento
                  </label>
                  <select
                    value={addForm.documentType}
                    onChange={(e) => setAddForm({ ...addForm, documentType: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all"
                  >
                    {COMMON_DOCUMENT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Número do documento (opcional)
                  </label>
                  <input
                    type="text"
                    value={addForm.documentNumber}
                    onChange={(e) => setAddForm({ ...addForm, documentNumber: e.target.value })}
                    placeholder="Ex: 381-001234/2026"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all"
                  />
                </div>
              </div>

              {/* Órgão Emissor & Data de Emissão */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Órgão emissor (opcional)
                  </label>
                  <input
                    type="text"
                    value={addForm.issuingAgency}
                    onChange={(e) => setAddForm({ ...addForm, issuingAgency: e.target.value })}
                    placeholder="Ex: Capitania dos Portos de São Paulo"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Data de emissão (opcional)
                  </label>
                  <input
                    type="date"
                    value={addForm.issueDate}
                    onChange={(e) => setAddForm({ ...addForm, issueDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all"
                  />
                </div>
              </div>

              {/* Validade & Data de Vencimento */}
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    O documento possui validade / vencimento?
                  </label>
                  <select
                    value={addForm.validityType}
                    onChange={(e) => setAddForm({ ...addForm, validityType: e.target.value as ValidityType })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all"
                  >
                    <option value="nao_informada">Vencimento não informado / A confirmar</option>
                    <option value="com_vencimento">Sim, possui data de vencimento</option>
                    <option value="sem_vencimento">Não possui vencimento (Indeterminado / Vitalício)</option>
                  </select>
                </div>

                {addForm.validityType === "com_vencimento" && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Data de vencimento <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={addForm.expirationDate}
                      onChange={(e) => setAddForm({ ...addForm, expirationDate: e.target.value })}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all ${
                        addFormErrors.expirationDate ? "border-red-400 bg-red-50/20" : "border-slate-200"
                      }`}
                    />
                    {addFormErrors.expirationDate && (
                      <p className="text-[11px] text-red-500 mt-1">{addFormErrors.expirationDate}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Observações */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Observações (opcional)
                </label>
                <textarea
                  rows={2}
                  value={addForm.notes}
                  onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                  placeholder="Ex: Documento final emitido pela Capitania após inspeção física."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all resize-none"
                />
              </div>
            </div>

            <DialogFooter className="p-4 sm:p-5 border-t border-slate-100 flex-row items-center justify-end gap-2 bg-slate-50/50 flex-shrink-0">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                disabled={isAddingSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isAddingSubmitting}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isAddingSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Salvar documento emitido</span>
                  </>
                )}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 2: EDITAR INFORMAÇÕES (Preserva arquivo e versionamento) */}
      {/* ========================================================================= */}
      <Dialog open={Boolean(editDoc)} onOpenChange={(open) => !open && setEditDoc(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl bg-white border border-slate-200">
          <DialogHeader className="p-5 sm:p-6 border-b border-slate-100 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#075BFF] flex items-center justify-center shrink-0 border border-blue-100">
                <Edit2 className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-[#0B1739]">
                  Editar informações do documento
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Atualize os dados e a data de vencimento sem modificar o arquivo anexado.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              {/* Nome do Documento */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome do documento <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editForm.documentName}
                  onChange={(e) => setEditForm({ ...editForm, documentName: e.target.value })}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all ${
                    editFormErrors.documentName ? "border-red-400 bg-red-50/20" : "border-slate-200"
                  }`}
                />
                {editFormErrors.documentName && (
                  <p className="text-[11px] text-red-500 mt-1">{editFormErrors.documentName}</p>
                )}
              </div>

              {/* Tipo do Documento & Número */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tipo do documento
                  </label>
                  <select
                    value={editForm.documentType}
                    onChange={(e) => setEditForm({ ...editForm, documentType: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all"
                  >
                    {COMMON_DOCUMENT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Número do documento (opcional)
                  </label>
                  <input
                    type="text"
                    value={editForm.documentNumber}
                    onChange={(e) => setEditForm({ ...editForm, documentNumber: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all"
                  />
                </div>
              </div>

              {/* Órgão Emissor & Data de Emissão */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Órgão emissor (opcional)
                  </label>
                  <input
                    type="text"
                    value={editForm.issuingAgency}
                    onChange={(e) => setEditForm({ ...editForm, issuingAgency: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Data de emissão (opcional)
                  </label>
                  <input
                    type="date"
                    value={editForm.issueDate}
                    onChange={(e) => setEditForm({ ...editForm, issueDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all"
                  />
                </div>
              </div>

              {/* Validade & Data de Vencimento */}
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Validade do documento
                  </label>
                  <select
                    value={editForm.validityType}
                    onChange={(e) => setEditForm({ ...editForm, validityType: e.target.value as ValidityType })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all"
                  >
                    <option value="nao_informada">Vencimento não informado / A confirmar</option>
                    <option value="com_vencimento">Com data de vencimento</option>
                    <option value="sem_vencimento">Sem vencimento (Vitalício / Indeterminado)</option>
                  </select>
                </div>

                {editForm.validityType === "com_vencimento" && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Data de vencimento <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={editForm.expirationDate}
                      onChange={(e) => setEditForm({ ...editForm, expirationDate: e.target.value })}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all ${
                        editFormErrors.expirationDate ? "border-red-400 bg-red-50/20" : "border-slate-200"
                      }`}
                    />
                    {editFormErrors.expirationDate && (
                      <p className="text-[11px] text-red-500 mt-1">{editFormErrors.expirationDate}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Observações */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Observações (opcional)
                </label>
                <textarea
                  rows={2}
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all resize-none"
                />
              </div>
            </div>

            <DialogFooter className="p-4 sm:p-5 border-t border-slate-100 flex-row items-center justify-end gap-2 bg-slate-50/50 flex-shrink-0">
              <button
                type="button"
                onClick={() => setEditDoc(null)}
                disabled={isEditingSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isEditingSubmitting}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isEditingSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Salvar alterações</span>
                  </>
                )}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 3: SUBSTITUIR ARQUIVO (Preserva versões anteriores no histórico) */}
      {/* ========================================================================= */}
      <Dialog open={Boolean(replaceDoc)} onOpenChange={(open) => !open && setReplaceDoc(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl bg-white border border-slate-200">
          <DialogHeader className="p-5 sm:p-6 border-b border-slate-100 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#075BFF] flex items-center justify-center shrink-0 border border-blue-100">
                <RefreshCw className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-[#0B1739]">
                  Substituir arquivo do documento
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Envie a nova via ou arquivo atualizado. A versão anterior será preservada no histórico.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleReplaceSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              {/* Arquivo Atual em Exibição */}
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 text-xs space-y-1">
                <p className="font-bold text-slate-700">Arquivo atual (Versão {replaceDoc?.metadata?.version || 1}):</p>
                <p className="text-slate-600 truncate font-mono">{replaceDoc?.file_name}</p>
                <p className="text-[11px] text-slate-400">
                  O arquivo atual não será excluído; você poderá consultá-lo ou baixá-lo a qualquer momento.
                </p>
              </div>

              {/* Novo Arquivo */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Novo arquivo (PDF, PNG ou JPG) <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  accept=".pdf,application/pdf,image/png,image/jpeg,image/jpg"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setReplaceFile(f);
                      setReplaceError(null);
                    }
                  }}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-[#075BFF] hover:file:bg-blue-100 file:cursor-pointer border border-slate-200 rounded-xl p-1.5"
                />

                {replaceError && (
                  <p className="text-[11px] text-red-500 mt-0.5">{replaceError}</p>
                )}

                {replaceFile && (
                  <div className="flex items-center justify-between p-2.5 bg-blue-50/50 border border-blue-100 rounded-xl text-xs">
                    <span className="font-semibold text-[#0B1739] truncate">{replaceFile.name}</span>
                    <button
                      type="button"
                      onClick={() => setReplaceFile(null)}
                      className="text-slate-400 hover:text-red-500 p-1"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Motivo da Substituição */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Motivo da substituição (opcional)
                </label>
                <input
                  type="text"
                  value={replaceReason}
                  onChange={(e) => setReplaceReason(e.target.value)}
                  placeholder="Ex: Emissão de segunda via com correção do número"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all"
                />
              </div>
            </div>

            <DialogFooter className="p-4 sm:p-5 border-t border-slate-100 flex-row items-center justify-end gap-2 bg-slate-50/50 flex-shrink-0">
              <button
                type="button"
                onClick={() => setReplaceDoc(null)}
                disabled={isReplacingSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isReplacingSubmitting}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isReplacingSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Substituindo...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    <span>Confirmar substituição</span>
                  </>
                )}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 4: HISTÓRICO DE VERSÕES */}
      {/* ========================================================================= */}
      <Dialog open={Boolean(historyDoc)} onOpenChange={(open) => !open && setHistoryDoc(null)}>
        <DialogContent className="max-w-xl max-h-[85vh] flex flex-col p-0 overflow-hidden rounded-2xl bg-white border border-slate-200">
          <DialogHeader className="p-5 sm:p-6 border-b border-slate-100 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#075BFF] flex items-center justify-center shrink-0 border border-blue-100">
                <History className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold text-[#0B1739]">
                  Histórico de versões do documento
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Consulte e baixe todas as versões arquivadas deste documento.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
            {/* Versão Atual */}
            <div className="p-3.5 bg-blue-50/50 border border-blue-200/80 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#075BFF] flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5" />
                  Versão {historyDoc?.metadata?.version || 1} (Atual)
                </span>
                <span className="text-[11px] text-slate-400">
                  {formatDateSafe(historyDoc?.metadata?.last_modified_at || historyDoc?.created_at)}
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-800 truncate">
                {historyDoc?.file_name}
              </p>
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => historyDoc && openStoredFile(historyDoc)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#075BFF] hover:underline cursor-pointer"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>Visualizar</span>
                </button>
                <div className="h-3.5 w-px bg-slate-200" />
                <button
                  type="button"
                  onClick={() => historyDoc && downloadStoredFile(historyDoc, historyDoc.file_name)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#075BFF] hover:underline cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Baixar</span>
                </button>
              </div>
            </div>

            {/* Versões Anteriores */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-700">Versões anteriores:</p>
              {(!historyDoc?.metadata?.version_history || historyDoc.metadata.version_history.length === 0) ? (
                <p className="text-xs text-slate-400 italic">
                  Nenhuma versão anterior registrada. Este documento está em sua primeira versão.
                </p>
              ) : (
                <div className="space-y-2">
                  {historyDoc.metadata.version_history.map((h, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-700">
                          Versão {h.version}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Substituído em {formatDateSafe(h.replaced_at)}
                        </span>
                      </div>
                      <p className="text-slate-600 truncate font-mono text-[11px]">
                        {h.file_name}
                      </p>
                      {h.reason && (
                        <p className="text-[11px] text-slate-500 italic">
                          Motivo: {h.reason}
                        </p>
                      )}
                      <div className="flex items-center gap-3 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            const mockDoc = {
                              file_url: h.file_url,
                              file_name: h.file_name,
                              file_type: h.file_type || "application/pdf",
                            };
                            openStoredFile(mockDoc as any);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#075BFF] hover:underline cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>Visualizar versão v{h.version}</span>
                        </button>
                        <div className="h-3.5 w-px bg-slate-200" />
                        <button
                          type="button"
                          onClick={() => {
                            const mockDoc = {
                              file_url: h.file_url,
                              file_name: h.file_name,
                              file_type: h.file_type || "application/pdf",
                            };
                            downloadStoredFile(mockDoc as any, h.file_name);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#075BFF] hover:underline cursor-pointer"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>Baixar</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="p-4 sm:p-5 border-t border-slate-100 flex-row items-center justify-end bg-slate-50/50 flex-shrink-0">
            <button
              type="button"
              onClick={() => setHistoryDoc(null)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              Fechar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
