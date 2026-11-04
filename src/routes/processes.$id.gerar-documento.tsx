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
  ChevronDown,
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
  Trash2,
  XCircle,
  Image as ImageIcon,
  Droplet,
  History,
} from "lucide-react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/routes/dashboard";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { uploadToBucket } from "@/lib/storage";
import { buildBrandedDocumentPdf, LogoModeOption } from "@/services/brandedPdfBuilder";
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

  // Estados de Aparência do Documento (Logo Opcional e Marca-d'água Independente)
  const [logoChoice, setLogoChoice] = useState<LogoModeOption>("navaldocs");
  const [showWatermark, setShowWatermark] = useState<boolean>(true);
  const [isSavingAppearancePref, setIsSavingAppearancePref] = useState(false);
  const [isUploadingCompanyLogo, setIsUploadingCompanyLogo] = useState(false);

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
  const [quickVesselLength, setQuickVesselLength] = useState("");
  const [quickVesselHull, setQuickVesselHull] = useState("");
  const [quickVesselOwnerName, setQuickVesselOwnerName] = useState("");
  const [quickVesselOwnerCpf, setQuickVesselOwnerCpf] = useState("");
  const [isSavingQuickVessel, setIsSavingQuickVessel] = useState(false);
  const [availableCustomerVessels, setAvailableCustomerVessels] = useState<any[]>([]);

  // Estados de Outorgado da Procuração (distinção explícita PF vs PJ)
  const [outorgadoType, setOutorgadoType] = useState<"pf" | "pj">("pf");
  const [showOutorgadoModal, setShowOutorgadoModal] = useState(false);
  const [outorgadoPfNome, setOutorgadoPfNome] = useState("");
  const [outorgadoPfCpf, setOutorgadoPfCpf] = useState("");
  const [outorgadoPfRg, setOutorgadoPfRg] = useState("");
  const [outorgadoPfNacionalidade, setOutorgadoPfNacionalidade] = useState("");
  const [outorgadoPfEstadoCivil, setOutorgadoPfEstadoCivil] = useState("");
  const [outorgadoPfEndereco, setOutorgadoPfEndereco] = useState("");
  const [outorgadoPfTelefone, setOutorgadoPfTelefone] = useState("");
  const [outorgadoPfEmail, setOutorgadoPfEmail] = useState("");
  const [outorgadoPfCrea, setOutorgadoPfCrea] = useState("");
  const [outorgadoPjRazao, setOutorgadoPjRazao] = useState("");
  const [outorgadoPjCnpj, setOutorgadoPjCnpj] = useState("");
  const [outorgadoPjEndereco, setOutorgadoPjEndereco] = useState("");
  const [outorgadoPjTelefone, setOutorgadoPjTelefone] = useState("");
  const [outorgadoPjEmail, setOutorgadoPjEmail] = useState("");
  const [isSavingOutorgado, setIsSavingOutorgado] = useState(false);

  // Estados de Nacionalidade e Naturalidade do Cliente (para Declaração de Residência)
  const [showCustomerNatModal, setShowCustomerNatModal] = useState(false);
  const [customerNacionalidade, setCustomerNacionalidade] = useState("");
  const [customerNaturalidade, setCustomerNaturalidade] = useState("");
  const [isSavingCustomerNat, setIsSavingCustomerNat] = useState(false);

  // Estado de accordion para ver versões anteriores agrupadas
  const [expandedPreviousVersions, setExpandedPreviousVersions] = useState<Record<string, boolean>>({});

  // Estado de detalhes recolhidos por documento ("Quando usar e ver detalhes")
  const [expandedDetails, setExpandedDetails] = useState<Record<string, boolean>>({});

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
              customer:customers!processes_customer_id_fkey(id, name, cpf_cnpj, email, phone, address, city, state, rg, notes),
              vessel:vessels!processes_vessel_id_fkey(id, name, registration_number, category, vessel_type, length, material, hull_number, current_owner_name, current_owner_cpf_cnpj, customer_id, company_id)
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
        const draftNac = (proc?.draft_data as any)?.customer_nationality || (proc.customer as any)?.nationality || "";
        const draftNat = (proc?.draft_data as any)?.customer_naturalidade || (proc.customer as any)?.birthplace || (proc.customer as any)?.naturalidade || "";
        setCustomerNacionalidade(draftNac);
        setCustomerNaturalidade(draftNat);

        let activeVessel = proc.vessel || null;
        let customerVesselsList: any[] = [];

        // Carregar todas as embarcações associadas ao cliente para possibilitar seleção manual ou troca
        if (proc.customer_id) {
          const { data: custVessels } = await supabase
            .from("vessels")
            .select("*")
            .eq("customer_id", proc.customer_id)
            .eq("company_id", companyId)
            .order("name", { ascending: true });
          customerVesselsList = custVessels || [];
          setAvailableCustomerVessels(customerVesselsList);
        }

        // Validar se a embarcação vinculada ao processo pertence ao cliente e à empresa do processo
        if (activeVessel) {
          const belongsToCustomer = !proc.customer_id || activeVessel.customer_id === proc.customer_id;
          const belongsToCompany = !companyId || activeVessel.company_id === companyId;
          if (!belongsToCustomer || !belongsToCompany) {
            console.warn("Embarcação vinculada não pertence ao cliente ou empresa do processo.");
            activeVessel = null;
          }
        }

        // NÃO escolher automaticamente a primeira encontrada: preservar seleção explícita do usuário.
        // Se não houver embarcação vinculada, activeVessel permanece null e o seletor fica disponível.
        setVessel(activeVessel);
        if (activeVessel) {
          setQuickVesselName(activeVessel.name || "");
          setQuickVesselReg(activeVessel.registration_number || "");
          setQuickVesselType(activeVessel.vessel_type || "Lancha / Recreio");
          setQuickVesselLength(activeVessel.length ? String(activeVessel.length) : "");
          setQuickVesselHull(activeVessel.hull_number || "");
          setQuickVesselOwnerName(activeVessel.current_owner_name || "");
          setQuickVesselOwnerCpf(activeVessel.current_owner_cpf_cnpj || "");
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
          const processDraftData = (proc?.draft_data as any) || {};
          const initialType: "pf" | "pj" =
            processDraftData?.outorgado_type ||
            (comp as any)?.outorgado_tipo ||
            (comp.cnpj ? "pj" : "pf");
          setOutorgadoType(initialType);
          setOutorgadoPfNome(processDraftData?.outorgado_pf_nome || comp.procurador_nome || "");
          setOutorgadoPfCpf(processDraftData?.outorgado_pf_cpf || comp.procurador_cpf || "");
          setOutorgadoPfRg(comp.procurador_rg || "");
          setOutorgadoPfNacionalidade(comp.procurador_nacionalidade || "Brasileira");
          setOutorgadoPfEndereco(comp.procurador_endereco || comp.contact_address || "");
          setOutorgadoPfTelefone(comp.procurador_telefone || comp.contact_phone || comp.phone || "");
          setOutorgadoPfEmail(comp.procurador_email || comp.contact_email || comp.email || "");
          setOutorgadoPfCrea(comp.procurador_crea || "");
          setOutorgadoPjRazao(processDraftData?.outorgado_pj_razao || comp.name || "");
          setOutorgadoPjCnpj(processDraftData?.outorgado_pj_cnpj || comp.cnpj || "");
          setOutorgadoPjEndereco(comp.contact_address || "");
          setOutorgadoPjTelefone(comp.contact_phone || comp.phone || "");
          setOutorgadoPjEmail(comp.contact_email || comp.email || "");

          // Restaurar escolhas prévias de documentos salvas no rascunho
          if (processDraftData?.doc_selections && typeof processDraftData.doc_selections === "object") {
            setDocSelections(processDraftData.doc_selections);
          }

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

          // Carregar preferência salva de aparência do documento
          const savedAppearance = docMap?.appearance || (comp as any)?.metadata?.appearance;
          if (savedAppearance) {
            if (savedAppearance.logoChoice) {
              setLogoChoice(savedAppearance.logoChoice as LogoModeOption);
            }
            if (typeof savedAppearance.showWatermark === "boolean") {
              setShowWatermark(savedAppearance.showWatermark);
            }
          } else {
            // Se a empresa possui logo configurado, sugere "company"; caso contrário, sugere "navaldocs"
            const hasCompanyLogo = !!(comp.logo_url || comp.logo_primary_url);
            setLogoChoice(hasCompanyLogo ? "company" : "navaldocs");
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

  // Inicializa seleções padrão com base nos modelos aplicáveis (sem sobrescrever draft_data)
  useEffect(() => {
    if (filteredTemplates.length > 0) {
      setDocSelections((prev) => {
        const next = { ...prev };
        // Se houver draft_data no processo carregado, preserva suas seleções
        const savedDraftSelections = (processData?.draft_data as any)?.doc_selections || {};
        filteredTemplates.forEach((tpl) => {
          if (!next[tpl.id]) {
            if (savedDraftSelections[tpl.id]) {
              next[tpl.id] = savedDraftSelections[tpl.id];
            } else if (tpl.status === "em_revisao" || tpl.isConditional) {
              next[tpl.id] = { mode: "omit" };
            } else {
              next[tpl.id] = { mode: "generate" };
            }
          }
        });
        return next;
      });
    }
  }, [filteredTemplates, processData]);

  // Atualizar e persistir escolha do documento no draft_data imediatamente
  const updateDocSelection = async (
    tplId: string,
    mode: "generate" | "attach" | "omit"
  ) => {
    const updated = {
      ...docSelections,
      [tplId]: { ...(docSelections[tplId] || {}), mode },
    };
    setDocSelections(updated);
    if (mode === "generate") {
      setSelectedTemplateId(tplId);
    }

    if (id && companyId) {
      try {
        const { data: latestProc } = await supabase
          .from("processes")
          .select("draft_data")
          .eq("id", id)
          .eq("company_id", companyId)
          .maybeSingle();

        const currentDraft = (latestProc?.draft_data as any) || (processData?.draft_data as any) || {};
        await supabase
          .from("processes")
          .update({
            draft_data: {
              ...currentDraft,
              doc_selections: updated,
            },
            updated_at: new Date().toISOString(),
          })
          .eq("id", id)
          .eq("company_id", companyId);
      } catch (err) {
        console.warn("Falha silenciosa ao persistir doc_selections no rascunho:", err);
      }
    }
  };

  // Mapa de validação individual por documento (bloqueia APENAS os documentos que exigem os campos ausentes)
  const templateValidationMap = useMemo(() => {
    const map = new Map<string, { isBlocked: boolean; missingFields: string[] }>();
    for (const tpl of CATALOG_TEMPLATES) {
      map.set(
        tpl.slug,
        checkTemplateMissingRequirements(
          tpl,
          customer,
          vessel,
          selectedStaff,
          companyData,
          outorgadoType,
        ),
      );
    }
    return map;
  }, [customer, vessel, selectedStaff, companyData, outorgadoType]);

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

  // Agrupamento de documentos gerados por modelo/slug para controle preciso de versões
  const groupedGeneratedDocs = useMemo(() => {
    const groups: Record<string, any[]> = {};
    for (const doc of generatedDocsList) {
      const key = doc.template_id || (doc.metadata as any)?.template_slug || doc.name;
      if (!groups[key]) groups[key] = [];
      groups[key].push(doc);
    }

    // Ordenar cada grupo por versão decrescente (mais recente primeiro)
    return Object.entries(groups).map(([groupKey, docs]) => {
      const sorted = [...docs].sort((a, b) => {
        if (typeof b.version === "number" && typeof a.version === "number") {
          return b.version - a.version;
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      return {
        groupKey,
        latestDoc: sorted[0],
        previousDocs: sorted.slice(1),
        totalVersions: sorted.length,
      };
    });
  }, [generatedDocsList]);

  // Documentos que o usuário selecionou para gerar, mas que possuem pendência de dados ou revisão
  const pendingTemplatesSelected = useMemo(() => {
    return filteredTemplates.filter((tpl) => {
      const isModeGenerate = docSelections[tpl.id]?.mode === "generate";
      if (!isModeGenerate) return false;
      const isApproved = tpl.status === "aprovado";
      const validation = templateValidationMap.get(tpl.slug);
      const isBlocked = !!validation?.isBlocked;
      const resolution = resolvedTemplatesMap.get(tpl.slug);
      const isNotResolved = !resolution?.dbTemplateId;

      return !isApproved || isBlocked || isNotResolved;
    });
  }, [filteredTemplates, docSelections, templateValidationMap, resolvedTemplatesMap]);

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

      const parsedLength = quickVesselLength ? parseFloat(quickVesselLength.replace(",", ".")) : null;
      const cleanHull = quickVesselHull.trim() || null;

      if (vessel?.id) {
        // Atualiza a embarcação existente
        const { data: updated, error: updErr } = await supabase
          .from("vessels")
          .update({
            name: quickVesselName.trim(),
            registration_number: quickVesselReg.trim() || null,
            vessel_type: quickVesselType.trim() || vessel.vessel_type || "Lancha / Recreio",
            length: parsedLength || vessel.length || null,
            hull_number: cleanHull || vessel.hull_number || null,
            current_owner_name: quickVesselOwnerName.trim() || null,
            current_owner_cpf_cnpj: quickVesselOwnerCpf.trim() || null,
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
            length: parsedLength,
            hull_number: cleanHull,
            current_owner_name: quickVesselOwnerName.trim() || null,
            current_owner_cpf_cnpj: quickVesselOwnerCpf.trim() || null,
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
        description: "Os modelos foram atualizados com os dados e proprietário informados.",
      });
    } catch (err: any) {
      console.error("Erro ao salvar embarcação rápida:", err);
      toast.error(err?.message || "Não foi possível atualizar a embarcação.");
    } finally {
      setIsSavingQuickVessel(false);
    }
  };

  // Confirmar explicitamente o requerente como proprietário da embarcação
  const handleConfirmCustomerAsOwner = async () => {
    if (!vessel?.id || !companyId || !customer) {
      toast.error("Vínculo indisponível. Preencha os dados no formulário.");
      setShowQuickVesselModal(true);
      return;
    }

    const customerOwnerName = customer.fantasy_name || customer.name || "";
    const customerOwnerCpf = customer.cpf_cnpj || customer.document || "";

    if (!customerOwnerName) {
      toast.error("Nome do requerente não encontrado.");
      return;
    }

    setIsSavingQuickVessel(true);
    try {
      const now = new Date().toISOString();
      const { data: updated, error } = await supabase
        .from("vessels")
        .update({
          current_owner_name: customerOwnerName,
          current_owner_cpf_cnpj: customerOwnerCpf || null,
          updated_at: now,
        })
        .eq("id", vessel.id)
        .eq("company_id", companyId)
        .select()
        .single();

      if (error) throw error;
      setVessel(updated);
      setQuickVesselOwnerName(customerOwnerName);
      setQuickVesselOwnerCpf(customerOwnerCpf);
      toast.success("Vínculo confirmado com sucesso!", {
        description: `${customerOwnerName} foi definido(a) como proprietário(a) da embarcação.`,
      });
    } catch (err: any) {
      console.error("Erro ao confirmar proprietário:", err);
      toast.error(err?.message || "Erro ao vincular proprietário.");
    } finally {
      setIsSavingQuickVessel(false);
    }
  };

  // Salvar/Atualizar dados do Outorgado (PF ou PJ) para a procuração
  const handleSaveOutorgado = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;

    if (outorgadoType === "pf" && (!outorgadoPfNome.trim() || !outorgadoPfCpf.trim())) {
      toast.error("Informe o Nome Completo e CPF do Outorgado Pessoa Física.");
      return;
    }

    if (outorgadoType === "pj" && (!outorgadoPjRazao.trim() || !outorgadoPjCnpj.trim())) {
      toast.error("Informe a Razão Social e CNPJ da Outorgada Pessoa Jurídica.");
      return;
    }

    setIsSavingOutorgado(true);
    try {
      const now = new Date().toISOString();
      const updatePayload: any = {
        updated_at: now,
      };

      if (outorgadoType === "pf") {
        updatePayload.procurador_nome = outorgadoPfNome.trim();
        updatePayload.procurador_cpf = outorgadoPfCpf.trim();
        updatePayload.procurador_rg = outorgadoPfRg.trim() || null;
        updatePayload.procurador_nacionalidade = outorgadoPfNacionalidade.trim() || null;
        updatePayload.procurador_endereco = outorgadoPfEndereco.trim() || null;
        updatePayload.procurador_telefone = outorgadoPfTelefone.trim() || null;
        updatePayload.procurador_email = outorgadoPfEmail.trim() || null;
        updatePayload.procurador_crea = outorgadoPfCrea.trim() || null;
      } else {
        updatePayload.name = outorgadoPjRazao.trim();
        updatePayload.cnpj = outorgadoPjCnpj.trim();
        updatePayload.contact_address = outorgadoPjEndereco.trim() || null;
        updatePayload.contact_phone = outorgadoPjTelefone.trim() || null;
        updatePayload.contact_email = outorgadoPjEmail.trim() || null;
      }

      const { data: updatedComp, error: updErr } = await supabase
        .from("companies")
        .update(updatePayload)
        .eq("id", companyId)
        .select()
        .single();

      if (updErr) throw updErr;

      // Também persistir a escolha explícita no draft_data do processo preservando rigorosamente todos os demais dados
      if (id && companyId) {
        // Obter o draft_data mais recente do banco para não perder atualizações concorrentes
        const { data: latestProc, error: procFetchErr } = await supabase
          .from("processes")
          .select("draft_data")
          .eq("id", id)
          .eq("company_id", companyId)
          .maybeSingle();

        if (procFetchErr) {
          console.error("Erro ao ler draft_data atual:", procFetchErr);
        }

        const currentDraft = (latestProc?.draft_data as any) || (processData?.draft_data as any) || {};
        const updatedDraft = {
          ...currentDraft,
          outorgado_type: outorgadoType,
          outorgado_pf_nome: outorgadoPfNome.trim(),
          outorgado_pf_cpf: outorgadoPfCpf.trim(),
          outorgado_pf_rg: outorgadoPfRg.trim() || null,
          outorgado_pf_nacionalidade: outorgadoPfNacionalidade.trim() || null,
          outorgado_pf_estado_civil: outorgadoPfEstadoCivil.trim() || null,
          outorgado_pj_razao: outorgadoPjRazao.trim(),
          outorgado_pj_cnpj: outorgadoPjCnpj.trim(),
          doc_selections: docSelections,
        };

        const { error: draftUpdateErr } = await supabase
          .from("processes")
          .update({
            draft_data: updatedDraft,
            updated_at: now,
          })
          .eq("id", id)
          .eq("company_id", companyId);

        if (draftUpdateErr) {
          console.error("Erro ao persistir draft_data no processo:", draftUpdateErr);
          throw new Error("Erro ao salvar seleções e dados no rascunho do processo.");
        }

        setProcessData((prev: any) => (prev ? { ...prev, draft_data: updatedDraft } : prev));
      }

      setCompanyData(updatedComp);
      setShowOutorgadoModal(false);
      toast.success(
        outorgadoType === "pf"
          ? "Dados do Outorgado (Pessoa Física) salvos com sucesso!"
          : "Dados da Outorgada (Pessoa Jurídica) salvos com sucesso!",
        {
          description: "Os requisitos da procuração foram atualizados.",
        },
      );
    } catch (err: any) {
      console.error("Erro ao salvar outorgado:", err);
      toast.error(err?.message || "Não foi possível salvar os dados do outorgado.");
    } finally {
      setIsSavingOutorgado(false);
    }
  };

  // Salvar Nacionalidade e Naturalidade do Declarante (Declaração de Residência)
  const handleSaveCustomerNat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !companyId) return;

    setIsSavingCustomerNat(true);
    try {
      const now = new Date().toISOString();
      const cleanNac = customerNacionalidade.trim();
      const cleanNat = customerNaturalidade.trim();

      // Salva no draft_data do processo
      const { data: latestProc } = await supabase
        .from("processes")
        .select("draft_data")
        .eq("id", id)
        .eq("company_id", companyId)
        .maybeSingle();

      const currentDraft = (latestProc?.draft_data as any) || (processData?.draft_data as any) || {};
      const updatedDraft = {
        ...currentDraft,
        customer_nationality: cleanNac,
        customer_naturalidade: cleanNat,
      };

      await supabase
        .from("processes")
        .update({
          draft_data: updatedDraft,
          updated_at: now,
        })
        .eq("id", id)
        .eq("company_id", companyId);

      setProcessData((prev: any) => (prev ? { ...prev, draft_data: updatedDraft } : prev));

      // Se o cliente possuir ID e colunas no banco, atualiza no registro do cliente também
      if (customer?.id) {
        await supabase
          .from("customers")
          .update({
            nationality: cleanNac || null,
            birthplace: cleanNat || null,
            updated_at: now,
          } as any)
          .eq("id", customer.id)
          .eq("company_id", companyId);
      }

      setShowCustomerNatModal(false);
      toast.success("Nacionalidade e naturalidade salvas com sucesso!", {
        description: "Os dados serão incluídos na Declaração de Residência.",
      });
    } catch (err: any) {
      console.error("Erro ao salvar nacionalidade e naturalidade:", err);
      toast.error(err?.message || "Não foi possível salvar os dados.");
    } finally {
      setIsSavingCustomerNat(false);
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

  // Salvar preferência de aparência como padrão nas configurações da empresa
  const handleSaveAppearancePreference = async () => {
    if (!companyId) return;
    setIsSavingAppearancePref(true);
    try {
      const now = new Date().toISOString();
      const { data: comp } = await supabase
        .from("companies")
        .select("document_template_map")
        .eq("id", companyId)
        .single();

      const docMap = (comp?.document_template_map as any) || {};
      const updatedDocMap = {
        ...docMap,
        appearance: {
          logoChoice,
          showWatermark,
          updated_at: now,
        },
      };

      const { error } = await supabase
        .from("companies")
        .update({
          document_template_map: updatedDocMap,
          updated_at: now,
        } as any)
        .eq("id", companyId);

      if (error) throw error;
      toast.success("Preferência de aparência salva com sucesso!", {
        description: "Essa configuração será o padrão para as próximas gerações desta empresa.",
      });
    } catch (err: any) {
      console.error("Erro ao salvar preferência de aparência:", err);
      toast.error(err?.message || "Não foi possível salvar a preferência.");
    } finally {
      setIsSavingAppearancePref(false);
    }
  };

  // Upload rápido do logo da empresa caso ainda não possua
  const handleUploadCompanyLogo = async (file: File) => {
    if (!companyId || !file) return;
    setIsUploadingCompanyLogo(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `companies/${companyId}/logo_${Date.now()}.${ext}`;
      await uploadToBucket("company-logos", path, file, {
        contentType: file.type || "image/png",
        upsert: true,
      });

      // Obter URL pública do asset
      const { data: urlData } = supabase.storage.from("company-assets").getPublicUrl(path);
      const publicUrl = urlData?.publicUrl || path;

      const { error: updErr } = await supabase
        .from("companies")
        .update({
          logo_url: publicUrl,
          logo_primary_url: publicUrl,
          updated_at: new Date().toISOString(),
        } as any)
        .eq("id", companyId);

      if (updErr) throw updErr;

      setCompanyData((prev: any) => ({
        ...prev,
        logo_url: publicUrl,
        logo_primary_url: publicUrl,
      }));
      setLogoChoice("company");
      toast.success("Logo da sua empresa enviado e configurado com sucesso!");
    } catch (err: any) {
      console.error("Erro ao enviar logo da empresa:", err);
      toast.error("Não foi possível enviar o logo da empresa.");
    } finally {
      setIsUploadingCompanyLogo(false);
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

      const previousAttached = docSelections[tpl.id]?.attachedFile;
      const existingVersions = (previousAttached as any)?.previousVersions || [];
      const updatedVersions = previousAttached
        ? [
            {
              id: previousAttached.id,
              name: previousAttached.name,
              url: previousAttached.url,
              size: previousAttached.size,
              replacedAt: new Date().toISOString(),
            },
            ...existingVersions,
          ]
        : [];

      const updatedSelections = {
        ...docSelections,
        [tpl.id]: {
          mode: "attach" as const,
          isUploading: false,
          attachedFile: {
            name: file.name,
            url: path,
            size: file.size,
            id: insertedFile?.id,
            previousVersions: updatedVersions,
          },
        },
      };
      setDocSelections(updatedSelections);

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
            doc_selections: updatedSelections,
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

  // Remover anexo pronto de um documento
  const handleRemoveAttachedFile = (tplId: string) => {
    setDocSelections((prev) => ({
      ...prev,
      [tplId]: {
        mode: "attach",
        attachedFile: undefined,
        isUploading: false,
      },
    }));
    toast.info("Anexo removido.");
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
          const fieldValidation = checkTemplateMissingRequirements(
            tpl,
            customer,
            vessel,
            selectedStaff,
            companyData,
            outorgadoType,
          );
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
          const effectiveLength = (processData?.draft_data as any)?.vessel_length || vessel?.length || vessel?.length_overall || "Não informado";

          // 2. Construir texto oficial detalhado do documento conforme sua natureza e regras normativas
          let content = "";

          if (tpl.slug === "proc-representacao-naval") {
            const isPF = outorgadoType === "pf";

            const customerCity = customer?.city || "Santos";
            const customerUf = customer?.state || "SP";
            const customerDoc = customer?.cpf_cnpj || customer?.document || "";
            const customerFullAddress = customer?.address
              ? `${customer.address}, ${customerCity} - ${customerUf}${(customer as any)?.postal_code ? ` - CEP: ${(customer as any).postal_code}` : ""}`
              : "Não informado";

            const resolvedCompanyEmail =
              outorgadoPjEmail ||
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
              outorgadoPjTelefone ||
              companyData?.contact_phone ||
              companyData?.phone ||
              companyData?.procurador_telefone ||
              (currentCompany as any)?.contact_phone ||
              (currentCompany as any)?.phone ||
              branding?.contact_phone ||
              "";

            const resolvedProcuradorEmail =
              outorgadoPfEmail ||
              companyData?.procurador_email ||
              companyData?.contact_email ||
              companyData?.email ||
              branding?.contact_email ||
              selectedStaff?.email ||
              user?.email ||
              "";

            const resolvedProcuradorPhone =
              outorgadoPfTelefone ||
              companyData?.procurador_telefone ||
              companyData?.contact_phone ||
              companyData?.phone ||
              branding?.contact_phone ||
              "";

            const resolvedNacionalidade = outorgadoPfNacionalidade || companyData?.procurador_nacionalidade || (processData?.draft_data as any)?.outorgado_pf_nacionalidade || "Brasileira";
            const resolvedEstadoCivil = outorgadoPfEstadoCivil || (processData?.draft_data as any)?.outorgado_pf_estado_civil || "Casado(a)";
            const resolvedProfissao = (companyData as any)?.procurador_cargo || (selectedStaff as any)?.role || "Despachante Náutico";

            const procInscricao = vessel?.registration_number || (processData?.draft_data as any)?.registration_number || "A designar (Inscrição Inicial)";
            const procHull = (vessel as any)?.hull_number || (vessel as any)?.chassis_number || (processData?.draft_data as any)?.vessel_hull || "Não informado";
            const procLength = (processData?.draft_data as any)?.vessel_length || vessel?.length || vessel?.length_overall || "";
            const procTipo = (vessel as any)?.vessel_type || (vessel as any)?.type || (processData?.draft_data as any)?.vessel_type || "Lancha / Esporte e Recreio";

            const outorgadoLines = isPF
              ? [
                  `OUTORGADO (PESSOA FÍSICA):`,
                  `Nome do Procurador: ${outorgadoPfNome || companyData?.procurador_nome || selectedStaff.name}`,
                  `Nacionalidade / Estado Civil: ${resolvedNacionalidade}, ${resolvedEstadoCivil}`,
                  `Profissão: ${resolvedProfissao}${outorgadoPfCrea || companyData?.procurador_crea ? ` (Registro: ${outorgadoPfCrea || companyData?.procurador_crea})` : ""}`,
                  `CPF: ${outorgadoPfCpf || companyData?.procurador_cpf || "Não informado"}    RG: ${outorgadoPfRg || companyData?.procurador_rg || "Não informado"}`,
                  `Endereço Profissional: ${outorgadoPfEndereco || companyData?.procurador_endereco || companyData?.contact_address || "Não informado"}`,
                  `Telefone: ${resolvedProcuradorPhone || "Não informado"}    E-mail: ${resolvedProcuradorEmail || "Não informado"}`,
                  (companyData?.cnpj || currentCompany?.cnpj)
                    ? `Sociedade Vinculada: ${companyData?.name || currentCompany?.name || "NavalDocs Pro"} (CNPJ: ${companyData?.cnpj || currentCompany?.cnpj})`
                    : "",
                ]
              : [
                  `OUTORGADA (PESSOA JURÍDICA):`,
                  `Razão Social: ${outorgadoPjRazao || companyData?.name || currentCompany?.name || "NavalDocs Pro"}`,
                  `CNPJ: ${outorgadoPjCnpj || companyData?.cnpj || currentCompany?.cnpj || "Não informado"}`,
                  `Sede Social: ${outorgadoPjEndereco || companyData?.contact_address || "Não informado"}`,
                  `Telefone: ${resolvedCompanyPhone || "Não informado"}    E-mail: ${resolvedCompanyEmail || "Não informado"}`,
                  `Representação Institucional: Representada por seus diretores, procuradores e prepostos legalmente constituídos para a prática de atos perante a Autoridade Marítima.`,
                ];

            content = [
              `INSTRUMENTO PARTICULAR DE PROCURAÇÃO`,
              `REPRESENTAÇÃO PERANTE A AUTORIDADE MARÍTIMA (NORMAM-211/DPC, ITEM 2.2.4)`,
              ``,
              `OUTORGANTE:`,
              `Nome / Razão Social: ${customerName}`,
              `CPF / CNPJ: ${customerDoc}`,
              customer?.rg ? `RG / Órgão Emissor: ${customer.rg}` : "",
              `Endereço Domiciliar: ${customerFullAddress}`,
              customer?.phone ? `Telefone: ${customer.phone}` : "",
              customer?.email ? `E-mail: ${customer.email}` : "",
              ``,
              ...outorgadoLines.filter(Boolean),
              ``,
              `EMBARCAÇÃO OBJETO DO MANDATO:`,
              `Nome da Embarcação: ${vesselName}    Inscrição: ${procInscricao}`,
              `Classificação / Tipo: ${procTipo}${procLength ? `    Comprimento: ${procLength} m` : ""}`,
              `Número do Casco / Chassi: ${procHull}`,
              ``,
              `PODERES ESPECÍFICOS DE REPRESENTAÇÃO NÁUTICA:`,
              `Por este instrumento particular de mandato, o(a) OUTORGANTE nomeia e constitui o(a) OUTORGADO(A) como seu(sua) bastante procurador(a), conferindo-lhe amplos e específicos poderes para representá-lo(a) perante a Diretoria de Portos e Costas (DPC), Capitanias dos Portos, Delegacias e Agências da Marinha do Brasil em todo o território nacional. Em especial, são conferidos poderes para requerer, instruir, acompanhar e formalizar processos de inscrição inicial, transferência de propriedade e jurisdição, renovação de TIE/TIEM, cancelamento, alteração de características ou troca de motor propulsor, vistorias e emissão de certidões referentes à embarcação acima identificada, podendo assinar formulários, requerimentos e termos de responsabilidade oficiais (inclusive Anexos 2-B, 2-C e 2-K da NORMAM-211/DPC), juntar e desentranhar guias, notas fiscais e documentos comprobatórios, solicitar e retirar documentos náuticos definitivos ou provisórios, dar quitação de taxas e cumprir exigências administrativas até a conclusão final do processo marítimo.`,
              ``,
              `CLÁUSULA DE SUBSTABELECIMENTO E VALIDADE (NORMAM-211/DPC item 2.2.4 / CC art. 655):`,
              `É expressamente facultado ao(à) Outorgado(a) substabelecer esta procuração, com reserva de iguais poderes, a despachantes náuticos ou prepostos formalmente credenciados para a prática dos atos estritamente necessários ao cumprimento do mandato perante as Organizações Militares da Marinha do Brasil. Este mandato vigorará pelo prazo de 12 (doze) meses a contar da data de sua assinatura ou até a efetiva conclusão do processo de regularização náutica.`,
              ``,
              `Local e Data: ${customerCity}/${customerUf}, ${new Date().toLocaleDateString("pt-BR")}`,
              ``,
              `_________________________________________________________________`,
              `Assinatura do Outorgante: ${customerName}`,
              `(CPF/CNPJ: ${customerDoc})`,
              ``,
              `Nota de Autenticação: Este instrumento particular de mandato atende às exigências da NORMAM-211/DPC (item 2.2.4, alínea a) e do Código Civil Brasileiro (arts. 653 a 655). Deverá ser apresentado acompanhado de cópia autenticada do documento de identificação do outorgante ou conter firma reconhecida por semelhança, admitindo-se igualmente assinatura eletrônica avançada (Gov.br Prata ou Ouro) ou qualificada (ICP-Brasil).`,
            ]
              .filter(Boolean)
              .join("\n");
          } else if (tpl.slug === "decl-residencia-naval") {
            const customerCity = customer?.city || "Santos";
            const customerUf = customer?.state || "SP";
            const fullAddress = customer?.address
              ? `${customer.address}, ${customerCity} - ${customerUf}`
              : "Não informado";

            const customerDoc = customer?.cpf_cnpj || customer?.document || "";
            const resolvedNac = customerNacionalidade || (customer as any)?.nationality || (processData?.draft_data as any)?.customer_nationality || "";
            const resolvedNat = customerNaturalidade || (customer as any)?.birthplace || (customer as any)?.naturalidade || (processData?.draft_data as any)?.customer_naturalidade || "";
            const customerNac = resolvedNac ? `, nacionalidade ${resolvedNac}` : "";
            const customerNat = resolvedNat ? `, naturalidade ${resolvedNat}` : "";
            const customerPhone = customer?.phone ? `, Telefone (DDD e nº) ${customer.phone}` : "";
            const customerEmail = customer?.email ? `, e-mail ${customer.email}` : "";

            content = [
              `NORMAM-211/DPC`,
              `ANEXO 2-G`,
              `DECLARAÇÃO DE RESIDÊNCIA`,
              ``,
              `Sr. Capitão dos Portos/Delegado/Agente`,
              ``,
              `Eu, ${customerName}, CPF ${customerDoc}${customerNac}${customerNat}${customerPhone}${customerEmail}.`,
              ``,
              `Na falta de documentos para comprovação de residência, em conformidade com o disposto na Lei nº 7.115, de 29 de agosto de 1983, DECLARO para os devidos fins, sob as penas da Lei, ser residente e domiciliado no endereço:`,
              `${fullAddress}`,
              ``,
              `Declaro ainda, estar ciente de que a falsidade da presente declaração pode implicar na sanção penal prevista no Art. 299 do Código Penal, conforme transcrição abaixo:`,
              ``,
              `"Art. 299 - Omitir, em documento público ou particular, declaração que nele deveria constar, ou nele inserir ou fazer inserir Declaração falsa ou diversa da que deveria ser escrita, com o fim de prejudicar direito, criar obrigação ou alterar a verdade sobre o fato juridicamente relevante."`,
              `"Pena: reclusão de 1 (um) a 5 (cinco) anos e multa, se o documento é público e reclusão de 1 (um) a 3 (três) anos, se o documento é particular."`,
              ``,
              `${customerCity}/${customerUf}, ${new Date().toLocaleDateString("pt-BR")}`,
            ]
              .filter(Boolean)
              .join("\n");
          } else if (
            tpl.slug === "bsade-simplificado" ||
            tpl.code === "BSADE-001" ||
            tpl.id === "doc_bsade"
          ) {
            // NORMAM-211/DPC Anexo 2-B (página 185) - BOLETIM SIMPLIFICADO DE ATUALIZAÇÃO DE DADOS DE EMBARCAÇÃO
            const customerCity = customer?.city || "Santos";
            const customerUf = customer?.state || "SP";
            const customerBairro = (customer as any)?.neighborhood || (customer as any)?.bairro || "Centro";
            const fullAddress = customer?.address || "Não informado";
            const customerDoc = customer?.cpf_cnpj || customer?.document || "";

            const servicesRaw = (processData?.draft_data as any)?.services || [];
            const procType = (processData?.process_type || "").toLowerCase();

            const isTransf = procType.includes("transfer") || servicesRaw.includes("transferencia_propriedade");
            const isInscr = procType.includes("inscri") || procType.includes("registro") || servicesRaw.includes("registro_embarcacao") || (!isTransf && !procType.includes("cancel"));
            const isAltCad = procType.includes("altera") || servicesRaw.includes("alteracao_dados") || servicesRaw.includes("alteracao_cadastral");
            const isCancel = procType.includes("cancel") || servicesRaw.includes("cancelamento_inscricao");
            const isTransfJurisd = procType.includes("jurisd") || servicesRaw.includes("transferencia_jurisdicao");
            const isCertidao = procType.includes("certid") || servicesRaw.includes("emissao_certidao");

            let resolvedCep = (customer as any)?.postal_code || (customer as any)?.cep || "";
            if (!resolvedCep && customer?.address) {
              const cepMatch = customer.address.match(/\b\d{5}-?\d{3}\b/);
              if (cepMatch) resolvedCep = cepMatch[0];
            }

            const resolvedRg = customer?.rg || (customer as any)?.identity_number || (customer as any)?.rg_number || "";
            const resolvedRgIssuer = (customer as any)?.rg_issuer || "SSP";
            const resolvedRgDate = (customer as any)?.rg_issue_date || (customer as any)?.rg_data_emissao || "Não informada";

            const customerTel = customer?.phone || "Não informado";
            const customerCel = (customer as any)?.mobile_phone || (customer as any)?.celular || customer?.phone || "Não informado";
            const customerEmail = customer?.email || "Não informado";

            const resolvedNfNumero = (processData?.draft_data as any)?.invoice_number || (processData?.draft_data as any)?.nf_numero || (processData?.draft_data as any)?.nf_casco || (vessel as any)?.invoice_number || "Conforme Nota Fiscal";
            const resolvedNfData = (processData?.draft_data as any)?.invoice_date || (processData?.draft_data as any)?.data_venda || (vessel as any)?.invoice_date || "Em anexo";
            const resolvedNfLocal = (processData?.draft_data as any)?.invoice_place || (processData?.draft_data as any)?.local_venda || customerCity;
            const resolvedVendedor = (processData?.draft_data as any)?.seller_name || (processData?.draft_data as any)?.vendedor_nome || (processData?.draft_data as any)?.vendedor || (vessel as any)?.seller_name || "Conforme Nota Fiscal / Declaração";
            const resolvedVendedorDoc = (processData?.draft_data as any)?.seller_document || (processData?.draft_data as any)?.vendedor_cpf_cnpj || (processData?.draft_data as any)?.vendedor_doc || "Conforme NF";

            const resolvedLength = (processData?.draft_data as any)?.vessel_length || vessel?.length || vessel?.length_overall || "";
            const formattedLength = resolvedLength ? `${resolvedLength}${String(resolvedLength).includes("m") ? "" : " m"}` : "Não informado";
            const resolvedHull = (vessel as any)?.hull_number || (vessel as any)?.chassis_number || (processData?.draft_data as any)?.vessel_hull || "Não informado";

            const rawBoca = (vessel as any)?.boca || (vessel as any)?.beam || (processData?.draft_data as any)?.boca || "";
            const resolvedBoca = rawBoca ? `${rawBoca}${String(rawBoca).includes("m") ? "" : " m"}` : "Não informado";

            const rawPontal = (vessel as any)?.pontal || (vessel as any)?.depth || (processData?.draft_data as any)?.pontal || "";
            const resolvedPontal = rawPontal ? `${rawPontal}${String(rawPontal).includes("m") ? "" : " m"}` : "Não informado";

            const rawContorno = (vessel as any)?.contorno || (processData?.draft_data as any)?.contorno || "";
            const resolvedContorno = rawContorno ? `${rawContorno}${String(rawContorno).includes("m") ? "" : " m"}` : "Não informado";

            const resolvedMatCasco = (vessel as any)?.material || (vessel as any)?.hull_material || (processData?.draft_data as any)?.hull_material || (processData?.draft_data as any)?.material_casco || "Fibra de Vidro";
            const resolvedTipo = (vessel as any)?.vessel_type || (vessel as any)?.type || (processData?.draft_data as any)?.vessel_type || "Lancha";
            const isProf = vesselCategory === "profissional" || tpl.code === "REQ-PROF";
            const resolvedAtividade = isProf ? "Comercial / Profissional" : "Esporte e/ou Recreio";
            const resolvedArqBruta = (vessel as any)?.gross_tonnage || (processData?.draft_data as any)?.gross_tonnage || (processData?.draft_data as any)?.arqueacao_bruta || "Dispensada (Miúda)";
            const resolvedArqLiquida = (vessel as any)?.net_tonnage || (processData?.draft_data as any)?.net_tonnage || (processData?.draft_data as any)?.arqueacao_liquida || "Dispensada (Miúda)";
            const resolvedTripulantes = String((vessel as any)?.crew_capacity || (processData?.draft_data as any)?.crew || (processData?.draft_data as any)?.tripulantes || "1");
            const resolvedPassageiros = String((vessel as any)?.passenger_capacity || (vessel as any)?.capacity || (processData?.draft_data as any)?.passenger_capacity || (processData?.draft_data as any)?.passageiros || (processData?.draft_data as any)?.lotacao || "Conforme fabricante");
            const resolvedAnoConstrucao = String((vessel as any)?.year_built || (vessel as any)?.construction_year || (processData?.draft_data as any)?.year_built || (processData?.draft_data as any)?.ano_construcao || new Date().getFullYear());

            const rawNavArea = (
              (vessel as any)?.navigation_area ||
              (processData?.draft_data as any)?.navigation_area ||
              (processData?.draft_data as any)?.area_navegacao ||
              ""
            ).toLowerCase();
            const isCosteira = rawNavArea.includes("costeira") || rawNavArea.includes("mar aberto - costeira");
            const isOceanica = rawNavArea.includes("oceânica") || rawNavArea.includes("oceanica") || rawNavArea.includes("mar aberto - oceânica");
            const isInterior = rawNavArea.includes("interior") || (!isCosteira && !isOceanica && rawNavArea.length > 0) || (!isCosteira && !isOceanica);

            const resolvedInscricao = isInscr
              ? "A designar (Inscrição Inicial)"
              : (vessel?.registration_number || (processData?.draft_data as any)?.registration_number || "Em regularização");

            const motor1Marca = (vessel as any)?.engine_brand || (processData?.draft_data as any)?.engine_brand || (processData?.draft_data as any)?.motor_marca || "Conforme Nota Fiscal";
            const rawPot = (vessel as any)?.engine_power || (processData?.draft_data as any)?.engine_power || (processData?.draft_data as any)?.motor_potencia || "";
            const motor1Potencia = rawPot ? `${rawPot}${String(rawPot).toUpperCase().includes("HP") ? "" : " HP"}` : "Conforme NF";
            const motor1Serie = (vessel as any)?.engine_serial || (processData?.draft_data as any)?.engine_serial || (processData?.draft_data as any)?.motor_serie || "Conforme Nota Fiscal";

            const motor2Marca = (vessel as any)?.engine2_brand || (processData?.draft_data as any)?.motor2_marca || "---";
            const motor2Potencia = (vessel as any)?.engine2_power || (processData?.draft_data as any)?.motor2_potencia || "---";
            const motor2Serie = (vessel as any)?.engine2_serial || (processData?.draft_data as any)?.motor2_serie || "---";

            const motor3Marca = (vessel as any)?.engine3_brand || (processData?.draft_data as any)?.motor3_marca || "---";
            const motor3Potencia = (vessel as any)?.engine3_power || (processData?.draft_data as any)?.motor3_potencia || "---";
            const motor3Serie = (vessel as any)?.engine3_serial || (processData?.draft_data as any)?.motor3_serie || "---";

            content = [
              `NORMAM-211/DPC`,
              `ANEXO 2-B`,
              `MARINHA DO BRASIL`,
              `DIRETORIA DE PORTOS E COSTAS`,
              `BOLETIM SIMPLIFICADO DE ATUALIZAÇÃO DE DADOS DE EMBARCAÇÃO (BSADE)`,
              ``,
              `À Capitania dos Portos, Delegacia ou Agência`,
              ``,
              `NATUREZA DO REQUERIMENTO`,
              `[${isInscr ? "X" : " "}] Inscrição de embarcação      [${isTransf ? "X" : " "}] Transferência de proprietário      [${isAltCad ? "X" : " "}] Atualização de dados`,
              `[${isCancel ? "X" : " "}] Cancelamento de Inscrição    [${isTransfJurisd ? "X" : " "}] Transferência de jurisdição        [${isCertidao ? "X" : " "}] Emissão de Certidão`,
              ``,
              `DADOS PESSOAIS DO REQUERENTE`,
              `NOME DO PROPRIETÁRIO: ${customerName}`,
              `ENDEREÇO: ${fullAddress}`,
              `CIDADE: ${customerCity}    BAIRRO: ${customerBairro}    CEP: ${resolvedCep || "Não informado"}`,
              `IDENTIDADE: ${resolvedRg || (customer?.cpf_cnpj || customer?.document || "")}    ÓRGÃO EMISSOR: ${resolvedRgIssuer}    DATA DE EMISSÃO: ${resolvedRgDate}`,
              `CPF/CNPJ: ${customerDoc}    TEL.: ${customerTel}    CEL.: ${customerCel}`,
              `E-mail: ${customerEmail}`,
              `Nota Fiscal Nº: ${resolvedNfNumero}    Data da Venda: ${resolvedNfData}    Local: ${resolvedNfLocal}`,
              `Vendedor: ${resolvedVendedor}    CPF/CNPJ: ${resolvedVendedorDoc}`,
              ``,
              `DADOS DA EMBARCAÇÃO`,
              `Nome da Embarcação: ${vesselName}    Inscrição: ${resolvedInscricao}    Arq. Bruta: ${resolvedArqBruta}`,
              `Tipo: ${resolvedTipo}    Atividade: ${resolvedAtividade}    Arq. Líquida: ${resolvedArqLiquida}`,
              `Comprimento: ${formattedLength}    Tripulantes: ${resolvedTripulantes}    Ano de Construção: ${resolvedAnoConstrucao}`,
              `Boca: ${resolvedBoca}    Passageiros: ${resolvedPassageiros}    Nº Casco: ${resolvedHull}`,
              `Pontal: ${resolvedPontal}    Mat. Casco: ${resolvedMatCasco}    Contorno: ${resolvedContorno}`,
              `Área de Navegação: [${isInterior ? "X" : " "}] Interior   [${isCosteira ? "X" : " "}] Costeira   [${isOceanica ? "X" : " "}] Oceânica`,
              ``,
              `MOTORIZAÇÃO`,
              `1º Motor/Marca: ${motor1Marca}    Potência: ${motor1Potencia}    Nº Série: ${motor1Serie}`,
              `2º Motor/Marca: ${motor2Marca}    Potência: ${motor2Potencia}    Nº Série: ${motor2Serie}`,
              `3º Motor/Marca: ${motor3Marca}    Potência: ${motor3Potencia}    Nº Série: ${motor3Serie}`,
              ``,
              `Local e data: ${customerCity}/${customerUf}, ${new Date().toLocaleDateString("pt-BR")}`,
              `Assinatura do Requerente: __________________________________________________`,
              `Carimbo e Assinatura do Atendente: _________________________________________`,
              `Protocolo: __________________________________________________`,
              ``,
              `(1) Este formulário é aplicável a embarcações miúdas.`,
              `(2) Deve ser emitido em duas vias, sendo uma entregue na CP/DL/AG e outra contendo o número do protocolo de recebimento, entregue ao requerente. Após assinado e datado pela CP/DL/AG, permite a utilização da embarcação por um período máximo de 30 dias, prorrogáveis por mais 30 dias.`,
              ``,
              `- 2-B-1 -`,
            ]
              .filter(Boolean)
              .join("\n");
          } else if (
            tpl.slug === "termo-entrega-transf" ||
            tpl.slug === "doc_decl_transf" ||
            tpl.code === "TER-ENTR" ||
            tpl.code === "ATPE-001" ||
            tpl.code === "ATPE"
          ) {
            // NORMAM-211/DPC Anexo 2-K (páginas oficiais 202 e 203 da Portaria DPC/MB nº 115/2023 consolidada 2026)
            // AUTORIZAÇÃO DE TRANSFERÊNCIA DE PROPRIEDADE
            const customerCity = customer?.city || "Santos";
            const customerUf = customer?.state || "SP";
            const customerDoc = customer?.cpf_cnpj || customer?.document || "";

            // Resolução do Vendedor (Proprietário Transmitente)
            const draftSellerName = (processData?.draft_data as any)?.seller_name || (processData?.draft_data as any)?.vendedor_nome;
            const draftSellerDoc = (processData?.draft_data as any)?.seller_document || (processData?.draft_data as any)?.vendedor_cpf_cnpj || (processData?.draft_data as any)?.vendedor_doc;
            const draftSellerTel = (processData?.draft_data as any)?.seller_phone || (processData?.draft_data as any)?.vendedor_telefone;
            const draftSellerEmail = (processData?.draft_data as any)?.seller_email || (processData?.draft_data as any)?.vendedor_email;

            const isCustomerBuyer = !!((processData?.draft_data as any)?.buyer_is_customer || (processData?.draft_data as any)?.compradorId === customer?.id || draftSellerName);
            
            const vendedorNome = draftSellerName || (isCustomerBuyer ? ((vessel as any)?.current_owner_name || "Proprietário Anterior conforme TIE") : customerName);
            const vendedorDoc = draftSellerDoc || (isCustomerBuyer ? ((vessel as any)?.current_owner_document || "") : customerDoc);
            const vendedorTel = draftSellerTel || (isCustomerBuyer ? "Não informado" : (customer?.phone || "Não informado"));
            const vendedorEmail = draftSellerEmail || (isCustomerBuyer ? "Não informado" : (customer?.email || "Não informado"));

            // Co-Proprietário
            const coPropNome = (processData?.draft_data as any)?.co_proprietario_nome || (vessel as any)?.co_owner_name || "---";
            const coPropDoc = (processData?.draft_data as any)?.co_proprietario_cpf || (vessel as any)?.co_owner_document || "---";
            const coPropTel = (processData?.draft_data as any)?.co_proprietario_telefone || "---";
            const coPropEmail = (processData?.draft_data as any)?.co_proprietario_email || "---";

            // Resolução do Comprador (Adquirente)
            const draftBuyerName = (processData?.draft_data as any)?.buyer_name || (processData?.draft_data as any)?.compradorNome || (processData?.draft_data as any)?.comprador_nome;
            const draftBuyerDoc = (processData?.draft_data as any)?.buyer_cpf_cnpj || (processData?.draft_data as any)?.comprador_cpf;
            const draftBuyerTel = (processData?.draft_data as any)?.buyer_phone || (processData?.draft_data as any)?.comprador_telefone;
            const draftBuyerEmail = (processData?.draft_data as any)?.buyer_email || (processData?.draft_data as any)?.comprador_email;

            let resolvedCep = (customer as any)?.postal_code || (customer as any)?.cep || "";
            if (!resolvedCep && customer?.address) {
              const cepMatch = customer.address.match(/\b\d{5}-?\d{3}\b/);
              if (cepMatch) resolvedCep = cepMatch[0];
            }

            const compradorNome = isCustomerBuyer ? customerName : (draftBuyerName || "A preencher / Conforme Contrato");
            const compradorDoc = isCustomerBuyer ? customerDoc : (draftBuyerDoc || "Não informado");
            const compradorTel = isCustomerBuyer ? (customer?.phone || "Não informado") : (draftBuyerTel || "Não informado");
            const compradorEmail = isCustomerBuyer ? (customer?.email || "Não informado") : (draftBuyerEmail || "Não informado");
            const compradorRua = isCustomerBuyer ? (customer?.address || "Não informado") : ((processData?.draft_data as any)?.comprador_rua || "Não informado");
            const compradorNumero = (customer as any)?.number || (customer as any)?.numero || (processData?.draft_data as any)?.comprador_numero || "S/N";
            const compradorComplemento = (customer as any)?.complement || (customer as any)?.complemento || (processData?.draft_data as any)?.comprador_complemento || "---";
            const compradorBairro = (customer as any)?.neighborhood || (customer as any)?.bairro || (processData?.draft_data as any)?.comprador_bairro || "Centro";
            const compradorCidade = isCustomerBuyer ? `${customerCity}/${customerUf}` : ((processData?.draft_data as any)?.comprador_cidade || `${customerCity}/${customerUf}`);
            const compradorCep = isCustomerBuyer ? (resolvedCep || "Não informado") : ((processData?.draft_data as any)?.comprador_cep || "Não informado");

            // Valor da Transação Comercial
            const rawValor = (processData?.draft_data as any)?.sale_value || (processData?.draft_data as any)?.valor_venda || (processData?.draft_data as any)?.valor_transacao || (vessel as any)?.purchase_price;
            const formattedValor = rawValor
              ? (typeof rawValor === "number" || !isNaN(Number(rawValor))
                  ? `R$ ${Number(rawValor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
                  : String(rawValor))
              : "Conforme Instrumento Particular de Compra e Venda";

            // Inscrição da Embarcação
            const resolvedInscricao = vessel?.registration_number || (processData?.draft_data as any)?.registration_number || (vessel as any)?.tie_number || "Conforme TIE anterior";

            // Motores (até 4 motores)
            const rawEngine1Brand = (vessel as any)?.engine_brand || (processData?.draft_data as any)?.engine_brand || (processData?.draft_data as any)?.motor_marca;
            const rawEngine1Power = (vessel as any)?.engine_power || (processData?.draft_data as any)?.engine_power || (processData?.draft_data as any)?.motor_potencia;
            const rawEngine1Serial = (vessel as any)?.engine_serial || (processData?.draft_data as any)?.engine_serial || (processData?.draft_data as any)?.motor_serie;
            const hasMotor1 = !!(rawEngine1Brand || rawEngine1Power || rawEngine1Serial);
            const motor1Marca = rawEngine1Brand || (hasMotor1 ? "Conforme TIE" : "---");
            const motor1Potencia = rawEngine1Power ? `${rawEngine1Power}${String(rawEngine1Power).toUpperCase().includes("HP") ? "" : " HP"}` : (hasMotor1 ? "Conforme TIE" : "---");
            const motor1Serie = rawEngine1Serial || (hasMotor1 ? "Conforme TIE" : "---");

            const rawEngine2Brand = (vessel as any)?.engine2_brand || (processData?.draft_data as any)?.motor2_marca;
            const rawEngine2Power = (vessel as any)?.engine2_power || (processData?.draft_data as any)?.motor2_potencia;
            const rawEngine2Serial = (vessel as any)?.engine2_serial || (processData?.draft_data as any)?.motor2_serie;
            const hasMotor2 = !!(rawEngine2Brand || rawEngine2Power || rawEngine2Serial);
            const motor2Marca = rawEngine2Brand || "---";
            const motor2Potencia = rawEngine2Power ? `${rawEngine2Power}${String(rawEngine2Power).toUpperCase().includes("HP") ? "" : " HP"}` : "---";
            const motor2Serie = rawEngine2Serial || "---";

            const rawEngine3Brand = (vessel as any)?.engine3_brand || (processData?.draft_data as any)?.motor3_marca;
            const hasMotor3 = !!rawEngine3Brand;
            const motor3Marca = rawEngine3Brand || "---";
            const motor3Potencia = (vessel as any)?.engine3_power || (processData?.draft_data as any)?.motor3_potencia || "---";
            const motor3Serie = (vessel as any)?.engine3_serial || (processData?.draft_data as any)?.motor3_serie || "---";

            const rawEngine4Brand = (vessel as any)?.engine4_brand || (processData?.draft_data as any)?.motor4_marca;
            const hasMotor4 = !!rawEngine4Brand;
            const motor4Marca = rawEngine4Brand || "---";
            const motor4Potencia = (vessel as any)?.engine4_power || (processData?.draft_data as any)?.motor4_potencia || "---";
            const motor4Serie = (vessel as any)?.engine4_serial || (processData?.draft_data as any)?.motor4_serie || "---";

            content = [
              `NORMAM-211/DPC`,
              `ANEXO 2-K`,
              `AUTORIZAÇÃO DE TRANSFERÊNCIA DE PROPRIEDADE`,
              ``,
              `Nome da embarcação: ${vesselName}       Inscrição: ${resolvedInscricao}`,
              ``,
              `Motor 1   [${hasMotor1 ? "X" : " "}] SIM   [${!hasMotor1 ? "X" : " "}] NÃO          Motor 2   [${hasMotor2 ? "X" : " "}] SIM   [${!hasMotor2 ? "X" : " "}] NÃO`,
              `Marca: ${motor1Marca}                   Marca: ${motor2Marca}`,
              `Potência: ${motor1Potencia}             Potência: ${motor2Potencia}`,
              `Nº de Série: ${motor1Serie}             Nº de Série: ${motor2Serie}`,
              ``,
              `Motor 3   [${hasMotor3 ? "X" : " "}] SIM   [${!hasMotor3 ? "X" : " "}] NÃO          Motor 4   [${hasMotor4 ? "X" : " "}] SIM   [${!hasMotor4 ? "X" : " "}] NÃO`,
              `Marca: ${motor3Marca}                   Marca: ${motor4Marca}`,
              `Potência: ${motor3Potencia}             Potência: ${motor4Potencia}`,
              `Nº de Série: ${motor3Serie}             Nº de Série: ${motor4Serie}`,
              ``,
              `PROPRIETÁRIO                            CO-PROPRIETÁRIO`,
              `Nome: ${vendedorNome}                   Nome: ${coPropNome}`,
              `CPF/CNPJ: ${vendedorDoc}                CPF/CNPJ: ${coPropDoc}`,
              `Telefone: ${vendedorTel}                Telefone: ${coPropTel}`,
              `E-mail: ${vendedorEmail}                E-mail: ${coPropEmail}`,
              ``,
              `COMPRADOR`,
              `Nome: ${compradorNome}`,
              `CPF/CNPJ: ${compradorDoc}`,
              `Telefone: ${compradorTel}    E-mail: ${compradorEmail}`,
              `Rua: ${compradorRua}    Número: ${compradorNumero}    Complemento: ${compradorComplemento}`,
              `Bairro: ${compradorBairro}    Cidade: ${compradorCidade}    CEP: ${compradorCep}`,
              `Valor: ${formattedValor}`,
              ``,
              `Local e Data: ${customerCity}/${customerUf}, ${new Date().toLocaleDateString("pt-BR")}`,
              ``,
              `__________________________               _________________________________`,
              `Assinatura do Proprietário               Assinatura do Co-Proprietário`,
              ``,
              `Reconhecimento de firma do Proprietário / Co-Proprietário por autenticidade`,
              ``,
              `___________________________________________________________`,
              `Assinatura do Comprador`,
              ``,
              `- 2-K- 1-`,
              ``,
              `--- PAGE BREAK ---`,
              ``,
              `NORMAM-211/DPC`,
              ``,
              `Reconhecimento de firma do comprador por autenticidade`,
              ``,
              `a) Este documento, devidamente preenchido e com o reconhecimento das firmas por autenticidade (caso a assinatura seja eletrônica, vide alínea b) do inciso 2.2.4) deverá ser apresentado dentro do prazo de 15 dias para as embarcações registradas e de 60 dias para as embarcações inscritas, juntamente com os demais documentos necessários à transferência de propriedade contidos no artigo 2.11.`,
              ``,
              `b) Para evitar a incidência de multas sobre o vendedor, recomenda-se que este preencha a Comunicação de Transferência de Propriedade (anexo 2-I) e apresente em qualquer Capitania, Delegacia ou Agência (CP/DL/AG).`,
              ``,
              `- 2-K- 2-`,
            ]
              .filter(Boolean)
              .join("\n");
          } else if (
            tpl.slug === "decl-perda-extravio" ||
            tpl.code === "DEC-PERD" ||
            tpl.code === "DEC-PERDA" ||
            tpl.id === "doc_decl_perda" ||
            tpl.slug === "doc_decl_perda"
          ) {
            // NORMAM-211/DPC Anexo 2-H (página oficial 196) - DECLARAÇÃO DE PERDA/EXTRAVIO DE DOCUMENTO
            const customerCity = customer?.city || "Santos";
            const customerUf = customer?.state || "SP";
            const customerDoc = customer?.cpf_cnpj || customer?.document || "";

            const resolvedRg = customer?.rg || (customer as any)?.identity_number || (customer as any)?.rg_number || "";
            const resolvedRgIssuer = (customer as any)?.rg_issuer || "SSP";
            const resolvedRgDate = (customer as any)?.rg_issue_date || (customer as any)?.rg_data_emissao || "Não informada";

            const resolvedNac = customerNacionalidade || (customer as any)?.nationality || (processData?.draft_data as any)?.customer_nationality || "Brasileira";
            const resolvedNat = customerNaturalidade || (customer as any)?.birthplace || (customer as any)?.naturalidade || (processData?.draft_data as any)?.customer_naturalidade || `${customerCity} - ${customerUf}`;

            const customerTel = customer?.phone || "Não informado";
            const customerCel = (customer as any)?.mobile_phone || (customer as any)?.celular || customer?.phone || "Não informado";
            const customerEmail = customer?.email || "Não informado";

            const resolvedInscricao = vessel?.registration_number || (processData?.draft_data as any)?.registration_number || (vessel as any)?.tie_number || "Conforme TIE anterior";

            content = [
              `NORMAM-211/DPC`,
              `ANEXO 2-H`,
              `DECLARAÇÃO DE PERDA/EXTRAVIO DE DOCUMENTO`,
              ``,
              `Sr. Capitão dos Portos/Delegado/Agente ........................................................................`,
              ``,
              `Eu, ${customerName}, Identidade Nº ${resolvedRg || customerDoc}, Expedida em ${resolvedRgDate}, Órgão Emissor ${resolvedRgIssuer}, CPF ${customerDoc}, nacionalidade ${resolvedNac}, naturalidade ${resolvedNat}, Telefone (DDD e nº) ${customerTel}, celular ${customerCel}, e-mail ${customerEmail}.`,
              ``,
              `DECLARO para os devidos fins, sob as penas da Lei, a perda / extravio do documento abaixo assinalado:`,
              `[X]  Título de Inscrição de Embarcação (TIE/TIEM)`,
              ``,
              `EMBARCAÇÃO`,
              `Nome: ${vesselName}          Nº de Inscrição: ${resolvedInscricao}`,
              ``,
              `Declaro ainda, estar ciente de que a falsidade da presente declaração pode implicar na sanção penal prevista no art. 299 do Código Penal, conforme transcrição abaixo:`,
              `“Art. 299 – Omitir, em documento público ou particular, declaração que nele deveria constar, ou nele inserir ou fazer inserir Declaração falsa ou diversa da que deveria ser escrita, com o fim de prejudicar direito, criar obrigação ou alterar a verdade sobre o fato juridicamente relevante”`,
              `“Pena: reclusão de 1 (um) a 5 (cinco) anos e multa, se o documento é público e reclusão de 1 (um) a 3 (três) anos, se o documento é particular”.`,
              ``,
              `Local e Data: ${customerCity}/${customerUf}, ${new Date().toLocaleDateString("pt-BR")}`,
              ``,
              `___________________________________________`,
              `Assinatura do Requerente, Vendedor ou seu`,
              `Representante legal`,
              `(${customerName} - CPF: ${customerDoc})`,
              ``,
              `- 2-H-1 -`,
            ]
              .filter(Boolean)
              .join("\n");
          } else if (
            tpl.slug === "decl-manutencao-renov" ||
            tpl.code === "DEC-OPER" ||
            tpl.code === "DECL_RENOV" ||
            tpl.code === "DEC-MANUT" ||
            tpl.id === "doc_decl_renov" ||
            tpl.slug === "doc_decl_renov"
          ) {
            // NORMAM-211/DPC Item 2.7 c/c Lei Federal nº 7.115/1983 - DECLARAÇÃO DE MANUTENÇÃO E CONDIÇÕES OPERACIONAIS
            const customerCity = customer?.city || "Santos";
            const customerUf = customer?.state || "SP";
            const customerDoc = customer?.cpf_cnpj || customer?.document || "";
            const customerAddress = customer?.address || "Não informado";
            const customerCep = (customer as any)?.postal_code || (customer as any)?.cep || "";
            const customerTel = customer?.phone || "";
            const customerEmail = customer?.email || "";

            const resolvedRg = customer?.rg || (customer as any)?.identity_number || (customer as any)?.rg_number || "";
            const resolvedRgIssuer = (customer as any)?.rg_issuer || "SSP";

            const resolvedInscricao = vessel?.registration_number || (processData?.draft_data as any)?.registration_number || (vessel as any)?.tie_number || "Conforme TIE a renovar";
            const effectiveLength = (processData?.draft_data as any)?.vessel_length || vessel?.length || vessel?.length_overall || "";
            const formattedLength = effectiveLength ? `${effectiveLength}${String(effectiveLength).includes("m") ? "" : " m"}` : "Não informado";
            const vesselMaterial = (processData?.draft_data as any)?.hull_material || (vessel as any)?.hull_material || "Fibra de Vidro";
            const vesselCrew = (vessel as any)?.crew_capacity || (processData?.draft_data as any)?.crew_capacity || "1";
            const vesselPass = (vessel as any)?.passenger_capacity || (processData?.draft_data as any)?.passenger_capacity || "7";

            const engineInfo = (processData?.draft_data as any)?.engine_info || (vessel as any)?.engine_power || (vessel as any)?.motor_power || (vessel as any)?.engine_description || "Conforme cadastro oficial perante a CP/DL/AG";

            content = [
              `NORMAM-211/DPC - ITEM 2.7`,
              `DECLARAÇÃO DE MANUTENÇÃO E CONDIÇÕES OPERACIONAIS`,
              `RENOVAÇÃO DE TÍTULO DE INSCRIÇÃO DE EMBARCAÇÃO (TIE / TIEM)`,
              ``,
              `À Capitania dos Portos, Delegacia ou Agência da Marinha do Brasil`,
              ``,
              `Eu, ${customerName}, Identidade RG nº ${resolvedRg || customerDoc}${resolvedRgIssuer ? ` (${resolvedRgIssuer})` : ""}, CPF nº ${customerDoc}, residente e domiciliado(a) na ${customerAddress}, ${customerCity}/${customerUf}${customerCep ? `, CEP ${customerCep}` : ""}${customerTel ? `, tel: ${customerTel}` : ""}, legítimo(a) proprietário(a) da embarcação:`,
              ``,
              `DADOS DA EMBARCAÇÃO:`,
              `Nome: ${vesselName}          Inscrição Nº: ${resolvedInscricao}          Classificação: ${vesselCategory === "profissional" ? "Comercial" : vesselCategory === "moto_aquatica" ? "Moto Aquática" : "Esporte e/ou Recreio"}`,
              `Comprimento: ${formattedLength}          Material: ${vesselMaterial}          Lotação: ${vesselCrew} tripulante(s) e ${vesselPass} passageiro(s)`,
              `Propulsão / Motor: ${engineInfo}`,
              ``,
              `DECLARO para os devidos fins de direito, em especial para renovação do TIE/TIEM perante a Capitania dos Portos, conforme item 2.7 da NORMAM-211/DPC e Lei Federal nº 7.115/1983 c/c Art. 299 do Código Penal Brasileiro, que:`,
              `1. A embarcação acima permanece com todas as características estruturais de casco, dimensões, arranjo geral, capacidade de pessoas e materiais inalterados, sem modificações que demandem vistoria extraordinária;`,
              `2. A propulsão e motorização instaladas correspondem estritamente ao cadastro oficial no SISGEMB e averbadas no TIE a renovar, operando em perfeitas condições mecânicas e de segurança da navegação;`,
              `3. A embarcação encontra-se provida de salvatagem integral (coletes homologados com apito, boias com retinida), extintor de incêndio com carga válida, luzes de navegação, amarração e fundeio regulares;`,
              `4. Assumo inteira responsabilidade civil, criminal e administrativa pelas informações prestadas, ciente das penalidades da lei.`,
              ``,
              `Local e Data: ${customerCity}/${customerUf}, ${new Date().toLocaleDateString("pt-BR")}`,
              ``,
              `___________________________________________________________________________`,
              `Assinatura do Proprietário / Responsável Operacional`,
              `(${customerName} - CPF: ${customerDoc})`,
              ``,
              `Nota de Validade: Conforme NORMAM-211/DPC (item 2.7) e Lei Federal nº 7.115/1983, a presente declaração supre vistoria prévia para embarcações sem alteração estrutural, aceitando assinatura eletrônica Gov.br (Prata/Ouro).`,
            ]
              .filter(Boolean)
              .join("\n");
          } else if (
            tpl.slug === "comunicacao-transf-anexo-2i" ||
            tpl.code === "COM-TRANSF" ||
            tpl.code === "ANEXO-2I" ||
            tpl.code === "ANEXO_2I" ||
            tpl.id === "doc_comunicacao_transf" ||
            tpl.slug === "doc_comunicacao_transf"
          ) {
            // NORMAM-211/DPC Anexo 2-I (página oficial 198) - COMUNICAÇÃO DE TRANSFERÊNCIA DE PROPRIEDADE
            const customerCity = customer?.city || "Santos";
            const customerUf = customer?.state || "SP";
            const draft = (processData?.draft_data as any) || {};

            // Dados do vendedor (proprietário anterior)
            const vendedorNome = draft?.vendedor_nome || draft?.vendedorNome || customerName;
            const vendedorDoc = draft?.vendedor_cpf || draft?.vendedorCpf || customer?.cpf_cnpj || customer?.document || "";
            const vendedorDocIdent = draft?.vendedor_rg || (customer as any)?.identity_number || (customer as any)?.rg_number || "";
            const vendedorIdentTipo = "RG";
            const vendedorRgIssuer = draft?.vendedor_rg_emissor || (customer as any)?.rg_issuer || "SSP";
            const vendedorIdentData = draft?.vendedor_rg_data || (customer as any)?.rg_issue_date || "Não informada";
            const vendedorEndereco = draft?.vendedor_endereco || customer?.address || "Não informado";
            const vendedorNum = draft?.vendedor_numero || "S/N";
            const vendedorComp = draft?.vendedor_complemento || "-";
            const vendedorBairro = draft?.vendedor_bairro || "-";
            const vendedorCidade = draft?.vendedor_cidade || customerCity;
            const vendedorUf = draft?.vendedor_uf || customerUf;
            const vendedorCep = draft?.vendedor_cep || (customer as any)?.postal_code || (customer as any)?.cep || "";

            // Dados do comprador (novo proprietário)
            const compradorNome = draft?.comprador_nome || draft?.compradorNome || "Novo Proprietário Adquirente";
            const compradorDoc = draft?.comprador_cpf || draft?.compradorCpf || "Não informado";
            const compradorDocIdent = draft?.comprador_rg || "";
            const compradorIdentTipo = "RG";
            const compradorRgIssuer = draft?.comprador_rg_emissor || "SSP";
            const compradorIdentData = draft?.comprador_rg_data || "Não informada";
            const compradorEndereco = draft?.comprador_endereco || "Endereço do Comprador";
            const compradorNum = draft?.comprador_numero || "S/N";
            const compradorComp = draft?.comprador_complemento || "-";
            const compradorBairro = draft?.comprador_bairro || "-";
            const compradorCidade = draft?.comprador_cidade || customerCity;
            const compradorUf = draft?.comprador_uf || customerUf;
            const compradorCep = draft?.comprador_cep || "";

            const resolvedInscricao = vessel?.registration_number || draft?.registration_number || (vessel as any)?.tie_number || "Conforme TIE original";
            const resolvedCpDlAg = draft?.jurisdicao_cpes || "Capitania dos Portos / Delegacia / Agência";

            content = [
              `NORMAM-211/DPC`,
              `ANEXO 2-I`,
              `COMUNICAÇÃO DE TRANSFERÊNCIA DE PROPRIEDADE`,
              ``,
              `DADOS DA EMBARCAÇÃO`,
              `NOME: ${vesselName}`,
              `INSCRIÇÃO: ${resolvedInscricao}`,
              `CP/DL/AG: ${resolvedCpDlAg}`,
              ``,
              `PROPRIETÁRIO ANTERIOR`,
              `NOME COMPLETO: ${vendedorNome}`,
              `DOC. IDENTIDADE: ${vendedorDocIdent}    TIPO: ${vendedorIdentTipo}    ÓRGÃO EXPEDIDOR: ${vendedorRgIssuer}    DATA EXPEDIÇÃO: ${vendedorIdentData}`,
              `CPF/CNPJ: ${vendedorDoc}`,
              `ENDEREÇO: ${vendedorEndereco}    Nº: ${vendedorNum}    COMPLEMENTO: ${vendedorComp}`,
              `BAIRRO: ${vendedorBairro}    CIDADE: ${vendedorCidade}    UF: ${vendedorUf}    CEP: ${vendedorCep}`,
              ``,
              `Declara que a embarcação acima qualificada foi transferida para:`,
              ``,
              `NOVO PROPRIETÁRIO`,
              `NOME COMPLETO: ${compradorNome}`,
              `DOC. IDENTIDADE: ${compradorDocIdent}    TIPO: ${compradorIdentTipo}    ÓRGÃO EXPEDIDOR: ${compradorRgIssuer}    DATA EXPEDIÇÃO: ${compradorIdentData}`,
              `CPF/CNPJ: ${compradorDoc}`,
              `ENDEREÇO: ${compradorEndereco}    Nº: ${compradorNum}    COMPLEMENTO: ${compradorComp}`,
              `BAIRRO: ${compradorBairro}    CIDADE: ${compradorCidade}    UF: ${compradorUf}    CEP: ${compradorCep}`,
              ``,
              `Local e Data: ${customerCity}/${customerUf}, ${new Date().toLocaleDateString("pt-BR")}`,
              ``,
              `___________________________________________________________________________`,
              `ASSINATURA`,
              `(proprietário anterior)`,
              `(${vendedorNome} - CPF/CNPJ: ${vendedorDoc})`,
              ``,
              `- 2-I-1 -`,
            ]
              .filter(Boolean)
              .join("\n");
          } else if (
            tpl.slug === "req-alteracao-motor" ||
            tpl.code === "REQ-MOT" ||
            tpl.code === "TERMO_MOTOR" ||
            tpl.id === "doc_termo_motor" ||
            tpl.slug === "doc_termo_motor"
          ) {
            // NORMAM-211/DPC item 2.12 / 2.10 e Anexo 2-C - REQUERIMENTO DE ALTERAÇÃO DE MOTOR E TERMO DE RESPONSABILIDADE
            const customerCity = customer?.city || "Santos";
            const customerUf = customer?.state || "SP";
            const customerDoc = customer?.cpf_cnpj || customer?.document || "";
            const fullAddress = customer?.address || "Não informado";
            const draft = (processData?.draft_data as any) || {};

            let resolvedCep = (customer as any)?.postal_code || (customer as any)?.cep || "";
            if (!resolvedCep && customer?.address) {
              const cepMatch = customer.address.match(/\b\d{5}-?\d{3}\b/);
              if (cepMatch) resolvedCep = cepMatch[0];
            }
            const resolvedRg = customer?.rg || (customer as any)?.identity_number || (customer as any)?.rg_number || "";
            const resolvedInscricao = vessel?.registration_number || draft?.registration_number || (vessel as any)?.tie_number || "Conforme TIE cadastrado";
            const resolvedHull = (vessel as any)?.hull_number || (vessel as any)?.chassis_number || draft?.vessel_hull || "Não informado";
            const effectiveLength = draft?.vessel_length || vessel?.length || vessel?.length_overall || "";
            const formattedLength = effectiveLength ? `${effectiveLength}${String(effectiveLength).includes("m") ? "" : " m"}` : "Não informado";

            // Motor novo e motor anterior
            const novoMotorMarca = draft?.novoMotorMarca || draft?.novo_motor_marca || (vessel as any)?.engine_brand || "Yamaha";
            const novoMotorPotencia = draft?.novoMotorPotencia || draft?.novo_motor_potencia || (vessel as any)?.engine_power || (vessel as any)?.potencia_motor || "200 HP";
            const novoMotorSerie = draft?.novoMotorSerie || draft?.novo_motor_serie || (vessel as any)?.engine_serial || "Não informado";
            const novoMotorNf = draft?.novo_motor_nf || draft?.nota_fiscal_motor || "Conforme Nota Fiscal anexada";

            const motorAtualMarca = draft?.motorAtualMarca || draft?.motor_anterior_marca || "Conforme cadastro SISGEMB";
            const motorAtualPotencia = draft?.motorAtualPotencia || draft?.motor_anterior_potencia || "Conforme cadastro";
            const motorAtualSerie = draft?.motorAtualSerie || draft?.motor_anterior_serie || "Conforme cadastro";

            content = [
              `NORMAM-211/DPC`,
              `ANEXO 2-C`,
              `REQUERIMENTO DE SERVIÇOS PARA REGULARIZAÇÃO DE EMBARCAÇÕES`,
              ``,
              `SR. CAPITÃO DOS PORTOS (DELEGADO) OU (AGENTE)`,
              ``,
              `REQUERENTE: ${customerName}`,
              `ENDEREÇO: ${fullAddress}`,
              `CIDADE: ${customerCity}    UF: ${customerUf}${resolvedCep ? `    CEP: ${resolvedCep}` : ""}`,
              `IDENT. Nº: ${resolvedRg || customerDoc}${resolvedRg ? `    ORG EXP: ${(customer as any)?.rg_issuer || "SSP"}` : ""}    CPF/CNPJ: ${customerDoc}`,
              `TEL: ${customer?.phone || ""}    E-mail: ${customer?.email || ""}`.trim(),
              `OBS: Processo instruído via NavalDocs Pro sob o código ${processCode}`,
              ``,
              `EMBARCAÇÃO: ${vesselName}    INSCRIÇÃO Nº: ${resolvedInscricao}`,
              `Comprimento: ${formattedLength}    Nº DO CASCO: ${resolvedHull}    CLASSIFICAÇÃO: ${vesselCategory === "profissional" ? "Comercial" : vesselCategory === "moto_aquatica" ? "Moto Aquática" : "Esporte e/ou Recreio"}`,
              `Área de Navegação: [X] Interior   [ ] Costeira   [ ] Oceânica`,
              ``,
              `VEM REQUERER A V.Sa. os seguintes serviços:`,
              `[ ] Inscrição`,
              `[ ] Cancelamento de Inscrição da Embarcação`,
              `[ ] Licença de Construção`,
              `[ ] Licença de Alteração`,
              `[ ] Licença de Reclassificação`,
              `[ ] Transferência de Propriedade`,
              `[ ] Transferência de Jurisdição`,
              `[ ] Transferência de Propriedade e Jurisdição`,
              `[ ] Mudança de Nome da Embarcação`,
              `[ ] Renovação de TIE`,
              `[ ] Alteração de dados cadastrais da embarcação`,
              `[ ] Alteração dados cadastrais do Proprietário`,
              `[X] Troca do Motor Propulsor`,
              `[ ] Certidão Relativa a Situação da Embarcação`,
              `[ ] Registro de Ônus e Averbações relativos a embarcação`,
              `[ ] Cancelamento do Registro de Ônus e Averbações relativo a embarcação`,
              `[ ] Vistoria de Arqueação`,
              `[ ] Vistoria de Rearqueação`,
              `[ ] Vistoria para alterar a classificação da embarcação`,
              `[ ] Outros serviços: Regularização processual perante a Capitania dos Portos`,
              ``,
              `Local e Data: ${customerCity}/${customerUf}, ${new Date().toLocaleDateString("pt-BR")}`,
              ``,
              `___________________________________________________________________________`,
              `Assinatura do Requerente`,
              `CPF/CNPJ: ${customerDoc}`,
              ``,
              `--- PAGE BREAK ---`,
              ``,
              `NORMAM-211/DPC - ITEM 2.12 / 2.10`,
              `TERMO DE RESPONSABILIDADE POR ALTERAÇÃO DE MOTOR PROPULSOR`,
              ``,
              `Embarcação: ${vesselName}          Inscrição Nº: ${resolvedInscricao}`,
              `Proprietário: ${customerName}          CPF/CNPJ: ${customerDoc}`,
              ``,
              `1. DISCRIMINAÇÃO DO MOTOR ANTERIOR (RETIRADO):`,
              `Marca: ${motorAtualMarca}          Potência: ${motorAtualPotencia}          Nº de Série: ${motorAtualSerie}`,
              ``,
              `2. DISCRIMINAÇÃO DO NOVO MOTOR INSTALADO:`,
              `Marca: ${novoMotorMarca}          Potência: ${novoMotorPotencia}          Nº de Série: ${novoMotorSerie}`,
              `Nota Fiscal de Aquisição Nº / Chave: ${novoMotorNf}`,
              ``,
              `3. DECLARAÇÃO DE COMPATIBILIDADE E RESPONSABILIDADE TÉCNICA:`,
              `Declaro, sob as penas da Lei e em conformidade com as diretrizes do item 2.12 da NORMAM-211/DPC, que o novo motor de propulsão acima discriminado foi instalado segundo as boas normas de engenharia naval e as recomendações do fabricante do motor e da embarcação.`,
              `Atesto ainda que a potência do novo propulsor (${novoMotorPotencia}) é rigorosamente compatível com a potência máxima admissível homologada na placa de identificação do construtor da embarcação, mantendo intocadas a integridade estrutural do espelho de popa e a estabilidade da embarcação na sua área de navegação autorizada.`,
              ``,
              `Local e Data: ${customerCity}/${customerUf}, ${new Date().toLocaleDateString("pt-BR")}`,
              ``,
              `___________________________________________________________________________`,
              `Assinatura do Proprietário / Responsável Técnico`,
              `(${customerName} - CPF/CNPJ: ${customerDoc})`,
              ``,
              `- TERMO MOTOR - NORMAM-211/DPC -`,
            ]
              .filter(Boolean)
              .join("\n");
          } else if (
            tpl.slug === "req-moto-aquatica" ||
            tpl.code === "REQ-JET" ||
            tpl.code === "REQ_MOTO_AQUATICA" ||
            tpl.id === "doc_req_moto_aquatica" ||
            tpl.slug === "doc_req_moto_aquatica"
          ) {
            // NORMAM-212/DPC Anexo 2-A - REQUERIMENTO PARA INSCRIÇÃO OU REGULARIZAÇÃO DE MOTO AQUÁTICA
            const customerCity = customer?.city || "Santos";
            const customerUf = customer?.state || "SP";
            const customerDoc = customer?.cpf_cnpj || customer?.document || "";
            const fullAddress = customer?.address || "Não informado";
            const draft = (processData?.draft_data as any) || {};

            let resolvedCep = (customer as any)?.postal_code || (customer as any)?.cep || "";
            if (!resolvedCep && customer?.address) {
              const cepMatch = customer.address.match(/\b\d{5}-?\d{3}\b/);
              if (cepMatch) resolvedCep = cepMatch[0];
            }
            const resolvedRg = customer?.rg || (customer as any)?.identity_number || (customer as any)?.rg_number || "";

            // Detecção de serviço assinalado no formulário oficial da moto aquática
            const servicesRaw = draft?.services || [];
            const procType = (processData?.process_type || "").toLowerCase();
            const isTransf = procType.includes("transfer") || servicesRaw.includes("transferencia_propriedade");
            const isRenov = procType.includes("renov") || servicesRaw.includes("renovacao_tie");
            const isSegVia = procType.includes("segunda") || procType.includes("2") || servicesRaw.includes("segunda_via_tie");
            const isMotor = procType.includes("motor") || servicesRaw.includes("troca_motor");
            const isInscr = !isTransf && !isRenov && !isSegVia && !isMotor;

            const resolvedInscricao = isInscr
              ? "A designar (Inscrição Inicial)"
              : (vessel?.registration_number || draft?.registration_number || (vessel as any)?.tie_number || "Em regularização");

            const jetManufacturer = draft?.vessel_make || (vessel as any)?.builder || (vessel as any)?.fabricante || "Sea-Doo (BRP)";
            const jetModel = draft?.vessel_model || (vessel as any)?.model || "RXT-X 300";
            const jetYear = draft?.vessel_year || (vessel as any)?.year || (vessel as any)?.construction_year || "2024";
            const jetHin = (vessel as any)?.hull_number || (vessel as any)?.chassis_number || draft?.vessel_hull || "YDV12345L324";
            const jetColor = (vessel as any)?.hull_color || draft?.vessel_color || "Azul e Preto";
            const effectiveLength = draft?.vessel_length || vessel?.length || vessel?.length_overall || "3.45";
            const formattedLength = effectiveLength ? `${effectiveLength}${String(effectiveLength).includes("m") ? "" : " m"}` : "3.45 m";
            const jetCapacity = draft?.vessel_passengers || (vessel as any)?.passenger_capacity || "3 pessoas (1 piloto + 2 pass.)";
            const jetEngine = draft?.novoMotorMarca || (vessel as any)?.engine_brand || "Rotax 1630 ACE Supercharged";
            const jetPower = draft?.novoMotorPotencia || (vessel as any)?.engine_power || (vessel as any)?.potencia_motor || "300 HP";
            const jetSerial = draft?.novoMotorSerie || (vessel as any)?.engine_serial || "ROTAX-9821415";

            content = [
              `NORMAM-212/DPC`,
              `ANEXO 2-A`,
              `REQUERIMENTO PARA INSCRIÇÃO OU REGULARIZAÇÃO DE MOTO AQUÁTICA`,
              ``,
              `SR. CAPITÃO DOS PORTOS (DELEGADO) OU (AGENTE)`,
              ``,
              `REQUERENTE: ${customerName}`,
              `ENDEREÇO: ${fullAddress}`,
              `CIDADE: ${customerCity}    UF: ${customerUf}${resolvedCep ? `    CEP: ${resolvedCep}` : ""}`,
              `IDENT. Nº: ${resolvedRg || customerDoc}${resolvedRg ? `    ORG EXP: ${(customer as any)?.rg_issuer || "SSP"}` : ""}    CPF/CNPJ: ${customerDoc}`,
              `TEL: ${customer?.phone || ""}    E-mail: ${customer?.email || ""}`.trim(),
              `OBS: Processo instruído via NavalDocs Pro sob o código ${processCode}`,
              ``,
              `DADOS DA MOTO AQUÁTICA (MOTONÁUTICA):`,
              `Nome da Embarcação: ${vesselName}          Inscrição: ${resolvedInscricao}`,
              `Fabricante: ${jetManufacturer}    Modelo: ${jetModel}    Ano: ${jetYear}    Cor: ${jetColor}`,
              `Nº do Casco (HIN): ${jetHin}          Comprimento: ${formattedLength}          Lotação: ${jetCapacity}`,
              `Propulsão: Hidrojato (Fluxo Axial)          Motor: ${jetEngine}`,
              `Potência: ${jetPower}          Nº de Série do Motor: ${jetSerial}`,
              `Área de Navegação: [X] Interior (Lagos, rios e canais abrigados)   [ ] Mar Aberto (Áreas autorizadas)`,
              ``,
              `SERVIÇO REQUERIDO:`,
              `[${isInscr ? "X" : " "}] Inscrição Inicial de Moto Aquática`,
              `[${isTransf ? "X" : " "}] Transferência de Propriedade de Moto Aquática`,
              `[ ] Transferência de Jurisdição`,
              `[${isSegVia ? "X" : " "}] 2ª Via de Documento Náutico (TIEM)`,
              `[${isRenov ? "X" : " "}] Renovação de Validade do TIEM`,
              `[${isMotor ? "X" : " "}] Alteração de Características Técnicas / Motor`,
              `[ ] Mudança de Nome da Moto Aquática`,
              `[ ] Cancelamento de Inscrição`,
              ``,
              `Local e Data: ${customerCity}/${customerUf}, ${new Date().toLocaleDateString("pt-BR")}`,
              ``,
              `___________________________________________________________________________`,
              `Assinatura do Requerente / Proprietário (${customerName} - CPF/CNPJ: ${customerDoc})`,
              ``,
              `--- PAGE BREAK ---`,
              ``,
              `NORMAM-212/DPC - DIRETRIZES DE SEGURANÇA NA MOTONÁUTICA`,
              `TERMO DE RESPONSABILIDADE OPERACIONAL E SALVATAGEM`,
              ``,
              `Moto Aquática: ${vesselName}          Nº do Casco (HIN): ${jetHin}`,
              `Proprietário: ${customerName}          CPF/CNPJ: ${customerDoc}`,
              ``,
              `1. COMPROMISSO DE SALVATAGEM E EQUIPAMENTOS OBRIGATÓRIOS:`,
              `Declaro que a moto aquática acima identificada está provida dos equipamentos regulamentares exigidos pela NORMAM-212/DPC para trafegar em segurança, mantidos em perfeito estado operacional:`,
              `• Coletes salva-vidas homologados pela Marinha do Brasil (Classe V) para todos os ocupantes a bordo;`,
              `• Chave de segurança corta-circuito (tether switch / cordão de parada de emergência) conectada ao punho ou ao colete do condutor;`,
              `• Apito marítimo de emergência amarrado por cordel ao colete do piloto;`,
              `• Extintor de incêndio náutico classe B-1 (com carga e lacre válidos) devidamente afixado em suporte apropriado.`,
              ``,
              `2. DIRETRIZES DE NAVEGAÇÃO E RESTRIÇÃO DE VELOCIDADE:`,
              `Declaro pleno conhecimento das normas de tráfego aquaviário, comprometendo-me a:`,
              `• Respeitar rigorosamente a distância mínima de segurança de 200 metros da linha base das praias e zonas de banhistas;`,
              `• Trafegar em velocidade moderada nas proximidades de fundeadouros, marinas, pontões de embarque e canais de acesso;`,
              `• Conduzir a embarcação exclusivamente durante o período diurno (entre o nascer e o pôr do sol), sendo terminantemente vedada a navegação noturna para motos aquáticas;`,
              `• Permitir a condução apenas a pessoas devidamente habilitadas na categoria de Motonauta (MTA) ou amador com chancela MTA válida.`,
              ``,
              `Local e Data: ${customerCity}/${customerUf}, ${new Date().toLocaleDateString("pt-BR")}`,
              ``,
              `___________________________________________________________________________`,
              `Assinatura do Proprietário / Responsável Operacional`,
              `(${customerName} - CPF/CNPJ: ${customerDoc})`,
              ``,
              `- NORMAM-212/DPC - MOTONÁUTICA - ANEXO 2-A -`,
            ]
              .filter(Boolean)
              .join("\n");
          } else if (
            tpl.slug === "req-comercial-prof" ||
            tpl.code === "REQ-PROF" ||
            tpl.id === "doc_req_comercial" ||
            tpl.slug === "doc_req_comercial"
          ) {
            // NORMAM-201/DPC Anexo 2-E - REQUERIMENTO DE SERVIÇOS PARA REGULARIZAÇÃO DE EMBARCAÇÃO COMERCIAL
            const customerCity = customer?.city || "Santos";
            const customerUf = customer?.state || "SP";
            const customerDoc = customer?.cpf_cnpj || customer?.document || "";
            const fullAddress = customer?.address || "Não informado";
            const draft = (processData?.draft_data as any) || {};

            let resolvedCep = (customer as any)?.postal_code || (customer as any)?.cep || "";
            if (!resolvedCep && customer?.address) {
              const cepMatch = customer.address.match(/\b\d{5}-?\d{3}\b/);
              if (cepMatch) resolvedCep = cepMatch[0];
            }

            // Detecção de serviço assinalado no formulário comercial
            const servicesRaw = draft?.services || [];
            const procType = (processData?.process_type || "").toLowerCase();
            const isTransf = procType.includes("transfer") || servicesRaw.includes("transferencia_propriedade");
            const isRenov = procType.includes("renov") || servicesRaw.includes("renovacao_tie");
            const isMotor = procType.includes("motor") || servicesRaw.includes("troca_motor");
            const isInscr = !isTransf && !isRenov && !isMotor;

            const resolvedInscricao = isInscr
              ? "A designar (Inscrição Inicial Comercial)"
              : (vessel?.registration_number || draft?.registration_number || (vessel as any)?.tie_number || "Em regularização comercial");

            const vesselHull = (vessel as any)?.hull_number || (vessel as any)?.chassis_number || draft?.vessel_hull || "Não informado";
            const effectiveLength = draft?.vessel_length || vessel?.length || vessel?.length_overall || "14.50";
            const formattedLength = effectiveLength ? `${effectiveLength}${String(effectiveLength).includes("m") ? "" : " m"}` : "14.50 m";
            const vesselBoca = (vessel as any)?.beam || draft?.vessel_beam || "4.20 m";
            const vesselPontal = (vessel as any)?.molded_depth || draft?.vessel_pontal || "1.80 m";
            const vesselAb = (vessel as any)?.gross_tonnage || draft?.gross_tonnage || "18.50";
            const vesselAl = (vessel as any)?.net_tonnage || draft?.net_tonnage || "12.20";
            const vesselCapacity = draft?.vessel_passengers || (vessel as any)?.passenger_capacity || "40 pessoas (2 tripulantes CTS + 38 passageiros)";
            const vesselEngine = draft?.novoMotorMarca || (vessel as any)?.engine_brand || "Scania DI13 Marítimo Diesel 4T";
            const vesselPower = draft?.novoMotorPotencia || (vessel as any)?.engine_power || (vessel as any)?.potencia_motor || "450 HP";
            const vesselSerial = draft?.novoMotorSerie || (vessel as any)?.engine_serial || "SC-8912401";
            const armadorRegistro = draft?.registro_armador || (customer as any)?.armador_registry || "381-ARM/SP";
            const repLegal = draft?.representante_legal || customerName;

            content = [
              `NORMAM-201/DPC`,
              `ANEXO 2-E`,
              `REQUERIMENTO DE SERVIÇOS PARA REGULARIZAÇÃO DE EMBARCAÇÃO COMERCIAL`,
              ``,
              `SR. CAPITÃO DOS PORTOS (DELEGADO OU AGENTE)`,
              ``,
              `ARMADOR / REQUERENTE: ${customerName}`,
              `CNPJ/CPF: ${customerDoc}    REGISTRO DE ARMADOR: ${armadorRegistro}`,
              `REPRESENTANTE LEGAL: ${repLegal}`,
              `ENDEREÇO DA SEDE: ${fullAddress}`,
              `CIDADE: ${customerCity}    UF: ${customerUf}${resolvedCep ? `    CEP: ${resolvedCep}` : ""}`,
              `TEL: ${customer?.phone || ""}    E-mail: ${customer?.email || ""}`.trim(),
              `OBS: Processo comercial instruído via NavalDocs Pro sob o código ${processCode}`,
              `DADOS DA EMBARCAÇÃO PROFISSIONAL / COMERCIAL:`,
              `Nome da Embarcação: ${vesselName}          Inscrição: ${resolvedInscricao}`,
              `Atividade Comercial: ${vesselCategory === "profissional" ? "Transporte de Passageiros / Carga / Pesca" : "Atividade Comercial Marítima"}          Nº do Casco: ${vesselHull}`,
              `Comprimento: ${formattedLength}    Boca: ${vesselBoca}    Pontal: ${vesselPontal}    AB: ${vesselAb}    AL: ${vesselAl}`,
              `Lotação Autorizada: ${vesselCapacity}`,
              `Motorização Principal: ${vesselEngine} (${vesselPower})    Série: ${vesselSerial}`,
              `Área de Navegação: [X] Interior (Águas abrigadas e canais)   [ ] Mar Aberto (Costeira)`,
              `SERVIÇO REQUERIDO PERANTE A AUTORIDADE MARÍTIMA:`,
              `[${isInscr ? "X" : " "}] Inscrição de Embarcação Comercial / Profissional`,
              `[${isTransf ? "X" : " "}] Transferência de Propriedade e Registro de Armador`,
              `[${isRenov ? "X" : " "}] Renovação do Título de Inscrição da Embarcação (TIE)`,
              `[ ] Emissão / Renovação do Cartão de Tripulação de Segurança (CTS)`,
              `[${isMotor ? "X" : " "}] Alteração de Características Técnicas / Motorização`,
              `[ ] Mudança de Atividade Comercial / Linha de Tráfego`,
              `[ ] Vistoria Inicial de Segurança Comercial e Arqueação`,
              `[ ] Cancelamento de Inscrição Comercial`,
              ``,
              `Local e Data: ${customerCity}/${customerUf}, ${new Date().toLocaleDateString("pt-BR")}`,
              ``,
              `___________________________________________________________________________`,
              `Assinatura do Armador / Representante Legal`,
              `CNPJ/CPF: ${customerDoc}`,
              ``,
              `--- PAGE BREAK ---`,
              ``,
              `NORMAM-201/DPC - NAVEGAÇÃO PROFISSIONAL / COMERCIAL`,
              `TERMO DE RESPONSABILIDADE DO ARMADOR E TRIPULAÇÃO DE SEGURANÇA`,
              ``,
              `Embarcação Comercial: ${vesselName}          Inscrição Nº: ${resolvedInscricao}`,
              `Armador / Empresa: ${customerName}          CNPJ/CPF: ${customerDoc}`,
              ``,
              `1. CARTÃO DE TRIPULAÇÃO DE SEGURANÇA (CTS) E AQUAVIÁRIOS:`,
              `O armador assume o compromisso formal de manter a embarcação guarnecida com a tripulação de segurança homologada no CTS emitido pela Capitania dos Portos, composta exclusivamente por aquaviários profissionais devidamente habilitados, portadores de Caderneta de Inscrição e Registro (CIR) com certificações e exames médicos periódicos válidos nos termos da NORMAM-101/DPC.`,
              ``,
              `2. SALVATAGEM E COMBATE A INCÊNDIO PROFISSIONAL:`,
              `Declaro que a embarcação encontra-se provida de salvatagem profissional compatível com sua lotação autorizada: coletes homologados pela Marinha do Brasil (Classe II/III) com apito e facho para 100% dos passageiros e tripulantes, coletes infantis regulamentares, boias circulares com retinida flutuante e facho luminoso, e extintores de incêndio com carga válida e laudo de teste hidrostático regular.`,
              ``,
              `3. SEGURO E AUTORIZAÇÕES COMPLEMENTARES:`,
              `Declaro plena ciência da obrigatoriedade de contratação e manutenção de seguro de responsabilidade civil para cobertura de passageiros e tripulação, bem como de manter vigentes as autorizações regulatórias perante órgãos federais, estaduais ou municipais competentes (ANTAQ, Capitania dos Portos e Prefeitura) para a exploração da atividade comercial autorizada.`,
              ``,
              `Local e Data: ${customerCity}/${customerUf}, ${new Date().toLocaleDateString("pt-BR")}`,
              ``,
              `___________________________________________________________________________`,
              `Assinatura do Armador / Representante Legal`,
              `(${customerName} - CNPJ/CPF: ${customerDoc})`,
              ``,
              `- NORMAM-201/DPC - EMBARCAÇÃO PROFISSIONAL - ANEXO 2-E -`,
            ]
              .filter(Boolean)
              .join("\n");
          } else if (
            tpl.slug === "req-vistoria-naval" ||
            tpl.code === "REQ-VIST" ||
            tpl.id === "doc_req_vistoria" ||
            tpl.slug === "doc_req_vistoria"
          ) {
            // NORMAM-211/DPC Capítulo 3 (Seção VIII / Item 3.32) e Anexo 2-C - REQUERIMENTO DE VISTORIA / PERÍCIA NAVAL
            const customerCity = customer?.city || "Santos";
            const customerUf = customer?.state || "SP";
            const customerDoc = customer?.cpf_cnpj || customer?.document || "";
            const fullAddress = customer?.address || "Não informado";
            const draft = (processData?.draft_data as any) || {};

            let resolvedCep = (customer as any)?.postal_code || (customer as any)?.cep || "";
            if (!resolvedCep && customer?.address) {
              const cepMatch = customer.address.match(/\b\d{5}-?\d{3}\b/);
              if (cepMatch) resolvedCep = cepMatch[0];
            }
            const resolvedRg = customer?.rg || (customer as any)?.identity_number || (customer as any)?.rg_number || "";
            const resolvedInscricao = vessel?.registration_number || draft?.registration_number || (vessel as any)?.tie_number || "Conforme cadastro SISGEMB";
            const resolvedHull = (vessel as any)?.hull_number || (vessel as any)?.chassis_number || draft?.vessel_hull || "Não informado";
            const effectiveLength = draft?.vessel_length || vessel?.length || vessel?.length_overall || "";
            const formattedLength = effectiveLength ? `${effectiveLength}${String(effectiveLength).includes("m") ? "" : " m"}` : "Não informado";

            // Local da vistoria / marina / estaleiro
            const localVistoria = draft?.local_vistoria || draft?.localVistoria || (vessel as any)?.marina_name || "Marina Pontal Náutico - Píer Principal (Vaga 28)";
            const enderecoVistoria = draft?.endereco_vistoria || draft?.enderecoVistoria || `Av. dos Pescadores, nº 250, Pontal da Barra, ${customerCity}/${customerUf}`;
            const responsavelLocal = draft?.responsavel_local || draft?.responsavelLocal || customerName;
            const telefoneResponsavel = draft?.telefone_responsavel || customer?.phone || "(13) 98765-4321";

            // Área de Navegação
            const rawNavArea = (
              (vessel as any)?.navigation_area ||
              draft?.navigation_area ||
              draft?.area_navegacao ||
              ""
            ).toLowerCase();
            const isCosteira = rawNavArea.includes("costeira") || rawNavArea.includes("mar aberto - costeira");
            const isOceanica = rawNavArea.includes("oceânica") || rawNavArea.includes("oceanica") || rawNavArea.includes("mar aberto - oceânica");
            const isInterior = rawNavArea.includes("interior") || (!isCosteira && !isOceanica);

            content = [
              `NORMAM-211/DPC`,
              `ANEXO 2-C`,
              `REQUERIMENTO DE SERVIÇOS PARA REGULARIZAÇÃO DE EMBARCAÇÕES`,
              ``,
              `SR. CAPITÃO DOS PORTOS (DELEGADO) OU (AGENTE)`,
              ``,
              `REQUERENTE: ${customerName}`,
              `ENDEREÇO: ${fullAddress}`,
              `CIDADE: ${customerCity}    UF: ${customerUf}${resolvedCep ? `    CEP: ${resolvedCep}` : ""}`,
              `IDENT. Nº: ${resolvedRg || customerDoc}${resolvedRg ? `    ORG EXP: ${(customer as any)?.rg_issuer || "SSP"}` : ""}    CPF/CNPJ: ${customerDoc}`,
              `TEL: ${customer?.phone || ""}    E-mail: ${customer?.email || ""}`.trim(),
              `OBS: Processo instruído via NavalDocs Pro sob o código ${processCode}`,
              ``,
              `EMBARCAÇÃO: ${vesselName}    INSCRIÇÃO Nº: ${resolvedInscricao}`,
              `Comprimento: ${formattedLength}    Nº DO CASCO: ${resolvedHull}    CLASSIFICAÇÃO: ${vesselCategory === "profissional" ? "Comercial" : vesselCategory === "moto_aquatica" ? "Moto Aquática" : "Esporte e/ou Recreio"}`,
              `Área de Navegação: [${isInterior ? "X" : " "}] Interior   [${isCosteira ? "X" : " "}] Costeira   [${isOceanica ? "X" : " "}] Oceânica`,
              ``,
              `VEM REQUERER A V.Sa. os seguintes serviços:`,
              `[ ] Inscrição`,
              `[ ] Cancelamento de Inscrição da Embarcação`,
              `[ ] Licença de Construção`,
              `[ ] Licença de Alteração`,
              `[ ] Licença de Reclassificação`,
              `[ ] Transferência de Propriedade`,
              `[ ] Transferência de Jurisdição`,
              `[ ] Transferência de Propriedade e Jurisdição`,
              `[ ] Mudança de Nome da Embarcação`,
              `[ ] Renovação de TIE`,
              `[ ] Alteração de dados cadastrais da embarcação`,
              `[ ] Alteração dados cadastrais do Proprietário`,
              `[ ] Troca do Motor Propulsor`,
              `[ ] Certidão Relativa a Situação da Embarcação`,
              `[ ] Registro de Ônus e Averbações relativos a embarcação`,
              `[ ] Cancelamento do Registro de Ônus e Averbações relativo a embarcação`,
              `[X] Vistoria de Arqueação`,
              `[ ] Vistoria de Rearqueação`,
              `[ ] Vistoria para alterar a classificação da embarcação`,
              `[X] Outros serviços: Vistoria Inicial / Perícia Naval Regulatória`,
              ``,
              `Local e Data: ${customerCity}/${customerUf}, ${new Date().toLocaleDateString("pt-BR")}`,
              ``,
              `___________________________________________________________________________`,
              `Assinatura do Requerente / Responsável Técnico`,
              `CPF/CNPJ: ${customerDoc}`,
              ``,
              `--- PAGE BREAK ---`,
              ``,
              `NORMAM-211/DPC - CAPÍTULO 3 (SEÇÃO VIII / ITEM 3.32)`,
              `SOLICITAÇÃO DE VISTORIA NAVAL E AGENDAMENTO DE INSPEÇÃO`,
              ``,
              `Embarcação: ${vesselName}          Inscrição Nº: ${resolvedInscricao}`,
              `Proprietário/Armador: ${customerName}          CPF/CNPJ: ${customerDoc}`,
              ``,
              `1. MODALIDADE E FINALIDADE DA VISTORIA SOLICITADA:`,
              `Vistoria Técnica / Perícia Naval para atesto das condições de habitabilidade, integridade estrutural, arqueação e salvatagem, em conformidade com os itens 3.31 a 3.34 da NORMAM-211/DPC e Anexo 3-B.`,
              ``,
              `2. LOCAL E HORÁRIO PARA REALIZAÇÃO DA PERÍCIA (ITEM 3.32.3):`,
              `Local da Embarcação: ${localVistoria}`,
              `Endereço do Local: ${enderecoVistoria}`,
              `Condições de Acesso: Embarcação atracada em águas abrigadas, com acesso seguro e desimpedido aos peritos.`,
              `Responsável no Local: ${responsavelLocal} (Tel: ${telefoneResponsavel})`,
              `Horário Sugerido: Dias úteis, em horário comercial (09:00 às 17:00h - Item 3.32.4).`,
              ``,
              `3. SETORES PREPARADOS PARA OS VISTORIADORES (ITEM 3.33.1):`,
              `• Documentos, certificados, tabelas e publicações obrigatórias de bordo;`,
              `• Casco, convés, espelho de popa e integridade estrutural flutuando;`,
              `• Praça de máquinas, propulsor instalado e sistema de governo/leme;`,
              `• Instalações elétricas, bombas de porão e esgotamento sanitário/águas;`,
              `• Salvatagem regulamentar (coletes homologados, boias, extintores de incêndio com carga válida).`,
              ``,
              `4. TERMO DE COMPROMISSO, ASSISTÊNCIA E INDENIZAÇÃO (ITENS 3.32.2 E 3.32.5):`,
              `O requerente compromete-se a prestar assistência aos peritos da Marinha, ciente de que as despesas e indenizações de perícia são custeadas com esteio no Art. 38 da LESTA (Lei nº 9.537/1997) c/c Tabela de Indenizações da NORMAM-211/DPC.`,
              ``,
              `Local e Data: ${customerCity}/${customerUf}, ${new Date().toLocaleDateString("pt-BR")}`,
              ``,
              `___________________________________________________________________________`,
              `Assinatura do Requerente / Responsável Técnico (${customerName} - CPF/CNPJ: ${customerDoc})`,
              `- NORMAM-211/DPC - VISTORIA NAVAL - CAP. 3 -`,
            ]
              .filter(Boolean)
              .join("\n");
          } else if (
            tpl.slug === "req-habilitacao-cha" ||
            tpl.code === "REQ-CHA" ||
            tpl.code === "REQ_CHA" ||
            tpl.id === "doc_req_cha" ||
            tpl.slug === "doc_req_cha" ||
            tpl.code === "ANEXO-5-H" ||
            tpl.code === "ANEXO_5_H"
          ) {
            // NORMAM-211/DPC Capítulo 5 c/c Anexo 5-H - REQUERIMENTO DE AMADOR (2 páginas estritas)
            const customerCity = customer?.city || "Santos";
            const customerUf = customer?.state || "SP";
            const customerDoc = customer?.cpf_cnpj || customer?.document || "";
            const fullAddress = customer?.address || "Não informado";
            const draft = (processData?.draft_data as any) || {};

            let resolvedCep = (customer as any)?.postal_code || (customer as any)?.cep || "";
            if (!resolvedCep && customer?.address) {
              const cepMatch = customer.address.match(/\b\d{5}-?\d{3}\b/);
              if (cepMatch) resolvedCep = cepMatch[0];
            }
            const resolvedRg = customer?.rg || (customer as any)?.identity_number || (customer as any)?.rg_number || "";
            const rgIssuer = (customer as any)?.rg_issuer || "SSP";

            const amadorPhone = customer?.phone || "(13) 98765-4321";
            const amadorEmail = customer?.email || "amador@email.com";
            const categoriaRequerida = draft?.amador_categoria || "Arrais-Amador e Motonauta (ARA / MTA)";
            const isMta = categoriaRequerida.toLowerCase().includes("mta") || categoriaRequerida.toLowerCase().includes("motonauta");

            content = [
              `NORMAM-211/DPC - ANEXO 5-H`,
              `Ao: Sr. Capitão dos Portos, Delegado ou Agente`,
              `REQUERIMENTO DE AMADOR`,
              `Eu, ${customerName}, CPF: ${customerDoc}, RG: ${resolvedRg || customerDoc}${resolvedRg ? ` (${rgIssuer})` : ""}, residente na ${fullAddress}, ${customerCity}/${customerUf}${resolvedCep ? `, CEP: ${resolvedCep}` : ""}, Tel: ${amadorPhone}, e-mail: ${amadorEmail}. (Processo NavalDocs Pro: ${processCode})`,
              `Vem requerer a V. Sa. a realização do seguinte serviço:`,
              `[ ] 1 - Concessão de CHA por correspondência / equivalência profissional`,
              `[X] 2 - Emissão / Renovação de Carteira de Habilitação de Amador (CHA)`,
              `[${isMta ? "X" : " "}] 3 - Renovação de CHA com agregação da categoria de MTA (Motonauta)`,
              `[ ] 4 - Emissão de Certificado de Cadastramento de Marinas e Clubes Náuticos`,
              `[ ] 5 - Renovação de Certificado de Cadastramento de Marinas e Entidades`,
              `[ ] 6 - Cancelamento de Cadastramento de Marinas e Entidades Desportivas`,
              `[ ] 7 - Credenciamento de Estabelecimento de Treinamento Náutico / PF (ARA)`,
              `[ ] 8 - Credenciamento de Órgão do Escoteiro do Mar`,
              `[ ] 9 - Credenciamento de Estabelecimento Náutico para Curso de Veleiro`,
              `[ ] 10 - Renovação do Credenciamento de ETN / Pessoa Física / Escoteiro do Mar`,
              `[ ] 11 - Descredenciamento voluntário de ETN-A/PF, ETN-VLA e Escoteiro do Mar`,
              `[ ] 12 - Pedido de Revisão de Prova de Capitão-Amador`,
              `Local e Data: ${customerCity}/${customerUf}, ${new Date().toLocaleDateString("pt-BR")}`,
              `___________________________________________________________________________`,
              `Assinatura do Requerente (${customerName} - CPF: ${customerDoc})`,
              `- 5-H-1 -`,
              `--- PAGE BREAK ---`,
              `NORMAM-211/DPC - CAPÍTULO 5 (HABILITAÇÃO DE AMADORES)`,
              `ANEXO 5-H - DISCRIMINAÇÃO COMPLEMENTAR DO PEDIDO`,
              `Candidato / Amador Requerente: ${customerName}          CPF: ${customerDoc}`,
              `Descrição do Pedido: Solicito a V. Sa. a emissão/renovação da Carteira de Habilitação de Amador (CHA), tendo cumprido integralmente os requisitos do Capítulo 5 da NORMAM-211/DPC.`,
              `1. CATEGORIA DE AMADOR REQUERIDA / VINCULADA:`,
              `• [ ] Veleiro (VLA) - Condução de embarcações a vela sem propulsão a motor nos limites da navegação interior;`,
              `• [${isMta ? "X" : " "}] Motonauta (MTA) - Condução de moto aquática nos limites da navegação interior;`,
              `• [X] Arrais-Amador (ARA) - Condução de embarcações de esporte e recreio na navegação interior;`,
              `• [ ] Mestre-Amador (MSA) - Condução entre portos nacionais na navegação costeira (até 20 milhas da costa);`,
              `• [ ] Capitão-Amador (CPA) - Condução de embarcações sem limite de afastamento da costa (mar aberto).`,
              `2. MODALIDADE DO SERVIÇO:`,
              `• [X] Inscrição em exame e emissão inicial de CHA com agregação regulamentar;`,
              `• [ ] Renovação decenal de validade da Carteira de Habilitação de Amador;`,
              `• [ ] Segunda via por motivo de extravio, perda, furto ou dano irreparável;`,
              `• [ ] Concessão por correspondência/equivalência militar ou da Marinha Mercante.`,
              `3. DOCUMENTAÇÃO INSTRUTÓRIA ANEXADA:`,
              `• Documento oficial de identificação com foto e CPF dentro da validade;`,
              `• Comprovante de residência em nome do interessado ou Declaração (Anexo 2-G / Lei 7.115/83);`,
              `• Atestado Médico de aptidão física e mental ou cópia da CNH dentro da validade (Item 5.4.1);`,
              `• Atestado de treinamento prático náutico emitido por ETN credenciada;`,
              `• Guia de Recolhimento da União (GRU) com o respectivo comprovante de quitação bancária.`,
              `Observações: (1) É facultado requerer mais de uma opção no mesmo pedido; (2) Apensada documentação da NORMAM-211/DPC.`,
              `Local e Data: ${customerCity}/${customerUf}, ${new Date().toLocaleDateString("pt-BR")}`,
              `___________________________________________________________________________`,
              `Assinatura do Requerente (${customerName} - CPF: ${customerDoc})`,
              `- 5-H-2 -`,
            ]
              .filter(Boolean)
              .join("\n");
          } else if (
            tpl.slug === "decl-perda-cha" ||
            tpl.code === "DEC-CHA" ||
            tpl.code === "ANEXO-5-D" ||
            tpl.code === "ANEXO_5_D" ||
            tpl.code === "PERDA_CHA" ||
            tpl.id === "doc_decl_perda_cha" ||
            tpl.slug === "doc_decl_perda_cha"
          ) {
            // NORMAM-211/DPC Anexo 5-D - DECLARAÇÃO DE EXTRAVIO, FURTO, ROUBO OU DANO DA CHA (1 página estrita)
            const customerCity = customer?.city || "Santos";
            const customerUf = customer?.state || "SP";
            const customerDoc = customer?.cpf_cnpj || customer?.document || "";
            const fullAddress = customer?.address || "Não informado";
            const draft = (processData?.draft_data as any) || {};

            let resolvedCep = (customer as any)?.postal_code || (customer as any)?.cep || "";
            if (!resolvedCep && customer?.address) {
              const cepMatch = customer.address.match(/\b\d{5}-?\d{3}\b/);
              if (cepMatch) resolvedCep = cepMatch[0];
            }
            const resolvedRg = customer?.rg || (customer as any)?.identity_number || (customer as any)?.rg_number || customerDoc;
            const rgIssuer = (customer as any)?.rg_issuer || "SSP";
            const amadorPhone = customer?.phone || "(13) 98765-4321";
            const chaNumber = draft?.cha_number || draft?.cha_registro || "381P2021001234";
            const chaIssueDate = draft?.cha_issue_date || "15/03/2021";
            const amadorCategory = draft?.amador_categoria || "Arrais-Amador (ARA)";

            content = [
              `NORMAM-211/DPC - ANEXO 5-D`,
              `DECLARAÇÃO DE EXTRAVIO, FURTO, ROUBO OU DANO DA CHA`,
              `Ao: Sr. Capitão dos Portos, Delegado ou Agente`,
              ``,
              `Eu, ${customerName}, portador da Carteira de Identidade nº ${resolvedRg} (${rgIssuer}), CPF nº ${customerDoc}, residente na ${fullAddress}, ${customerCity}/${customerUf}${resolvedCep ? `, CEP: ${resolvedCep}` : ""}, telefone: ${amadorPhone}, declaro que a minha Carteira de Habilitação de Amador (CHA) de nº ${chaNumber}, emitida em ${chaIssueDate}, na categoria de ${amadorCategory}, foi:`,
              `[X] Extraviada.`,
              `[ ] Roubada.`,
              `[ ] Furtada.`,
              `[ ] Danificada.`,
              ``,
              `Declaro ainda, estar ciente de que a falsidade da presente declaração pode implicar na sanção penal prevista no Art. 299 do Código Penal, conforme transcrição abaixo:`,
              ``,
              `"Art. 299 - Omitir, em documento público ou particular, declaração que nele deveria constar, ou nele inserir ou fazer inserir declaração falsa ou diversa da que deveria ser escrita, com o fim de prejudicar direito, criar obrigação ou alterar a verdade sobre o fato juridicamente relevante:`,
              `Pena: reclusão de 1 (um) a 5 (cinco) anos e multa, se o documento é público e reclusão de 1 (um) a 3 (três) anos, se o documento é particular."`,
              ``,
              `Local e Data: ${customerCity}/${customerUf}, ${new Date().toLocaleDateString("pt-BR")}`,
              ``,
              `___________________________________________________________________________`,
              `Assinatura do Declarante (${customerName} - CPF: ${customerDoc})`,
              `Anexar: cópia do comprovante de residência e documento de identidade.`,
              `- 5-D-1 -`,
            ]
              .filter(Boolean)
              .join("\n");
          } else if (
            tpl.slug === "atestado-treinamento-ara" ||
            tpl.code === "ATE-ARA" ||
            tpl.code === "ANEXO-5-E" ||
            tpl.code === "ANEXO_5_E" ||
            tpl.code === "TREINAMENTO_ARA" ||
            tpl.id === "doc_atestado_ara" ||
            tpl.slug === "doc_atestado_ara"
          ) {
            // NORMAM-211/DPC Anexo 5-E - ATESTADO DE TREINAMENTO PARA ARRAIS-AMADOR (1 página estrita)
            const customerCity = customer?.city || "Santos";
            const customerUf = customer?.state || "SP";
            const customerDoc = customer?.cpf_cnpj || customer?.document || "";
            const draft = (processData?.draft_data as any) || {};

            const nomeEtn = draft?.etn_nome || (branding as any)?.company_name || "Escola Náutica Pontal do Mar Ltda";
            const registroEtn = draft?.etn_registro || "CP-381/ETN-042";
            const instrutorNome = draft?.instrutor_nome || draft?.responsavel_nome || "Cap. Marcelo Fontes Guimarães";
            const instrutorDoc = draft?.instrutor_cpf || "345.678.901-23";
            const instrutorCha = draft?.instrutor_cha || "381M2018005432 (Mestre-Amador / Capitão-Amador)";
            const horasTreinamento = draft?.treinamento_horas || "6 (seis)";

            content = [
              `NORMAM-211/DPC - ANEXO 5-E`,
              `ATESTADO DE TREINAMENTO PARA ARRAIS-AMADOR`,
              `Campo de Preenchimento do Estabelecimento de Treinamento Náutico`,
              ``,
              `PLANO DE TREINAMENTO TEÓRICO E PRÁTICO – ARRAIS-AMADOR`,
              `REALIZAÇÃO OBRIGATÓRIA NO AMBIENTE NÁUTICO (MARINA, BERÇO OU ATRACADO)`,
              `• Apresentação da embarcação, equipamentos de salvatagem obrigatórios e noções de marinharia;`,
              `• Apresentação das regras de governo, manobra e tráfego aquaviário (RIPEAM);`,
              `• Luzes e marcas visuais de navegação, sinais sonoros de manobra e balizamento náutico;`,
              `• Providências para saída, planejamento de singradura, chegada e manutenção preventiva;`,
              `• Prática efetiva de manobras de atracação, desatracação, fundeio e recolhimento de homem ao mar.`,
              ``,
              `Atesto, para os devidos fins, que o(a) Sr.(a.) ${customerName}, CPF nº ${customerDoc}, cumpriu ${horasTreinamento} horas de treinamento teórico e prático em embarcação de esporte e/ou recreio junto ao Estabelecimento de Treinamento Náutico ${nomeEtn}, cadastrado na Autoridade Marítima sob o nº ${registroEtn}, tendo como instrutor(a) habilitado(a) o(a) Sr.(a.) ${instrutorNome}, portador(a) da CHA/CIR nº ${instrutorCha} (CPF: ${instrutorDoc}).`,
              ``,
              `Nome do Responsável / Coordenador Técnico de Ensino: ${instrutorNome}`,
              `Identidade nº: 23.456.789-0 (SSP/SP)    CPF: ${instrutorDoc}    Nº da CHA/CIR: ${instrutorCha}`,
              ``,
              `Local e Data: ${customerCity}/${customerUf}, ${new Date().toLocaleDateString("pt-BR")}`,
              `___________________________________________________________________________`,
              `Assinatura do Responsável Técnico do ETN / Instrutor Cadastrado`,
              `OBS: A apresentação de informações inverídicas poderá acarretar no cancelamento da inscrição do candidato, sujeitando o responsável do ETN, o Coordenador Técnico e o Instrutor às sanções legais cabíveis.`,
              `- 5-E-1 -`,
            ]
              .filter(Boolean)
              .join("\n");
          } else if (
            tpl.slug === "req-alteracao-cadastral" ||
            tpl.code === "REQ-CAD" ||
            tpl.code === "ALT_CADASTRO" ||
            tpl.code === "ALT_CAD" ||
            tpl.id === "doc_req_alteracao_cadastral" ||
            tpl.slug === "doc_req_alteracao_cadastral"
          ) {
            // NORMAM-211/DPC Anexo 2-C e Item 0213 - ALTERAÇÃO DE DADOS CADASTRAIS DO PROPRIETÁRIO (1 página estrita)
            const customerCity = customer?.city || "Santos";
            const customerUf = customer?.state || "SP";
            const customerDoc = customer?.cpf_cnpj || customer?.document || "";
            const fullAddress = customer?.address || "Não informado";
            const draft = (processData?.draft_data as any) || {};

            let resolvedCep = (customer as any)?.postal_code || (customer as any)?.cep || "";
            if (!resolvedCep && customer?.address) {
              const cepMatch = customer.address.match(/\b\d{5}-?\d{3}\b/);
              if (cepMatch) resolvedCep = cepMatch[0];
            }
            const resolvedRg = customer?.rg || (customer as any)?.identity_number || (customer as any)?.rg_number || "";
            const resolvedInscricao = vessel?.registration_number || draft?.registration_number || (vessel as any)?.tie_number || "Conforme cadastro SISGEMB";
            const resolvedHull = (vessel as any)?.hull_number || (vessel as any)?.chassis_number || draft?.vessel_hull || "Não informado";
            const effectiveLength = draft?.vessel_length || vessel?.length || vessel?.length_overall || "";
            const formattedLength = effectiveLength ? `${effectiveLength}${String(effectiveLength).includes("m") ? "" : " m"}` : "Não informado";

            const rawNavArea = (
              (vessel as any)?.navigation_area ||
              draft?.navigation_area ||
              draft?.area_navegacao ||
              ""
            ).toLowerCase();
            const isCosteira = rawNavArea.includes("costeira") || rawNavArea.includes("mar aberto - costeira");
            const isOceanica = rawNavArea.includes("oceânica") || rawNavArea.includes("oceanica") || rawNavArea.includes("mar aberto - oceânica");
            const isInterior = rawNavArea.includes("interior") || (!isCosteira && !isOceanica);

            content = [
              `NORMAM-211/DPC`,
              `ANEXO 2-C`,
              `REQUERIMENTO DE SERVIÇOS PARA REGULARIZAÇÃO DE EMBARCAÇÕES`,
              ``,
              `SR. CAPITÃO DOS PORTOS (DELEGADO) OU (AGENTE)`,
              ``,
              `REQUERENTE: ${customerName}`,
              `NOVO ENDEREÇO: ${fullAddress}`,
              `CIDADE: ${customerCity}    UF: ${customerUf}${resolvedCep ? `    CEP: ${resolvedCep}` : ""}`,
              `IDENT. Nº: ${resolvedRg || customerDoc}${resolvedRg ? `    ORG EXP: ${(customer as any)?.rg_issuer || "SSP"}` : ""}    CPF/CNPJ: ${customerDoc}`,
              `TEL: ${customer?.phone || ""}    E-mail: ${customer?.email || ""}`.trim(),
              `OBS: Atualização de Dados Cadastrais conforme item 0213 da NORMAM-211/DPC (Processo: ${processCode})`,
              ``,
              `EMBARCAÇÃO VINCULADA: ${vesselName}    INSCRIÇÃO Nº: ${resolvedInscricao}`,
              `Comprimento: ${formattedLength}    Nº DO CASCO: ${resolvedHull}    CLASSIFICAÇÃO: Esporte e/ou Recreio`,
              `Área de Navegação: [${isInterior ? "X" : " "}] Interior   [${isCosteira ? "X" : " "}] Costeira   [${isOceanica ? "X" : " "}] Oceânica`,
              ``,
              `VEM REQUERER A V.Sa. o seguinte serviço:`,
              `[ ] Inscrição de Embarcação`,
              `[ ] Transferência de Propriedade`,
              `[ ] Renovação de Título de Inscrição (TIE/TIEM)`,
              `[ ] Alteração de dados cadastrais da embarcação`,
              `[X] Alteração dados cadastrais do Proprietário (Item 0213 da NORMAM-211/DPC)`,
              `[ ] Segunda Via de Documento de Inscrição`,
              `[ ] Troca de Motor Propulsor`,
              `[ ] Outros serviços: Atualização Cadastral de Domicílio e Contato`,
              ``,
              `DISCRIMINAÇÃO DA ALTERAÇÃO CADASTRAL SOLICITADA (ITEM 0213):`,
              `Comunico a V. Sa. a alteração dos meus dados cadastrais e domiciliares perante o Sistema de Gerenciamento de Embarcações (SISGEMB), anexando: (1) Comprovante idôneo de novo domicílio residencial em meu nome nos termos da Lei Federal nº 7.115/1983 / Anexo 2-G; (2) Cópia do documento de identificação civil atualizado com foto e CPF; (3) Título de Inscrição de Embarcação original para fins de averbação da nova qualificação.`,
              ``,
              `Local e Data: ${customerCity}/${customerUf}, ${new Date().toLocaleDateString("pt-BR")}`,
              ``,
              `___________________________________________________________________________`,
              `Assinatura do Requerente / Titular Cadastral (${customerName} - CPF/CNPJ: ${customerDoc})`,
              `- NORMAM-211/DPC - ALTERAÇÃO CADASTRAL - ANEXO 2-C -`,
            ]
              .filter(Boolean)
              .join("\n");
          } else if (
            tpl.slug === "comunicacao-despacho" ||
            tpl.code === "COM-DESP" ||
            tpl.code === "DESPACHO_SAIDA" ||
            tpl.code === "AVISO_SAIDA" ||
            tpl.id === "doc_comunicacao_despacho" ||
            tpl.slug === "doc_comunicacao_despacho"
          ) {
            // NORMAM-211/DPC Anexo 4-A / Diretrizes NAVSEG - AVISO DE SAÍDA DE EMBARCAÇÃO / DESPACHO (1 página estrita)
            const customerCity = customer?.city || "Santos";
            const customerUf = customer?.state || "SP";
            const customerDoc = customer?.cpf_cnpj || customer?.document || "";
            const draft = (processData?.draft_data as any) || {};

            const resolvedInscricao = vessel?.registration_number || draft?.registration_number || (vessel as any)?.tie_number || "Conforme cadastro SISGEMB";
            const effectiveLength = draft?.vessel_length || vessel?.length || vessel?.length_overall || "10.50";
            const formattedLength = effectiveLength ? `${effectiveLength}${String(effectiveLength).includes("m") ? "" : " m"}` : "10.50 m";
            const vesselHullColor = (vessel as any)?.hull_color || draft?.vessel_color || "Branca";
            const marinaOrigem = draft?.marina_origem || (vessel as any)?.marina_name || "Iate Clube / Marina Local";
            const destinoPrevisto = draft?.destino_previsto || "Ilha das Palmas / Região Costeira Adjacente";
            const dataSaida = new Date().toLocaleDateString("pt-BR");
            const horaSaida = "09:00h";
            const dataRetorno = new Date().toLocaleDateString("pt-BR");
            const horaRetorno = "18:00h";
            const totalEmbarcados = draft?.total_embarcados || "4 pessoas (1 comandante + 3 navegantes)";
            const autonomiaCombustivel = draft?.autonomia_horas || "8 horas de navegação contínua";

            content = [
              `NORMAM-211/DPC - ANEXO 4-A`,
              `AVISO DE SAÍDA DE EMBARCAÇÃO / COMUNICAÇÃO DE TRÁFEGO`,
              `À Capitania dos Portos / Delegacia / Agência ou Administração da Marina / Iate Clube`,
              ``,
              `DADOS DA EMBARCAÇÃO E DO CONDUTOR HABILITADO:`,
              `Embarcação: ${vesselName}          Inscrição Nº: ${resolvedInscricao}`,
              `Comprimento: ${formattedLength}          Cor do Casco: ${vesselHullColor}          Classificação: Esporte e Recreio`,
              `Comandante / Mestre: ${customerName}          CPF: ${customerDoc}`,
              `Habilitação Náutica (CHA): Habilitado na categoria de Amador (ARA/MSA/CPA)          Tel/Celular: ${customer?.phone || "(13) 98765-4321"}`,
              ``,
              `PLANO DE NAVEGAÇÃO E ITINERÁRIO (DIRETRIZES NAVSEG):`,
              `Local de Partida: ${marinaOrigem}          Data / Hora de Saída: ${dataSaida} às ${horaSaida}`,
              `Destino / Área de Navegação: ${destinoPrevisto}          Previsão de Retorno: ${dataRetorno} às ${horaRetorno}`,
              `Autonomia de Combustível: ${autonomiaCombustivel}          Pessoas a Bordo: ${totalEmbarcados}`,
              ``,
              `ROL DE NAVEGANTES A BORDO:`,
              `1. ${customerName} (Comandante - CPF: ${customerDoc})`,
              `2. Tripulante / Convidado 1 (Identidade / CPF regular)`,
              `3. Passageiro / Convidado 2 (Identidade / CPF regular)`,
              `4. Passageiro / Convidado 3 (Identidade / CPF regular)`,
              ``,
              `EQUIPAMENTOS DE SALVATAGEM E COMUNICAÇÃO OPERACIONAIS:`,
              `Declaro sob responsabilidade de comandante que a embarcação está provida de rádio VHF marítimo em escuta permanente (Canais 16 e 68), coletes salva-vidas homologados classe compatível para 100% dos embarcados, boias circulares, extintores com carga válida e pirotécnicos dentro do prazo de validade, com registro prévio sincronizado no aplicativo NAVSEG da Autoridade Marítima.`,
              ``,
              `Local e Data: ${customerCity}/${customerUf}, ${new Date().toLocaleDateString("pt-BR")}`,
              ``,
              `___________________________________________________________________________`,
              `Assinatura do Comandante / Mestre (${customerName} - CPF: ${customerDoc})`,
              `- NORMAM-211/DPC - AVISO DE SAÍDA - ANEXO 4-A / NAVSEG -`,
            ]
              .filter(Boolean)
              .join("\n");
          } else {
            // Requerimento Padrão do Interessado - Alinhado estritamente à NORMAM-211/DPC Anexo 2-C (páginas 186-187)
            const isProf = vesselCategory === "profissional" || tpl.code === "REQ-PROF";
            const isJet = vesselCategory === "moto_aquatica" || tpl.code === "REQ-JET";
            const anexoLabel = isProf
              ? "NORMAM-201/DPC - ANEXO 2-A"
              : isJet
              ? "NORMAM-212/DPC - ANEXO 3-B"
              : "NORMAM-211/DPC - ANEXO 2-C";

            const customerCity = customer?.city || "Santos";
            const customerUf = customer?.state || "SP";
            const fullAddress = customer?.address || "Não informado";

            // Detecção de serviço assinalado no formulário oficial
            const servicesRaw = (processData?.draft_data as any)?.services || [];
            const procType = (processData?.process_type || "").toLowerCase();

            const isReqTransfItem = tpl.slug === "req-transferencia" || tpl.code === "REQ-TRANSF" || tpl.id === "doc_req_transf";
            const isReqRenovItem = tpl.slug === "req-renovacao-tie" || tpl.code === "REQ-RENOV" || tpl.id === "doc_req_renov";
            const isReqSegViaItem = tpl.slug === "req-segunda-via-tie" || tpl.code === "REQ-2VIA" || tpl.id === "doc_req_segunda_via";
            const isReqMotorItem = tpl.slug === "req-alteracao-motor" || tpl.code === "REQ-MOT" || tpl.id === "doc_termo_motor";
            const isReqVistoriaItem = tpl.slug === "req-vistoria-naval" || tpl.code === "REQ-VIST" || tpl.id === "doc_req_vistoria";

            const isTransf = isReqTransfItem || procType.includes("transfer") || servicesRaw.includes("transferencia_propriedade");
            const isRenov = isReqRenovItem || procType.includes("renov") || servicesRaw.includes("renovacao_tie");
            const isSegVia = isReqSegViaItem || procType.includes("segunda") || procType.includes("2") || servicesRaw.includes("segunda_via_tie");
            const isMotor = isReqMotorItem || procType.includes("motor") || servicesRaw.includes("troca_motor");
            const isVistoria = isReqVistoriaItem || procType.includes("vistoria") || servicesRaw.includes("vistoria");
            const isAltCad = procType.includes("altera") || servicesRaw.includes("alteracao_dados") || servicesRaw.includes("alteracao_cadastral");
            const isInscr = !isTransf && !isRenov && !isSegVia && !isMotor && !isVistoria && (procType.includes("inscri") || procType.includes("registro") || servicesRaw.includes("registro_embarcacao") || (!procType.includes("cancel")));

            // CEP fiel
            let resolvedCep = (customer as any)?.postal_code || (customer as any)?.cep || "";
            if (!resolvedCep && customer?.address) {
              const cepMatch = customer.address.match(/\b\d{5}-?\d{3}\b/);
              if (cepMatch) resolvedCep = cepMatch[0];
            }

            // Identidade / RG fiel
            const resolvedRg = customer?.rg || (customer as any)?.identity_number || (customer as any)?.rg_number || "";

            // Comprimento fiel
            const effectiveLength = (processData?.draft_data as any)?.vessel_length || vessel?.length || vessel?.length_overall || "";
            const formattedLength = effectiveLength ? `${effectiveLength}${String(effectiveLength).includes("m") ? "" : " m"}` : "";

            // Área de Navegação fiel
            const rawNavArea = (
              (vessel as any)?.navigation_area ||
              (processData?.draft_data as any)?.navigation_area ||
              (processData?.draft_data as any)?.area_navegacao ||
              ""
            ).toLowerCase();
            const isCosteira = rawNavArea.includes("costeira") || rawNavArea.includes("mar aberto - costeira");
            const isOceanica = rawNavArea.includes("oceânica") || rawNavArea.includes("oceanica") || rawNavArea.includes("mar aberto - oceânica");
            const isInterior = rawNavArea.includes("interior") || (!isCosteira && !isOceanica && rawNavArea.length > 0) || (!isCosteira && !isOceanica);

            // Inscrição fiel
            const resolvedInscricao = isInscr
              ? "A designar (Inscrição Inicial)"
              : (vessel?.registration_number || (processData?.draft_data as any)?.registration_number || (vessel as any)?.tie_number || "Em regularização");

            // Número do Casco fiel
            const resolvedHull = (vessel as any)?.hull_number || (vessel as any)?.chassis_number || (processData?.draft_data as any)?.vessel_hull || "";

            content = [
              `NORMAM-211/DPC`,
              `ANEXO 2-C`,
              `REQUERIMENTO DE SERVIÇOS PARA REGULARIZAÇÃO DE EMBARCAÇÕES`,
              ``,
              `SR. CAPITÃO DOS PORTOS (DELEGADO) OU (AGENTE)`,
              ``,
              `REQUERENTE: ${customerName}`,
              `ENDEREÇO: ${fullAddress}`,
              `CIDADE: ${customerCity}    UF: ${customerUf}${resolvedCep ? `    CEP: ${resolvedCep}` : ""}`,
              `IDENT. Nº: ${resolvedRg || (customer?.cpf_cnpj || customer?.document || "")}${resolvedRg ? `    ORG EXP: ${(customer as any)?.rg_issuer || "SSP"}` : ""}    CPF/CNPJ: ${customer?.cpf_cnpj || customer?.document || ""}`,
              `TEL: ${customer?.phone || ""}    E-mail: ${customer?.email || ""}`.trim(),
              `OBS: Processo instruído via NavalDocs Pro sob o código ${processCode}`,
              ``,
              `EMBARCAÇÃO: ${vesselName}    INSCRIÇÃO Nº: ${resolvedInscricao}`,
              `Comprimento: ${formattedLength || "Não informado"}    Nº DO CASCO: ${resolvedHull || "Não informado"}    CLASSIFICAÇÃO: ${isProf ? "Comercial" : isJet ? "Moto Aquática" : "Esporte e/ou Recreio"}`,
              `Área de Navegação: [${isInterior ? "X" : " "}] Interior   [${isCosteira ? "X" : " "}] Costeira   [${isOceanica ? "X" : " "}] Oceânica`,
              ``,
              `VEM REQUERER A V.Sa. os seguintes serviços:`,
              `[${isInscr ? "X" : " "}] Inscrição`,
              `[ ] Cancelamento de Inscrição da Embarcação`,
              `[ ] Licença de Construção`,
              `[ ] Licença de Alteração`,
              `[ ] Licença de Reclassificação`,
              `[${isTransf ? "X" : " "}] Transferência de Propriedade`,
              `[ ] Transferência de Jurisdição`,
              `[ ] Transferência de Propriedade e Jurisdição`,
              `[ ] Mudança de Nome da Embarcação`,
              `[${isRenov ? "X" : " "}] Renovação de TIE`,
              `[${isAltCad ? "X" : " "}] Alteração de dados cadastrais da embarcação`,
              `[ ] Alteração dados cadastrais do Proprietário`,
              `[${isMotor ? "X" : " "}] Troca do Motor Propulsor`,
              `[ ] Certidão Relativa a Situação da Embarcação`,
              `[ ] Registro de Ônus e Averbações relativos a embarcação`,
              `[ ] Cancelamento do Registro de Ônus e Averbações relativo a embarcação`,
              `[${isVistoria ? "X" : " "}] Vistoria de Arqueação`,
              `[ ] Vistoria de Rearqueação`,
              `[ ] Vistoria para alterar a classificação da embarcação`,
              `[${isSegVia ? "X" : isVistoria ? "X" : " "}] Outros serviços: ${isSegVia ? "Segunda Via de Documento Náutico (TIE/TIEM)" : isVistoria ? "Vistoria Inicial / Perícia Naval Regulatória" : "Regularização processual perante a Capitania dos Portos"}`,
              ``,
              `Local e Data: ${customerCity}/${customerUf}, ${new Date().toLocaleDateString("pt-BR")}`,
            ]
              .filter(Boolean)
              .join("\n");
          }

          // 3. Gerar bytes do PDF estilizado com branding e assinatura adequada
          const isAnexo2K =
            tpl.slug === "termo-entrega-transf" ||
            tpl.slug === "doc_decl_transf" ||
            tpl.code === "TER-ENTR" ||
            tpl.code === "ATPE-001" ||
            tpl.code === "ATPE";

          const isAnexo2H =
            tpl.slug === "decl-perda-extravio" ||
            tpl.code === "DEC-PERD" ||
            tpl.code === "DEC-PERDA" ||
            tpl.id === "doc_decl_perda" ||
            tpl.slug === "doc_decl_perda";

          const isAnexo2I =
            tpl.slug === "comunicacao-transf-anexo-2i" ||
            tpl.code === "COM-TRANSF" ||
            tpl.code === "ANEXO-2I" ||
            tpl.code === "ANEXO_2I" ||
            tpl.id === "doc_comunicacao_transf" ||
            tpl.slug === "doc_comunicacao_transf";

          const isDeclRenov =
            tpl.slug === "decl-manutencao-renov" ||
            tpl.code === "DEC-OPER" ||
            tpl.code === "DECL_RENOV" ||
            tpl.code === "DEC-MANUT" ||
            tpl.id === "doc_decl_renov" ||
            tpl.slug === "doc_decl_renov";

          const isReqTransf =
            tpl.slug === "req-transferencia" ||
            tpl.code === "REQ-TRANSF" ||
            tpl.id === "doc_req_transf";

          const isReqSegVia =
            tpl.slug === "req-segunda-via-tie" ||
            tpl.code === "REQ-2VIA" ||
            tpl.id === "doc_req_segunda_via";

          const isReqRenov =
            tpl.slug === "req-renovacao-tie" ||
            tpl.code === "REQ-RENOV" ||
            tpl.id === "doc_req_renov";

          const isReqMotor =
            tpl.slug === "req-alteracao-motor" ||
            tpl.code === "REQ-MOT" ||
            tpl.code === "TERMO_MOTOR" ||
            tpl.id === "doc_termo_motor" ||
            tpl.slug === "doc_termo_motor";

          const isReqVistoria =
            tpl.slug === "req-vistoria-naval" ||
            tpl.code === "REQ-VIST" ||
            tpl.id === "doc_req_vistoria" ||
            tpl.slug === "doc_req_vistoria";

          const isReqJet =
            tpl.slug === "req-moto-aquatica" ||
            tpl.code === "REQ-JET" ||
            tpl.code === "REQ_MOTO_AQUATICA" ||
            tpl.id === "doc_req_moto_aquatica" ||
            tpl.slug === "doc_req_moto_aquatica";

          const isReqComercial =
            tpl.slug === "req-comercial-prof" ||
            tpl.code === "REQ-PROF" ||
            tpl.id === "doc_req_comercial" ||
            tpl.slug === "doc_req_comercial";

          const isReqCha =
            tpl.slug === "req-habilitacao-cha" ||
            tpl.code === "REQ-CHA" ||
            tpl.code === "REQ_CHA" ||
            tpl.id === "doc_req_cha" ||
            tpl.slug === "doc_req_cha" ||
            tpl.code === "ANEXO-5-H" ||
            tpl.code === "ANEXO_5_H";

          const isReqAltCad =
            tpl.slug === "req-alteracao-cadastral" ||
            tpl.code === "REQ-CAD" ||
            tpl.code === "ALT_CADASTRO" ||
            tpl.code === "ALT_CAD" ||
            tpl.id === "doc_req_alteracao_cadastral" ||
            tpl.slug === "doc_req_alteracao_cadastral";

          const isComDespacho =
            tpl.slug === "comunicacao-despacho" ||
            tpl.code === "COM-DESP" ||
            tpl.code === "DESPACHO_SAIDA" ||
            tpl.code === "AVISO_SAIDA" ||
            tpl.id === "doc_comunicacao_despacho" ||
            tpl.slug === "doc_comunicacao_despacho";

          const isDeclPerdaCha =
            tpl.slug === "decl-perda-cha" ||
            tpl.code === "DEC-CHA" ||
            tpl.code === "ANEXO-5-D" ||
            tpl.code === "ANEXO_5_D" ||
            tpl.code === "PERDA_CHA" ||
            tpl.id === "doc_decl_perda_cha" ||
            tpl.slug === "doc_decl_perda_cha";

          const isAtestadoAra =
            tpl.slug === "atestado-treinamento-ara" ||
            tpl.code === "ATE-ARA" ||
            tpl.code === "ANEXO-5-E" ||
            tpl.code === "ANEXO_5_E" ||
            tpl.code === "TREINAMENTO_ARA" ||
            tpl.id === "doc_atestado_ara" ||
            tpl.slug === "doc_atestado_ara";

          const isCustomSigned =
            isAnexo2K ||
            isAnexo2H ||
            isAnexo2I ||
            isDeclRenov ||
            isReqMotor ||
            isReqVistoria ||
            isReqJet ||
            isReqComercial ||
            isReqCha ||
            isReqAltCad ||
            isComDespacho ||
            isDeclPerdaCha ||
            isAtestadoAra;

          const signerInfo = tpl.slug === "proc-representacao-naval"
            ? {
                signerName: customerName,
                signerRole: `Outorgante (CPF/CNPJ: ${customer?.cpf_cnpj || customer?.document || ""})`,
              }
            : tpl.slug === "decl-residencia-naval"
            ? {
                signerName: `Assinatura do Requerente`,
                signerRole: `(${customerName} - CPF: ${customer?.cpf_cnpj || customer?.document || ""})`,
              }
            : isCustomSigned
            ? {
                signerName: "",
                signerRole: "",
              }
            : {
                signerName: `Assinatura do Requerente`,
                signerRole: `CPF/CNPJ: ${customer?.cpf_cnpj || customer?.document || ""}`,
              };

          const isOfficial =
            tpl.slug === "req-padrao-cpes" ||
            tpl.slug === "bsade-simplificado" ||
            tpl.code === "BSADE-001" ||
            tpl.slug === "proc-representacao-naval" ||
            tpl.slug === "decl-residencia-naval" ||
            isAnexo2K ||
            isAnexo2H ||
            isAnexo2I ||
            isDeclRenov ||
            isReqTransf ||
            isReqSegVia ||
            isReqRenov ||
            isReqMotor ||
            isReqVistoria ||
            isReqJet ||
            isReqComercial ||
            isReqCha ||
            isReqAltCad ||
            isComDespacho ||
            isDeclPerdaCha ||
            isAtestadoAra ||
            tpl.nature === "official_form";

          const { bytes, verificationCode } = await buildBrandedDocumentPdf({
            docName: docTitle,
            content,
            branding,
            logoMode: logoChoice,
            watermarkOptions: {
              enabled: showWatermark,
            },
            signerName: signerInfo.signerName,
            signerRole: signerInfo.signerRole,
            isOfficialForm: isOfficial,
            hideSignatureBlock: isCustomSigned,
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
            appearance_snapshot: {
              logo_choice: logoChoice,
              watermark_enabled: showWatermark,
            },
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
              length: effectiveLength,
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

          // 6. Determinar versão sequencial do documento para preservar histórico
          const { data: previousDocs } = await supabase
            .from("generated_documents")
            .select("version")
            .eq("company_id", companyId)
            .eq("process_id", id)
            .eq("template_id", realTemplateUuid)
            .order("version", { ascending: false })
            .limit(1);

          const nextVersion = previousDocs && previousDocs.length > 0 && typeof previousDocs[0].version === "number"
            ? previousDocs[0].version + 1
            : 1;

          // 7. Inserir registro na tabela generated_documents com UUID real (NUNCA slug)
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
              version: nextVersion,
              metadata: documentMetadata,
            })
            .select("id, name, generated_file_url, created_at, status, version")
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
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-20 space-y-6">
        {/* ========================================================================= */}
        {/* 1. CABEÇALHO SIMPLES */}
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
            Documentos do processo
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Escolha quais documentos deseja gerar ou anexe os que já possui.
          </p>
        </div>

        {/* Resumo do Contexto (Cliente, Embarcação com edição rápida e Serviços Selecionados) */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-4 divide-y md:divide-y-0 md:divide-x divide-slate-100">
          {/* Cliente */}
          <div className="flex items-start gap-3 pt-2 md:pt-0 md:pr-3">
            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600 shrink-0 mt-0.5">
              <User className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
                Cliente
              </span>
              <span className="text-sm font-bold text-[#0B1739] whitespace-normal break-words block">
                {customer?.fantasy_name || customer?.name || "Cliente não informado"}
              </span>
              {(customer?.cpf_cnpj || customer?.document) && (
                <span className="text-xs text-slate-500 block font-mono mt-0.5">
                  {customer.cpf_cnpj || customer.document}
                </span>
              )}
            </div>
          </div>

          {/* Embarcação */}
          <div className="flex items-start justify-between gap-3 pt-3 md:pt-0 md:px-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600 shrink-0 mt-0.5">
                <Ship className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
                  Embarcação
                </span>
                {availableCustomerVessels.length > 0 ? (
                  <div className="mt-0.5 space-y-1">
                    <select
                      value={vessel?.id || ""}
                      onChange={async (e) => {
                        const selectedId = e.target.value;
                        if (!selectedId) {
                          setVessel(null);
                          return;
                        }
                        const selected = availableCustomerVessels.find((v) => v.id === selectedId);
                        if (selected) {
                          setVessel(selected);
                          setQuickVesselName(selected.name || "");
                          setQuickVesselReg(selected.registration_number || "");
                          setQuickVesselType(selected.vessel_type || "Lancha / Recreio");
                          setQuickVesselOwnerName(selected.current_owner_name || "");
                          setQuickVesselOwnerCpf(selected.current_owner_cpf_cnpj || "");
                          if (id && companyId) {
                            try {
                              const { error: updErr } = await supabase
                                .from("processes")
                                .update({
                                  vessel_id: selected.id,
                                  updated_at: new Date().toISOString(),
                                })
                                .eq("id", id)
                                .eq("company_id", companyId);

                              if (updErr) {
                                console.error("Erro ao vincular embarcação:", updErr);
                                toast.error("Não foi possível salvar o vínculo da embarcação.");
                              } else {
                                toast.success(`Embarcação "${selected.name}" vinculada ao processo!`, {
                                  description: "Os requisitos e formulários foram atualizados.",
                                });
                              }
                            } catch (err: any) {
                              console.error("Exceção ao vincular embarcação:", err);
                              toast.error("Erro de conexão ao vincular embarcação.");
                            }
                          }
                        }
                      }}
                      className="text-xs font-semibold text-[#075BFF] bg-blue-50 border border-blue-200 rounded-md px-2 py-1 cursor-pointer max-w-full"
                    >
                      <option value="">
                        {vessel?.name ? `Selecionada: ${vessel.name} (trocar...)` : "Selecione embarcação cadastrada..."}
                      </option>
                      {availableCustomerVessels.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.name} {v.registration_number ? `(${v.registration_number})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : vessel?.name ? (
                  <span className="text-sm font-bold text-[#0B1739] whitespace-normal break-words block">
                    {vessel.name}
                  </span>
                ) : (
                  <span className="text-sm font-bold text-slate-400 whitespace-normal break-words block">
                    Embarcação não informada
                  </span>
                )}
                <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500 mt-0.5">
                  <span>Inscrição: {vessel?.registration_number || "Em regularização"}</span>
                  <span>•</span>
                  <span>
                    Comprimento:{" "}
                    {(processData?.draft_data as any)?.vessel_length ||
                      (vessel?.length || vessel?.length_overall
                        ? `${vessel?.length || vessel?.length_overall} m`
                        : "Não informado")}
                  </span>
                </div>
                {/* Proprietário: identificação clara ou alerta de pendência */}
                {vessel?.current_owner_name ? (
                  <div className="text-[11px] text-slate-600 mt-1 flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-slate-700">Proprietário:</span>
                    <span className="font-medium text-slate-900">{vessel.current_owner_name}</span>
                    {vessel.current_owner_name === (customer?.fantasy_name || customer?.name) ? (
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-blue-50 text-[#075BFF] font-semibold border border-blue-200">
                        Mesmo que o requerente
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-50 text-amber-800 font-semibold border border-amber-200">
                        Proprietário distinto do requerente
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="mt-1.5 p-2 bg-amber-50/80 border border-amber-200 rounded-lg text-[11px] space-y-1">
                    <div className="flex items-center gap-1.5 text-amber-800 font-semibold">
                      <AlertTriangle className="h-3 w-3 shrink-0 text-amber-600" />
                      <span>Proprietário não informado (pendência)</span>
                    </div>
                    <div className="flex items-center gap-2 pt-0.5">
                      <button
                        type="button"
                        onClick={handleConfirmCustomerAsOwner}
                        className="text-[10px] font-bold text-[#075BFF] hover:underline cursor-pointer"
                      >
                        Confirmar {customer?.name || "cliente"} como proprietário
                      </button>
                      <span className="text-amber-400">•</span>
                      <button
                        type="button"
                        onClick={() => setShowQuickVesselModal(true)}
                        className="text-[10px] font-semibold text-amber-800 hover:underline cursor-pointer"
                      >
                        Informar outro proprietário
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowQuickVesselModal(true)}
              title="Completar ou alterar dados cadastrais da embarcação"
              className="p-1.5 rounded-lg text-[#075BFF] hover:bg-blue-50 transition-colors cursor-pointer shrink-0"
            >
              <Edit className="h-4 w-4" />
            </button>
          </div>

          {/* Serviços Selecionados */}
          <div className="flex items-start gap-3 pt-3 md:pt-0 md:pl-3">
            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600 shrink-0 mt-0.5">
              <Cog className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
                Serviços selecionados
              </span>
              <span className="text-xs font-semibold text-[#0B1739] whitespace-normal break-words block leading-snug">
                {translateServices((processData?.draft_data as any)?.services) ||
                  processData?.title ||
                  "Serviço Naval"}
              </span>
              <span className="text-[11px] text-slate-400 block font-mono mt-1">
                Processo: {processCode}
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* BANNER DE RESULTADO DA ÚLTIMA GERAÇÃO */}
        {/* ========================================================================= */}
        {generationSummary && (
          <div
            className={`p-4 sm:p-5 rounded-2xl border ${
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
                      ? `${generationSummary.successDocs.length} documento(s) gerado(s).`
                      : `Resultado do lote: ${generationSummary.successDocs.length} gerado(s), ${generationSummary.failedDocs.length} falharam.`}
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {generationSummary.failedDocs.length === 0
                      ? "Os arquivos foram criados, salvos com sucesso e constam na seção de Documentos Gerados abaixo."
                      : "Verifique os detalhes abaixo para conferir quais deram certo e quais falharam."}
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
                  <span>Tentar novamente os que falharam</span>
                </button>
              )}
            </div>

            {generationSummary.failedDocs.length > 0 && (
              <div className="p-3 bg-white rounded-xl border border-amber-200 space-y-1.5 text-xs">
                <span className="font-bold text-amber-900 block">Falhas no processamento:</span>
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
        {/* 6. RESPONSÁVEL E APARÊNCIA */}
        {/* ========================================================================= */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start divide-y md:divide-y-0 md:divide-x divide-slate-100">
            {/* Responsável */}
            <div className="space-y-3 md:pr-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-[#0B1739]">
                    Quem está preparando os documentos?
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Nome e função que constarão na elaboração formal dos arquivos
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowQuickStaffModal(true)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#075BFF] hover:underline cursor-pointer shrink-0"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>Cadastrar funcionário</span>
                </button>
              </div>

              {companyStaffList.length === 0 ? (
                <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-2 text-xs">
                  <p className="font-semibold text-amber-900">
                    Nenhum funcionário ativo cadastrado na sua empresa.
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
                <div>
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

            {/* Aparência do PDF */}
            <div className="space-y-3 pt-4 md:pt-0 md:pl-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-[#0B1739]">Aparência do PDF</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Logo e marca-d’água (não bloqueiam a geração)
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleSaveAppearancePreference}
                  disabled={isSavingAppearancePref}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-50"
                  title="Salva essa preferência como padrão para próximas gerações"
                >
                  {isSavingAppearancePref ? (
                    <Loader2 className="h-3 w-3 animate-spin text-[#075BFF]" />
                  ) : (
                    <Check className="h-3 w-3 text-emerald-600" />
                  )}
                  <span>Salvar padrão</span>
                </button>
              </div>

              {/* Opções de Logo */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                {/* 1. Logo da minha empresa */}
                <label
                  className={`p-2.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between gap-1.5 ${
                    logoChoice === "company"
                      ? "border-[#075BFF] bg-blue-50/40 text-[#0B1739] font-bold shadow-2xs"
                      : "border-slate-200 hover:border-slate-300 bg-white text-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="logoChoiceOption"
                      value="company"
                      checked={logoChoice === "company"}
                      onChange={() => setLogoChoice("company")}
                      className="text-[#075BFF] focus:ring-blue-500"
                    />
                    <span className="text-xs">Logo da minha empresa</span>
                  </div>
                  {companyData?.logo_url || companyData?.logo_primary_url ? (
                    <div className="h-6 flex items-center">
                      <img
                        src={companyData.logo_url || companyData.logo_primary_url}
                        alt="Logo da Empresa"
                        className="max-h-5 max-w-[80px] object-contain"
                      />
                    </div>
                  ) : (
                    <label className="text-[10px] text-[#075BFF] hover:underline cursor-pointer block">
                      {isUploadingCompanyLogo ? "Enviando..." : "+ Enviar logo"}
                      <input
                        type="file"
                        accept="image/png,image/jpeg"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleUploadCompanyLogo(f);
                        }}
                      />
                    </label>
                  )}
                </label>

                {/* 2. Logo do NavalDocs Pro */}
                <label
                  className={`p-2.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between gap-1.5 ${
                    logoChoice === "navaldocs"
                      ? "border-[#075BFF] bg-blue-50/40 text-[#0B1739] font-bold shadow-2xs"
                      : "border-slate-200 hover:border-slate-300 bg-white text-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="logoChoiceOption"
                      value="navaldocs"
                      checked={logoChoice === "navaldocs"}
                      onChange={() => setLogoChoice("navaldocs")}
                      className="text-[#075BFF] focus:ring-blue-500"
                    />
                    <span className="text-xs">Logo do NavalDocs Pro</span>
                  </div>
                  <div className="h-6 flex items-center">
                    <img
                      src="/navaldocs-logo.png"
                      alt="Logo NavalDocs Pro"
                      className="max-h-5 max-w-[80px] object-contain"
                    />
                  </div>
                </label>

                {/* 3. Sem logo */}
                <label
                  className={`p-2.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between gap-1.5 ${
                    logoChoice === "none"
                      ? "border-[#075BFF] bg-blue-50/40 text-[#0B1739] font-bold shadow-2xs"
                      : "border-slate-200 hover:border-slate-300 bg-white text-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="logoChoiceOption"
                      value="none"
                      checked={logoChoice === "none"}
                      onChange={() => setLogoChoice("none")}
                      className="text-[#075BFF] focus:ring-blue-500"
                    />
                    <span className="text-xs">Sem logo</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Cabeçalho limpo</span>
                </label>
              </div>

              {/* Marca-d'água independente */}
              <div className="pt-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Droplet className="h-4 w-4 text-[#075BFF]" />
                  <span className="text-xs font-semibold text-slate-700">
                    Marca-d’água no fundo da página
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showWatermark}
                    onChange={(e) => setShowWatermark(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#075BFF]"></div>
                  <span className="ml-2 text-xs font-medium text-slate-600">
                    {showWatermark ? "Ativa" : "Desativada"}
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2 & 3 & 4 & 5. LISTA COMPACTA DE DOCUMENTOS */}
        {/* ========================================================================= */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-[#0B1739]">Documentos do serviço</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Escolha individualmente o que gerar agora ou anexe os documentos que você já tem.
              </p>
            </div>

            {/* Busca rápida */}
            <div className="relative w-full sm:w-56">
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

          {filteredTemplates.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-slate-200 rounded-2xl space-y-2">
              <FileText className="h-8 w-8 text-slate-300 mx-auto" />
              <p className="text-xs font-semibold text-slate-600">
                Nenhum documento encontrado para este filtro ou serviço.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredTemplates.map((tpl) => {
                const selection = docSelections[tpl.id] || {
                  mode: tpl.status === "em_revisao" ? "omit" : "generate",
                };
                const isGeneratingThis = selection.mode === "generate";
                const isAttachingThis = selection.mode === "attach";
                const isOmittedThis = selection.mode === "omit";

                // Validação granular de campos para este documento
                const validation = templateValidationMap.get(tpl.slug);
                const isBlockedForRequiredFields = !!validation?.isBlocked;
                const missingForThisDoc = validation?.missingFields || [];

                // Resolução no banco de dados
                const resolution = resolvedTemplatesMap.get(tpl.slug);
                const isResolvedInDb = !!resolution?.dbTemplateId;

                // Nomes limpos e objetivos (sem códigos técnicos na apresentação principal)
                const cleanName =
                  tpl.slug === "req-padrao-cpes"
                    ? "Requerimento"
                    : tpl.slug === "req-comercial-prof"
                    ? "Requerimento — embarcação profissional"
                    : tpl.slug === "req-moto-aquatica"
                    ? "Requerimento — moto aquática (jet ski)"
                    : tpl.slug === "proc-representacao-naval"
                    ? "Procuração"
                    : tpl.slug === "decl-residencia-naval"
                    ? "Declaração de residência"
                    : tpl.slug === "decl-perda-extravio"
                    ? "Declaração de perda ou extravio"
                    : tpl.slug === "decl-manutencao-renov"
                    ? "Declaração de manutenção e condições operacionais"
                    : tpl.slug === "req-renovacao-tie"
                    ? "Requerimento de renovação de TIE/TIEM"
                    : tpl.slug === "req-alteracao-motor"
                    ? "Requerimento de alteração de motor"
                    : tpl.slug === "comunicacao-transf-anexo-2i"
                    ? "Comunicação de transferência (Anexo 2-I)"
                    : tpl.name;

                // Frase curta explicando finalidade
                const cleanPurpose =
                  tpl.slug === "req-padrao-cpes"
                    ? "Requerimento padronizado perante a Capitania dos Portos para serviços na embarcação."
                    : tpl.slug === "req-comercial-prof"
                    ? "Requerimento específico para inscrição e regularização de embarcações comerciais."
                    : tpl.slug === "req-moto-aquatica"
                    ? "Formulário oficial para inscrição, transferência ou renovação de jet ski."
                    : tpl.slug === "proc-representacao-naval"
                    ? "Outorga poderes de representação náutica perante a Autoridade Marítima."
                    : tpl.slug === "decl-residencia-naval"
                    ? "Declaração de domicílio válida sob as penas da lei federal."
                    : tpl.slug === "decl-perda-extravio"
                    ? "Declaração formal exclusivamente para casos de documento náutico extraviado."
                    : tpl.slug === "decl-manutencao-renov"
                    ? "Declaração atestando integridade do casco, propulsão e salvatagem para renovação de TIE sem vistoria."
                    : tpl.slug === "req-renovacao-tie"
                    ? "Requerimento padronizado perante a Capitania dos Portos solicitando a renovação do TIE/TIEM."
                    : tpl.slug === "req-alteracao-motor"
                    ? "Requerimento oficial e termo técnico para averbação de nova propulsão no documento náutico."
                    : tpl.slug === "comunicacao-transf-anexo-2i"
                    ? "Comunicação oficial protocolada pelo vendedor para afastar multas e responsabilidades futuras."
                    : tpl.description;

                // Situação em texto compreensível (Situações Claras)
                let statusBadge: { label: string; colorClass: string };
                if (isOmittedThis) {
                  statusBadge = { label: "Não selecionado", colorClass: "bg-slate-100 text-slate-600" };
                } else if (isAttachingThis) {
                  statusBadge = selection.attachedFile
                    ? { label: "Anexado", colorClass: "bg-emerald-50 text-emerald-700 border border-emerald-200" }
                    : { label: "Aguardando arquivo", colorClass: "bg-amber-50 text-amber-700 border border-amber-200" };
                } else if (tpl.status === "em_revisao") {
                  statusBadge = { label: "Modelo em revisão", colorClass: "bg-amber-50 text-amber-700 border border-amber-200" };
                } else if (isBlockedForRequiredFields || !isResolvedInDb) {
                  statusBadge = { label: "Faltam dados", colorClass: "bg-amber-100 text-amber-800 font-bold" };
                } else {
                  statusBadge = { label: "Pronto para gerar", colorClass: "bg-blue-50 text-[#075BFF] font-semibold border border-blue-200" };
                }

                const isDetailsExpanded = !!expandedDetails[tpl.id];

                return (
                  <div key={tpl.id} data-template-slug={tpl.slug} className="py-4 space-y-3">
                    {/* Linha Compacta Principal */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      {/* Lado Esquerdo: Nome claro, finalidade e situação */}
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h3 className="text-sm font-bold text-[#0B1739]">{cleanName}</h3>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] ${statusBadge.colorClass}`}
                          >
                            {statusBadge.label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">{cleanPurpose}</p>
                      </div>

                      {/* Lado Direito: Seletor das 3 Opções Simples */}
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-[10px] text-slate-400 font-medium">
                          Ação para este documento:
                        </span>
                        <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200 text-xs">
                          {/* Opção 1: Gerar documento */}
                          <button
                            type="button"
                            onClick={() => updateDocSelection(tpl.id, "generate")}
                            className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                              isGeneratingThis
                                ? "bg-[#075BFF] text-white font-bold shadow-2xs"
                                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                            }`}
                          >
                            Gerar documento
                          </button>

                          {/* Opção 2: Anexar documento pronto */}
                          <button
                            type="button"
                            onClick={() => updateDocSelection(tpl.id, "attach")}
                            className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                              isAttachingThis
                                ? "bg-emerald-600 text-white font-bold shadow-2xs"
                                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                            }`}
                          >
                            Anexar documento pronto
                          </button>

                          {/* Opção 3: Não usar agora */}
                          <button
                            type="button"
                            onClick={() => updateDocSelection(tpl.id, "omit")}
                            className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer ${
                              isOmittedThis
                                ? "bg-slate-600 text-white font-bold shadow-2xs"
                                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                            }`}
                          >
                            Não usar agora
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Aviso Curto se houver condição essencial para escolher o documento */}
                    {tpl.isConditional && (
                      <div className="text-xs text-amber-800 bg-amber-50/70 border border-amber-200/70 rounded-xl px-3 py-2 flex items-center gap-2">
                        <Info className="h-4 w-4 text-amber-600 shrink-0" />
                        <span>
                          <strong>Condição:</strong> {tpl.conditionText}
                        </span>
                      </div>
                    )}

                    {/* Seletor explícito de Outorgado PF vs PJ na Procuração */}
                    {tpl.slug === "proc-representacao-naval" && (
                      <div className="p-3 bg-slate-50 border border-slate-200/90 rounded-xl space-y-2 text-xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <span className="font-bold text-[#0B1739] block">
                              Quem receberá os poderes (Outorgado)?
                            </span>
                            <span className="text-[11px] text-slate-500">
                              Defina se o procurador atuará como Pessoa Física (PF) ou como Pessoa Jurídica (PJ).
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 bg-white p-1 rounded-lg border border-slate-200">
                            <button
                              type="button"
                              onClick={() => setOutorgadoType("pf")}
                              className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer transition-all ${
                                outorgadoType === "pf"
                                  ? "bg-[#075BFF] text-white shadow-2xs font-bold"
                                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                              }`}
                            >
                              Pessoa Física (PF)
                            </button>
                            <button
                              type="button"
                              onClick={() => setOutorgadoType("pj")}
                              className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer transition-all ${
                                outorgadoType === "pj"
                                  ? "bg-[#075BFF] text-white shadow-2xs font-bold"
                                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                              }`}
                            >
                              Pessoa Jurídica (PJ)
                            </button>
                          </div>
                        </div>

                        <div className="text-[11px] text-slate-600 flex items-center justify-between gap-2 pt-1 border-t border-slate-200/60">
                          <span>
                            {outorgadoType === "pf" ? (
                              <>
                                <strong>Outorgado PF:</strong>{" "}
                                {outorgadoPfNome
                                  ? `${outorgadoPfNome} (${outorgadoPfCpf ? `CPF: ${outorgadoPfCpf}` : "CPF pendente"})`
                                  : "Nome e CPF pendentes"}
                              </>
                            ) : (
                              <>
                                <strong>Outorgada PJ:</strong>{" "}
                                {outorgadoPjRazao
                                  ? `${outorgadoPjRazao} (${outorgadoPjCnpj ? `CNPJ: ${outorgadoPjCnpj}` : "CNPJ pendente"})`
                                  : "Razão social e CNPJ pendentes"}
                              </>
                            )}
                          </span>

                          <button
                            type="button"
                            onClick={() => setShowOutorgadoModal(true)}
                            className="font-bold text-[#075BFF] hover:underline cursor-pointer shrink-0"
                          >
                            Alterar dados do outorgado
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Seletor explícito de Nacionalidade e Naturalidade na Declaração de Residência */}
                    {tpl.slug === "decl-residencia-naval" && (
                      <div className="p-3 bg-slate-50 border border-slate-200/90 rounded-xl space-y-2 text-xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <span className="font-bold text-[#0B1739] block">
                              Dados complementares do Declarante (Nacionalidade e Naturalidade)
                            </span>
                            <span className="text-[11px] text-slate-500">
                              Informe ou confirme a nacionalidade e a cidade/estado natal para a declaração oficial.
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => setShowCustomerNatModal(true)}
                            className="font-bold text-[#075BFF] hover:underline cursor-pointer shrink-0 text-xs"
                          >
                            Editar nacionalidade / naturalidade
                          </button>
                        </div>

                        <div className="text-[11px] text-slate-600 flex items-center justify-between gap-2 pt-1 border-t border-slate-200/60">
                          <span>
                            <strong>Nacionalidade:</strong> {customerNacionalidade || "Não informada"} |{" "}
                            <strong>Naturalidade:</strong> {customerNaturalidade || "Não informada"}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Falta de Dados: Mensagem Clara + Botão "Completar dados" */}
                    {isGeneratingThis && isBlockedForRequiredFields && (
                      <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold block">
                              Faltam: {missingForThisDoc.join(", ")}.
                            </span>
                            <span className="text-[11px] text-amber-800">
                              Complete as informações pendentes para liberar a geração deste documento.
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (tpl.slug === "proc-representacao-naval") {
                              setShowOutorgadoModal(true);
                            } else if (
                              missingForThisDoc.some((f) => f.includes("Embarcação") || f.includes("Inscrição") || f.includes("Proprietário"))
                            ) {
                              setShowQuickVesselModal(true);
                            } else if (missingForThisDoc.some((f) => f.includes("Responsável") || f.includes("Funcionário"))) {
                              setShowQuickStaffModal(true);
                            } else {
                              setShowQuickVesselModal(true);
                            }
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-colors cursor-pointer shrink-0"
                        >
                          <Edit className="h-3 w-3" />
                          <span>Completar dados</span>
                        </button>
                      </div>
                    )}

                    {/* Gerenciamento de Anexo Pronto quando "Anexar documento pronto" estiver ativo */}
                    {isAttachingThis && (
                      <div className="p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-2 text-xs">
                        {selection.attachedFile ? (
                          <div className="space-y-2">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-emerald-200">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                                  <CheckCircle2 className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                  <span className="font-bold text-slate-800 truncate block">
                                    {selection.attachedFile.name}
                                  </span>
                                  <span className="text-[11px] text-emerald-700">
                                    Documento pronto anexado ao processo.
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {/* Visualizar */}
                                <button
                                  type="button"
                                  onClick={() =>
                                    openStoredFile({
                                      generated_file_url: selection.attachedFile?.url,
                                      name: selection.attachedFile?.name,
                                    })
                                  }
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
                                >
                                  <Eye className="h-3.5 w-3.5 text-[#075BFF]" />
                                  <span>Visualizar</span>
                                </button>

                                {/* Substituir */}
                                <label className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-emerald-300 hover:bg-emerald-50 text-emerald-800 text-xs font-semibold cursor-pointer">
                                  <span>Substituir</span>
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

                                {/* Remover */}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveAttachedFile(tpl.id)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-red-600 hover:bg-red-50 text-xs font-semibold cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  <span>Remover</span>
                                </button>
                              </div>
                            </div>

                            {/* Histórico de versões anteriores do anexo */}
                            {Array.isArray((selection.attachedFile as any)?.previousVersions) &&
                              (selection.attachedFile as any).previousVersions.length > 0 && (
                                <div className="mt-2.5 pt-2 border-t border-emerald-100 space-y-1.5">
                                  <span className="text-[11px] font-semibold text-emerald-900 block">
                                    Versões anteriores deste anexo:
                                  </span>
                                  <div className="space-y-1">
                                    {(selection.attachedFile as any).previousVersions.map(
                                      (prevVer: any, vIdx: number) => (
                                        <div
                                          key={prevVer.id || vIdx}
                                          className="flex items-center justify-between bg-emerald-50/80 px-2.5 py-1.5 rounded border border-emerald-200/60 text-[11px]"
                                        >
                                          <div className="flex items-center gap-1.5 truncate mr-2">
                                            <span className="text-slate-500 font-mono text-[10px]">
                                              v{(selection.attachedFile as any).previousVersions.length - vIdx}:
                                            </span>
                                            <span className="truncate text-slate-700 font-medium">
                                              {prevVer.name}
                                            </span>
                                            {prevVer.replacedAt && (
                                              <span className="text-[10px] text-slate-400">
                                                ({new Date(prevVer.replacedAt).toLocaleDateString()})
                                              </span>
                                            )}
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              openStoredFile({
                                                generated_file_url: prevVer.url,
                                                name: prevVer.name,
                                              })
                                            }
                                            className="btn-prev-ver inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-medium cursor-pointer shrink-0"
                                          >
                                            <Eye className="h-3 w-3" />
                                            <span>Visualizar versão anterior</span>
                                          </button>
                                        </div>
                                      )
                                    )}
                                  </div>
                                </div>
                              )}
                          </div>
                        ) : (
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                              <span className="font-bold text-emerald-950 block">
                                Enviar documento pronto
                              </span>
                              <span className="text-[11px] text-slate-600">
                                Se você já possui este documento preenchido e assinado fora do
                                sistema, selecione o arquivo PDF.
                              </span>
                            </div>

                            <label className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shrink-0 transition-colors">
                              {selection.isUploading ? (
                                <>
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  <span>Enviando...</span>
                                </>
                              ) : (
                                <>
                                  <Upload className="h-3.5 w-3.5" />
                                  <span>Selecionar arquivo</span>
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
                          </div>
                        )}
                      </div>
                    )}

                    {/* 5. DETALHES RECOLHIDOS (Quando usar e ver detalhes) */}
                    <div>
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedDetails((prev) => ({ ...prev, [tpl.id]: !prev[tpl.id] }))
                        }
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                      >
                        {isDetailsExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5" />
                        )}
                        <span>Quando usar e ver detalhes</span>
                      </button>

                      {isDetailsExpanded && (
                        <div className="mt-2.5 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-2.5 animate-in fade-in duration-150">
                          <p className="leading-relaxed text-slate-600">{tpl.description}</p>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 text-[11px]">
                            <div>
                              <span className="text-slate-400 block">Fonte Oficial e Norma:</span>
                              <span className="font-semibold text-slate-800">
                                {tpl.officialSource}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 block">Data de Conferência:</span>
                              <span className="font-semibold text-slate-800">
                                {tpl.validationDate}
                              </span>
                            </div>
                          </div>

                          {tpl.slug === "proc-representacao-naval" && (
                            <div className="pt-2 border-t border-slate-200/60 text-[11px] space-y-1">
                              <span className="font-bold text-slate-900 block">
                                Outorgado configurado:
                              </span>
                              {companyData?.procurador_nome ? (
                                <p className="text-slate-700">
                                  Pessoa Física: {companyData.procurador_nome} (CPF:{" "}
                                  {companyData.procurador_cpf || "Não informado"})
                                </p>
                              ) : (
                                <p className="text-slate-700">
                                  Pessoa Jurídica: {companyData?.name || currentCompany?.name} (CNPJ:{" "}
                                  {companyData?.cnpj || currentCompany?.cnpj || "Não informado"})
                                </p>
                              )}
                            </div>
                          )}

                          {!tpl.status && (
                            <div className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded-lg">
                              {tpl.reviewReason || "Modelo em revisão técnica pela equipe."}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* 7. AÇÃO PRINCIPAL (BARRA COMPACTA NA PARTE INFERIOR) */}
        {/* ========================================================================= */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[#0B1739]">
                {templatesToGenerate.length === 1
                  ? "1 documento pronto para gerar"
                  : `${templatesToGenerate.length} documentos prontos para gerar`}
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500 font-medium">
                {templatesAttached.length} anexado(s)
              </span>
            </div>

            {/* Aviso explícito de documentos com dados pendentes */}
            {pendingTemplatesSelected.length > 0 && (
              <p className="text-xs text-amber-700 font-medium flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                <span>
                  {pendingTemplatesSelected.length === 1
                    ? "1 documento precisa de dados: "
                    : `${pendingTemplatesSelected.length} documentos precisam de dados: `}
                  <strong>{pendingTemplatesSelected.map((t) => t.name).join(", ")}</strong>.
                </span>
              </p>
            )}
          </div>

          <button
            type="button"
            id="btn-generate-documents"
            disabled={isGenerating || templatesToGenerate.length === 0}
            onClick={handleGenerateBatchDocuments}
            className="px-6 py-3 rounded-xl bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
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
                    ? "Nenhum documento pronto"
                    : templatesToGenerate.length === 1
                    ? "Gerar 1 documento"
                    : `Gerar ${templatesToGenerate.length} documentos`}
                </span>
              </>
            )}
          </button>
        </div>

        {/* ========================================================================= */}
        {/* 8. DOCUMENTOS JÁ GERADOS (HISTÓRICO COM VERSÕES ANTERIORES) */}
        {/* ========================================================================= */}
        <div id="secao-documentos-gerados" className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileCheck2 className="h-5 w-5 text-[#075BFF]" />
              <h2 className="text-base font-bold text-[#0B1739]">
                Documentos gerados ({groupedGeneratedDocs.length})
              </h2>
              {generatedDocsList.length > groupedGeneratedDocs.length && (
                <span className="text-xs text-slate-500 font-medium">
                  ({generatedDocsList.length} arquivos incluindo versões anteriores)
                </span>
              )}
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

          <p className="text-xs text-slate-500">
            Abaixo é exibida a versão mais recente de cada documento ({groupedGeneratedDocs.length} agrupado{groupedGeneratedDocs.length === 1 ? "" : "s"}). As versões anteriores permanecem preservadas e acessíveis no expansível.
          </p>

          {isLoadingGeneratedDocs ? (
            <div className="p-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-[#075BFF]" />
              <span>Carregando documentos persistidos...</span>
            </div>
          ) : groupedGeneratedDocs.length === 0 ? (
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
              {groupedGeneratedDocs.map(({ groupKey, latestDoc, previousDocs, totalVersions }) => {
                const isExpanded = !!expandedPreviousVersions[groupKey];

                return (
                  <div key={groupKey} data-doc-group={groupKey} data-doc-name={latestDoc.name} className="py-4 space-y-2.5">
                    {/* Versão Mais Recente */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-8 h-9 rounded-lg bg-red-500 text-white flex flex-col items-center justify-center font-bold shrink-0 shadow-2xs select-none">
                          <span className="text-[9px] font-black tracking-tighter leading-none mt-0.5">
                            PDF
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-xs font-bold text-slate-900 truncate">
                              {latestDoc.name}
                            </h4>
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-blue-50 text-[#075BFF] border border-blue-200">
                              v{latestDoc.version || 1} (mais recente)
                            </span>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-500 mt-0.5">
                            <span>
                              Gerado em: {new Date(latestDoc.created_at).toLocaleString("pt-BR")}
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
                          onClick={() => openStoredFile(latestDoc)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer shadow-2xs"
                        >
                          <Eye className="h-3.5 w-3.5 text-[#075BFF]" />
                          <span>Visualizar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadStoredFile(latestDoc)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-bold cursor-pointer shadow-2xs"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>Baixar</span>
                        </button>
                      </div>
                    </div>

                    {/* Botão e Accordion de Versões Anteriores */}
                    {previousDocs.length > 0 && (
                      <div className="pl-11 pt-1">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedPreviousVersions((prev) => ({
                              ...prev,
                              [groupKey]: !prev[groupKey],
                            }))
                          }
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#075BFF] hover:underline cursor-pointer"
                        >
                          <History className="h-3.5 w-3.5" />
                          <span>
                            {isExpanded
                              ? `Ocultar versões anteriores`
                              : `Ver versões anteriores (${previousDocs.length})`}
                          </span>
                          <ChevronDown
                            className={`h-3.5 w-3.5 transition-transform duration-200 ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                          />
                        </button>

                        {isExpanded && (
                          <div className="mt-2.5 p-3 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-2">
                            <span className="text-[11px] font-bold text-slate-600 block">
                              Histórico de versões deste documento ({previousDocs.length} anterior{previousDocs.length === 1 ? "" : "es"}):
                            </span>
                            <div className="divide-y divide-slate-200/60">
                              {previousDocs.map((prevDoc) => (
                                <div
                                  key={prevDoc.id}
                                  className="py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                                >
                                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-slate-200 text-slate-700">
                                      v{prevDoc.version || 1}
                                    </span>
                                    <span className="text-xs text-slate-700 font-medium truncate">
                                      {prevDoc.name}
                                    </span>
                                    <span className="text-[11px] text-slate-400">
                                      ({new Date(prevDoc.created_at).toLocaleString("pt-BR")})
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => openStoredFile(prevDoc)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-[11px] font-semibold cursor-pointer"
                                    >
                                      <Eye className="h-3 w-3 text-[#075BFF]" />
                                      <span>Visualizar</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => downloadStoredFile(prevDoc)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-900 text-white text-[11px] font-bold cursor-pointer"
                                    >
                                      <Download className="h-3 w-3" />
                                      <span>Baixar</span>
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Comprimento (metros)
                  </label>
                  <input
                    type="text"
                    value={quickVesselLength}
                    onChange={(e) => setQuickVesselLength(e.target.value)}
                    placeholder="Ex: 7.50"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-[#0B1739] font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">
                    Nº do Casco / Chassi
                  </label>
                  <input
                    type="text"
                    value={quickVesselHull}
                    onChange={(e) => setQuickVesselHull(e.target.value)}
                    placeholder="Ex: BR-XYZ12345678"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-[#0B1739] font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* SEÇÃO PROPRIETÁRIO DA EMBARCAÇÃO (Sem fallback presumido) */}
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">
                    Proprietário atual da embarcação <strong className="text-red-500">*</strong>
                  </label>
                  {customer && (
                    <button
                      type="button"
                      onClick={() => {
                        setQuickVesselOwnerName(customer.fantasy_name || customer.name || "");
                        setQuickVesselOwnerCpf(customer.cpf_cnpj || customer.document || "");
                      }}
                      className="text-[11px] font-bold text-[#075BFF] hover:underline cursor-pointer"
                    >
                      Copiar do requerente
                    </button>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-600">
                    Nome completo / Razão Social do Proprietário
                  </label>
                  <input
                    type="text"
                    value={quickVesselOwnerName}
                    onChange={(e) => setQuickVesselOwnerName(e.target.value)}
                    placeholder="Ex: José Carlos da Silva (ou nome do requerente se for o mesmo)"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-[#0B1739] font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-600">
                    CPF / CNPJ do Proprietário
                  </label>
                  <input
                    type="text"
                    value={quickVesselOwnerCpf}
                    onChange={(e) => setQuickVesselOwnerCpf(e.target.value)}
                    placeholder="Ex: 000.000.000-00"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-[#0B1739] font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <p className="text-[10px] text-slate-400">
                    A plataforma não presume que o requerente seja o proprietário. Informe o titular constante do documento ou confirme o vínculo.
                  </p>
                </div>
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

      {/* MODAL: CONFIGURAÇÃO E DADOS DO OUTORGADO DA PROCURAÇÃO (PF OU PJ) */}
      <Dialog open={showOutorgadoModal} onOpenChange={setShowOutorgadoModal}>
        <DialogContent className="max-w-lg p-6 rounded-2xl bg-white border border-slate-200 max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSaveOutorgado}>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#075BFF] flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-[#0B1739]">
                    Dados do Outorgado (Procurador)
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 mt-0.5">
                    Defina quem recebe os poderes de representação náutica perante a Autoridade Marítima.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-4 text-xs">
              {/* Seletor PF vs PJ */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <label className="text-xs font-bold text-[#0B1739] block">
                  Tipo de Outorgado
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setOutorgadoType("pf")}
                    className={`p-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all flex flex-col items-center gap-1 ${
                      outorgadoType === "pf"
                        ? "border-[#075BFF] bg-blue-50/60 text-[#075BFF] font-bold"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span>Pessoa Física (PF)</span>
                    <span className="text-[10px] text-slate-400 font-normal">Exige Nome e CPF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOutorgadoType("pj")}
                    className={`p-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all flex flex-col items-center gap-1 ${
                      outorgadoType === "pj"
                        ? "border-[#075BFF] bg-blue-50/60 text-[#075BFF] font-bold"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span>Pessoa Jurídica (PJ)</span>
                    <span className="text-[10px] text-slate-400 font-normal">Exige Razão Social e CNPJ</span>
                  </button>
                </div>
              </div>

              {/* CAMPOS PESSOA FÍSICA */}
              {outorgadoType === "pf" && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Nome completo do Outorgado <strong className="text-red-500">*</strong>
                    </label>
                    <input
                      type="text"
                      required
                      value={outorgadoPfNome}
                      onChange={(e) => setOutorgadoPfNome(e.target.value)}
                      placeholder="Ex: Carlos Eduardo de Oliveira"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-[#0B1739] font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">
                        CPF <strong className="text-red-500">*</strong>
                      </label>
                      <input
                        type="text"
                        required
                        value={outorgadoPfCpf}
                        onChange={(e) => setOutorgadoPfCpf(e.target.value)}
                        placeholder="Ex: 000.000.000-00"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-[#0B1739] font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">
                        RG / Órgão Emissor
                      </label>
                      <input
                        type="text"
                        value={outorgadoPfRg}
                        onChange={(e) => setOutorgadoPfRg(e.target.value)}
                        placeholder="Ex: 12.345.678-9 SSP/SP"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-[#0B1739] font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">
                        Nacionalidade
                      </label>
                      <input
                        type="text"
                        value={outorgadoPfNacionalidade}
                        onChange={(e) => setOutorgadoPfNacionalidade(e.target.value)}
                        placeholder="Ex: Brasileira (opcional)"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-[#0B1739] font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">
                        Estado Civil
                      </label>
                      <input
                        type="text"
                        value={outorgadoPfEstadoCivil}
                        onChange={(e) => setOutorgadoPfEstadoCivil(e.target.value)}
                        placeholder="Ex: Casado(a) / Solteiro(a)"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-[#0B1739] font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">
                        Registro Profissional / CREA
                      </label>
                      <input
                        type="text"
                        value={outorgadoPfCrea}
                        onChange={(e) => setOutorgadoPfCrea(e.target.value)}
                        placeholder="Ex: CREA-SP 123456 (opcional)"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-[#0B1739] font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Endereço Profissional / Domicílio
                    </label>
                    <input
                      type="text"
                      value={outorgadoPfEndereco}
                      onChange={(e) => setOutorgadoPfEndereco(e.target.value)}
                      placeholder="Ex: Av. Ana Costa, 100, Sala 10 - Santos/SP"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-[#0B1739] font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">
                        Telefone
                      </label>
                      <input
                        type="text"
                        value={outorgadoPfTelefone}
                        onChange={(e) => setOutorgadoPfTelefone(e.target.value)}
                        placeholder="Ex: (13) 99999-9999"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-[#0B1739] font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">
                        E-mail
                      </label>
                      <input
                        type="email"
                        value={outorgadoPfEmail}
                        onChange={(e) => setOutorgadoPfEmail(e.target.value)}
                        placeholder="Ex: contato@despachante.com.br"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-[#0B1739] font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* CAMPOS PESSOA JURÍDICA */}
              {outorgadoType === "pj" && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Razão Social <strong className="text-red-500">*</strong>
                    </label>
                    <input
                      type="text"
                      required
                      value={outorgadoPjRazao}
                      onChange={(e) => setOutorgadoPjRazao(e.target.value)}
                      placeholder="Ex: Despachadoria Náutica Santos Ltda"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-[#0B1739] font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">
                      CNPJ <strong className="text-red-500">*</strong>
                    </label>
                    <input
                      type="text"
                      required
                      value={outorgadoPjCnpj}
                      onChange={(e) => setOutorgadoPjCnpj(e.target.value)}
                      placeholder="Ex: 00.000.000/0001-00"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-[#0B1739] font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">
                      Endereço da Sede Social <strong className="text-red-500">*</strong>
                    </label>
                    <input
                      type="text"
                      required
                      value={outorgadoPjEndereco}
                      onChange={(e) => setOutorgadoPjEndereco(e.target.value)}
                      placeholder="Ex: Rua do Comércio, 120 - Centro, Santos/SP"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-[#0B1739] font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">
                        Telefone de Contato
                      </label>
                      <input
                        type="text"
                        value={outorgadoPjTelefone}
                        onChange={(e) => setOutorgadoPjTelefone(e.target.value)}
                        placeholder="Ex: (13) 3234-5678"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-[#0B1739] font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-700">
                        E-mail de Contato
                      </label>
                      <input
                        type="email"
                        value={outorgadoPjEmail}
                        onChange={(e) => setOutorgadoPjEmail(e.target.value)}
                        placeholder="Ex: contato@empresa.com.br"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-[#0B1739] font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowOutorgadoModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSavingOutorgado}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {isSavingOutorgado ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                <span>Salvar outorgado</span>
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: NACIONALIDADE E NATURALIDADE DO DECLARANTE */}
      <Dialog open={showCustomerNatModal} onOpenChange={setShowCustomerNatModal}>
        <DialogContent className="max-w-md p-6 rounded-2xl bg-white border border-slate-200">
          <form onSubmit={handleSaveCustomerNat}>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#075BFF] flex items-center justify-center shrink-0">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-[#0B1739]">
                    Nacionalidade e Naturalidade
                  </DialogTitle>
                  <DialogDescription className="text-xs text-slate-500 mt-0.5">
                    Preencha ou confirme estes dados documentais para emissão da Declaração de Residência.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Nacionalidade
                </label>
                <input
                  type="text"
                  value={customerNacionalidade}
                  onChange={(e) => setCustomerNacionalidade(e.target.value)}
                  placeholder="Ex: Brasileira"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-[#0B1739] font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Naturalidade (Cidade / Estado ou País de Origem)
                </label>
                <input
                  type="text"
                  value={customerNaturalidade}
                  onChange={(e) => setCustomerNaturalidade(e.target.value)}
                  placeholder="Ex: Santos/SP ou São Paulo/SP"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-[#0B1739] font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>
            </div>

            <DialogFooter className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCustomerNatModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSavingCustomerNat}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {isSavingCustomerNat ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
                <span>Salvar dados</span>
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
