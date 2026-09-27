import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { 
  Search, 
  User, 
  ArrowRight, 
  ChevronDown, 
  Loader2, 
  AlertCircle, 
  X,
  Building2,
  FolderOpen
} from "lucide-react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/routes/dashboard";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/processes/")({
  validateSearch: (search: Record<string, unknown>) => ({
    tab: (search.tab as "clients" | "vessels") || "clients",
    q: (search.q as string) || undefined,
    sort: (search.sort as "asc" | "desc") || "asc",
  }),
  component: () => (
    <ProtectedRoute>
      <DashboardLayout>
        <ProcessesMainPage />
      </DashboardLayout>
    </ProtectedRoute>
  ),
});

// Ícone náutico estilizado oficial do NavalDocs Pro
function NauticalBoatIcon({ className = "w-6 h-6 text-[#0B1739]" }: { className?: string }) {
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
      <path d="M4 23.5C12 23.5 15 25.5 24 25.5C33 25.5 36 23.5 44 23.5" />
      <path d="M6 18.5L9 24C14 26 34 26 39 24L42 18.5H6Z" />
      <path d="M12 18.5L14 13H34L36 18.5" />
      <path d="M24 13V6" />
      <path d="M24 7L31 10H24" />
    </svg>
  );
}

function ProcessesMainPage() {
  const searchParams = Route.useSearch();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const companyId = profile?.company_id;

  // Estados de navegação e filtros
  const [activeTab, setActiveTab] = useState<"clients" | "vessels">(searchParams.tab || "clients");
  const [clientSearch, setClientSearch] = useState(searchParams.tab === "clients" ? (searchParams.q || "") : "");
  const [vesselSearch, setVesselSearch] = useState(searchParams.tab === "vessels" ? (searchParams.q || "") : "");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(searchParams.sort || "asc");

  // Dados do backend
  const [customers, setCustomers] = useState<any[]>([]);
  const [vessels, setVessels] = useState<any[]>([]);
  const [processes, setProcesses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  // Sincronizar parâmetros na URL
  const updateQueryParams = useCallback((newTab: "clients" | "vessels", query: string, sort: "asc" | "desc") => {
    navigate({
      to: "/processes",
      search: {
        tab: newTab,
        q: query.trim() || undefined,
        sort: sort !== "asc" ? sort : undefined,
      },
      replace: true,
    });
  }, [navigate]);

  // Carregar dados gerais do Supabase
  const loadData = useCallback(async () => {
    if (!companyId) return;
    setIsLoading(true);
    setIsError(false);

    try {
      // 1. Carregar Clientes da empresa
      const { data: custData, error: custError } = await supabase
        .from("customers")
        .select("id, name, fantasy_name, cpf_cnpj, customer_type, status")
        .eq("company_id", companyId);

      if (custError) throw custError;

      // 2. Carregar Embarcações da empresa com vínculo do cliente
      const { data: vesData, error: vesError } = await supabase
        .from("vessels")
        .select(`
          id, 
          name, 
          registration_number, 
          category, 
          customer_id,
          customer:customers!vessels_customer_id_fkey(id, name, fantasy_name)
        `)
        .eq("company_id", companyId);

      if (vesError) throw vesError;

      // 3. Carregar Processos / Serviços da empresa
      const { data: procData, error: procError } = await supabase
        .from("processes")
        .select("id, title, process_type, customer_id, vessel_id, status, created_at")
        .eq("company_id", companyId);

      if (procError) throw procError;

      setCustomers(custData || []);
      setVessels(vesData || []);
      setProcesses(procData || []);
    } catch (err) {
      console.error("Erro ao carregar dados de processos:", err);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // -------------------------------------------------------------
  // MAPEAMENTO DA ABA CLIENTES
  // -------------------------------------------------------------
  const clientsList = useMemo(() => {
    // Mapear cada cliente com contagem de embarcações vinculadas e contagem de serviços
    const mapped = customers.map((c) => {
      const clientName = c.fantasy_name || c.name || "Cliente sem nome";
      
      // Contagem de processos/serviços deste cliente
      const clientProcesses = processes.filter((p) => p.customer_id === c.id);
      const servicesCount = clientProcesses.length;

      // Embarcações distintas vinculadas nos processos OU cadastradas no cliente
      const directVesselIds = vessels.filter((v) => v.customer_id === c.id).map((v) => v.id);
      const processVesselIds = clientProcesses.map((p) => p.vessel_id).filter(Boolean);
      const uniqueVessels = new Set([...directVesselIds, ...processVesselIds]);
      const vesselsCount = uniqueVessels.size;

      // Tipo de pessoa (Física ou Jurídica)
      const cleanDoc = (c.cpf_cnpj || "").replace(/\D/g, "");
      const isPJ = c.customer_type === "PJ" || cleanDoc.length > 11;
      const personTypeLabel = isPJ ? "Pessoa jurídica" : "Pessoa física";

      return {
        id: c.id,
        name: clientName,
        personTypeLabel,
        vesselsCount,
        servicesCount,
        rawCustomer: c,
      };
    });

    // Filtro por termo de busca
    const term = clientSearch.toLowerCase().trim();
    let filtered = mapped;
    if (term) {
      filtered = mapped.filter((item) => {
        const nameMatch = item.name.toLowerCase().includes(term);
        const docMatch = (item.rawCustomer.cpf_cnpj || "").includes(term);
        return nameMatch || docMatch;
      });
    }

    // Ordenação A-Z ou Z-A
    filtered.sort((a, b) => {
      const cmp = a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" });
      return sortOrder === "asc" ? cmp : -cmp;
    });

    return filtered;
  }, [customers, vessels, processes, clientSearch, sortOrder]);

  // -------------------------------------------------------------
  // MAPEAMENTO DA ABA EMBARCAÇÕES
  // -------------------------------------------------------------
  const vesselsList = useMemo(() => {
    const mapped = vessels.map((v) => {
      const vesselName = v.name || "Embarcação sem nome";
      const regNumber = v.registration_number ? v.registration_number : "Inscrição não informada";
      const categoryLabel = v.category || "Não informada";

      // Proprietário / Cliente atual
      const currentCustomer = v.customer?.fantasy_name || v.customer?.name || (v.customer_id ? "Cliente vinculado" : "Vínculo pendente");

      // Contagem de serviços vinculados a esta embarcação
      const servicesCount = processes.filter((p) => p.vessel_id === v.id).length;

      return {
        id: v.id,
        name: vesselName,
        registrationNumber: regNumber,
        category: categoryLabel,
        customerName: currentCustomer,
        servicesCount,
        rawVessel: v,
      };
    });

    // Filtro por termo de busca
    const term = vesselSearch.toLowerCase().trim();
    let filtered = mapped;
    if (term) {
      filtered = mapped.filter((item) => {
        const nameMatch = item.name.toLowerCase().includes(term);
        const regMatch = item.registrationNumber.toLowerCase().includes(term);
        return nameMatch || regMatch;
      });
    }

    // Ordenação A-Z ou Z-A
    filtered.sort((a, b) => {
      const cmp = a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" });
      return sortOrder === "asc" ? cmp : -cmp;
    });

    return filtered;
  }, [vessels, processes, vesselSearch, sortOrder]);

  // Troca de aba
  const handleTabChange = (tab: "clients" | "vessels") => {
    setActiveTab(tab);
    const query = tab === "clients" ? clientSearch : vesselSearch;
    updateQueryParams(tab, query, sortOrder);
  };

  // Troca de ordenação
  const handleSortChange = (newSort: "asc" | "desc") => {
    setSortOrder(newSort);
    const query = activeTab === "clients" ? clientSearch : vesselSearch;
    updateQueryParams(activeTab, query, newSort);
  };

  // Alteração no input de busca
  const handleSearchInput = (val: string) => {
    if (activeTab === "clients") {
      setClientSearch(val);
      updateQueryParams("clients", val, sortOrder);
    } else {
      setVesselSearch(val);
      updateQueryParams("vessels", val, sortOrder);
    }
  };

  // Limpeza de busca
  const handleClearSearch = () => {
    handleSearchInput("");
  };

  // Renderização de Erro Geral
  if (isError) {
    return (
      <div className="max-w-6xl mx-auto py-16 px-4 text-center space-y-4">
        <div className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto border border-red-100">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold text-[#0B1739]">Erro ao carregar processos</h2>
        <p className="text-sm text-slate-500">
          Não foi possível carregar a relação de processos desta empresa.
        </p>
        <div className="pt-2">
          <button
            type="button"
            onClick={loadData}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#075BFF] text-white text-xs font-semibold hover:bg-blue-600 transition-colors shadow-xs cursor-pointer"
          >
            <span>Tentar novamente</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-2 sm:py-6 px-2 sm:px-4 space-y-6">
      {/* 1. CABEÇALHO DA PÁGINA */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#0B1739] tracking-tight">
          Processos
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Encontre os serviços pelo cliente ou pela embarcação.
        </p>
      </div>

      {/* 2. DOIS CARTÕES SELETORES (ABAS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6" role="tablist">
        {/* CARTÃO 1: CLIENTES */}
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "clients"}
          onClick={() => handleTabChange("clients")}
          className={`flex items-center gap-4 p-5 sm:p-6 rounded-2xl transition-all text-left cursor-pointer ${
            activeTab === "clients"
              ? "border-2 border-[#075BFF] bg-[#EEF4FF]/50 shadow-xs"
              : "border border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/40"
          }`}
        >
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
              activeTab === "clients"
                ? "bg-white text-[#075BFF] border-blue-200 shadow-2xs"
                : "bg-slate-50 text-slate-500 border-slate-200/80"
            }`}
          >
            <User className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-bold text-[#0B1739]">
              Clientes
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              Buscar pelo nome do cliente
            </p>
          </div>
        </button>

        {/* CARTÃO 2: EMBARCAÇÕES */}
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "vessels"}
          onClick={() => handleTabChange("vessels")}
          className={`flex items-center gap-4 p-5 sm:p-6 rounded-2xl transition-all text-left cursor-pointer ${
            activeTab === "vessels"
              ? "border-2 border-[#075BFF] bg-[#EEF4FF]/50 shadow-xs"
              : "border border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/40"
          }`}
        >
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
              activeTab === "vessels"
                ? "bg-white text-[#075BFF] border-blue-200 shadow-2xs"
                : "bg-slate-50 text-slate-500 border-slate-200/80"
            }`}
          >
            <NauticalBoatIcon className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-bold text-[#0B1739]">
              Embarcações
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 truncate">
              Buscar pelo nome da embarcação
            </p>
          </div>
        </button>
      </div>

      {/* 3. BARRA DE PESQUISA & ORDENAÇÃO */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-2.5 sm:p-3 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Campo de Busca com Lupa */}
        <div className="relative w-full sm:flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={activeTab === "clients" ? clientSearch : vesselSearch}
            onChange={(e) => handleSearchInput(e.target.value)}
            placeholder={activeTab === "clients" ? "Pesquisar cliente..." : "Pesquisar embarcação..."}
            className="w-full pl-10 pr-9 py-2 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all"
          />
          {(activeTab === "clients" ? clientSearch : vesselSearch) && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              title="Limpar pesquisa"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Dropdown de Ordenação A-Z / Z-A */}
        <div className="w-full sm:w-auto flex justify-end shrink-0">
          <div className="relative inline-block w-full sm:w-auto">
            <select
              value={sortOrder}
              onChange={(e) => handleSortChange(e.target.value as "asc" | "desc")}
              className="w-full sm:w-auto appearance-none pl-3.5 pr-8 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all cursor-pointer"
            >
              <option value="asc">Ordem: A-Z</option>
              <option value="desc">Ordem: Z-A</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-3 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* 4. LISTAGEM PRINCIPAL CONFORME A ABA ATIVA */}
      {isLoading ? (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-16 flex flex-col items-center justify-center gap-3 text-xs text-slate-400 shadow-xs">
          <Loader2 className="h-6 w-6 animate-spin text-[#075BFF]" />
          <span>Carregando dados dos processos...</span>
        </div>
      ) : activeTab === "clients" ? (
        /* ========================================================================= */
        /* ABA 1: TABELA DE CLIENTES                                                */
        /* ========================================================================= */
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
          {/* Cabeçalho da Tabela em Desktop */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3.5 bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            <div className="col-span-5">Cliente</div>
            <div className="col-span-3">Embarcações vinculadas</div>
            <div className="col-span-2">Serviços</div>
            <div className="col-span-2 text-right">Ações</div>
          </div>

          {/* Conteúdo da Tabela */}
          {clientsList.length === 0 ? (
            <div className="py-16 text-center space-y-3 px-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#075BFF] flex items-center justify-center mx-auto border border-blue-100">
                <User className="h-6 w-6" />
              </div>
              <p className="font-bold text-slate-800 text-sm">
                {clientSearch 
                  ? "Nenhum cliente encontrado com os termos pesquisados" 
                  : "Nenhum cliente cadastrado nesta empresa"}
              </p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {clientSearch
                  ? "Tente buscar por outro nome ou limpe o filtro de pesquisa."
                  : "Cadastre novos clientes para gerenciar processos, embarcações e serviços."}
              </p>
              {clientSearch ? (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <span>Limpar pesquisa</span>
                  </button>
                </div>
              ) : (
                <div className="pt-2">
                  <Link
                    to="/customers/novo"
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-semibold shadow-xs"
                  >
                    <span>Cadastrar cliente</span>
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {clientsList.map((c) => {
                const vesselText = c.vesselsCount === 1 ? "1 embarcação" : `${c.vesselsCount} embarcações`;
                const serviceText = c.servicesCount === 1 ? "1 serviço" : `${c.servicesCount} serviços`;

                return (
                  <div 
                    key={c.id} 
                    className="p-4 sm:px-6 sm:py-4 grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 items-center hover:bg-slate-50/40 transition-colors"
                  >
                    {/* Coluna 1: Cliente (Nome e Tipo) */}
                    <div className="md:col-span-5 min-w-0">
                      <p className="text-sm font-bold text-[#0B1739] truncate">
                        {c.name}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {c.personTypeLabel}
                      </p>
                    </div>

                    {/* Coluna 2: Embarcações Vinculadas */}
                    <div className="md:col-span-3 text-xs text-slate-600 flex items-center justify-between md:block">
                      <span className="md:hidden text-[11px] font-semibold text-slate-400">Embarcações:</span>
                      <span className="font-medium text-slate-700">{vesselText}</span>
                    </div>

                    {/* Coluna 3: Serviços */}
                    <div className="md:col-span-2 text-xs text-slate-600 flex items-center justify-between md:block">
                      <span className="md:hidden text-[11px] font-semibold text-slate-400">Serviços:</span>
                      <span className="font-medium text-slate-700">{serviceText}</span>
                    </div>

                    {/* Coluna 4: Ação Abrir Cliente */}
                    <div className="md:col-span-2 flex justify-end">
                      <Link
                        to="/customers/$id"
                        params={{ id: c.id }}
                        search={{ from: "processes" }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-blue-200 bg-white hover:bg-blue-50/60 text-[#075BFF] text-xs font-bold shadow-2xs transition-all cursor-pointer whitespace-nowrap"
                      >
                        <span>Abrir cliente</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Rodapé da Tabela de Clientes */}
          <div className="px-5 py-3.5 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400">
            <span>
              {clientsList.length === 1 
                ? "1 cliente encontrado" 
                : `${clientsList.length} clientes encontrados`}
            </span>
            <span>
              Selecione um cliente para acessar suas embarcações e serviços.
            </span>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* ABA 2: TABELA DE EMBARCAÇÕES                                             */
        /* ========================================================================= */
        <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
          {/* Cabeçalho da Tabela em Desktop */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3.5 bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            <div className="col-span-4">Embarcação</div>
            <div className="col-span-3">Cliente atual</div>
            <div className="col-span-2">Categoria</div>
            <div className="col-span-1">Serviços</div>
            <div className="col-span-2 text-right">Ações</div>
          </div>

          {/* Conteúdo da Tabela */}
          {vesselsList.length === 0 ? (
            <div className="py-16 text-center space-y-3 px-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#075BFF] flex items-center justify-center mx-auto border border-blue-100">
                <NauticalBoatIcon className="h-6 w-6" />
              </div>
              <p className="font-bold text-slate-800 text-sm">
                {vesselSearch 
                  ? "Nenhuma embarcação encontrada com os termos pesquisados" 
                  : "Nenhuma embarcação cadastrada nesta empresa"}
              </p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {vesselSearch
                  ? "Tente buscar por outro nome ou inscrição, ou limpe o filtro."
                  : "Cadastre embarcações vinculadas a clientes para gerenciar os serviços náuticos."}
              </p>
              {vesselSearch ? (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <span>Limpar pesquisa</span>
                  </button>
                </div>
              ) : (
                <div className="pt-2">
                  <Link
                    to="/vessels/novo"
                    className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-semibold shadow-xs"
                  >
                    <span>Cadastrar embarcação</span>
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {vesselsList.map((v) => {
                const serviceText = v.servicesCount === 1 ? "1 serviço" : `${v.servicesCount} serviços`;

                return (
                  <div 
                    key={v.id} 
                    className="p-4 sm:px-6 sm:py-4 grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 items-center hover:bg-slate-50/40 transition-colors"
                  >
                    {/* Coluna 1: Embarcação (Nome e Inscrição) */}
                    <div className="md:col-span-4 min-w-0">
                      <p className="text-sm font-bold text-[#0B1739] truncate">
                        {v.name}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {v.registrationNumber}
                      </p>
                    </div>

                    {/* Coluna 2: Cliente Atual */}
                    <div className="md:col-span-3 text-xs text-slate-600 flex items-center justify-between md:block">
                      <span className="md:hidden text-[11px] font-semibold text-slate-400">Cliente atual:</span>
                      <span className="truncate block font-medium text-slate-700">{v.customerName}</span>
                    </div>

                    {/* Coluna 3: Categoria */}
                    <div className="md:col-span-2 text-xs text-slate-600 flex items-center justify-between md:block">
                      <span className="md:hidden text-[11px] font-semibold text-slate-400">Categoria:</span>
                      <span className="truncate block">{v.category}</span>
                    </div>

                    {/* Coluna 4: Serviços */}
                    <div className="md:col-span-1 text-xs text-slate-600 flex items-center justify-between md:block">
                      <span className="md:hidden text-[11px] font-semibold text-slate-400">Serviços:</span>
                      <span className="font-medium text-slate-700">{serviceText}</span>
                    </div>

                    {/* Coluna 5: Ação Abrir Embarcação */}
                    <div className="md:col-span-2 flex justify-end">
                      <Link
                        to="/vessels/$id"
                        params={{ id: v.id }}
                        search={{ from: "processes" }}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-blue-200 bg-white hover:bg-blue-50/60 text-[#075BFF] text-xs font-bold shadow-2xs transition-all cursor-pointer whitespace-nowrap"
                      >
                        <span>Abrir embarcação</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Rodapé da Tabela de Embarcações */}
          <div className="px-5 py-3.5 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400">
            <span>
              {vesselsList.length === 1 
                ? "1 embarcação encontrada" 
                : `${vesselsList.length} embarcações encontradas`}
            </span>
            <span>
              Selecione uma embarcação para acessar seus serviços.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
