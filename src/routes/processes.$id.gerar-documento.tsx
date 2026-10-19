import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Search,
  User,
  Ship,
  Folder,
  Cog,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Info,
  Loader2,
  Download,
  ExternalLink,
  ShieldCheck,
  Building2,
  FileSpreadsheet,
  ChevronRight,
  Check,
  Sparkles,
  PenTool,
  RefreshCw,
  AlertTriangle,
  FileCheck2,
  Lock,
  UserPlus,
  Upload,
  Paperclip,
  CheckSquare,
  Square,
  Eye,
  Edit,
  XCircle,
} from "lucide-react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/routes/dashboard";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { uploadToBucket } from "@/lib/storage";
import { buildBrandedDocumentPdf } from "@/services/brandedPdfBuilder";
import { loadCompanyBranding } from "@/services/companyBranding";
import { openStoredFile, downloadStoredFile } from "@/utils/file-preview";
import {
  CATALOG_TEMPLATES,
  CatalogTemplateItem,
  loadDatabaseTemplates,
  resolveCatalogTemplate,
  checkTemplateMissingRequirements,
  ResolvedTemplateResult,
} from "@/services/documents/templateCatalogResolver";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/processes/$id/gerar-documento")({
  validateSearch: (
    search: Record<string, unknown>,
  ): {
    serviceKey?: string;
    templateId?: string;
    from?: string;
  } => ({
    ...(search.serviceKey ? { serviceKey: search.serviceKey as string } : {}),
    ...(search.templateId ? { templateId: search.templateId as string } : {}),
    ...(search.from ? { from: search.from as string } : {}),
  }),
  component: () => (
    <ProtectedRoute>
      <DashboardLayout>
        <GerarDocumentoPage />
      </DashboardLayout>
    </ProtectedRoute>
  ),
});

// Mantido para compatibilidade com outros módulos que importam SYSTEM_TEMPLATES
export type DocumentTemplateItem = CatalogTemplateItem;
export const SYSTEM_TEMPLATES: DocumentTemplateItem[] = CATALOG_TEMPLATES;

function GerarDocumentoPage() {
  const { id } = Route.useParams();
  const searchParams = Route.useSearch();
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const companyId = profile?.company_id;
  const currentCompany = profile?.companies;

  // Estados do Processo e Contexto
  const [processData, setProcessData] = useState<any | null>(null);
  const [customer, setCustomer] = useState<any | null>(null);
  const [vessel, setVessel] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Modelos do Banco de Dados e Documentos Gerados
  const [dbTemplates, setDbTemplates] = useState<any[]>([]);
  const [generatedDocsList, setGeneratedDocsList] = useState<any[]>([]);
  const [isLoadingGeneratedDocs, setIsLoadingGeneratedDocs] = useState(false);

  // Estados dos Modelos do Catálogo
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    searchParams.templateId || "req-padrao-cpes",
  );

  // Funcionário Responsável
  const [selectedStaff, setSelectedStaff] = useState<{
    id: string;
    name: string;
    role: string;
    professional_registry?: string;
    email?: string;
  }>({
    id: user?.id || "user-1",
    name: profile?.name || user?.email?.split("@")[0] || "Despachante Náutico",
    role: "Despachante Náutico Responsável",
  });

  // Lista de Funcionários da Empresa (carregados do Lovable Cloud)
  const [companyStaffList, setCompanyStaffList] = useState<
    {
      id: string;
      name: string;
      role: string;
      professional_registry?: string;
      email?: string;
    }[]
  >([]);

  const [companyData, setCompanyData] = useState<any | null>(null);

  // Modal para cadastro rápido de funcionário
  const [showQuickStaffModal, setShowQuickStaffModal] = useState(false);
  const [quickStaffName, setQuickStaffName] = useState("");
  const [quickStaffRole, setQuickStaffRole] = useState("Despachante Náutico");
  const [isSavingQuickStaff, setIsSavingQuickStaff] = useState(false);

  // Modal para cadastro/edição rápida da embarcação (desbloqueio sem sair do fluxo)
  const [showQuickVesselModal, setShowQuickVesselModal] = useState(false);
  const [quickVesselName, setQuickVesselName] = useState("");
  const [quickVesselReg, setQuickVesselReg] = useState("");
  const [quickVesselType, setQuickVesselType] = useState("Lancha / Recreio");
  const [isSavingQuickVessel, setIsSavingQuickVessel] = useState(false);

  // Estado de Geração e Falhas Parciais
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationSummary, setGenerationSummary] = useState<{
    successDocs: any[];
    failedDocs: Array<{ tpl: CatalogTemplateItem; error: string }>;
  } | null>(null);

  // Carregar documentos gerados existentes para este processo
  const loadExistingGeneratedDocs = useCallback(async () => {
    if (!id || !companyId) return;
    setIsLoadingGeneratedDocs(true);
    try {
      const { data, error } = await supabase
        .from("generated_documents")
        .select("*")
        .eq("company_id", companyId)
        .eq("process_id", id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setGeneratedDocsList(data || []);
    } catch (err) {
      console.error("Erro ao carregar documentos gerados:", err);
    } finally {
      setIsLoadingGeneratedDocs(false);
    }
  }, [companyId, id]);

  // Carregamento dos Dados do Processo, Empresa, Modelos e Funcionários
  useEffect(() => {
    async function loadData() {
      const isPreview =
        typeof window !== "undefined" &&
        (window.location.search.includes("preview=true") ||
          window.localStorage.getItem("preview_mode") === "true");
      if (!id || (!companyId && !isPreview)) return;
      setIsLoading(true);

      try {
        let proc: any = null;
        if (companyId) {
          const { data } = await supabase
            .from("processes")
            .select(
              `
              *,
              customer:customers!processes_customer_id_fkey(id, name, cpf_cnpj, email, phone, address, city, state),
              vessel:vessels!processes_vessel_id_fkey(id, name, registration_number, category, vessel_type, length, material)
            `,
            )
            .eq("id", id)
            .eq("company_id", companyId)
            .maybeSingle();
          proc = data;
        }

        if (!proc) {
          const isPreview =
            typeof window !== "undefined" &&
            (window.location.search.includes("preview=true") ||
              window.localStorage.getItem("preview_mode") === "true");
          if (isPreview) {
            const demoProc = {
              id,
              title: "Processo Demonstrativo",
              process_type: "laudo_engenharia",
              status: "draft",
              is_draft: true,
              created_at: new Date().toISOString(),
              draft_data: {
                category: "profissional",
                category_label: "Embarcações profissionais",
                services: [
                  "laudo_engenharia",
                  "despacho_maritimo",
                  "inscricao_inicial",
                  "renovacao_tie",
                ],
              },
              customer: { id: "c-1", name: "Marina Alves de Souza", cpf_cnpj: "123.456.789-00", address: "Av. Ana Costa, 100", city: "Santos", state: "SP" },
              vessel: {
                id: "v-1",
                name: "Brisa Azul Teste",
                registration_number: "SP-123456",
                category: "profissional",
                vessel_type: "Embarcação Comercial",
              },
            };
            setProcessData(demoProc);
            setCustomer(demoProc.customer);
            setVessel(demoProc.vessel);
            setQuickVesselName(demoProc.vessel.name);
            setQuickVesselReg(demoProc.vessel.registration_number);
            setIsLoading(false);
            return;
          }
          toast.error("Processo não encontrado.");
          navigate({ to: "/processes" });
          return;
        }

        setProcessData(proc);
        setCustomer(proc.customer || null);
        setVessel(proc.vessel || null);
        if (proc.vessel) {
          setQuickVesselName(proc.vessel.name || "");
          setQuickVesselReg(proc.vessel.registration_number || "");
          setQuickVesselType(proc.vessel.vessel_type || "Lancha / Recreio");
        }

        // 2. Carregar modelos reais do banco de dados (document_templates)
        const templatesFromDb = await loadDatabaseTemplates(companyId);
        setDbTemplates(templatesFromDb);

        // 3. Carregar documentos já gerados para este processo
        const { data: existingDocs } = await supabase
          .from("generated_documents")
          .select("*")
          .eq("company_id", companyId)
          .eq("process_id", id)
          .order("created_at", { ascending: false });
        setGeneratedDocsList(existingDocs || []);

        // 4. Carregar dados da empresa e lista de funcionários
        const { data: comp } = await supabase
          .from("companies")
          .select(
            "id, name, cnpj, phone, email, contact_phone, contact_email, contact_address, logo_url, logo_primary_url, document_template_map, procurador_nome, procurador_cpf, procurador_rg, procurador_orgao_expedidor, procurador_nacionalidade, procurador_endereco, procurador_telefone, procurador_email, procurador_crea",
          )
          .eq("id", companyId)
          .maybeSingle();

        if (comp) {
          setCompanyData(comp);
          const docMap = (comp.document_template_map as any) || {};
          const savedEmployees: any[] =
            docMap.employees || (comp as any)?.metadata?.employees || [];

          const activeEmployees = savedEmployees
            .filter((emp: any) => emp.status !== "inactive")
            .map((emp: any) => ({
              id: emp.id,
              name: emp.document_name || emp.name,
              role: emp.document_role || emp.role || "Despachante / Responsável",
              professional_registry: emp.professional_registry,
              email: emp.email,
            }));

          if (activeEmployees.length === 0 && profile?.id) {
            activeEmployees.push({
              id: profile.id,
              name: profile.name || user?.email?.split("@")[0] || "Despachante Náutico",
              role:
                profile.role === "company_admin" || profile.role === "admin"
                  ? "Administrador / Despachante"
                  : "Operador Náutico",
              professional_registry: undefined,
              email: user?.email,
            });
          }

          setCompanyStaffList(activeEmployees);
          if (activeEmployees.length > 0) {
            setSelectedStaff(activeEmployees[0]);
          }
        }
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [companyId, id, navigate, profile, user]);

  // Mapa de resolução: catalogItem.slug -> ResolvedTemplateResult
  const resolvedTemplatesMap = useMemo(() => {
    const map = new Map<string, ResolvedTemplateResult>();
    for (const tpl of CATALOG_TEMPLATES) {
      const res = resolveCatalogTemplate(tpl, dbTemplates, companyId);
      map.set(tpl.slug, res);
    }
    return map;
  }, [dbTemplates, companyId]);

  // Identificação do Processo
  const processCode = useMemo(() => {
    if (!processData) return "PROC";
    return (
      processData.protocol_number || `PROC-${String(processData.id).slice(0, 4).toUpperCase()}`
    );
  }, [processData]);

  // Categoria da Embarcação
  const vesselCategory = useMemo(() => {
    const draftCategory =
      (processData?.draft_data as any)?.category ||
      processData?.metadata?.category ||
      vessel?.category;
    if (draftCategory === "profissional") {
      return "profissional";
    }
    const typeStr = (vessel?.vessel_type || "").toLowerCase();
    const nameStr = (vessel?.name || "").toLowerCase();
    if (typeStr.includes("moto") || typeStr.includes("jet") || nameStr.includes("jet")) {
      return "moto_aquatica";
    }
    return "esporte_recreio";
  }, [vessel, processData]);

  // Modelos Filtrados e Compatíveis
  const filteredTemplates = useMemo(() => {
    return CATALOG_TEMPLATES.filter((tpl) => {
      const isCategoryMatch = tpl.category === "geral" || tpl.category === vesselCategory;
      const matchesSearch =
        searchQuery === "" ||
        tpl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tpl.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tpl.description.toLowerCase().includes(searchQuery.toLowerCase());

      return isCategoryMatch && matchesSearch;
    });
  }, [vesselCategory, searchQuery]);

  // Estado de Seleção e Ação para cada documento aplicável
  const [docSelections, setDocSelections] = useState<
    Record<
      string,
      {
        mode: "generate" | "attach" | "omit";
        attachedFile?: { name: string; url: string; size?: number; id?: string };
        isUploading?: boolean;
      }
    >
  >({});

  // Inicializa seleções padrão com base nos modelos aplicáveis
  useEffect(() => {
    if (filteredTemplates.length > 0) {
      setDocSelections((prev) => {
        const next = { ...prev };
        filteredTemplates.forEach((tpl) => {
          if (!next[tpl.id]) {
            if (tpl.status === "em_revisao" || tpl.isConditional) {
              next[tpl.id] = { mode: "omit" };
            } else {
              next[tpl.id] = { mode: "generate" };
            }
          }
        });
        return next;
      });
    }
  }, [filteredTemplates]);

  // Mapa de validação individual por documento (bloqueia APENAS os documentos que exigem os campos ausentes)
  const templateValidationMap = useMemo(() => {
    const map = new Map<string, { isBlocked: boolean; missingFields: string[] }>();
    for (const tpl of CATALOG_TEMPLATES) {
      map.set(tpl.slug, checkTemplateMissingRequirements(tpl, customer, vessel, selectedStaff, companyData));
    }
    return map;
  }, [customer, vessel, selectedStaff, companyData]);

  // Contagens dinâmicas
  // IMPORTANTE: apenas documentos com mode === "generate", status aprovado, COM UUID resolvido no banco e com dados válidos!
  const templatesToGenerate = useMemo(() => {
    return filteredTemplates.filter((tpl) => {
      const isModeGenerate = docSelections[tpl.id]?.mode === "generate";
      const isApproved = tpl.status === "aprovado";
      const validation = templateValidationMap.get(tpl.slug);
      const isFieldsValid = !validation?.isBlocked;
      const resolution = resolvedTemplatesMap.get(tpl.slug);
      const isDbResolved = !!resolution?.dbTemplateId;

      return isModeGenerate && isApproved && isFieldsValid && isDbResolved;
    });
  }, [filteredTemplates, docSelections, templateValidationMap, resolvedTemplatesMap]);

  const templatesAttached = useMemo(() => {
    return filteredTemplates.filter(
      (tpl) => docSelections[tpl.id]?.mode === "attach" && docSelections[tpl.id]?.attachedFile,
    );
  }, [filteredTemplates, docSelections]);

  const templatesOmitted = useMemo(() => {
    return filteredTemplates.filter((tpl) => docSelections[tpl.id]?.mode === "omit");
  }, [filteredTemplates, docSelections]);

  // Modelo Selecionado Atualmente para prévia de campos
  const activeTemplate = useMemo(() => {
    return (
      CATALOG_TEMPLATES.find((t) => t.id === selectedTemplateId) ||
      templatesToGenerate[0] ||
      filteredTemplates[0] ||
      CATALOG_TEMPLATES[0]
    );
  }, [selectedTemplateId, templatesToGenerate, filteredTemplates]);

  // Verificação Geral de Dados Ausentes
  const dataValidation = useMemo(() => {
    const missing: string[] = [];
    if (!customer?.name && !customer?.fantasy_name) missing.push("Nome do Cliente");
    if (!customer?.cpf_cnpj && !customer?.document) missing.push("CPF ou CNPJ do Cliente");
    if (!vessel?.name) missing.push("Nome da Embarcação");
    if (!vessel?.registration_number && vesselCategory !== "esporte_recreio")
      missing.push("Número de Inscrição");

    return {
      isValid: missing.length === 0,
      missingFields: missing,
    };
  }, [customer, vessel, vesselCategory]);

  // Salvar/Completar dados rápidos da embarcação para desbloquear geração sem sair do fluxo
  const handleSaveQuickVessel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickVesselName.trim() || !companyId) {
      toast.error("Informe o nome da embarcação.");
      return;
    }

    setIsSavingQuickVessel(true);
    try {
      const now = new Date().toISOString();
      let updatedVesselRecord: any = null;

      if (vessel?.id) {
        // Atualiza a embarcação existente
        const { data: updated, error: updErr } = await supabase
          .from("vessels")
          .update({
            name: quickVesselName.trim(),
            registration_number: quickVesselReg.trim() || null,
            vessel_type: quickVesselType.trim() || vessel.vessel_type || "Lancha / Recreio",
            updated_at: now,
          })
          .eq("id", vessel.id)
          .eq("company_id", companyId)
          .select()
          .single();

        if (updErr) throw updErr;
        updatedVesselRecord = updated;
      } else {
        // Cria nova embarcação associada ao cliente e processo
        const { data: created, error: crtErr } = await supabase
          .from("vessels")
          .insert({
            company_id: companyId,
            customer_id: customer?.id || null,
            name: quickVesselName.trim(),
            registration_number: quickVesselReg.trim() || null,
            vessel_type: quickVesselType.trim() || "Lancha / Recreio",
            category: vesselCategory,
            status: "active",
            created_at: now,
            updated_at: now,
          })
          .select()
          .single();

        if (crtErr) throw crtErr;
        updatedVesselRecord = created;

        // Vincula a nova embarcação ao processo
        if (id) {
          await supabase
            .from("processes")
            .update({
              vessel_id: created.id,
              updated_at: now,
            })
            .eq("id", id)
            .eq("company_id", companyId);
        }
      }

      setVessel(updatedVesselRecord);
      setShowQuickVesselModal(false);
      toast.success("Dados da embarcação salvos com sucesso!", {
        description: "Os modelos que exigiam nome e inscrição foram desbloqueados.",
      });
    } catch (err: any) {
      console.error("Erro ao salvar embarcação rápida:", err);
      toast.error(err?.message || "Não foi possível atualizar a embarcação.");
    } finally {
      setIsSavingQuickVessel(false);
    }
  };

  // Cadastro Rápido de Funcionário inline
  const handleCreateQuickStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickStaffName.trim() || !companyId) return;

    setIsSavingQuickStaff(true);
    try {
      const now = new Date().toISOString();
      const newStaffId = `emp-${Date.now()}`;
      const newStaffObj = {
        id: newStaffId,
        name: quickStaffName.trim(),
        role: quickStaffRole.trim() || "Despachante Náutico",
        document_name: quickStaffName.trim(),
        document_role: quickStaffRole.trim() || "Despachante Náutico",
        status: "active",
        created_at: now,
      };

      const { data: comp } = await supabase
        .from("companies")
        .select("document_template_map")
        .eq("id", companyId)
        .single();

      const docMap = (comp?.document_template_map as any) || {};
      const existingEmployees: any[] = docMap.employees || [];
      const updatedEmployees = [...existingEmployees, newStaffObj];

      const { error: updErr } = await supabase
        .from("companies")
        .update({
          document_template_map: {
            ...docMap,
            employees: updatedEmployees,
          },
          updated_at: now,
        } as any)
        .eq("id", companyId);

      if (updErr) throw updErr;

      setCompanyStaffList((prev) => [...prev, newStaffObj]);
      setSelectedStaff(newStaffObj);
      setShowQuickStaffModal(false);
      setQuickStaffName("");
      toast.success("Funcionário cadastrado e selecionado com sucesso!");
    } catch (err: any) {
      console.error("Erro ao cadastrar funcionário rápido:", err);
      toast.error("Não foi possível cadastrar o funcionário.");
    } finally {
      setIsSavingQuickStaff(false);
    }
  };

  // Anexar arquivo externo para um documento que o usuário já possui pronto
  const handleAttachFileForTemplate = async (tpl: CatalogTemplateItem, file: File) => {
    if (!companyId || !id || !file) return;

    setDocSelections((prev) => ({
      ...prev,
      [tpl.id]: { ...(prev[tpl.id] || { mode: "attach" }), isUploading: true },
    }));

    try {
      const path = `${companyId}/${id}/attached_${tpl.code}_${Date.now()}_${file.name}`;
      await uploadToBucket("process-attachments", path, file);

      const { data: insertedFile, error: insErr } = await supabase
        .from("uploaded_files")
        .insert({
          company_id: companyId,
          process_id: id,
          customer_id: customer?.id || null,
          vessel_id: vessel?.id || null,
          category: "attached_requirement",
          file_name: file.name,
          file_url: path,
          file_size: file.size,
          file_type: file.type || "application/pdf",
          status: "ready",
          metadata: {
            requirement_code: tpl.code,
            requirement_name: tpl.name,
            original_filename: file.name,
            source: "external_signed_document",
            official_source: tpl.officialSource,
            uploaded_at: new Date().toISOString(),
          },
        })
        .select("id")
        .single();

      if (insErr) throw insErr;

      setDocSelections((prev) => ({
        ...prev,
        [tpl.id]: {
          mode: "attach",
          isUploading: false,
          attachedFile: { name: file.name, url: path, size: file.size, id: insertedFile?.id },
        },
      }));

      // Registra no histórico do processo dentro de draft_data (coluna metadata não existe em processes)
      const existingHistory = (processData?.draft_data as any)?.history || [];
      const historyEntry = {
        event: "doc_attached_externally",
        description: `Documento anexado externamente: "${tpl.name}" (${file.name})`,
        user: selectedStaff.name,
        date: new Date().toISOString(),
      };

      await supabase
        .from("processes")
        .update({
          draft_data: {
            ...((processData?.draft_data as any) || {}),
            history: [historyEntry, ...existingHistory],
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("company_id", companyId);

      toast.success(`Documento "${tpl.name}" anexado com sucesso!`, {
        description: "Este documento foi gravado como anexo externo e não precisará ser gerado.",
      });
    } catch (err: any) {
      console.error("Erro ao anexar documento pronto:", err);
      toast.error(err?.message || "Erro ao anexar arquivo.");
      setDocSelections((prev) => ({
        ...prev,
        [tpl.id]: { ...(prev[tpl.id] || { mode: "attach" }), isUploading: false },
      }));
    }
  };

  // Tabela de tradução: slug interno → rótulo legível para o PDF
  const SERVICE_LABELS: Record<string, string> = {
    laudo_engenharia:       'Laudo de Engenharia Naval',
    despacho_maritimo:      'Despacho Marítimo',
    inscricao_inicial:      'Inscrição Inicial',
    renovacao_tie:          'Renovação de TIE/TIEM',
    transferencia:          'Transferência de Propriedade',
    segunda_via:            '2ª Via de Documento',
    vistoria:               'Vistoria Náutica',
    regularizacao:          'Regularização',
    cancelamento:           'Cancelamento de Inscrição',
    alteracao_dados:        'Alteração de Dados Cadastrais',
    habilitacao_amador:     'Habilitação de Amador',
    renovacao_habilitacao:  'Renovação de Habilitação',
    geral:                  'Serviço Geral',
  };

  const translateServices = (services: unknown): string => {
    if (Array.isArray(services) && services.length > 0) {
      return services
        .map((s: string) => SERVICE_LABELS[s] ?? s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()))
        .join('; ');
    }
    return 'Inscrição / Regularização / Transferência';
  };

  // Ação de Geração de Documentos Selecionados
  const handleGenerateBatchDocuments = async () => {
    if (!companyId || !id) return;

    if (isGenerating) {
      toast.info("Geração em andamento. Aguarde...");
      return;
    }

    if (templatesToGenerate.length === 0) {
      toast.info("Nenhum documento apto selecionado para geração.", {
        description: "Confira se os modelos marcados 'Gerar pelo NavalDocs' estão com todos os campos obrigatórios preenchidos.",
      });
      return;
    }

    setIsGenerating(true);
    setGenerationSummary(null);
    const loadingToast = toast.loading(
      `Gerando ${templatesToGenerate.length} documento(s) selecionado(s)...`,
    );

    const successDocs: any[] = [];
    const failedDocs: Array<{ tpl: CatalogTemplateItem; error: string }> = [];

    try {
      const branding = await loadCompanyBranding(companyId);
      const now = new Date().toISOString();
      const customerName = customer?.fantasy_name || customer?.name || "Cliente";
      const vesselName = vessel?.name || "Embarcação";

      for (const tpl of templatesToGenerate) {
        try {
          // 0. Validação estrita de campos obrigatórios (não permite emissão silenciosa)
          const fieldValidation = checkTemplateMissingRequirements(tpl, customer, vessel, selectedStaff, companyData);
          if (fieldValidation.isBlocked) {
            throw new Error(
              `O modelo "${tpl.name}" possui campos obrigatórios não preenchidos: ${fieldValidation.missingFields.join(", ")}. Preencha todos os campos antes de gerar.`
            );
          }

          // 1. Resolução estrita do UUID real no banco
          const resolution = resolvedTemplatesMap.get(tpl.slug);
          const realTemplateUuid = resolution?.dbTemplateId;

          if (!realTemplateUuid) {
            throw new Error(
              `Modelo "${tpl.name}" (${tpl.code}) não foi localizado no catálogo do banco de dados. Execute a migração de sincronização.`,
            );
          }

          const docTitle = `${tpl.name} - ${vesselName}`;
          const fileName = `${tpl.code}_${vesselName.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}.pdf`;
          const storagePath = `${companyId}/${id}/${fileName}`;

          // 2. Construir texto oficial detalhado do documento conforme sua natureza e regras normativas
          let content = "";

          if (tpl.slug === "proc-representacao-naval") {
            const isPF = !!(companyData?.procurador_nome || companyData?.procurador_cpf);

            const resolvedCompanyEmail =
              companyData?.contact_email ||
              companyData?.email ||
              companyData?.procurador_email ||
              (currentCompany as any)?.contact_email ||
              (currentCompany as any)?.email ||
              branding?.contact_email ||
              selectedStaff?.email ||
              user?.email ||
              "";

            const resolvedCompanyPhone =
              companyData?.contact_phone ||
              companyData?.phone ||
              companyData?.procurador_telefone ||
              (currentCompany as any)?.contact_phone ||
              (currentCompany as any)?.phone ||
              branding?.contact_phone ||
              "";

            const resolvedProcuradorEmail =
              companyData?.procurador_email ||
              companyData?.contact_email ||
              companyData?.email ||
              (currentCompany as any)?.contact_email ||
              (currentCompany as any)?.email ||
              branding?.contact_email ||
              selectedStaff?.email ||
              user?.email ||
              "";

            const resolvedProcuradorPhone =
              companyData?.procurador_telefone ||
              companyData?.contact_phone ||
              companyData?.phone ||
              (currentCompany as any)?.contact_phone ||
              (currentCompany as any)?.phone ||
              branding?.contact_phone ||
              "";

            const outorgadoLines = isPF
              ? [
                  `OUTORGADO (PESSOA FÍSICA):`,
                  `Nome do Procurador: ${companyData?.procurador_nome || selectedStaff.name}`,
                  `Nacionalidade: ${companyData?.procurador_nacionalidade || "Brasileira"}    Estado Civil: Casado(a)`,
                  `RG: ${companyData?.procurador_rg || "Não informado"}    CPF: ${companyData?.procurador_cpf || "Não informado"}`,
                  companyData?.procurador_crea ? `Registro Profissional / Habilitação: ${companyData.procurador_crea}` : "",
                  `Endereço Profissional: ${companyData?.procurador_endereco || companyData?.contact_address || "Não informado"}`,
                  `Telefone: ${resolvedProcuradorPhone || "Não informado"} | E-mail: ${resolvedProcuradorEmail || "Não informado"}`,
                  `Sociedade Vinculada: ${companyData?.name || currentCompany?.name || "NavalDocs Pro"} (CNPJ: ${companyData?.cnpj || currentCompany?.cnpj || "Não informado"})`,
                ]
              : [
                  `OUTORGADA (PESSOA JURÍDICA):`,
                  `Razão Social: ${companyData?.name || currentCompany?.name || "NavalDocs Pro"}`,
                  `CNPJ: ${companyData?.cnpj || currentCompany?.cnpj || "Não informado"}`,
                  `Sede Social: ${companyData?.contact_address || "Não informado"}`,
                  `Telefone: ${resolvedCompanyPhone || "Não informado"} | E-mail: ${resolvedCompanyEmail || "Não informado"}`,
                  `Representação Legal: Representada neste ato por seus administradores ou procuradores com poderes específicos para a prática de atos perante a Autoridade Marítima.`,
                ];

            content = [
              `INSTRUMENTO PARTICULAR DE PROCURAÇÃO: ${tpl.name.toUpperCase()}`,
              `CÓDIGO: ${tpl.code} | BASE LEGAL: ${tpl.officialSource}`,
              `PROCESSO Nº: ${processCode}`,
              `DATA: ${new Date().toLocaleDateString("pt-BR")}`,
              ``,
              `OUTORGANTE:`,
              `Nome / Razão Social: ${customerName}`,
              `CPF / CNPJ: ${customer?.cpf_cnpj || customer?.document || "Não informado"}    RG: ${customer?.rg || "Não informado"}`,
              `Endereço: ${customer?.address || "Não informado"}, ${customer?.city || ""}/${customer?.state || ""}`,
              `Telefone: ${customer?.phone || "Não informado"} | E-mail: ${customer?.email || "Não informado"}`,
              ``,
              ...outorgadoLines.filter(Boolean),
              ``,
              `PODERES ESPECÍFICOS DE REPRESENTAÇÃO NÁUTICA:`,
              `Por este instrumento particular de mandato, o(a) Outorgante nomeia e constitui o(a) Outorgado(a) como seu(sua) bastante procurador(a) para o fim específico de representá-lo(a) perante a Capitania dos Portos, Delegacias e Agências da Marinha do Brasil, podendo requerer, protocolar, instruir e dar andamento a processos administrativos da embarcação "${vesselName}" (Inscrição: ${vessel?.registration_number || "Em regularização"}), juntar e desentranhar documentos, prestar declarações, assinar termos e praticar os atos necessários ao fiel cumprimento deste mandato.`,
              ``,
              `PREPARADO POR (OPERADOR DO SISTEMA): ${selectedStaff.name} (${selectedStaff.role})`,
              `Documento elaborado na plataforma NavalDocs Pro para conferência e assinatura externa (GOV.BR ou presencial) pelo(a) Outorgante.`,
            ]
              .filter(Boolean)
              .join("\n");
          } else if (tpl.slug === "decl-residencia-naval") {
            content = [
              `DECLARAÇÃO DE RESIDÊNCIA ELABORADA PELA PLATAFORMA: ${tpl.name.toUpperCase()}`,
              `CÓDIGO: ${tpl.code} | BASE LEGAL: ${tpl.officialSource}`,
              `PROCESSO Nº: ${processCode}`,
              `DATA: ${new Date().toLocaleDateString("pt-BR")}`,
              ``,
              `DECLARANTE:`,
              `Nome / Razão Social: ${customerName}`,
              `CPF / CNPJ: ${customer?.cpf_cnpj || customer?.document || "Não informado"}    RG: ${customer?.rg || "Não informado"}`,
              ``,
              `DECLARAÇÃO DE DOMICÍLIO:`,
              `Eu, ${customerName}, acima qualificado(a), DECLARO para os devidos fins de direito, em especial para instrução de processo náutico perante a Autoridade Marítima (Capitania dos Portos / Delegacia / Agência) referente à embarcação "${vesselName}", sob as penas da Lei Federal nº 7.115/1983 e do art. 299 do Código Penal (Falsidade Ideológica), que resido e sou domiciliado(a) no seguinte endereço:`,
              ``,
              `Endereço Declarado: ${customer?.address || "Não informado"}, ${customer?.city || ""}/${customer?.state || ""}`,
              ``,
              `Por ser a expressão da verdade, firmo a presente declaração sob minha responsabilidade jurídica.`,
              ``,
              `PREPARADO POR (OPERADOR DO SISTEMA): ${selectedStaff.name} (${selectedStaff.role})`,
              `Documento elaborado na plataforma NavalDocs Pro para conferência e assinatura externa (GOV.BR ou presencial) pelo(a) Declarante.`,
            ]
              .filter(Boolean)
              .join("\n");
          } else {
            // Requerimento Padrão do Interessado
            const isProf = vesselCategory === "profissional" || tpl.code === "REQ-PROF";
            const isJet = vesselCategory === "moto_aquatica" || tpl.code === "REQ-JET";
            const normamScope = isProf
              ? "NORMAM-201/DPC, ANEXO 2-A"
              : isJet
              ? "NORMAM-212/DPC, ANEXO 3-B"
              : "NORMAM-211/DPC, ANEXO 2-E";
            const normamSource = isProf
              ? "NORMAM-201/DPC, Anexo 2-A (Embarcações Comerciais e Profissionais)"
              : isJet
              ? "NORMAM-212/DPC, Anexo 3-B (Motonáutica)"
              : "NORMAM-211/DPC, Anexo 2-E (Embarcações de Esporte e Recreio)";

            content = [
              `REQUERIMENTO ELABORADO PELA PLATAFORMA: ${tpl.name.toUpperCase()}`,
              `CÓDIGO: ${tpl.code} | BASE NORMATIVA: ${normamSource}`,
              `PROCESSO Nº: ${processCode}`,
              `DATA: ${new Date().toLocaleDateString("pt-BR")}`,
              ``,
              `1. DADOS DO REQUERENTE / INTERESSADO`,
              `Nome / Razão Social: ${customerName}`,
              `CPF / CNPJ: ${customer?.cpf_cnpj || customer?.document || "Não informado"}    RG: ${customer?.rg || "Não informado"}`,
              `Endereço: ${customer?.address || "Não informado"}, ${customer?.city || ""}/${customer?.state || ""}`,
              `Telefone: ${customer?.phone || "Não informado"} | E-mail: ${customer?.email || "Não informado"}`,
              ``,
              `2. DADOS DA EMBARCAÇÃO`,
              `Nome da Embarcação: ${vesselName}`,
              `Número de Inscrição: ${vessel?.registration_number || "Em regularização"}`,
              `Tipo: ${vessel?.vessel_type || "Embarcação"} | Categoria: ${isProf ? "Embarcação Profissional" : isJet ? "Moto Aquática" : "Esporte e Recreio"}`,
              `Comprimento Total: ${vessel?.length || vessel?.length_overall || "Não informado"} m | Casco: ${vessel?.material || "Não informado"}`,
              ``,
              `3. ESCOPO DA SOLICITAÇÃO (${normamScope})`,
              `Serviços Requeridos: ${translateServices((processData?.draft_data as any)?.services) || processData?.process_type || 'Inscrição / Regularização / Transferência'}`,
              ``,
              `4. TERMO DE COMPROMISSO E DECLARAÇÃO`,
              `Vem respeitosamente requerer a V. Sa. a realização dos serviços náuticos supracitados, declarando sob as penas da lei a inteira veracidade das informações e documentos apresentados, em estrita observância à Lei nº 9.537/1997 (LESTA) e às normas da Autoridade Marítima (${isProf ? "NORMAM-201/DPC" : isJet ? "NORMAM-212/DPC" : "NORMAM-211/DPC"}).`,
              ``,
              `5. ELABORADO POR`,
              `Responsável Técnico: ${selectedStaff.name} (${selectedStaff.role})`,
              selectedStaff.professional_registry ? `Registro Profissional: ${selectedStaff.professional_registry}` : "",
              `Empresa: ${companyData?.name || currentCompany?.name || "NavalDocs Pro"}`,
              ``,
              `Requerimento elaborado pela plataforma NavalDocs Pro para protocolo perante a Capitania dos Portos / Del / Agência, com assinatura externa (GOV.BR ou presencial) pelo Requerente.`,
            ]
              .filter(Boolean)
              .join("\n");
          }

          // 3. Gerar bytes do PDF estilizado com branding e assinatura adequada
          const signerInfo = tpl.slug === "proc-representacao-naval"
            ? {
                signerName: `${customerName}\n(Outorgante)`,
                signerRole: `CPF/CNPJ: ${customer?.cpf_cnpj || customer?.document || ""}`,
              }
            : tpl.slug === "decl-residencia-naval"
            ? {
                signerName: `${customerName}\n(Declarante)`,
                signerRole: `CPF/CNPJ: ${customer?.cpf_cnpj || customer?.document || ""}`,
              }
            : {
                signerName: `${customerName}\n(Requerente / Interessado)`,
                signerRole: `CPF/CNPJ: ${customer?.cpf_cnpj || customer?.document || ""}`,
              };

          const { bytes, verificationCode } = await buildBrandedDocumentPdf({
            docName: docTitle,
            content,
            branding,
            signerName: signerInfo.signerName,
            signerRole: signerInfo.signerRole,
          });

          // 4. Converter para Blob e fazer upload seguro para o bucket 'generated-documents'
          const pdfBlob = new Blob(
            [
              bytes.buffer.slice(
                bytes.byteOffset,
                bytes.byteOffset + bytes.byteLength,
              ) as ArrayBuffer,
            ],
            { type: "application/pdf" },
          );
          await uploadToBucket("generated-documents", storagePath, pdfBlob, {
            contentType: "application/pdf",
            upsert: true,
          });

          // 5. Metadados completos congelados (preservando responsável, snapshots e códigos)
          const documentMetadata = {
            template_slug: tpl.slug,
            template_code: tpl.code,
            template_name: tpl.name,
            template_id_resolved: realTemplateUuid,
            official_source: tpl.officialSource,
            validation_date: tpl.validationDate,
            validation_status: tpl.status,
            storage_bucket: "generated-documents",
            storage_path: storagePath,
            disclaimer:
              "Documento elaborado eletronicamente pelo NavalDocs Pro para assinatura externa (gov.br ou presencial). Não emitido pela Autoridade Marítima.",
            staff_responsible: {
              id: selectedStaff.id,
              name: selectedStaff.name,
              role: selectedStaff.role,
              professional_registry: (selectedStaff as any).professional_registry || null,
              email: (selectedStaff as any).email || null,
            },
            client_snapshot: {
              name: customerName,
              document: customer?.cpf_cnpj || customer?.document || "Não informado",
              rg: customer?.rg || "",
              address: customer?.address || "",
              city: customer?.city || "",
              state: customer?.state || "",
              phone: customer?.phone || "",
              email: customer?.email || "",
            },
            vessel_snapshot: {
              name: vesselName,
              registration: vessel?.registration_number || "",
              type: vessel?.vessel_type || "",
              length: vessel?.length || vessel?.length_overall || "",
              material: vessel?.material || "",
            },
            company_snapshot: {
              name: companyData?.name || currentCompany?.name || "Empresa Naval",
              cnpj: companyData?.cnpj || currentCompany?.cnpj || "",
              address: companyData?.contact_address || "",
              logo_url: companyData?.logo_url || companyData?.logo_primary_url || "",
            },
            generated_at: now,
          };

          // 6. Inserir registro na tabela generated_documents com UUID real (NUNCA slug)
          const { data: newDoc, error: docError } = await supabase
            .from("generated_documents")
            .insert({
              company_id: companyId,
              process_id: id,
              customer_id: customer?.id || null,
              vessel_id: vessel?.id || null,
              name: docTitle,
              generated_file_url: `generated-documents/${storagePath}`,
              generated_by: profile?.id || null,
              status: "ready_for_signature",
              signature_status: "pending",
              verification_code: verificationCode,
              template_id: realTemplateUuid, // UUID REAL DO BANCO
              version: 1,
              metadata: documentMetadata,
            })
            .select("id, name, generated_file_url, created_at, status")
            .single();

          if (docError) {
            throw new Error(docError.message || `Erro ao salvar documento gerado (${tpl.name}).`);
          }

          // 7. Inserir também em uploaded_files para indexação central
          await supabase.from("uploaded_files").insert({
            company_id: companyId,
            process_id: id,
            customer_id: customer?.id || null,
            vessel_id: vessel?.id || null,
            category: "generated_document",
            file_name: fileName,
            file_url: `generated-documents/${storagePath}`,
            file_size: bytes.length,
            file_type: "application/pdf",
            status: "ready",
            metadata: {
              document_id: newDoc?.id,
              template_code: tpl.code,
              template_slug: tpl.slug,
              template_name: tpl.name,
              verification_code: verificationCode,
              generated_at: now,
            },
          });

          successDocs.push({
            ...newDoc,
            templateName: tpl.name,
            templateCode: tpl.code,
          });
        } catch (itemErr: any) {
          console.error(`Falha ao gerar documento ${tpl.name}:`, itemErr);
          failedDocs.push({
            tpl,
            error: itemErr?.message || "Erro desconhecido na geração do PDF.",
          });
        }
      }

      // 8. Atualizar histórico do processo dentro de draft_data (coluna metadata não existe em processes)
      if (successDocs.length > 0) {
        const existingHistory = (processData?.draft_data as any)?.history || [];
        const historyEntries = successDocs.map((doc) => ({
          event: "doc_generated",
          description: `Documento gerado: "${doc.name}" por ${selectedStaff.name}`,
          user: selectedStaff.name,
          date: now,
        }));

        await supabase
          .from("processes")
          .update({
            draft_data: {
              ...((processData?.draft_data as any) || {}),
              history: [...historyEntries, ...existingHistory],
            },
            updated_at: now,
          })
          .eq("id", id)
          .eq("company_id", companyId);
      }

      // Recarrega a lista persistida de documentos gerados
      await loadExistingGeneratedDocs();

      setGenerationSummary({
        successDocs,
        failedDocs,
      });

      toast.dismiss(loadingToast);

      if (failedDocs.length === 0) {
        toast.success(
          successDocs.length === 1
            ? "Documento gerado e armazenado com sucesso!"
            : `${successDocs.length} documentos gerados e armazenados com sucesso!`,
          {
            description:
              "Os arquivos PDF foram criados, salvos no storage e estão listados abaixo prontos para visualização e download.",
          },
        );
      } else if (successDocs.length > 0) {
        toast.warning(
          `${successDocs.length} documento(s) gerado(s), mas ${failedDocs.length} falharam.`,
          {
            description: "Verifique os detalhes na tela e tente novamente apenas os que falharam.",
          },
        );
      } else {
        toast.error("Nenhum documento pôde ser gerado.", {
          description: failedDocs[0]?.error || "Ocorreu um erro no processamento do lote.",
        });
      }
    } catch (err: any) {
      console.error("Erro geral na geração de documentos:", err);
      toast.dismiss(loadingToast);
      toast.error(err?.message || "Falha ao gerar documentos.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 font-sans">
        <Loader2 className="h-8 w-8 text-[#075BFF] animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-700">
          Carregando modelos e dados do serviço...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 font-sans text-slate-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        {/* ========================================================================= */}
        {/* 1. CABEÇALHO */}
        {/* ========================================================================= */}
        <div>
          <button
            type="button"
            onClick={() => navigate({ to: "/processes/$id", params: { id } })}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#075BFF] hover:text-blue-700 transition-colors mb-2 cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Voltar ao serviço</span>
          </button>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0B1739]">
            Gerar documento
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Selecione um modelo e confira os dados antes de gerar o arquivo.
          </p>
        </div>

        {/* ========================================================================= */}
        {/* RESUMO DO CONTEXTO (4 COLUNAS) */}
        {/* ========================================================================= */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
          {/* Cliente */}
          <div className="flex items-center gap-3 pt-2 sm:pt-0 sm:pr-3">
            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600 shrink-0">
              <User className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
                Cliente
              </span>
              <span className="text-sm font-bold text-[#0B1739] truncate block">
                {customer?.fantasy_name || customer?.name || "Cliente não informado"}
              </span>
            </div>
          </div>

          {/* Embarcação */}
          <div className="flex items-center justify-between gap-3 pt-3 sm:pt-0 sm:px-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                <Ship className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
                  Embarcação
                </span>
                <span className="text-sm font-bold text-[#0B1739] truncate block">
                  {vessel?.name || "Embarcação não informada"}
                </span>
              </div>
            </div>

            {/* Ação rápida para editar/completar embarcação */}
            <button
              type="button"
              onClick={() => setShowQuickVesselModal(true)}
              title="Completar dados cadastrais da embarcação"
              className="p-1.5 rounded-lg text-[#075BFF] hover:bg-blue-50 transition-colors cursor-pointer shrink-0"
            >
              <Edit className="h-4 w-4" />
            </button>
          </div>

          {/* Serviço */}
          <div className="flex items-center gap-3 pt-3 sm:pt-0 sm:px-3">
            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600 shrink-0">
              <Cog className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
                Serviço
              </span>
              <span className="text-sm font-bold text-[#0B1739] truncate block">
                {processData?.title || "Renovação do TIE"}
              </span>
            </div>
          </div>

          {/* Processo */}
          <div className="flex items-center gap-3 pt-3 sm:pt-0 sm:pl-3">
            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600 shrink-0">
              <FileCheck2 className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
                Processo
              </span>
              <span className="text-sm font-bold text-[#0B1739] font-mono truncate block">
                {processCode}
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* BANNER DE RESULTADO DA ÚLTIMA GERAÇÃO (CASO DISPONÍVEL) */}
        {/* ========================================================================= */}
        {generationSummary && (
          <div
            className={`p-5 rounded-2xl border ${
              generationSummary.failedDocs.length === 0
                ? "bg-emerald-50/70 border-emerald-200"
                : "bg-amber-50/70 border-amber-200"
            } space-y-3 animate-in fade-in duration-200`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                {generationSummary.failedDocs.length === 0 ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                )}
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {generationSummary.failedDocs.length === 0
                      ? `Lote concluído com sucesso: ${generationSummary.successDocs.length} documento(s) gerado(s)`
                      : `Resultado do lote: ${generationSummary.successDocs.length} gerado(s), ${generationSummary.failedDocs.length} com falha`}
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Todos os documentos bem-sucedidos estão salvos e vinculados a este processo.
                  </p>
                </div>
              </div>

              {generationSummary.failedDocs.length > 0 && (
                <button
                  type="button"
                  onClick={handleGenerateBatchDocuments}
                  disabled={isGenerating}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Repetir apenas os que falharam</span>
                </button>
              )}
            </div>

            {/* Lista dos que falharam, se houver */}
            {generationSummary.failedDocs.length > 0 && (
              <div className="p-3 bg-white rounded-xl border border-amber-200 space-y-1.5 text-xs">
                <span className="font-bold text-amber-900 block">Documentos não gerados:</span>
                <ul className="space-y-1">
                  {generationSummary.failedDocs.map((f, i) => (
                    <li key={i} className="flex items-center justify-between gap-2 text-amber-800">
                      <span className="font-medium">• {f.tpl.name}:</span>
                      <span className="text-[11px] font-mono text-red-600">{f.error}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* GRID PRINCIPAL: 2 COLUNAS */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ======================================================================= */}
          {/* COLUNA ESQUERDA (7 COLUNAS): MODELOS DISPONÍVEIS + DADOS UTILIZADOS */}
          {/* ======================================================================= */}
          <div className="lg:col-span-7 space-y-6">
            {/* SEÇÃO 2: DOCUMENTOS APLICÁVEIS AO SERVIÇO */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-[#0B1739]">
                    Documentos aplicáveis ao serviço
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Escolha individualmente quais documentos gerar pelo sistema ou anexar já
                    preenchidos.
                  </p>
                </div>

                {/* Busca */}
                <div className="relative w-full sm:w-52">
                  <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar documento..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#0B1739] placeholder:text-slate-400 focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              {/* Badges de Contagem de Seleção */}
              <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-slate-100 text-xs">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-[#075BFF] font-semibold border border-blue-100">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>{templatesToGenerate.length} a gerar pelo NavalDocs</span>
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-semibold border border-emerald-100">
                  <Paperclip className="h-3.5 w-3.5" />
                  <span>{templatesAttached.length} anexado(s) já pronto(s)</span>
                </span>
                {templatesOmitted.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 font-medium">
                    <span>{templatesOmitted.length} não utilizado(s)</span>
                  </span>
                )}
              </div>

              {filteredTemplates.length === 0 ? (
                <div className="p-6 text-center border border-dashed border-slate-200 rounded-2xl space-y-2">
                  <FileText className="h-8 w-8 text-slate-300 mx-auto" />
                  <p className="text-xs font-semibold text-slate-600">
                    Nenhum documento aplicável foi encontrado para este serviço.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredTemplates.map((tpl) => {
                    const selection = docSelections[tpl.id] || {
                      mode: tpl.status === "em_revisao" ? "omit" : "generate",
                    };
                    const isApproved = tpl.status === "aprovado";
                    const isGeneratingThis = selection.mode === "generate";
                    const isAttachingThis = selection.mode === "attach";
                    const isOmittedThis = selection.mode === "omit";

                    // Validação granular para este modelo específico
                    const validation = templateValidationMap.get(tpl.slug);
                    const isBlockedForRequiredFields = !!validation?.isBlocked;
                    const missingForThisDoc = validation?.missingFields || [];

                    // Resolução do banco de dados para este modelo
                    const resolution = resolvedTemplatesMap.get(tpl.slug);
                    const isResolvedInDb = !!resolution?.dbTemplateId;

                    return (
                      <div
                        key={tpl.id}
                        className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                          isGeneratingThis
                            ? isBlockedForRequiredFields || !isResolvedInDb
                              ? "border-amber-300 bg-amber-50/20 shadow-2xs"
                              : "border-[#075BFF] bg-blue-50/15 shadow-2xs"
                            : isAttachingThis
                              ? "border-emerald-300 bg-emerald-50/15 shadow-2xs"
                              : "border-slate-200/90 bg-white opacity-85"
                        }`}
                      >
                        {/* Cabeçalho do Documento com Badges */}
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                          <div className="flex items-start gap-3 min-w-0">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                                isGeneratingThis
                                  ? isBlockedForRequiredFields || !isResolvedInDb
                                    ? "bg-amber-500 text-white"
                                    : "bg-[#075BFF] text-white"
                                  : isAttachingThis
                                    ? "bg-emerald-600 text-white"
                                    : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              <FileText className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-xs sm:text-sm font-bold text-[#0B1739]">
                                  {tpl.name}
                                </h3>
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-mono font-bold">
                                  {tpl.code}
                                </span>
                                {isResolvedInDb ? (
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[9px] font-semibold border border-emerald-200">
                                    Catálogo vinculado
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[9px] font-semibold">
                                    Aguardando sincronização
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                {tpl.description}
                              </p>
                              <div className="flex items-center gap-2 mt-1.5 flex-wrap text-[11px] text-slate-400">
                                <span>
                                  Fonte Oficial:{" "}
                                  <strong className="text-slate-600 font-mono">
                                    {tpl.officialSource}
                                  </strong>
                                </span>
                                <span>•</span>
                                <span>
                                  Conferência:{" "}
                                  <strong className="text-slate-600">{tpl.validationDate}</strong>
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center sm:flex-col sm:items-end gap-1.5 shrink-0">
                            {isApproved ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                <Check className="h-3 w-3" />
                                <span>Aprovado</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
                                <Clock className="h-3 w-3" />
                                <span>Em revisão</span>
                              </span>
                            )}

                            {tpl.isMandatory ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#075BFF] border border-blue-200/60">
                                Obrigatório
                              </span>
                            ) : tpl.isConditional ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/60">
                                Condicional
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                                Opcional
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Aviso Explicativo de Regra Condicional */}
                        {tpl.isConditional && (
                          <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-start gap-2">
                            <Info className="h-4 w-4 text-[#075BFF] shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold text-slate-900">
                                Regra Condicional:
                              </span>
                              <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                                {tpl.conditionText ||
                                  "Este documento só deve ser utilizado quando a condição específica se aplicar ao caso."}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Aviso Granular: Bloqueio por Campos Obrigatórios Ausentes */}
                        {isBlockedForRequiredFields && isGeneratingThis && (
                          <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 animate-in fade-in duration-150">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-bold block">
                                  Campos obrigatórios ausentes para gerar este documento:
                                </span>
                                <span className="text-[11px] text-amber-800">
                                  {missingForThisDoc.join(", ")}.
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => setShowQuickVesselModal(true)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-[11px] transition-colors cursor-pointer shrink-0"
                            >
                              <Edit className="h-3 w-3" />
                              <span>Completar dados agora</span>
                            </button>
                          </div>
                        )}

                        {/* Aviso se Modelo Estiver em Revisão */}
                        {!isApproved && tpl.reviewReason && (
                          <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
                            <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                            <span>{tpl.reviewReason}</span>
                          </div>
                        )}

                        {/* SELETOR DAS 3 AÇÕES (A, B, C) */}
                        <div className="mt-4 pt-3 border-t border-slate-100">
                          <span className="text-[11px] font-semibold text-slate-600 block mb-2">
                            Opção para este documento:
                          </span>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {/* OPÇÃO A: GERAR PELO NAVALDOCS */}
                            <button
                              type="button"
                              disabled={!isApproved}
                              onClick={() => {
                                setDocSelections((prev) => ({
                                  ...prev,
                                  [tpl.id]: { ...(prev[tpl.id] || {}), mode: "generate" },
                                }));
                                setSelectedTemplateId(tpl.id);
                              }}
                              className={`p-2.5 rounded-xl border text-left transition-all text-xs flex items-center justify-between cursor-pointer ${
                                isGeneratingThis
                                  ? isBlockedForRequiredFields
                                    ? "border-amber-500 bg-amber-500 text-white font-bold shadow-2xs"
                                    : "border-[#075BFF] bg-[#075BFF] text-white font-bold shadow-2xs"
                                  : "border-slate-200 hover:border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                              } ${!isApproved ? "opacity-40 cursor-not-allowed" : ""}`}
                            >
                              <div className="flex items-center gap-2">
                                <Sparkles className="h-3.5 w-3.5 shrink-0" />
                                <span>A. Gerar pelo NavalDocs</span>
                              </div>
                              {isGeneratingThis && <Check className="h-3.5 w-3.5 shrink-0" />}
                            </button>

                            {/* OPÇÃO B: JÁ TENHO ESTE DOCUMENTO (ANEXAR) */}
                            <button
                              type="button"
                              onClick={() => {
                                setDocSelections((prev) => ({
                                  ...prev,
                                  [tpl.id]: { ...(prev[tpl.id] || {}), mode: "attach" },
                                }));
                              }}
                              className={`p-2.5 rounded-xl border text-left transition-all text-xs flex items-center justify-between cursor-pointer ${
                                isAttachingThis
                                  ? "border-emerald-600 bg-emerald-600 text-white font-bold shadow-2xs"
                                  : "border-slate-200 hover:border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <Paperclip className="h-3.5 w-3.5 shrink-0" />
                                <span>B. Já tenho: anexar arquivo</span>
                              </div>
                              {isAttachingThis && <Check className="h-3.5 w-3.5 shrink-0" />}
                            </button>

                            {/* OPÇÃO C: NÃO UTILIZAR AGORA */}
                            <button
                              type="button"
                              onClick={() => {
                                setDocSelections((prev) => ({
                                  ...prev,
                                  [tpl.id]: { ...(prev[tpl.id] || {}), mode: "omit" },
                                }));
                              }}
                              className={`p-2.5 rounded-xl border text-left transition-all text-xs flex items-center justify-between cursor-pointer ${
                                isOmittedThis
                                  ? "border-slate-400 bg-slate-600 text-white font-bold shadow-2xs"
                                  : "border-slate-200 hover:border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                              }`}
                            >
                              <span>C. Não utilizar agora</span>
                              {isOmittedThis && <Check className="h-3.5 w-3.5 shrink-0" />}
                            </button>
                          </div>

                          {/* ÁREA DE ANEXO SE OPÇÃO B ESTIVER SELECIONADA */}
                          {isAttachingThis && (
                            <div className="mt-3 p-3.5 bg-emerald-50/50 border border-emerald-200/80 rounded-xl space-y-2.5 animate-in fade-in duration-150">
                              {selection.attachedFile ? (
                                <div className="flex items-center justify-between gap-3 bg-white p-2.5 rounded-lg border border-emerald-200">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                                      <CheckCircle2 className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0">
                                      <span className="text-xs font-bold text-slate-800 truncate block">
                                        {selection.attachedFile.name}
                                      </span>
                                      <span className="text-[10px] text-emerald-700 font-semibold">
                                        Arquivo anexado como documento oficial do processo (dispensa
                                        geração)
                                      </span>
                                    </div>
                                  </div>

                                  <label className="text-[11px] font-semibold text-[#075BFF] hover:underline cursor-pointer shrink-0">
                                    Substituir
                                    <input
                                      type="file"
                                      accept=".pdf,application/pdf"
                                      className="hidden"
                                      onChange={(e) => {
                                        const f = e.target.files?.[0];
                                        if (f) handleAttachFileForTemplate(tpl, f);
                                      }}
                                    />
                                  </label>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-900">
                                    <Upload className="h-4 w-4 text-emerald-600" />
                                    <span>Anexar documento já pronto / assinado</span>
                                  </div>
                                  <p className="text-[11px] text-slate-600">
                                    Se você já possui este documento preenchido e assinado fora do
                                    sistema, anexe o PDF. Ele será incorporado ao dossiê sem
                                    consumir nova geração.
                                  </p>

                                  <div className="flex items-center gap-2">
                                    <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-emerald-300 hover:bg-emerald-50 text-emerald-800 font-semibold text-xs transition-colors cursor-pointer shadow-2xs">
                                      {selection.isUploading ? (
                                        <>
                                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                          <span>Enviando arquivo...</span>
                                        </>
                                      ) : (
                                        <>
                                          <Paperclip className="h-3.5 w-3.5" />
                                          <span>Selecionar PDF pronto</span>
                                        </>
                                      )}
                                      <input
                                        type="file"
                                        accept=".pdf,application/pdf"
                                        disabled={selection.isUploading}
                                        className="hidden"
                                        onChange={(e) => {
                                          const f = e.target.files?.[0];
                                          if (f) handleAttachFileForTemplate(tpl, f);
                                        }}
                                      />
                                    </label>
                                    <span className="text-[10px] text-slate-400">PDF até 10MB</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* ALERTA SE OPÇÃO C FOI ESCOLHIDA EM DOCUMENTO OBRIGATÓRIO */}
                          {isOmittedThis && tpl.isMandatory && (
                            <div className="mt-3 p-3 bg-amber-50 border border-amber-200/90 rounded-xl flex items-start gap-2 text-xs text-amber-900 animate-in fade-in duration-150">
                              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                              <div className="space-y-1">
                                <p className="font-bold">
                                  Atenção: Este documento é exigido obrigatoriamente pela Capitania
                                  dos Portos.
                                </p>
                                <p className="text-[11px] text-amber-800 leading-relaxed">
                                  Se você já possui o documento preenchido e assinado fora do
                                  sistema, a opção recomendada é{" "}
                                  <strong>"Já tenho: anexar arquivo"</strong>. Dispensar este item
                                  manterá a pendência documental ativa no processo.
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* SEÇÃO 4: DADOS UTILIZADOS NO DOCUMENTO */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-[#0B1739]">Dados utilizados no documento</h2>
                <button
                  type="button"
                  onClick={() => setShowQuickVesselModal(true)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#075BFF] hover:underline cursor-pointer"
                >
                  <Edit className="h-3.5 w-3.5" />
                  <span>Editar dados cadastrais</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Cliente */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Dados do Cliente
                  </span>
                  <p className="font-bold text-[#0B1739] truncate">
                    {customer?.fantasy_name || customer?.name}
                  </p>
                  <p className="text-slate-500 truncate">
                    {customer?.cpf_cnpj || customer?.document || "Documento não informado"}
                  </p>
                </div>

                {/* Embarcação */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Dados da Embarcação
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowQuickVesselModal(true)}
                      className="text-[10px] text-[#075BFF] font-semibold hover:underline cursor-pointer"
                    >
                      Alterar
                    </button>
                  </div>
                  <p className="font-bold text-[#0B1739] truncate">
                    {vessel?.name || <span className="text-amber-600 font-semibold">Nome não informado</span>}
                  </p>
                  <p className="text-slate-500 truncate">
                    Inscrição:{" "}
                    {vessel?.registration_number ? (
                      vessel.registration_number
                    ) : (
                      <span className="text-amber-600 font-semibold">Ausente no cadastro</span>
                    )}
                  </p>
                </div>

                {/* Empresa / Logo */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Identidade da Empresa
                  </span>
                  <p className="font-bold text-[#0B1739] truncate">
                    {currentCompany?.name || "NavalDocs Despachante"}
                  </p>
                  <p className="text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Logo e dados oficiais configurados</span>
                  </p>
                </div>

                {/* Porto de Registro */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Jurisdição / Capitania
                  </span>
                  <p className="font-bold text-[#0B1739] truncate">
                    {vessel?.port_of_registry || "Capitania dos Portos de São Paulo"}
                  </p>
                  <p className="text-slate-500">Área de Atendimento da CPES</p>
                </div>
              </div>

              {!dataValidation.isValid && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <span>Atenção: Campos cadastrais pendentes</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowQuickVesselModal(true)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-[11px] transition-colors cursor-pointer"
                    >
                      <Edit className="h-3 w-3" />
                      <span>Completar dados da embarcação</span>
                    </button>
                  </div>
                  <ul className="list-disc list-inside text-[11px] text-amber-700 pl-1">
                    {dataValidation.missingFields.map((f, i) => (
                      <li key={i}>{f} ausente no cadastro</li>
                    ))}
                  </ul>
                  <p className="text-[11px] text-amber-800">
                    Documentos que não exigem a embarcação (como <strong>Declaração de Residência</strong>) continuam liberados para geração.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ======================================================================= */}
          {/* COLUNA DIREITA (5 COLUNAS): FUNCIONÁRIO + RESUMO DA GERAÇÃO */}
          {/* ======================================================================= */}
          <div className="lg:col-span-5 space-y-6">
            {/* SEÇÃO 3: FUNCIONÁRIO RESPONSÁVEL */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-[#0B1739]">Funcionário responsável</h2>
                <button
                  type="button"
                  onClick={() => setShowQuickStaffModal(true)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#075BFF] hover:underline cursor-pointer"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>Cadastrar funcionário</span>
                </button>
              </div>

              {companyStaffList.length === 0 ? (
                <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-2 text-xs">
                  <p className="font-semibold text-amber-900">
                    Nenhum funcionário ativo cadastrado na sua empresa.
                  </p>
                  <p className="text-[11px] text-amber-800">
                    Cadastre o operador ou despachante responsável para constar formalmente nos
                    documentos gerados.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowQuickStaffModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-bold cursor-pointer"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    <span>Cadastrar funcionário agora</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">
                    Selecione o operador ou despachante responsável:
                  </label>
                  <select
                    value={selectedStaff.id}
                    onChange={(e) => {
                      const staff = companyStaffList.find((s) => s.id === e.target.value);
                      if (staff) setSelectedStaff(staff);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-[#0B1739] font-medium focus:outline-hidden focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                  >
                    {companyStaffList.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name} — {st.role}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* SEÇÃO 5: RESUMO E BOTÃO DE GERAÇÃO */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
              <h2 className="text-base font-bold text-[#0B1739]">Resumo da geração</h2>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Documentos a gerar:</span>
                  <span className="font-bold text-[#075BFF]">
                    {templatesToGenerate.length} selecionado(s)
                  </span>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
                    Lista do lote:
                  </span>
                  {templatesToGenerate.length === 0 ? (
                    <span className="text-slate-400 italic">
                      Nenhum documento apto selecionado para gerar
                    </span>
                  ) : (
                    <ul className="space-y-1">
                      {templatesToGenerate.map((t) => (
                        <li
                          key={t.id}
                          className="font-bold text-[#0B1739] flex items-center justify-between"
                        >
                          <span className="truncate">{t.name}</span>
                          <span className="font-mono text-[10px] font-bold text-blue-700 bg-blue-100/60 px-1.5 py-0.5 rounded ml-2">
                            {t.code}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {templatesAttached.length > 0 && (
                  <div className="pt-2 border-t border-slate-200/60">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block mb-1">
                      Documentos já anexados ({templatesAttached.length}):
                    </span>
                    <ul className="space-y-1">
                      {templatesAttached.map((t) => (
                        <li
                          key={t.id}
                          className="text-xs text-slate-700 flex items-center justify-between"
                        >
                          <span className="truncate">{t.name}</span>
                          <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">
                            Anexo externo
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-200/60 flex justify-between py-1">
                  <span className="text-slate-400">Responsável:</span>
                  <span className="font-medium text-slate-700">{selectedStaff.name}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Natureza:</span>
                  <span className="font-medium text-slate-700">
                    {activeTemplate.nature === "official_form"
                      ? "Formulário Oficial da Marinha"
                      : "Documento Elaborado pela Plataforma"}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Formato:</span>
                  <span className="font-semibold text-slate-800">PDF A4</span>
                </div>
              </div>

              {/* Card Explicativo sobre GOV.BR */}
              <div className="p-3.5 bg-blue-50/60 border border-blue-100 rounded-xl space-y-1.5 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-[#075BFF]">
                  <PenTool className="h-4 w-4" />
                  <span>Fluxo de assinatura GOV.BR</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Os documentos gerados são disponibilizados para download e assinatura externa via
                  GOV.BR ou presencial. O sistema <strong>não marca como assinado</strong>{" "}
                  automaticamente na geração.
                </p>
              </div>

              {/* Botão Dinâmico de Geração */}
              <button
                type="button"
                id="btn-generate-documents"
                disabled={isGenerating || templatesToGenerate.length === 0}
                onClick={handleGenerateBatchDocuments}
                className="w-full py-3 rounded-xl bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Gerando {templatesToGenerate.length} documento(s)...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>
                      {templatesToGenerate.length === 0
                        ? "Nenhum documento apto selecionado"
                        : templatesToGenerate.length === 1
                          ? "Gerar 1 documento selecionado"
                          : `Gerar ${templatesToGenerate.length} documentos selecionados`}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SEÇÃO 6: DOCUMENTOS GERADOS PERSISTIDOS NESTE PROCESSO */}
        {/* ========================================================================= */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCheck2 className="h-5 w-5 text-[#075BFF]" />
              <h2 className="text-base font-bold text-[#0B1739]">
                Documentos gerados no processo ({generatedDocsList.length})
              </h2>
            </div>
            <button
              type="button"
              onClick={loadExistingGeneratedDocs}
              disabled={isLoadingGeneratedDocs}
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoadingGeneratedDocs ? "animate-spin" : ""}`} />
              <span>Atualizar</span>
            </button>
          </div>

          {isLoadingGeneratedDocs ? (
            <div className="p-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-[#075BFF]" />
              <span>Carregando documentos persistidos...</span>
            </div>
          ) : generatedDocsList.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl space-y-2">
              <FileText className="h-8 w-8 text-slate-300 mx-auto" />
              <p className="text-xs font-semibold text-slate-600">
                Nenhum documento gerado para este processo ainda.
              </p>
              <p className="text-[11px] text-slate-400">
                Selecione os modelos acima e clique em "Gerar" para criar os arquivos PDF oficiais.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {generatedDocsList.map((doc) => (
                <div
                  key={doc.id}
                  className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-8 h-9 rounded-lg bg-red-500 text-white flex flex-col items-center justify-center font-bold shrink-0 shadow-2xs select-none">
                      <span className="text-[9px] font-black tracking-tighter leading-none mt-0.5">
                        PDF
                      </span>
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 truncate">{doc.name}</h4>
                      <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-500 mt-0.5">
                        <span>
                          Gerado em: {new Date(doc.created_at).toLocaleString("pt-BR")}
                        </span>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1 font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60">
                          <Clock className="h-3 w-3" />
                          <span>Aguardando assinatura GOV.BR</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => openStoredFile(doc)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer shadow-2xs"
                    >
                      <Eye className="h-3.5 w-3.5 text-[#075BFF]" />
                      <span>Visualizar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadStoredFile(doc)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-bold cursor-pointer shadow-2xs"
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

      {/* MODAL: CADASTRO RÁPIDO DE FUNCIONÁRIO */}
      <Dialog open={showQuickStaffModal} onOpenChange={setShowQuickStaffModal}>
        <DialogContent className="max-w-md p-6 rounded-2xl bg-white border border-slate-200">
          <form onSubmit={handleCreateQuickStaff}>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#075BFF] flex items-center justify-center shrink-0">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-[#0B1739]">
                    Cadastrar funcionário responsável
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 mt-0.5">
                    Adicione um colaborador para responder por este e próximos documentos.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Nome completo <strong className="text-red-500">*</strong>
                </label>
                <input
                  type="text"
                  required
                  value={quickStaffName}
                  onChange={(e) => setQuickStaffName(e.target.value)}
                  placeholder="Ex: Carlos Eduardo de Oliveira"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-[#0B1739] font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Cargo ou função <strong className="text-red-500">*</strong>
                </label>
                <input
                  type="text"
                  required
                  value={quickStaffRole}
                  onChange={(e) => setQuickStaffRole(e.target.value)}
                  placeholder="Ex: Despachante Náutico / Assistente Técnico"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-[#0B1739] font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-[11px] text-blue-900 flex items-start gap-2">
                <Info className="h-4 w-4 text-[#075BFF] shrink-0 mt-0.5" />
                <p>
                  <strong>Responsabilidade documental:</strong> Este cadastro habilita o funcionário
                  a constar como preparador nos documentos da empresa. Ele não cria login nem
                  concede acesso ao sistema.
                </p>
              </div>
            </div>

            <DialogFooter className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowQuickStaffModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSavingQuickStaff}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {isSavingQuickStaff ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                <span>Salvar e selecionar</span>
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: COMPLETAR / EDITAR DADOS DA EMBARCAÇÃO INLINE */}
      <Dialog open={showQuickVesselModal} onOpenChange={setShowQuickVesselModal}>
        <DialogContent className="max-w-md p-6 rounded-2xl bg-white border border-slate-200">
          <form onSubmit={handleSaveQuickVessel}>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#075BFF] flex items-center justify-center shrink-0">
                  <Ship className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-[#0B1739]">
                    Dados da embarcação
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 mt-0.5">
                    Preencha os campos para desbloquear a geração dos requerimentos náuticos.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Nome da embarcação <strong className="text-red-500">*</strong>
                </label>
                <input
                  type="text"
                  required
                  value={quickVesselName}
                  onChange={(e) => setQuickVesselName(e.target.value)}
                  placeholder="Ex: Mar Azul II"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-[#0B1739] font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Número de inscrição (TIE / TIEM)
                </label>
                <input
                  type="text"
                  value={quickVesselReg}
                  onChange={(e) => setQuickVesselReg(e.target.value)}
                  placeholder="Ex: 381-123456-7 (ou deixe em branco se for inscrição inicial)"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-[#0B1739] font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <p className="text-[10px] text-slate-400">
                  Para processos de Registro Inicial, utilize o padrão provisório ou preencha o número oficial da Capitania.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Tipo / Categoria
                </label>
                <input
                  type="text"
                  value={quickVesselType}
                  onChange={(e) => setQuickVesselType(e.target.value)}
                  placeholder="Ex: Lancha / Bote / Moto Aquática"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-[#0B1739] font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            <DialogFooter className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowQuickVesselModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSavingQuickVessel}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {isSavingQuickVessel ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                <span>Salvar e atualizar</span>
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
