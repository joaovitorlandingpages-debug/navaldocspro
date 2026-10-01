import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { 
  ArrowLeft, 
  Search, 
  FileText, 
  Award, 
  FileCheck2, 
  PenTool, 
  Plus, 
  Calendar, 
  Clock, 
  User, 
  Building2, 
  Download, 
  Eye, 
  X, 
  Filter, 
  Loader2, 
  AlertCircle, 
  Check, 
  AlertTriangle, 
  ShieldCheck, 
  Sparkles, 
  RefreshCw,
  FolderOpen,
  ArrowUpDown,
  Lock,
  CheckCircle2,
  ChevronRight,
  Upload,
  ExternalLink,
  Ship,
  FileSpreadsheet,
  Layers,
  HelpCircle,
  Undo2
} from "lucide-react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/routes/dashboard";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { uploadToBucket } from "@/lib/storage";
import { openStoredFile, downloadStoredFile } from "@/utils/file-preview";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { SERVICES, findService, type ServiceDef } from "@/types/service-requirements";

export const Route = createFileRoute("/processes/$id/pendencias")({
  validateSearch: (search: Record<string, unknown>): { group?: string } => ({
    ...(search.group ? { group: search.group as string } : {}),
  }),
  component: () => (
    <ProtectedRoute>
      <DashboardLayout>
        <PendenciasProcessoPage />
      </DashboardLayout>
    </ProtectedRoute>
  ),
});

export type PendingGroup = "todos" | "dados" | "documentos" | "acoes";

export interface PendingItem {
  id: string;
  group: "dados" | "documentos" | "acoes";
  groupLabel: string;
  title: string;
  description: string;
  isCompleted: boolean;
  isRequired: boolean;
  completedAt?: string;
  completedBy?: string;
  notes?: string;
  actionType: 
    | "fill_vessel" 
    | "fill_customer" 
    | "fill_process" 
    | "upload_doc" 
    | "generate_pdf" 
    | "review_pdf" 
    | "sign_doc" 
    | "protocol" 
    | "issued_doc" 
    | "manual_action";
  actionLabel: string;
  actionTarget?: {
    field?: string;
    docKind?: string;
    route?: string;
    fileObj?: any;
    docId?: string;
  };
}

// Normalizador de serviço
function normalizeServiceKey(rawType?: string | null): string {
  if (!rawType) return "renovacao";
  const s = rawType.toLowerCase();
  if (s.includes("transf")) return "transferencia";
  if (s.includes("inic") || s.includes("registro")) return "registro_inicial";
  if (s.includes("motor")) return "alteracao_motor";
  if (s.includes("caracter")) return "alteracao_caracteristica";
  if (s.includes("segunda") || s.includes("2")) return "segunda_via";
  if (s.includes("regulariz")) return "regularizacao";
  return "renovacao";
}

function PendenciasProcessoPage() {
  const { id } = Route.useParams();
  const searchParams = Route.useSearch();
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const companyId = profile?.company_id;

  // Estados principais de dados do contexto
  const [processData, setProcessData] = useState<any | null>(null);
  const [customer, setCustomer] = useState<any | null>(null);
  const [vessel, setVessel] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  // Dados das tabelas para checagens reais de completude
  const [generatedDocs, setGeneratedDocs] = useState<any[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);

  // Filtro de Grupo ("todos" | "dados" | "documentos" | "acoes")
  const [activeGroup, setActiveGroup] = useState<PendingGroup>(
    (searchParams.group as PendingGroup) || "todos"
  );
  const [searchTerm, setSearchTerm] = useState("");

  // Modal: Preenchimento rápido de dados cadastrais
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const [dataModalTarget, setDataModalTarget] = useState<PendingItem | null>(null);
  const [dataInputValue, setDataInputValue] = useState("");
  const [dataInputSecondary, setDataInputSecondary] = useState("");
  const [isSavingData, setIsSavingData] = useState(false);

  // Modal: Anexar documento exigido pelo serviço
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadModalTarget, setUploadModalTarget] = useState<PendingItem | null>(null);
  const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(null);
  const [uploadNotes, setUploadNotes] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Modal: Confirmação de Ação Manual
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualModalTarget, setManualModalTarget] = useState<PendingItem | null>(null);
  const [manualActionNotes, setManualActionNotes] = useState("");
  const [isSavingManualAction, setIsSavingManualAction] = useState(false);

  // 1. Carregar Contexto Completo do Processo
  const loadContext = useCallback(async () => {
    if (!companyId || !id) return;
    setIsLoading(true);
    setIsError(false);

    try {
      // 1.1 Processo com Cliente e Embarcação Vinculada
      const { data: proc, error: pError } = await supabase
        .from("processes")
        .select(`
          *,
          customer:customers!processes_customer_id_fkey(*),
          vessel:vessels!processes_vessel_id_fkey(*)
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

      // 1.2 Documentos Gerados deste processo
      const { data: genDocs } = await supabase
        .from("generated_documents")
        .select("*")
        .eq("company_id", companyId)
        .eq("process_id", id);

      setGeneratedDocs(genDocs || []);

      // 1.3 Arquivos Anexados deste processo (todas as categorias)
      const { data: files } = await supabase
        .from("uploaded_files")
        .select("*")
        .eq("company_id", companyId)
        .eq("process_id", id);

      setUploadedFiles(files || []);
    } catch (err) {
      console.error("Erro ao carregar contexto de pendências:", err);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [companyId, id]);

  useEffect(() => {
    loadContext();
  }, [loadContext]);

  // Contexto formatado
  const customerName = useMemo(() => {
    return customer?.fantasy_name || customer?.name || "Cliente";
  }, [customer]);

  const vesselName = useMemo(() => {
    return vessel?.name || "Embarcação";
  }, [vessel]);

  const serviceTitle = useMemo(() => {
    return processData?.title || processData?.process_type || "Serviço Marítimo";
  }, [processData]);

  const protocolCode = useMemo(() => {
    return processData?.protocol_number || `PROC-${String(processData?.id || id).slice(0, 4).toUpperCase()}`;
  }, [processData, id]);

  // Definição de Requisitos do Serviço
  const serviceDef = useMemo(() => {
    const rawKind = normalizeServiceKey(processData?.process_type || processData?.title);
    return SERVICES.find(s => s.kind === rawKind) || SERVICES[0];
  }, [processData]);

  // =========================================================================
  // MOTOR DE AVALIAÇÃO DE PENDÊNCIAS DINÂMICAS (3 GRUPOS ESTRITOS)
  // =========================================================================
  const allPendingItems = useMemo<PendingItem[]>(() => {
    if (!processData) return [];

    const items: PendingItem[] = [];
    const rawKind = serviceDef.kind;
    const manualActions = processData.metadata?.manual_actions || {};

    // -----------------------------------------------------------------------
    // GRUPO 1: DADOS A PREENCHER
    // -----------------------------------------------------------------------
    
    // 1.1 CPF / CNPJ do Cliente
    const hasCpfCnpj = Boolean(
      customer?.cpf_cnpj && customer.cpf_cnpj.replace(/\D/g, "").length >= 11
    );
    items.push({
      id: "dado-cliente-cpf-cnpj",
      group: "dados",
      groupLabel: "Dados a preencher",
      title: "CPF ou CNPJ do cliente",
      description: hasCpfCnpj 
        ? `Documento cadastrado e validado: ${customer?.cpf_cnpj}` 
        : "Obrigatório para qualificação do requerente perante a Capitania dos Portos.",
      isCompleted: hasCpfCnpj,
      isRequired: true,
      actionType: "fill_customer",
      actionLabel: hasCpfCnpj ? "Ver no cadastro" : "Preencher CPF/CNPJ",
      actionTarget: { field: "cpf_cnpj" }
    });

    // 1.2 Endereço / Comarca do Cliente
    const hasAddress = Boolean(
      (customer?.address && customer.address.trim().length > 3) ||
      (customer?.city && customer?.state)
    );
    items.push({
      id: "dado-cliente-endereco",
      group: "dados",
      groupLabel: "Dados a preencher",
      title: "Endereço completo de domicílio",
      description: hasAddress 
        ? `Localidade informada: ${customer?.city || "Endereço completo cadastrado"} - ${customer?.state || ""}` 
        : "Endereço com CEP necessário para confecção dos termos e procurações.",
      isCompleted: hasAddress,
      isRequired: true,
      actionType: "fill_customer",
      actionLabel: hasAddress ? "Ver no cadastro" : "Preencher endereço",
      actionTarget: { field: "address" }
    });

    // 1.3 Contato (Telefone ou E-mail)
    const hasContact = Boolean(
      (customer?.phone && customer.phone.trim().length > 7) ||
      (customer?.email && customer.email.includes("@"))
    );
    items.push({
      id: "dado-cliente-contato",
      group: "dados",
      groupLabel: "Dados a preencher",
      title: "Telefone ou e-mail de contato",
      description: hasContact 
        ? `Contato principal: ${customer?.phone || customer?.email}` 
        : "Telefone ou e-mail para comunicação de exigências e notificações da Capitania.",
      isCompleted: hasContact,
      isRequired: true,
      actionType: "fill_customer",
      actionLabel: hasContact ? "Ver contato" : "Preencher contato",
      actionTarget: { field: "phone" }
    });

    // 1.4 Número de Inscrição no TIE/TIEM (Não obrigatório apenas para Registro Inicial)
    if (rawKind !== "registro_inicial") {
      const hasTie = Boolean(
        vessel?.registration_number && vessel.registration_number.trim().length >= 3
      );
      items.push({
        id: "dado-embarcacao-tie",
        group: "dados",
        groupLabel: "Dados a preencher",
        title: "Número de inscrição (TIE/TIEM)",
        description: hasTie 
          ? `Inscrição naval registrada: ${vessel?.registration_number}` 
          : "Número de registro da embarcação perante a Autoridade Marítima.",
        isCompleted: hasTie,
        isRequired: true,
        actionType: "fill_vessel",
        actionLabel: hasTie ? "Ver na embarcação" : "Completar dado da embarcação",
        actionTarget: { field: "registration_number" }
      });
    }

    // 1.5 Comprimento total da embarcação
    const hasLength = Boolean(
      vessel?.length && Number(vessel.length) > 0
    );
    items.push({
      id: "dado-embarcacao-comprimento",
      group: "dados",
      groupLabel: "Dados a preencher",
      title: "Comprimento total da embarcação (m)",
      description: hasLength 
        ? `Comprimento cadastrado: ${vessel?.length} metros` 
        : "Comprimento em metros exigido para enquadramento nas NORMAMs e cálculo de taxas.",
      isCompleted: hasLength,
      isRequired: true,
      actionType: "fill_vessel",
      actionLabel: hasLength ? "Ver na embarcação" : "Informar comprimento",
      actionTarget: { field: "length" }
    });

    // 1.6 Categoria / Tipo de Embarcação
    const hasCategoryType = Boolean(
      vessel?.category || vessel?.vessel_type
    );
    items.push({
      id: "dado-embarcacao-categoria",
      group: "dados",
      groupLabel: "Dados a preencher",
      title: "Classificação e tipo de navegação",
      description: hasCategoryType 
        ? `Tipo: ${vessel?.vessel_type || "Embarcação"} | Categoria: ${vessel?.category || "Esporte e Recreio"}` 
        : "Indicação da atividade (Esporte/Recreio, Comercial ou Pesca) e tipo de casco.",
      isCompleted: hasCategoryType,
      isRequired: true,
      actionType: "fill_vessel",
      actionLabel: hasCategoryType ? "Ver na embarcação" : "Definir categoria naval",
      actionTarget: { field: "category" }
    });

    // 1.7 Dados Específicos de Transferência (Comprador)
    if (rawKind === "transferencia") {
      const hasBuyer = Boolean(
        (processData.new_owner_name && processData.new_owner_name.trim().length > 3) &&
        (processData.new_owner_cpf_cnpj && processData.new_owner_cpf_cnpj.replace(/\D/g, "").length >= 11)
      );
      items.push({
        id: "dado-processo-comprador",
        group: "dados",
        groupLabel: "Dados a preencher",
        title: "Nome e CPF/CNPJ do comprador",
        description: hasBuyer 
          ? `Novo Adquirente: ${processData.new_owner_name} (${processData.new_owner_cpf_cnpj})` 
          : "Identificação completa do novo proprietário para emissão do novo título de propriedade.",
        isCompleted: hasBuyer,
        isRequired: true,
        actionType: "fill_process",
        actionLabel: hasBuyer ? "Ver dados da venda" : "Informar comprador",
        actionTarget: { field: "buyer" }
      });
    }

    // 1.8 Dados Específicos de Alteração de Motor
    if (rawKind === "alteracao_motor") {
      const hasMotor = Boolean(
        processData.metadata?.engine_power || 
        processData.metadata?.engine_serial || 
        vessel?.engine_power
      );
      items.push({
        id: "dado-processo-motor",
        group: "dados",
        groupLabel: "Dados a preencher",
        title: "Dados técnicos do novo motor",
        description: hasMotor 
          ? `Motor: ${processData.metadata?.engine_power || vessel?.engine_power || "Cadastrado"} HP` 
          : "Potência (HP), marca e número de série do novo motor a ser averbado no TIE.",
        isCompleted: hasMotor,
        isRequired: true,
        actionType: "fill_process",
        actionLabel: hasMotor ? "Ver dados do motor" : "Preencher dados do motor",
        actionTarget: { field: "engine" }
      });
    }

    // 1.9 Dados Específicos de Segunda Via (Motivo)
    if (rawKind === "segunda_via") {
      const hasReason = Boolean(
        processData.metadata?.reason || processData.notes
      );
      items.push({
        id: "dado-processo-motivo",
        group: "dados",
        groupLabel: "Dados a preencher",
        title: "Motivo da solicitação de 2ª via",
        description: hasReason 
          ? `Justificativa: ${processData.metadata?.reason || processData.notes}` 
          : "Informar justificativa legal (extravio, dano ou furto) para a declaração oficial.",
        isCompleted: hasReason,
        isRequired: true,
        actionType: "fill_process",
        actionLabel: hasReason ? "Ver motivo" : "Informar motivo",
        actionTarget: { field: "reason" }
      });
    }

    // -----------------------------------------------------------------------
    // GRUPO 2: DOCUMENTOS A ENVIAR (EXIGIDOS PELO SERVIÇO ESPECÍFICO)
    // -----------------------------------------------------------------------
    
    // Lista de documentos requeridos para este serviço
    const requiredDocTypes: { id: string; title: string; hint: string; matchers: string[] }[] = [];

    if (rawKind === "renovacao") {
      requiredDocTypes.push(
        {
          id: "doc-cnh-proprietario",
          title: "Documento com foto (CNH/RG do proprietário)",
          hint: "Cópia legível frente e verso de documento oficial de identidade.",
          matchers: ["cnh", "rg", "identidade", "foto", "proprietario"]
        },
        {
          id: "doc-residencia",
          title: "Comprovante de residência atualizado",
          hint: "Contas de consumo (água, luz, telefone) emitidas nos últimos 90 dias.",
          matchers: ["residencia", "endereco", "comprovante_residencia"]
        },
        {
          id: "doc-tie-anterior",
          title: "Título anterior (TIE/TIEM a renovar)",
          hint: "Cópia do título de inscrição de embarcação atual a ser renovado.",
          matchers: ["tie", "tiem", "titulo", "anterior"]
        }
      );
    } else if (rawKind === "transferencia") {
      requiredDocTypes.push(
        {
          id: "doc-comprador-id",
          title: "Documento de identificação do comprador",
          hint: "CNH ou RG do adquirente e comprovante de endereço.",
          matchers: ["comprador", "adquirente", "cnh_comprador"]
        },
        {
          id: "doc-vendedor-id",
          title: "Documento de identificação do vendedor",
          hint: "CNH ou RG do proprietário vendedor.",
          matchers: ["vendedor", "proprietario_vendedor", "cnh_vendedor"]
        },
        {
          id: "doc-tie-original",
          title: "Título de inscrição anterior (TIE/TIEM)",
          hint: "Cópia autenticada ou original do TIE para cancelamento/averbação.",
          matchers: ["tie", "tiem", "titulo"]
        },
        {
          id: "doc-atpv-contrato",
          title: "Autorização de Transferência (ATPV) ou Contrato",
          hint: "Documento com firmas reconhecidas por autenticidade em cartório.",
          matchers: ["atpv", "contrato", "compra_venda", "recibo"]
        }
      );
    } else if (rawKind === "registro_inicial") {
      requiredDocTypes.push(
        {
          id: "doc-id-proprietario",
          title: "Documento com foto e residência do proprietário",
          hint: "CNH ou RG com CPF e comprovante de residência do requerente.",
          matchers: ["cnh", "rg", "identidade", "residencia"]
        },
        {
          id: "doc-nf-embarcacao",
          title: "Nota Fiscal da embarcação / Estaleiro",
          hint: "Nota fiscal de aquisição emitida pelo fabricante ou construtor.",
          matchers: ["nota_fiscal", "nf", "estaleiro", "aquisicao"]
        },
        {
          id: "doc-memorial-descritivo",
          title: "Memorial Descritivo e Declaração de Conformidade",
          hint: "Especificações técnicas assinadas por engenheiro naval ou fabricante.",
          matchers: ["memorial", "conformidade", "art", "especificacao"]
        },
        {
          id: "doc-nf-motor",
          title: "Nota Fiscal do Motor",
          hint: "Nota fiscal de compra do motor de propulsão com número de série.",
          matchers: ["motor", "nf_motor", "propulsao"]
        }
      );
    } else if (rawKind === "alteracao_motor") {
      requiredDocTypes.push(
        {
          id: "doc-tie-atual",
          title: "Título atual da embarcação (TIE)",
          hint: "Cópia do TIE atual onde consta o motor antigo.",
          matchers: ["tie", "tiem", "titulo"]
        },
        {
          id: "doc-nf-novo-motor",
          title: "Nota fiscal do novo motor instalado",
          hint: "Nota fiscal comprovando a procedência lícita e potência.",
          matchers: ["nota_fiscal", "nf_motor", "novo_motor", "motor"]
        },
        {
          id: "doc-laudo-instalacao",
          title: "Termo de responsabilidade técnica de instalação",
          hint: "Declaração de instalação emitida por estaleiro ou oficina credenciada.",
          matchers: ["laudo", "termo", "responsabilidade", "instalacao"]
        }
      );
    } else if (rawKind === "alteracao_caracteristica") {
      requiredDocTypes.push(
        {
          id: "doc-tie-atual",
          title: "Título atual da embarcação (TIE)",
          hint: "Cópia do TIE atual a ser retificado.",
          matchers: ["tie", "tiem", "titulo"]
        },
        {
          id: "doc-memorial-alteracoes",
          title: "Memorial das alterações técnicas e estabilidade",
          hint: "Cálculos técnicos e descrição das modificações estruturais.",
          matchers: ["memorial", "alteracao", "laudo", "estabilidade"]
        },
        {
          id: "doc-art-engenheiro",
          title: "ART / RRT de engenheiro naval responsável",
          hint: "Anotação de Responsabilidade Técnica quitada.",
          matchers: ["art", "rrt", "crea", "engenheiro"]
        }
      );
    } else if (rawKind === "segunda_via") {
      requiredDocTypes.push(
        {
          id: "doc-id-proprietario",
          title: "Documento oficial de identidade do proprietário",
          hint: "CNH ou RG do proprietário solicitante da 2ª via.",
          matchers: ["cnh", "rg", "identidade", "foto"]
        },
        {
          id: "doc-bo-extravio",
          title: "Boletim de Ocorrência (BO) ou Declaração de Extravio",
          hint: "Registro policial em caso de perda/furto ou declaração oficial.",
          matchers: ["boletim", "bo", "extravio", "perda", "declaracao"]
        }
      );
    } else {
      // Regularização e outros
      requiredDocTypes.push(
        {
          id: "doc-id-requerente",
          title: "Documento oficial de identificação",
          hint: "CNH ou RG com foto e comprovante de endereço.",
          matchers: ["cnh", "rg", "identidade", "residencia"]
        },
        {
          id: "doc-comprovante-posse",
          title: "Documento comprobatório da posse da embarcação",
          hint: "Recibos antigos, contrato ou declaração de posse contínua.",
          matchers: ["posse", "declaracao", "recibo", "titulo"]
        }
      );
    }

    // Verificar se cada documento foi enviado no banco
    requiredDocTypes.forEach((docReq) => {
      // Busca arquivo correspondente em uploadedFiles
      const matchingFile = uploadedFiles.find((f: any) => {
        const name = (f.file_name || "").toLowerCase();
        const role = (f.metadata?.document_role || f.metadata?.doc_label || f.metadata?.required_doc_id || "").toLowerCase();
        const cat = (f.category || "").toLowerCase();
        
        if (f.metadata?.required_doc_id === docReq.id) return true;
        
        return docReq.matchers.some(m => name.includes(m) || role.includes(m) || cat.includes(m));
      });

      const isCompleted = Boolean(matchingFile);

      items.push({
        id: docReq.id,
        group: "documentos",
        groupLabel: "Documentos a enviar",
        title: docReq.title,
        description: isCompleted 
          ? `Arquivo anexado: ${matchingFile.file_name} (${(matchingFile.file_size ? (matchingFile.file_size / 1024 / 1024).toFixed(2) + " MB" : "Enviado")})` 
          : docReq.hint,
        isCompleted,
        isRequired: true,
        actionType: "upload_doc",
        actionLabel: isCompleted ? "Visualizar arquivo" : "Anexar documento",
        actionTarget: {
          fileObj: matchingFile || null,
          docKind: docReq.id,
        }
      });
    });

    // -----------------------------------------------------------------------
    // GRUPO 3: AÇÕES A REALIZAR
    // -----------------------------------------------------------------------

    // 3.1 Gerar e revisar minuta do requerimento (PDF) ou Requerimento externo anexado
    const hasGeneratedDoc = generatedDocs.length > 0;
    const latestGeneratedDoc = generatedDocs[0];
    
    // Suporte a requerimento externo anexado (quando o usuário já possui preenchido fora)
    const attachedReqDoc = uploadedFiles.find((f: any) => 
      f.category === "attached_requirement" || 
      f.metadata?.category === "attached_requirement" ||
      f.metadata?.document_role === "attached_requirement"
    );
    const hasRequirementDoc = hasGeneratedDoc || Boolean(attachedReqDoc);

    items.push({
      id: "acao-gerar-minuta",
      group: "acoes",
      groupLabel: "Ações a realizar",
      title: "Requerimento do Processo (Gerado ou Anexado)",
      description: attachedReqDoc
        ? `Requerimento externo anexado: "${attachedReqDoc.file_name}" (dispensa geração)`
        : hasGeneratedDoc 
          ? `Requerimento oficial gerado: "${latestGeneratedDoc?.title || "Requerimento Náutico"}"` 
          : "Gerar a minuta consolidada pelo NavalDocs ou anexar documento já preenchido fora do sistema.",
      isCompleted: hasRequirementDoc,
      isRequired: true,
      actionType: attachedReqDoc ? "upload_doc" : (hasGeneratedDoc ? "review_pdf" : "generate_pdf"),
      actionLabel: attachedReqDoc ? "Visualizar anexo" : (hasGeneratedDoc ? "Revisar documento" : "Gerar minuta (PDF)"),
      actionTarget: attachedReqDoc 
        ? { fileObj: attachedReqDoc }
        : {
            docId: latestGeneratedDoc?.id,
            route: hasGeneratedDoc ? "/processes/$id/revisar-documento" : "/processes/$id/gerar-documento"
          }
    });

    // 3.2 Coletar assinatura do cliente (gov.br ou física)
    const isSigned = Boolean(
      generatedDocs.some((d: any) => d.status === "signed" || !!d.signed_file_url) ||
      uploadedFiles.some((f: any) => f.category === "signed" || f.category === "arquivo_assinado") ||
      (attachedReqDoc && (attachedReqDoc.metadata?.is_signed || attachedReqDoc.metadata?.already_signed))
    );
    items.push({
      id: "acao-coletar-assinatura",
      group: "acoes",
      groupLabel: "Ações a realizar",
      title: "Assinatura do documento (gov.br ou física)",
      description: isSigned 
        ? "Documento assinado registrado e autenticado com sucesso." 
        : "Colher assinatura digital do cliente pelo gov.br ou anexar cópia com firma reconhecida.",
      isCompleted: isSigned,
      isRequired: true,
      actionType: "sign_doc",
      actionLabel: isSigned ? "Ver assinado" : "Anexar documento assinado",
      actionTarget: {
        route: hasGeneratedDoc ? "/processes/$id/anexar-versao-assinada" : "/processes/$id/gerar-documento"
      }
    });

    // 3.3 Pagar taxa da Capitania (GRU) / Custas do serviço (AÇÃO MANUAL COM REGISTRO DE QUEM/QUANDO)
    const gruAction = manualActions.pay_gru;
    const isGruPaid = Boolean(gruAction?.completed);
    items.push({
      id: "acao-pagar-gru",
      group: "acoes",
      groupLabel: "Ações a realizar",
      title: "Pagamento da taxa da Capitania (GRU)",
      description: isGruPaid 
        ? `Concluído por ${gruAction.completed_by} em ${new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(gruAction.completed_at))}${gruAction.notes ? ` — Obs: "${gruAction.notes}"` : ""}` 
        : "Efetuar o recolhimento da taxa bancária (GRU) necessária para tramitação na Capitania.",
      isCompleted: isGruPaid,
      isRequired: true,
      completedAt: gruAction?.completed_at,
      completedBy: gruAction?.completed_by,
      notes: gruAction?.notes,
      actionType: "manual_action",
      actionLabel: isGruPaid ? "Alterar registro" : "Marcar como pago",
    });

    // 3.4 Registrar protocolo na Capitania dos Portos
    const hasProtocol = Boolean(
      processData.protocol_number || 
      uploadedFiles.some((f: any) => f.category === "protocol")
    );
    items.push({
      id: "acao-registrar-protocolo",
      group: "acoes",
      groupLabel: "Ações a realizar",
      title: "Registrar protocolo na Capitania / Delegacia",
      description: hasProtocol 
        ? `Protocolo oficial ativo: ${processData.protocol_number || "Comprovante anexado no processo"}` 
        : "Dar entrada do processo na Autoridade Marítima e anexar o comprovante de protocolo.",
      isCompleted: hasProtocol,
      isRequired: true,
      actionType: "protocol",
      actionLabel: hasProtocol ? "Ver protocolos" : "Registrar protocolo",
      actionTarget: {
        route: hasProtocol ? "/processes/$id/protocolos-realizados" : "/processes/$id/anexar-protocolo"
      }
    });

    // 3.5 Anexar documento emitido final (TIE / TIEM / Certidão)
    const hasIssuedDoc = Boolean(
      uploadedFiles.some((f: any) => 
        ["issued", "issued_doc", "documento_emitido", "final_document"].includes(f.category)
      )
    );
    items.push({
      id: "acao-anexar-emitido",
      group: "acoes",
      groupLabel: "Ações a realizar",
      title: "Anexar documento emitido final (TIE/TIEM)",
      description: hasIssuedDoc 
        ? "Documento final recebido da Capitania e anexado para entrega ao cliente." 
        : "Cadastrar e disponibilizar o título ou certificado deferido pela Capitania.",
      isCompleted: hasIssuedDoc,
      isRequired: true,
      actionType: "issued_doc",
      actionLabel: hasIssuedDoc ? "Ver emitidos" : "Anexar documento emitido",
      actionTarget: {
        route: hasIssuedDoc ? "/processes/$id/documentos-emitidos" : "/processes/$id/anexar-documento-emitido"
      }
    });

    return items;
  }, [processData, customer, vessel, serviceDef, generatedDocs, uploadedFiles]);

  // Cálculos de Progresso
  const totalCount = allPendingItems.length;
  const completedCount = useMemo(() => {
    return allPendingItems.filter(i => i.isCompleted).length;
  }, [allPendingItems]);

  const pendingCount = totalCount - completedCount;
  const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const isAllReady = totalCount > 0 && completedCount === totalCount;

  // Contagens por grupo
  const groupStats = useMemo(() => {
    const dados = allPendingItems.filter(i => i.group === "dados");
    const docs = allPendingItems.filter(i => i.group === "documentos");
    const acoes = allPendingItems.filter(i => i.group === "acoes");

    return {
      dados: {
        total: dados.length,
        completed: dados.filter(i => i.isCompleted).length,
        pending: dados.filter(i => !i.isCompleted).length,
      },
      documentos: {
        total: docs.length,
        completed: docs.filter(i => i.isCompleted).length,
        pending: docs.filter(i => !i.isCompleted).length,
      },
      acoes: {
        total: acoes.length,
        completed: acoes.filter(i => i.isCompleted).length,
        pending: acoes.filter(i => !i.isCompleted).length,
      }
    };
  }, [allPendingItems]);

  // Filtro ativo e Busca
  const filteredItems = useMemo(() => {
    return allPendingItems.filter((item) => {
      if (activeGroup !== "todos" && item.group !== activeGroup) {
        return false;
      }
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(term);
        const matchesDesc = item.description.toLowerCase().includes(term);
        if (!matchesTitle && !matchesDesc) return false;
      }
      return true;
    });
  }, [allPendingItems, activeGroup, searchTerm]);

  // Itens separados por status
  const pendingItemsList = useMemo(() => {
    return filteredItems.filter(i => !i.isCompleted);
  }, [filteredItems]);

  const completedItemsList = useMemo(() => {
    return filteredItems.filter(i => i.isCompleted);
  }, [filteredItems]);

  // =========================================================================
  // EXECUÇÃO DE AÇÕES
  // =========================================================================

  // Abrir resolução do item
  const handleResolveItem = (item: PendingItem) => {
    // 1. Dados a preencher
    if (item.actionType === "fill_customer" || item.actionType === "fill_vessel" || item.actionType === "fill_process") {
      setDataModalTarget(item);
      // Preencher valor atual se existir
      if (item.actionTarget?.field === "cpf_cnpj") {
        setDataInputValue(customer?.cpf_cnpj || "");
      } else if (item.actionTarget?.field === "address") {
        setDataInputValue(customer?.address || "");
        setDataInputSecondary(customer?.city || "");
      } else if (item.actionTarget?.field === "phone") {
        setDataInputValue(customer?.phone || customer?.email || "");
      } else if (item.actionTarget?.field === "registration_number") {
        setDataInputValue(vessel?.registration_number || "");
      } else if (item.actionTarget?.field === "length") {
        setDataInputValue(vessel?.length ? String(vessel.length) : "");
      } else if (item.actionTarget?.field === "category") {
        setDataInputValue(vessel?.category || vessel?.vessel_type || "");
      } else if (item.actionTarget?.field === "buyer") {
        setDataInputValue(processData?.new_owner_name || "");
        setDataInputSecondary(processData?.new_owner_cpf_cnpj || "");
      } else if (item.actionTarget?.field === "engine") {
        setDataInputValue(processData?.metadata?.engine_power || vessel?.engine_power || "");
      } else if (item.actionTarget?.field === "reason") {
        setDataInputValue(processData?.metadata?.reason || processData?.notes || "");
      }
      setIsDataModalOpen(true);
      return;
    }

    // 2. Documento a enviar (Upload de Documento)
    if (item.actionType === "upload_doc") {
      if (item.isCompleted && item.actionTarget?.fileObj) {
        openStoredFile(item.actionTarget.fileObj);
        return;
      }
      setUploadModalTarget(item);
      setSelectedUploadFile(null);
      setUploadNotes("");
      setIsUploadModalOpen(true);
      return;
    }

    // 3. Ação Manual (Pagar taxa da GRU)
    if (item.actionType === "manual_action") {
      setManualModalTarget(item);
      setManualActionNotes(item.notes || "");
      setIsManualModalOpen(true);
      return;
    }

    // 4. Rotas do sistema
    if (item.actionTarget?.route) {
      (navigate as any)({
        to: item.actionTarget.route,
        params: { id },
        search: item.actionTarget.docId ? { docId: item.actionTarget.docId } : {},
      });
      return;
    }
  };

  // -------------------------------------------------------------------------
  // SALVAR DADOS NO BANCO REAL (Imutabilidade: não permite dispensar sem salvar)
  // -------------------------------------------------------------------------
  const handleSaveData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dataModalTarget || !companyId || !id) return;
    if (!dataInputValue.trim()) {
      toast.error("Por favor, preencha o campo obrigatório.");
      return;
    }

    setIsSavingData(true);
    try {
      const field = dataModalTarget.actionTarget?.field;
      const now = new Date().toISOString();
      const authorName = profile?.name || user?.email?.split("@")[0] || "Operador";

      // 1. Atualizar Cliente
      if (dataModalTarget.actionType === "fill_customer" && customer?.id) {
        const updatePayload: Record<string, any> = {};
        if (field === "cpf_cnpj") updatePayload.cpf_cnpj = dataInputValue.trim();
        if (field === "address") {
          updatePayload.address = dataInputValue.trim();
          if (dataInputSecondary.trim()) updatePayload.city = dataInputSecondary.trim();
        }
        if (field === "phone") {
          if (dataInputValue.includes("@")) updatePayload.email = dataInputValue.trim();
          else updatePayload.phone = dataInputValue.trim();
        }

        const { error } = await supabase
          .from("customers")
          .update(updatePayload)
          .eq("id", customer.id)
          .eq("company_id", companyId);

        if (error) throw error;
      }

      // 2. Atualizar Embarcação
      if (dataModalTarget.actionType === "fill_vessel" && vessel?.id) {
        const updatePayload: Record<string, any> = {};
        if (field === "registration_number") updatePayload.registration_number = dataInputValue.trim();
        if (field === "length") updatePayload.length = Number(dataInputValue.replace(",", "."));
        if (field === "category") updatePayload.category = dataInputValue.trim();

        const { error } = await supabase
          .from("vessels")
          .update(updatePayload)
          .eq("id", vessel.id)
          .eq("company_id", companyId);

        if (error) throw error;
      }

      // 3. Atualizar Processo
      if (dataModalTarget.actionType === "fill_process") {
        const updatePayload: Record<string, any> = {};
        if (field === "buyer") {
          updatePayload.new_owner_name = dataInputValue.trim();
          if (dataInputSecondary.trim()) updatePayload.new_owner_cpf_cnpj = dataInputSecondary.trim();
        } else if (field === "engine") {
          updatePayload.metadata = {
            ...(processData.metadata || {}),
            engine_power: dataInputValue.trim(),
          };
        } else if (field === "reason") {
          updatePayload.metadata = {
            ...(processData.metadata || {}),
            reason: dataInputValue.trim(),
          };
        }

        const { error } = await supabase
          .from("processes")
          .update(updatePayload as any)
          .eq("id", id)
          .eq("company_id", companyId);

        if (error) throw error;
      }

      // Registrar no histórico de auditoria
      const historyEntry = {
        event: "data_updated",
        description: `Dado preenchido: "${dataModalTarget.title}"`,
        user: authorName,
        date: now,
      };
      const existingHistory = processData.metadata?.history || [];
      await supabase
        .from("processes")
        .update({
          metadata: {
            ...(processData.metadata || {}),
            history: [historyEntry, ...existingHistory],
          },
        } as any)
        .eq("id", id)
        .eq("company_id", companyId);

      toast.success(`${dataModalTarget.title} salvo com sucesso!`);
      setIsDataModalOpen(false);
      setDataModalTarget(null);
      setDataInputValue("");
      setDataInputSecondary("");
      loadContext();
    } catch (err: any) {
      console.error("Erro ao salvar dado:", err);
      toast.error(err?.message || "Não foi possível salvar o dado cadastral.");
    } finally {
      setIsSavingData(false);
    }
  };

  // -------------------------------------------------------------------------
  // SALVAR DOCUMENTO EXIGIDO (Upload real: não permite dispensar sem arquivo)
  // -------------------------------------------------------------------------
  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadModalTarget || !selectedUploadFile || !companyId || !id) {
      toast.error("Por favor, selecione um arquivo válido.");
      return;
    }

    setIsUploading(true);
    try {
      const cleanFileName = selectedUploadFile.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const storagePath = `${companyId}/${id}/req_${Date.now()}_${cleanFileName}`;

      // 1. Upload no Supabase Storage
      await uploadToBucket("process-attachments", storagePath, selectedUploadFile, {
        allowedExtensions: [".pdf", ".png", ".jpg", ".jpeg"],
      });

      // 2. Registro no uploaded_files
      const { error: insError } = await supabase.from("uploaded_files").insert({
        company_id: companyId,
        process_id: id,
        file_name: selectedUploadFile.name,
        file_path: storagePath,
        file_size: selectedUploadFile.size,
        mime_type: selectedUploadFile.type || "application/pdf",
        category: "checklist_doc",
        metadata: {
          required_doc_id: uploadModalTarget.id,
          doc_label: uploadModalTarget.title,
          notes: uploadNotes.trim() || null,
          uploaded_by: profile?.name || user?.email,
          uploaded_at: new Date().toISOString(),
        },
      });

      if (insError) throw insError;

      // 3. Auditoria no histórico
      const authorName = profile?.name || user?.email?.split("@")[0] || "Operador";
      const historyEntry = {
        event: "document_attached",
        description: `Documento exigido anexado: "${uploadModalTarget.title}" (${selectedUploadFile.name})`,
        user: authorName,
        date: new Date().toISOString(),
      };
      const existingHistory = processData.metadata?.history || [];
      await supabase
        .from("processes")
        .update({
          metadata: {
            ...(processData.metadata || {}),
            history: [historyEntry, ...existingHistory],
          },
        } as any)
        .eq("id", id)
        .eq("company_id", companyId);

      toast.success(`Documento "${uploadModalTarget.title}" anexado com sucesso!`);
      setIsUploadModalOpen(false);
      setUploadModalTarget(null);
      setSelectedUploadFile(null);
      setUploadNotes("");
      loadContext();
    } catch (err: any) {
      console.error("Erro no upload do documento:", err);
      toast.error(err?.message || "Não foi possível anexar o arquivo.");
    } finally {
      setIsUploading(false);
    }
  };

  // -------------------------------------------------------------------------
  // SALVAR AÇÃO MANUAL (Identificando quem fez e quando)
  // -------------------------------------------------------------------------
  const handleSaveManualAction = async (markAsDone: boolean) => {
    if (!manualModalTarget || !companyId || !id || !processData) return;

    setIsSavingManualAction(true);
    try {
      const now = new Date().toISOString();
      const authorName = profile?.name || user?.email?.split("@")[0] || "Operador";
      const manualActions = { ...(processData.metadata?.manual_actions || {}) };

      if (markAsDone) {
        manualActions.pay_gru = {
          completed: true,
          completed_by: authorName,
          completed_by_id: profile?.id || user?.id,
          completed_at: now,
          notes: manualActionNotes.trim() || "Taxa recolhida e confirmada.",
        };
      } else {
        delete manualActions.pay_gru;
      }

      // Registro no histórico de auditoria
      const historyEntry = {
        event: markAsDone ? "manual_action_completed" : "manual_action_reopened",
        description: markAsDone 
          ? `Ação manual concluída: "${manualModalTarget.title}" (${manualActionNotes.trim() || "Sem observações adicionais"})`
          : `Ação manual reaberta: "${manualModalTarget.title}"`,
        user: authorName,
        date: now,
      };

      const existingHistory = processData.metadata?.history || [];
      const updatedMetadata = {
        ...(processData.metadata || {}),
        manual_actions: manualActions,
        history: [historyEntry, ...existingHistory],
      };

      const { error } = await supabase
        .from("processes")
        .update({
          metadata: updatedMetadata,
          updated_at: now,
        } as any)
        .eq("id", id)
        .eq("company_id", companyId);

      if (error) throw error;

      toast.success(
        markAsDone 
          ? `Ação "${manualModalTarget.title}" marcada como concluída!` 
          : `Ação "${manualModalTarget.title}" reaberta para pendente.`
      );
      setIsManualModalOpen(false);
      setManualModalTarget(null);
      setManualActionNotes("");
      loadContext();
    } catch (err: any) {
      console.error("Erro ao registrar ação manual:", err);
      toast.error(err?.message || "Não foi possível salvar o estado da ação manual.");
    } finally {
      setIsSavingManualAction(false);
    }
  };

  // -------------------------------------------------------------------------
  // CONCLUIR PROCESSO / AVANÇAR ETAPA QUANDO 100% PRONTO
  // -------------------------------------------------------------------------
  const handleAdvanceProcess = async () => {
    if (!companyId || !id || !processData) return;

    try {
      const now = new Date().toISOString();
      const authorName = profile?.name || user?.email?.split("@")[0] || "Operador";

      const historyEntry = {
        event: "process_completed",
        description: "Processo concluído com êxito! Todas as pendências e exigências foram atendidas.",
        user: authorName,
        date: now,
      };

      const existingHistory = processData.metadata?.history || [];
      const { error } = await supabase
        .from("processes")
        .update({
          status: "completed",
          metadata: {
            ...(processData.metadata || {}),
            history: [historyEntry, ...existingHistory],
          },
          completed_at: now,
          updated_at: now,
        } as any)
        .eq("id", id)
        .eq("company_id", companyId);

      if (error) throw error;

      toast.success("Parabéns! Processo marcado como concluído.");
      loadContext();
    } catch (err: any) {
      console.error("Erro ao avançar processo:", err);
      toast.error("Não foi possível concluir o processo.");
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto py-8 px-4 space-y-6">
        <div className="h-6 w-44 bg-slate-100 rounded-lg animate-pulse" />
        <div className="h-28 bg-white border border-slate-200 rounded-2xl animate-pulse" />
        <div className="h-96 bg-white border border-slate-200 rounded-2xl animate-pulse" />
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
          O processo solicitado não existe ou você não possui permissão para acessá-lo.
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
    <div className="max-w-6xl mx-auto py-3 sm:py-6 px-3 sm:px-6 space-y-6 font-sans text-slate-800">
      
      {/* ========================================================================= */}
      {/* 1. NAVEGAÇÃO: Processos → Cliente → Embarcação → Serviço → Pendências */}
      {/* ========================================================================= */}
      <div className="space-y-2">
        <div>
          <Link
            to="/processes/$id"
            params={{ id }}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[#075BFF] hover:underline cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Voltar ao serviço</span>
          </Link>
        </div>

        {/* Trilha Estruturada de Breadcrumbs */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium overflow-x-auto whitespace-nowrap">
          <Link to="/processes" className="hover:text-slate-600 hover:underline">
            Processos
          </Link>
          <span>/</span>
          {customer ? (
            <Link to="/customers/$id" params={{ id: customer.id }} className="hover:text-slate-600 hover:underline truncate max-w-[150px]">
              {customerName}
            </Link>
          ) : (
            <span>{customerName}</span>
          )}
          <span>/</span>
          {vessel ? (
            <Link to="/vessels/$id" params={{ id: vessel.id }} className="hover:text-slate-600 hover:underline truncate max-w-[150px] font-bold text-slate-700">
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
          <span className="text-slate-700 font-semibold">Pendências</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. CABEÇALHO COM CONTEXTO + BARRA DE PROGRESSO DO SERVIÇO */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-[#075BFF] border border-blue-200">
                {serviceDef.name}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {protocolCode}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0B1739]">
              Pendências do processo
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Acompanhe o que falta para concluir o serviço náutico com segurança e conformidade.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => loadContext()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              title="Atualizar lista de pendências"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Atualizar</span>
            </button>
            <Link
              to="/processes/$id/historico"
              params={{ id }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-xs font-semibold text-slate-700 transition-colors"
            >
              <Clock className="h-3.5 w-3.5" />
              <span>Histórico</span>
            </Link>
          </div>
        </div>

        {/* Card Contexto: Cliente, Embarcação, Serviço e Progresso */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50/70 p-4 rounded-xl border border-slate-100 text-xs">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Cliente</span>
            <span className="font-bold text-[#0B1739] block truncate text-sm mt-0.5">{customerName}</span>
            <span className="text-slate-500 text-[11px] font-mono">{customer?.cpf_cnpj || "CPF não informado"}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Embarcação</span>
            <span className="font-bold text-[#0B1739] block truncate text-sm mt-0.5">{vesselName}</span>
            <span className="text-slate-500 text-[11px]">{vessel?.registration_number ? `TIE: ${vessel.registration_number}` : "Inscrição pendente"}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Serviço</span>
            <span className="font-bold text-[#0B1739] block truncate text-sm mt-0.5">{serviceTitle}</span>
            <span className="text-slate-500 text-[11px]">Tipo: {serviceDef.name}</span>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-slate-400 text-[10px] uppercase font-semibold">Progresso Geral</span>
              <span className="font-bold text-[#075BFF] text-xs">{progressPercentage}%</span>
            </div>
            {/* Barra de Progresso */}
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${isAllReady ? "bg-emerald-500" : "bg-[#075BFF]"}`}
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-400 block mt-1">
              {completedCount} de {totalCount} etapas concluídas
            </span>
          </div>
        </div>

        {/* ===================================================================== */}
        {/* BANNER: TUDO PRONTO PARA A PRÓXIMA ETAPA (Quando 100% Concluído) */}
        {/* ===================================================================== */}
        {isAllReady && (
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-base font-bold text-emerald-900">
                  Tudo pronto para a próxima etapa
                </h3>
                <p className="text-xs text-emerald-700">
                  Todos os dados foram preenchidos, documentos comprobatórios anexados e ações executadas para este serviço.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {processData.status !== "completed" ? (
                <button
                  type="button"
                  onClick={handleAdvanceProcess}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs inline-flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Concluir processo</span>
                </button>
              ) : (
                <Link
                  to="/processes/$id/documentos-emitidos"
                  params={{ id }}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs inline-flex items-center gap-2 cursor-pointer"
                >
                  <Award className="h-4 w-4" />
                  <span>Ver documentos emitidos</span>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. FILTROS RÁPIDOS PELOS 3 GRUPOS + BUSCA */}
      {/* ========================================================================= */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Abas dos 3 Grupos */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveGroup("todos")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeGroup === "todos"
                  ? "bg-white text-[#0B1739] shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Todos ({totalCount})
            </button>

            <button
              type="button"
              onClick={() => setActiveGroup("dados")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer inline-flex items-center gap-1.5 ${
                activeGroup === "dados"
                  ? "bg-white text-[#0B1739] shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>Dados a preencher</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                groupStats.dados.pending > 0 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
              }`}>
                {groupStats.dados.completed}/{groupStats.dados.total}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveGroup("documentos")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer inline-flex items-center gap-1.5 ${
                activeGroup === "documentos"
                  ? "bg-white text-[#0B1739] shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>Documentos a enviar</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                groupStats.documentos.pending > 0 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
              }`}>
                {groupStats.documentos.completed}/{groupStats.documentos.total}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveGroup("acoes")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer inline-flex items-center gap-1.5 ${
                activeGroup === "acoes"
                  ? "bg-white text-[#0B1739] shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>Ações a realizar</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                groupStats.acoes.pending > 0 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
              }`}>
                {groupStats.acoes.completed}/{groupStats.acoes.total}
              </span>
            </button>
          </div>

          {/* Campo de Busca Textual */}
          <div className="relative w-full md:w-72">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar pendência por nome..."
              className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF]"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. LISTAGEM DE ITENS: PENDÊNCIAS ABERTAS E ITENS JÁ CONCLUÍDOS */}
      {/* ========================================================================= */}
      <div className="space-y-6">

        {/* 4.1 O QUE FALTA CONCLUIR */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <h2 className="text-sm font-bold text-[#0B1739]">
                O que falta resolver ({pendingItemsList.length})
              </h2>
            </div>
          </div>

          {pendingItemsList.length === 0 ? (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-8 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <Check className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-[#0B1739]">
                Nenhuma pendência neste grupo!
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Todos os itens avaliados nesta categoria foram preenchidos ou aprovados com sucesso.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {pendingItemsList.map((item) => (
                <div
                  key={item.id}
                  className="bg-white border border-amber-200/80 hover:border-amber-300 rounded-2xl p-4 sm:p-5 shadow-xs transition-all space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/80 flex items-center justify-center shrink-0 mt-0.5">
                        <AlertCircle className="h-4 w-4" />
                      </div>
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            {item.groupLabel}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            Pendente
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-[#0B1739] leading-snug">
                          {item.title}
                        </h3>
                        <p className="text-xs text-slate-500 leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    <div className="sm:self-center shrink-0 pt-1 sm:pt-0">
                      <button
                        type="button"
                        onClick={() => handleResolveItem(item)}
                        className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-bold transition-all shadow-xs inline-flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        {item.group === "documentos" ? (
                          <Upload className="h-3.5 w-3.5" />
                        ) : item.group === "dados" ? (
                          <PenTool className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5" />
                        )}
                        <span>{item.actionLabel}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 4.2 ITENS JÁ CONCLUÍDOS */}
        {completedItemsList.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-slate-200/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <h2 className="text-sm font-bold text-[#0B1739]">
                  Itens concluídos com sucesso ({completedItemsList.length})
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {completedItemsList.map((item) => (
                <div
                  key={item.id}
                  className="bg-white border border-slate-200/90 rounded-xl p-3.5 sm:p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="h-4 w-4" />
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-semibold text-slate-400">
                          {item.groupLabel}
                        </span>
                        <span className="px-2 py-0.2 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Concluído
                        </span>
                      </div>
                      <h4 className="text-xs sm:text-sm font-bold text-[#0B1739] truncate">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 truncate">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {item.actionType === "manual_action" && (
                      <button
                        type="button"
                        onClick={() => handleResolveItem(item)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        Reabrir ação
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleResolveItem(item)}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/70 text-[11px] font-semibold text-slate-700 transition-colors inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>{item.actionLabel}</span>
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: PREENCHIMENTO RÁPIDO DE DADO OBRIGATÓRIO (COM GRAVAÇÃO REAL) */}
      {/* ========================================================================= */}
      <Dialog open={isDataModalOpen} onOpenChange={setIsDataModalOpen}>
        <DialogContent className="max-w-md bg-white p-6 rounded-2xl shadow-xl border border-slate-200">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-lg font-bold text-[#0B1739] flex items-center gap-2">
              <PenTool className="h-5 w-5 text-[#075BFF]" />
              <span>{dataModalTarget?.title}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {dataModalTarget?.description}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveData} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#0B1739]">
                {dataModalTarget?.title} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={dataInputValue}
                onChange={(e) => setDataInputValue(e.target.value)}
                placeholder="Informe o valor correspondente..."
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF]"
              />
            </div>

            {/* Campo Secundário (ex: Cidade no Endereço ou CPF no Comprador) */}
            {(dataModalTarget?.actionTarget?.field === "address" || dataModalTarget?.actionTarget?.field === "buyer") && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#0B1739]">
                  {dataModalTarget.actionTarget.field === "address" ? "Município / Comarca" : "CPF/CNPJ do Comprador"}
                </label>
                <input
                  type="text"
                  value={dataInputSecondary}
                  onChange={(e) => setDataInputSecondary(e.target.value)}
                  placeholder={dataModalTarget.actionTarget.field === "address" ? "Ex: Rio de Janeiro" : "Ex: 000.000.000-00"}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF]"
                />
              </div>
            )}

            <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 flex items-start gap-2.5 text-[11px] text-blue-800">
              <ShieldCheck className="h-4 w-4 text-[#075BFF] shrink-0 mt-0.5" />
              <p>
                Os dados serão salvos de forma permanente no cadastro correspondente e registrados no histórico de auditoria do processo.
              </p>
            </div>

            <DialogFooter className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDataModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSavingData}
                className="px-4 py-2 rounded-xl bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5 disabled:opacity-60 cursor-pointer"
              >
                {isSavingData ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Salvar no cadastro</span>
                  </>
                )}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 2: UPLOAD DE DOCUMENTO EXIGIDO (COM ANEXO REAL NO STORAGE) */}
      {/* ========================================================================= */}
      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent className="max-w-md bg-white p-6 rounded-2xl shadow-xl border border-slate-200">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-lg font-bold text-[#0B1739] flex items-center gap-2">
              <Upload className="h-5 w-5 text-[#075BFF]" />
              <span>Anexar documento exigido</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {uploadModalTarget?.title}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUploadDocument} className="space-y-4 pt-2">
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#0B1739]">
                Selecione o arquivo (PDF, PNG ou JPG até 10MB) <span className="text-red-500">*</span>
              </label>
              
              <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-5 text-center transition-colors bg-slate-50/50">
                <input
                  type="file"
                  id="pending-doc-file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setSelectedUploadFile(file);
                  }}
                />
                <label
                  htmlFor="pending-doc-file"
                  className="cursor-pointer flex flex-col items-center justify-center gap-2"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#075BFF] flex items-center justify-center">
                    <Upload className="h-5 w-5" />
                  </div>
                  {selectedUploadFile ? (
                    <div>
                      <p className="text-xs font-bold text-[#0B1739]">{selectedUploadFile.name}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {(selectedUploadFile.size / 1024 / 1024).toFixed(2)} MB • Clique para substituir
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-bold text-[#075BFF] hover:underline">
                        Clique para selecionar o arquivo
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Formatos aceitos: PDF, JPG, PNG
                      </p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#0B1739]">
                Observações internas (opcional)
              </label>
              <textarea
                value={uploadNotes}
                onChange={(e) => setUploadNotes(e.target.value)}
                placeholder="Ex: Cópia autenticada recebida por e-mail..."
                rows={2}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF]"
              />
            </div>

            <DialogFooter className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!selectedUploadFile || isUploading}
                className="px-4 py-2 rounded-xl bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Enviando arquivo...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Concluir anexo</span>
                  </>
                )}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 3: REGISTRO AUDITADO DE AÇÃO MANUAL (QUEM E QUANDO) */}
      {/* ========================================================================= */}
      <Dialog open={isManualModalOpen} onOpenChange={setIsManualModalOpen}>
        <DialogContent className="max-w-md bg-white p-6 rounded-2xl shadow-xl border border-slate-200">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-lg font-bold text-[#0B1739] flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <span>{manualModalTarget?.title}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Confirme a execução desta etapa manual registrando o operador responsável e data/hora.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Responsável:</span>
                <span className="font-bold text-[#0B1739]">{profile?.name || user?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Data/Hora:</span>
                <span className="font-bold text-[#0B1739]">
                  {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date())}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#0B1739]">
                Comprovante ou número de autenticação bancária (opcional)
              </label>
              <textarea
                value={manualActionNotes}
                onChange={(e) => setManualActionNotes(e.target.value)}
                placeholder="Ex: GRU nº 984712 quitada no Banco do Brasil..."
                rows={2}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF]"
              />
            </div>

            <DialogFooter className="flex items-center justify-between gap-2 pt-2">
              {manualModalTarget?.isCompleted ? (
                <button
                  type="button"
                  onClick={() => handleSaveManualAction(false)}
                  disabled={isSavingManualAction}
                  className="px-3 py-2 rounded-xl text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer"
                >
                  <Undo2 className="h-3.5 w-3.5" />
                  <span>Reabrir pendência</span>
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveManualAction(true)}
                  disabled={isSavingManualAction}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {isSavingManualAction ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                  <span>Confirmar conclusão</span>
                </button>
              </div>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
