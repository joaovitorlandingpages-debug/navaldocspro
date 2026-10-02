import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { 
  ArrowLeft,
  Search, 
  Plus, 
  Pencil, 
  ChevronRight, 
  ChevronDown, 
  Mail, 
  Phone, 
  FileText, 
  Loader2, 
  Check, 
  X, 
  Eye, 
  Download, 
  AlertCircle,
  FolderOpen
} from "lucide-react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/routes/dashboard";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { safeString } from "@/utils/safe-string";
import { maskPhone } from "@/lib/br-format";
import { CustomerEditModal } from "@/components/customers/CustomerEditModal";
import { openStoredFile, downloadStoredFile } from "@/utils/file-preview";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import type { ExtractedCustomerData, UploadedCustomerFile } from "@/components/customers/CustomerDocumentUploadModal";

export const Route = createFileRoute("/customers/$id")({
  validateSearch: (search: Record<string, unknown>): {
    from?: string;
    search?: string;
    page?: number;
    type?: string;
  } => ({
    from: (search.from as string) || undefined,
    search: (search.search as string) || undefined,
    page: (search.page as number) || undefined,
    type: (search.type as string) || undefined,
  }),
  component: () => (
    <ProtectedRoute>
      <DashboardLayout>
        <CustomerDetailsPage />
      </DashboardLayout>
    </ProtectedRoute>
  ),
});

// Ícone náutico estilizado conforme o design do NavalDocs Pro
function NauticalBoatIcon({ className = "w-7 h-7 text-[#0B1739]" }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 48 32" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* Casco */}
      <path d="M4 22L11 28H37L44 22L41 18H7L4 22Z" />
      {/* Cabine / Superestrutura estilizada */}
      <path d="M14 18L18 10H30L34 18" />
      {/* Linha do convés / mastro */}
      <path d="M24 10V4" />
    </svg>
  );
}

function CustomerDetailsPage() {
  const { id } = Route.useParams();
  const searchParams = Route.useSearch();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const companyId = profile?.company_id;

  // Estados principais
  const [customer, setCustomer] = useState<any | null>(null);
  const [isLoadingCustomer, setIsLoadingCustomer] = useState(true);
  const [customerError, setCustomerError] = useState(false);

  // Embarcações
  const [vessels, setVessels] = useState<any[]>([]);
  const [isLoadingVessels, setIsLoadingVessels] = useState(true);
  const [vesselProcessCounts, setVesselProcessCounts] = useState<Record<string, number>>({});

  // Documentos Gerados
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);
  const [docSearch, setDocSearch] = useState("");
  const [selectedVesselFilter, setSelectedVesselFilter] = useState("all");

  // Modal de edição
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // 1. Carregar Dados do Cliente
  const loadCustomer = useCallback(async () => {
    if (!companyId || !id) return;
    setIsLoadingCustomer(true);
    setCustomerError(false);

    try {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("id", id)
        .eq("company_id", companyId)
        .maybeSingle();

      if (error || !data) {
        setCustomerError(true);
      } else {
        setCustomer(data);
      }
    } catch (err) {
      console.error("Erro ao carregar cliente:", err);
      setCustomerError(true);
    } finally {
      setIsLoadingCustomer(false);
    }
  }, [companyId, id]);

  // 2. Carregar Embarcações Vinculadas & Contagem de Processos por Embarcação
  const loadVessels = useCallback(async () => {
    if (!companyId || !id) return;
    setIsLoadingVessels(true);

    try {
      // 2.1 Buscar embarcações onde o cliente é o proprietário atual
      const { data: directVessels, error: vError } = await supabase
        .from("vessels")
        .select("*")
        .eq("company_id", companyId)
        .eq("customer_id", id)
        .order("name", { ascending: true });

      if (vError) throw vError;

      // 2.2 Buscar processos deste cliente para calcular quantidade de serviços e identificar vínculos históricos
      const { data: customerProcesses, error: pError } = await supabase
        .from("processes")
        .select("id, vessel_id, title, process_type")
        .eq("company_id", companyId)
        .eq("customer_id", id);

      if (pError) throw pError;

      const counts: Record<string, number> = {};
      const processVesselIds = new Set<string>();

      (customerProcesses || []).forEach((p: any) => {
        if (p.vessel_id) {
          counts[p.vessel_id] = (counts[p.vessel_id] || 0) + 1;
          processVesselIds.add(p.vessel_id);
        }
      });
      setVesselProcessCounts(counts);

      let allVessels = directVessels || [];

      // Verificar se há embarcações de processos com vínculo histórico encerrado
      const directIds = new Set(allVessels.map((v: any) => v.id));
      const historicalIds = Array.from(processVesselIds).filter((vid) => !directIds.has(vid));

      if (historicalIds.length > 0) {
        const { data: histVessels } = await supabase
          .from("vessels")
          .select("*")
          .eq("company_id", companyId)
          .in("id", historicalIds);

        if (histVessels && histVessels.length > 0) {
          const taggedHistVessels = histVessels.map((hv: any) => ({
            ...hv,
            isHistorical: true,
          }));
          allVessels = [...allVessels, ...taggedHistVessels];
        }
      }

      // Ordenar alfabeticamente
      allVessels.sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""));
      setVessels(allVessels);
    } catch (err) {
      console.error("Erro ao carregar embarcações:", err);
    } finally {
      setIsLoadingVessels(false);
    }
  }, [companyId, id]);

  // 3. Carregar Documentos Gerados
  const loadGeneratedDocuments = useCallback(async () => {
    if (!companyId || !id) return;
    setIsLoadingDocs(true);

    try {
      // Buscar processos do cliente
      const { data: pData } = await supabase
        .from("processes")
        .select("id, title, process_type, vessel_id")
        .eq("company_id", companyId)
        .eq("customer_id", id);

      const processIds = (pData || []).map((p: any) => p.id);
      const processMap = new Map((pData || []).map((p: any) => [p.id, p]));

      // Buscar documentos gerados diretamente para este cliente OU para processos deste cliente
      let query = supabase
        .from("generated_documents")
        .select(`
          id,
          name,
          customer_id,
          vessel_id,
          process_id,
          generated_file_url,
          signed_file_url,
          created_at,
          vessels (
            id,
            name,
            category
          ),
          processes (
            id,
            title,
            process_type,
            customer_id,
            vessel_id
          )
        `)
        .eq("company_id", companyId);

      if (processIds.length > 0) {
        query = query.or(`customer_id.eq.${id},process_id.in.(${processIds.join(",")})`);
      } else {
        query = query.eq("customer_id", id);
      }

      query = query.order("created_at", { ascending: false });

      const { data: docsData, error: docsError } = await query;
      if (docsError) throw docsError;

      // Normalizar registros
      const list = (docsData || []).map((d: any) => {
        const proc = d.processes || processMap.get(d.process_id);
        const vesselName = d.vessels?.name || null;
        const serviceName = proc?.title || proc?.process_type || null;

        return {
          id: d.id,
          name: d.name || "Documento gerado",
          vessel_id: d.vessel_id || proc?.vessel_id,
          vesselName: vesselName,
          process_id: d.process_id || proc?.id,
          serviceName: serviceName,
          file_url: d.signed_file_url || d.generated_file_url,
          category: "generated-documents",
          created_at: d.created_at,
        };
      });

      // Buscar também documentos anexados / enviados via OCR para este cliente
      const { data: custDocs } = await supabase
        .from("customer_documents")
        .select("*")
        .eq("company_id", companyId)
        .eq("customer_id", id)
        .order("created_at", { ascending: false });

      const uploadedList = (custDocs || []).map((cd: any) => ({
        id: cd.id,
        name: cd.file_name || "Documento anexado",
        vessel_id: null,
        vesselName: null,
        process_id: null,
        serviceName: "Documento Anexado (OCR/Manual)",
        file_url: cd.file_path,
        category: "customer-documents",
        created_at: cd.created_at,
      }));

      // Unir documentos gerados e anexados, ordenados por data
      const combinedDocs = [...uploadedList, ...list].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setDocuments(combinedDocs);
    } catch (err) {
      console.error("Erro ao carregar documentos:", err);
    } finally {
      setIsLoadingDocs(false);
    }
  }, [companyId, id]);

  const handleCustomerExtracted = async (extracted: ExtractedCustomerData, files: UploadedCustomerFile[]) => {
    if (!customer?.id || !companyId) return;

    const updates: Record<string, any> = {};
    if (extracted.name && extracted.name !== customer.name) updates.name = extracted.name;
    if (extracted.cpf_cnpj && extracted.cpf_cnpj !== customer.cpf_cnpj) updates.cpf_cnpj = extracted.cpf_cnpj;
    if (extracted.rg && extracted.rg !== customer.rg) updates.rg = extracted.rg;
    if (extracted.birth_date && extracted.birth_date !== customer.birth_date) updates.birth_date = extracted.birth_date;
    if (extracted.email && extracted.email !== customer.email) updates.email = extracted.email;
    if (extracted.phone && extracted.phone !== customer.phone) updates.phone = extracted.phone;
    if (extracted.cep && extracted.cep !== customer.cep) updates.cep = extracted.cep;
    if (extracted.cidade && extracted.cidade !== customer.city) updates.city = extracted.cidade;
    if (extracted.uf && extracted.uf !== customer.state) updates.state = extracted.uf;
    if (extracted.logradouro && extracted.logradouro !== customer.address) updates.address = extracted.logradouro;

    try {
      if (Object.keys(updates).length > 0) {
        const { error } = await supabase
          .from("customers")
          .update(updates)
          .eq("id", customer.id)
          .eq("company_id", companyId);
        if (error) throw error;
        toast.success("Dados do cliente atualizados com base no documento conferido!");
      } else {
        toast.info("Documento conferido. Nenhum campo cadastral precisou de atualização.");
      }

      if (files.length > 0) {
        for (const f of files) {
          try {
            await supabase.from("customer_documents").insert({
              customer_id: customer.id,
              company_id: companyId,
              file_name: f.name,
              file_path: f.path || "",
              file_type: f.file?.type || "application/pdf",
              file_size: f.size || 0,
            });
          } catch (docErr) {
            console.warn("Erro ao vincular documento anexado:", docErr);
          }
        }
        toast.success("Documento salvo no histórico do cliente!");
      }

      await loadCustomer();
      await loadGeneratedDocuments();
    } catch (err: any) {
      console.error("Erro ao aplicar dados do documento:", err);
      toast.error("Erro ao atualizar cliente: " + (err.message || "Erro desconhecido"));
    }
  };

  // Aplica retorno da tela de conferência de leitura automática
  useEffect(() => {
    if (typeof window === "undefined" || !window.sessionStorage) return;
    const reviewResultStr = window.sessionStorage.getItem("ndp_review_result");
    if (reviewResultStr) {
      try {
        const result = JSON.parse(reviewResultStr);
        if (result.targetEntity === "customer") {
          const filesToAdd: UploadedCustomerFile[] = result.file ? [{
            file: null as any,
            id: result.file.id,
            path: result.file.path,
            name: result.file.name,
            size: result.file.size,
          }] : [];

          if (result.confirmed && result.fields) {
            handleCustomerExtracted(result.fields, filesToAdd);
          } else if (result.manual && filesToAdd.length > 0) {
            handleCustomerExtracted({}, filesToAdd);
          }
        }
      } catch (e) {
        console.warn("[customers.$id] Erro ao aplicar resultado da conferência:", e);
      }
      window.sessionStorage.removeItem("ndp_review_result");
    }
  }, [customer?.id, companyId, handleCustomerExtracted]);

  useEffect(() => {
    loadCustomer();
    loadVessels();
    loadGeneratedDocuments();
  }, [loadCustomer, loadVessels, loadGeneratedDocuments]);

  // Identificação mascarada do CPF/CNPJ
  const maskedDoc = useMemo(() => {
    if (!customer?.cpf_cnpj) return "Não informado";
    const digits = customer.cpf_cnpj.replace(/\D/g, "");
    if (digits.length > 11) {
      return "**.***.***/****-**";
    }
    return "***.***.***-**";
  }, [customer?.cpf_cnpj]);

  // Tipo de pessoa
  const clientTypeLabel = useMemo(() => {
    const digits = (customer?.cpf_cnpj || "").replace(/\D/g, "");
    return digits.length > 11 ? "Pessoa jurídica" : "Pessoa física";
  }, [customer?.cpf_cnpj]);

  // Nome exibido com prioridade para Fantasia se PJ
  const displayName = useMemo(() => {
    if (!customer) return "";
    if (clientTypeLabel === "Pessoa jurídica" && customer.fantasy_name?.trim()) {
      return customer.fantasy_name.trim();
    }
    return customer.name || "Cliente";
  }, [customer, clientTypeLabel]);

  // Filtro de documentos em memória (pesquisa e seleção de embarcação)
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      // Filtro de embarcação
      if (selectedVesselFilter !== "all") {
        if (doc.vessel_id !== selectedVesselFilter && doc.vesselName !== selectedVesselFilter) {
          return false;
        }
      }

      // Filtro de busca de texto
      if (docSearch.trim()) {
        const term = docSearch.toLowerCase().trim();
        const docName = (doc.name || "").toLowerCase();
        const vName = (doc.vesselName || "").toLowerCase();
        const sName = (doc.serviceName || "").toLowerCase();
        return docName.includes(term) || vName.includes(term) || sName.includes(term);
      }

      return true;
    });
  }, [documents, selectedVesselFilter, docSearch]);

  // Configuração do botão de retorno conforme a origem
  const backNavigation = useMemo(() => {
    if (searchParams.from === "processes") {
      return {
        label: "Voltar para processos",
        to: "/processes",
        search: {},
      };
    }
    return {
      label: "Voltar para clientes",
      to: "/customers",
      search: {
        search: searchParams.search || undefined,
        page: searchParams.page || undefined,
        type: searchParams.type || undefined,
      },
    };
  }, [searchParams]);

  // Estados de Carregamento e Erro Inicial
  if (isLoadingCustomer) {
    return (
      <div className="max-w-6xl mx-auto py-6 px-4 space-y-6">
        <div className="h-6 w-36 bg-slate-100 rounded-lg animate-pulse" />
        <div className="space-y-2">
          <div className="h-9 w-64 bg-slate-200 rounded-xl animate-pulse" />
          <div className="h-4 w-28 bg-slate-100 rounded-lg animate-pulse" />
        </div>
        <div className="h-28 bg-white border border-slate-200/90 rounded-2xl animate-pulse" />
        <div className="h-56 bg-white border border-slate-200/90 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (customerError || !customer) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center space-y-4">
        <div className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto border border-red-100">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold text-[#0B1739]">Cliente não encontrado</h2>
        <p className="text-sm text-slate-500">
          O cliente solicitado não existe ou você não possui permissão para visualizá-lo nesta empresa.
        </p>
        <div className="pt-2">
          <Link
            to="/customers"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#075BFF] text-white text-xs font-semibold hover:bg-blue-600 transition-colors shadow-xs"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar para clientes</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-2 sm:py-6 px-2 sm:px-4 space-y-6">
      {/* 1. NAVEGAÇÃO SUPERIOR: VOLTAR */}
      <div>
        <Link
          to={backNavigation.to}
          search={backNavigation.search}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-[#075BFF] hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>{backNavigation.label}</span>
        </Link>
      </div>

      {/* 2. CABEÇALHO DO CLIENTE + BOTÃO EDITAR */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0B1739] tracking-tight">
            {displayName}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {clientTypeLabel}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              navigate({
                to: "/documentos/anexar",
                search: {
                  tipo: "cliente",
                  modo: "editar",
                  id: customer.id,
                  returnTo: `/customers/${customer.id}`,
                } as any,
              });
            }}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-[#075BFF] text-xs font-semibold shadow-2xs transition-all shrink-0 cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5 text-[#075BFF]" />
            <span>Anexar doc / IA</span>
          </button>
          <button
            type="button"
            onClick={() => setIsEditModalOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-[#0B1739] text-xs font-semibold shadow-2xs hover:border-slate-300 transition-all shrink-0 cursor-pointer"
          >
            <Pencil className="h-3.5 w-3.5 text-slate-500" />
            <span>Editar cliente</span>
          </button>
        </div>
      </div>

      {/* 3. RESUMO: CPF/CNPJ, E-MAIL E TELEFONE */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
        {/* CPF / CNPJ */}
        <div className="space-y-1">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            {clientTypeLabel === "Pessoa jurídica" ? "CNPJ" : "CPF"}
          </p>
          <p className="text-sm font-medium text-[#0B1739]">
            {maskedDoc}
          </p>
        </div>

        {/* E-mail */}
        <div className="pt-3 sm:pt-0 sm:pl-6 space-y-1">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            E-mail
          </p>
          <p className="text-sm font-medium text-[#0B1739] truncate" title={customer.email || "Não informado"}>
            {customer.email || "Não informado"}
          </p>
        </div>

        {/* Telefone */}
        <div className="pt-3 sm:pt-0 sm:pl-6 space-y-1">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Telefone
          </p>
          <p className="text-sm font-medium text-[#0B1739]">
            {customer.phone ? maskPhone(customer.phone) : "Não informado"}
          </p>
        </div>
      </div>

      {/* 4. SEÇÃO: EMBARCAÇÕES VINCULADAS */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-[#0B1739]">
            Embarcações vinculadas
          </h2>

          <Link
            to="/vessels/novo"
            search={{ customerId: customer.id }}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-semibold shadow-xs transition-colors shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Cadastrar embarcação</span>
          </Link>
        </div>

        {isLoadingVessels ? (
          <div className="py-8 flex items-center justify-center gap-2 text-xs text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin text-[#075BFF]" />
            <span>Carregando embarcações...</span>
          </div>
        ) : vessels.length === 0 ? (
          <div className="py-10 text-center space-y-2 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            <p className="text-sm font-semibold text-slate-700">Nenhuma embarcação vinculada</p>
            <p className="text-xs text-slate-400">Cadastre uma nova embarcação para este cliente para começar.</p>
            <div className="pt-2">
              <Link
                to="/vessels/novo"
                search={{ customerId: customer.id }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#075BFF] text-white text-xs font-medium hover:bg-blue-600"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Cadastrar embarcação</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {vessels.map((vessel) => {
              const count = vesselProcessCounts[vessel.id] || 0;
              const serviceText = `${count} ${count === 1 ? "serviço vinculado" : "serviços vinculados"}`;
              const categoryText = vessel.category || vessel.vessel_type || "Esporte e recreio";

              return (
                <div
                  key={vessel.id}
                  onClick={() => {
                    navigate({
                      to: "/vessels/$id",
                      params: { id: vessel.id },
                      search: { from: "customer", customerId: customer.id },
                    });
                  }}
                  className="group flex items-center justify-between p-4 rounded-xl border border-slate-200/90 hover:border-[#075BFF]/50 bg-white hover:bg-blue-50/20 transition-all cursor-pointer shadow-2xs hover:shadow-xs"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="shrink-0 p-1.5 rounded-lg bg-slate-50 group-hover:bg-blue-50 transition-colors">
                      <NauticalBoatIcon className="w-8 h-8 text-[#0B1739] group-hover:text-[#075BFF] transition-colors" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm sm:text-base text-[#0B1739] group-hover:text-[#075BFF] transition-colors truncate">
                          {vessel.name || "Embarcação sem nome"}
                        </p>
                        {vessel.isHistorical && (
                          <span className="text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded">
                            Vínculo histórico
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">{categoryText}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{serviceText}</p>
                    </div>
                  </div>

                  <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-[#075BFF] group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                </div>
              );
            })}
          </div>
        )}

        {vessels.length > 0 && (
          <p className="text-xs text-slate-400 pt-1">
            Selecione uma embarcação para acessar seus serviços.
          </p>
        )}
      </div>

      {/* 5. SEÇÃO: DOCUMENTOS GERADOS */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
        <div>
          <h2 className="text-lg font-bold text-[#0B1739]">
            Documentos gerados
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Todos os documentos deste cliente, organizados por embarcação e serviço.
          </p>
        </div>

        {/* Barra de Filtros dos Documentos */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Busca por texto */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={docSearch}
              onChange={(e) => setDocSearch(e.target.value)}
              placeholder="Pesquisar documento..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all"
            />
            {docSearch && (
              <button
                type="button"
                onClick={() => setDocSearch("")}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filtro por Embarcação */}
          <div className="relative shrink-0 sm:w-56">
            <select
              value={selectedVesselFilter}
              onChange={(e) => setSelectedVesselFilter(e.target.value)}
              className="w-full appearance-none pl-3.5 pr-9 py-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] cursor-pointer"
            >
              <option value="all">Todas as embarcações</option>
              {vessels.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Tabela de Documentos no Desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-semibold text-slate-700">
                <th className="py-3 px-3 font-semibold">Documento</th>
                <th className="py-3 px-3 font-semibold">Embarcação</th>
                <th className="py-3 px-3 font-semibold">Serviço</th>
                <th className="py-3 px-3 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoadingDocs ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-xs text-slate-400">
                    <Loader2 className="h-5 w-5 text-[#075BFF] animate-spin mx-auto mb-2" />
                    <span>Carregando documentos...</span>
                  </td>
                </tr>
              ) : filteredDocuments.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-xs text-slate-400 space-y-2">
                    <FileText className="h-8 w-8 text-slate-200 mx-auto" />
                    <p className="font-semibold text-slate-700">
                      {documents.length === 0
                        ? "Nenhum documento gerado para este cliente"
                        : "Nenhum documento encontrado com os filtros aplicados"}
                    </p>
                    {(docSearch || selectedVesselFilter !== "all") && (
                      <button
                        type="button"
                        onClick={() => {
                          setDocSearch("");
                          setSelectedVesselFilter("all");
                        }}
                        className="text-xs text-[#075BFF] hover:underline font-medium"
                      >
                        Limpar filtros
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredDocuments.map((doc) => {
                  // Encontrar nome da embarcação se não estiver direto no doc
                  const vesselMatch = vessels.find((v) => v.id === doc.vessel_id);
                  const displayVessel = doc.vesselName || vesselMatch?.name || "Não informado";
                  const displayService = doc.serviceName || "Não informado";

                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Documento */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <FileText className="h-4 w-4 text-[#075BFF] shrink-0" />
                          <span className="text-xs sm:text-sm font-semibold text-[#0B1739]">
                            {doc.name}
                          </span>
                        </div>
                      </td>

                      {/* Embarcação */}
                      <td className="py-3.5 px-3 text-xs sm:text-sm text-slate-600">
                        {displayVessel}
                      </td>

                      {/* Serviço */}
                      <td className="py-3.5 px-3 text-xs sm:text-sm text-slate-600">
                        {doc.process_id ? (
                          <Link
                            to="/processes/$id"
                            params={{ id: doc.process_id }}
                            className="hover:text-[#075BFF] hover:underline"
                          >
                            {displayService}
                          </Link>
                        ) : (
                          displayService
                        )}
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Visualizar */}
                          <button
                            type="button"
                            onClick={() => openStoredFile(doc)}
                            className="p-1.5 text-[#075BFF] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Visualizar documento"
                            aria-label={`Visualizar ${doc.name}`}
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          {/* Baixar */}
                          <button
                            type="button"
                            onClick={() => downloadStoredFile(doc, doc.name)}
                            className="p-1.5 text-[#075BFF] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Baixar documento"
                            aria-label={`Baixar ${doc.name}`}
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Cards de Documentos no Mobile */}
        <div className="md:hidden divide-y divide-slate-100">
          {isLoadingDocs ? (
            <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 text-[#075BFF] animate-spin" />
              <span>Carregando documentos...</span>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs space-y-1">
              <p className="font-semibold text-slate-700">Nenhum documento encontrado</p>
            </div>
          ) : (
            filteredDocuments.map((doc) => {
              const vesselMatch = vessels.find((v) => v.id === doc.vessel_id);
              const displayVessel = doc.vesselName || vesselMatch?.name || "Não informado";
              const displayService = doc.serviceName || "Não informado";

              return (
                <div key={doc.id} className="py-3.5 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 text-[#075BFF] shrink-0" />
                      <p className="font-semibold text-xs text-[#0B1739] truncate">{doc.name}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openStoredFile(doc)}
                        className="p-1 text-[#075BFF] hover:bg-blue-50 rounded"
                        title="Visualizar"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadStoredFile(doc, doc.name)}
                        className="p-1 text-[#075BFF] hover:bg-blue-50 rounded"
                        title="Baixar"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-500 flex flex-wrap gap-x-4 gap-y-1 pl-6">
                    <span>Embarcação: <strong>{displayVessel}</strong></span>
                    <span>Serviço: <strong>{displayService}</strong></span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Rodapé da Seção de Documentos */}
        <div className="pt-2 text-xs text-slate-400">
          <span>
            {filteredDocuments.length}{" "}
            {filteredDocuments.length === 1 ? "documento encontrado" : "documentos encontrados"}
          </span>
        </div>
      </div>

      {/* MODAL DE EDIÇÃO DO CLIENTE */}
      {isEditModalOpen && customer && (
        <CustomerEditModal
          customer={customer}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onCustomerUpdated={() => {
            loadCustomer();
            setIsEditModalOpen(false);
            toast.success("Cliente atualizado com sucesso!");
          }}
        />
      )}


    </div>
  );
}
