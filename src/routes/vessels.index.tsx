import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { 
  Search, 
  Plus, 
  ArrowRight, 
  Pencil, 
  ChevronDown, 
  Loader2, 
  AlertCircle, 
  X,
  User,
  ExternalLink
} from "lucide-react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/routes/dashboard";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { VesselEditModal } from "@/components/vessels/VesselEditModal";
import { toast } from "sonner";

export const Route = createFileRoute("/vessels/")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: (search.q as string) || undefined,
    category: (search.category as string) || undefined,
    sort: (search.sort as "asc" | "desc") || "asc",
  }),
  component: () => (
    <ProtectedRoute>
      <DashboardLayout>
        <VesselsListPage />
      </DashboardLayout>
    </ProtectedRoute>
  ),
});

// Componente para desenhar o ícone náutico da embarcação baseado no tipo
function VesselSilhouetteIcon({ type, name, className = "w-9 h-7 text-[#0B1739]" }: { type?: string; name?: string; className?: string }) {
  const t = (type || name || "").toLowerCase();

  // Veleiro
  if (t.includes("veleiro") || t.includes("vela") || t.includes("mar azul")) {
    return (
      <svg 
        viewBox="0 0 48 36" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg" 
        className={className}
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      >
        <path d="M6 28L10 32C18 34 30 34 38 32L42 28H6Z" />
        <path d="M22 28V6" />
        <path d="M22 8L34 22H22" />
        <path d="M20 12L10 24H20" />
      </svg>
    );
  }

  // Iate / Barco de Passeio / Estrela do Mar
  if (t.includes("iate") || t.includes("estrela") || t.includes("passageiro") || t.includes("pesca") || t.includes("comercial")) {
    return (
      <svg 
        viewBox="0 0 48 36" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg" 
        className={className}
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      >
        <path d="M4 27L8 31C16 33 32 33 40 31L44 27H4Z" />
        <path d="M12 27L15 20H33L36 27" />
        <path d="M18 20V14H30V20" />
        <path d="M24 14V9" />
      </svg>
    );
  }

  // Lancha / Padrão (Aurora, Brisa, Pérola)
  return (
    <svg 
      viewBox="0 0 48 32" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      stroke="currentColor"
      strokeWidth="2"
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

function VesselsListPage() {
  const searchParams = Route.useSearch();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const companyId = profile?.company_id;

  // Estados de Filtro e Busca
  const [searchTerm, setSearchTerm] = useState(searchParams.q || "");
  const [categoryFilter, setCategoryFilter] = useState(searchParams.category || "all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(searchParams.sort || "asc");

  // Dados do backend
  const [vessels, setVessels] = useState<any[]>([]);
  const [processes, setProcesses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  // Modal de Edição de Embarcação
  const [editingVessel, setEditingVessel] = useState<any | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Sincronizar parâmetros na URL
  const updateQueryParams = useCallback((query: string, category: string, sort: "asc" | "desc") => {
    navigate({
      to: "/vessels",
      search: {
        q: query.trim() || undefined,
        category: category !== "all" ? category : undefined,
        sort: sort !== "asc" ? sort : undefined,
      },
      replace: true,
    });
  }, [navigate]);

  // Carregar dados de embarcações e processos
  const loadVesselsData = useCallback(async () => {
    if (!companyId) return;
    setIsLoading(true);
    setIsError(false);

    try {
      // 1. Buscar Embarcações com cliente vinculado
      const { data: vesData, error: vesError } = await supabase
        .from("vessels")
        .select(`
          *,
          customer:customers!vessels_customer_id_fkey(id, name, cpf_cnpj, email, phone)
        `)
        .eq("company_id", companyId);

      if (vesError) throw vesError;

      // 2. Buscar Processos da empresa para contagem por embarcação
      const { data: procData, error: procError } = await supabase
        .from("processes")
        .select("id, vessel_id, customer_id, status")
        .eq("company_id", companyId);

      if (procError) throw procError;

      setVessels(vesData || []);
      setProcesses(procData || []);
    } catch (err) {
      console.error("Erro ao carregar relação de embarcações:", err);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadVesselsData();
  }, [loadVesselsData]);

  // Normalização e Filtragem da Lista
  const filteredVessels = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();

    const mapped = vessels.map((v) => {
      const vesselName = v.name || "Embarcação sem nome";
      const regNumber = v.registration_number ? v.registration_number : "Inscrição não informada";
      const customerName = v.customer?.fantasy_name || v.customer?.name || (v.customer_id ? "Cliente vinculado" : "Vínculo pendente");
      
      // Normalização de Categoria Amigável
      let categoryDisplay = "Esporte e recreio";
      const rawCat = (v.category || "").toLowerCase();
      if (rawCat.includes("comercial") || rawCat.includes("profissional") || rawCat.includes("pesca") || rawCat.includes("carga") || rawCat.includes("apoio")) {
        categoryDisplay = "Profissional";
      } else if (rawCat.includes("esporte") || rawCat.includes("recreio") || rawCat.includes("moto") || rawCat.includes("jet")) {
        categoryDisplay = "Esporte e recreio";
      } else if (v.category) {
        categoryDisplay = v.category;
      }

      // Contagem de Serviços da Embarcação
      const servicesCount = processes.filter((p) => p.vessel_id === v.id).length;

      return {
        ...v,
        displayName: vesselName,
        displayRegNumber: regNumber,
        displayCustomerName: customerName,
        displayCategory: categoryDisplay,
        servicesCount,
      };
    });

    // 1. Filtro por Busca (Nome, Inscrição ou Cliente)
    let list = mapped;
    if (term) {
      list = list.filter((item) => {
        const nameMatch = item.displayName.toLowerCase().includes(term);
        const regMatch = item.displayRegNumber.toLowerCase().includes(term);
        const custMatch = item.displayCustomerName.toLowerCase().includes(term);
        return nameMatch || regMatch || custMatch;
      });
    }

    // 2. Filtro por Categoria
    if (categoryFilter !== "all") {
      list = list.filter((item) => {
        if (categoryFilter === "profissional") {
          return item.displayCategory.toLowerCase().includes("profissional") || item.displayCategory.toLowerCase().includes("comercial");
        }
        if (categoryFilter === "esporte_recreio") {
          return item.displayCategory.toLowerCase().includes("esporte") || item.displayCategory.toLowerCase().includes("recreio");
        }
        return true;
      });
    }

    // 3. Ordenação A-Z ou Z-A
    list.sort((a, b) => {
      const cmp = a.displayName.localeCompare(b.displayName, "pt-BR", { sensitivity: "base" });
      return sortOrder === "asc" ? cmp : -cmp;
    });

    return list;
  }, [vessels, processes, searchTerm, categoryFilter, sortOrder]);

  // Manipulação de Busca
  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    updateQueryParams(val, categoryFilter, sortOrder);
  };

  // Manipulação de Categoria
  const handleCategoryChange = (val: string) => {
    setCategoryFilter(val);
    updateQueryParams(searchTerm, val, sortOrder);
  };

  // Manipulação de Ordenação
  const handleSortChange = (val: "asc" | "desc") => {
    setSortOrder(val);
    updateQueryParams(searchTerm, categoryFilter, val);
  };

  // Limpar Filtros
  const handleClearFilters = () => {
    setSearchTerm("");
    setCategoryFilter("all");
    setSortOrder("asc");
    updateQueryParams("", "all", "asc");
  };

  // Abrir Modal de Edição
  const handleEditVessel = (vessel: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingVessel(vessel);
    setIsEditModalOpen(true);
  };

  // Sucesso na Edição
  const handleEditSuccess = () => {
    setIsEditModalOpen(false);
    setEditingVessel(null);
    loadVesselsData();
  };

  // Estado de Erro
  if (isError) {
    return (
      <div className="max-w-6xl mx-auto py-16 px-4 text-center space-y-4">
        <div className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto border border-red-100">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-bold text-[#0B1739]">Erro ao carregar embarcações</h2>
        <p className="text-sm text-slate-500">
          Não foi possível consultar a relação de embarcações desta empresa.
        </p>
        <div className="pt-2">
          <button
            type="button"
            onClick={loadVesselsData}
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
      {/* 1. CABEÇALHO DA PÁGINA + BOTÃO DE AÇÃO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0B1739] tracking-tight">
            Relação de embarcações
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Consulte suas embarcações e os clientes vinculados.
          </p>
        </div>

        <div>
          <Link
            to="/vessels/novo"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#075BFF] hover:bg-blue-600 text-white text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Cadastrar embarcação</span>
          </Link>
        </div>
      </div>

      {/* 2. BARRA DE PESQUISA & FILTROS */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-2.5 sm:p-3 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Campo de Busca */}
        <div className="relative w-full sm:flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Pesquisar por embarcação, inscrição ou cliente..."
            className="w-full pl-10 pr-9 py-2 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => handleSearchChange("")}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              title="Limpar pesquisa"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Dropdowns de Categoria e Ordenação */}
        <div className="w-full sm:w-auto flex items-center gap-2.5 shrink-0">
          {/* Filtro de Categoria */}
          <div className="relative inline-block flex-1 sm:flex-none">
            <select
              value={categoryFilter}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full sm:w-auto appearance-none pl-3.5 pr-8 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all cursor-pointer"
            >
              <option value="all">Todas as categorias</option>
              <option value="esporte_recreio">Esporte e recreio</option>
              <option value="profissional">Profissional</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-3 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
          </div>

          {/* Ordenação A-Z / Z-A */}
          <div className="relative inline-block flex-1 sm:flex-none">
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

      {/* 3. LISTAGEM PRINCIPAL DE EMBARCAÇÕES */}
      <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
        {/* Cabeçalho da Tabela em Desktop */}
        <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3.5 bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          <div className="col-span-4">Embarcação</div>
          <div className="col-span-3">Cliente vinculado</div>
          <div className="col-span-2">Categoria</div>
          <div className="col-span-1">Serviços</div>
          <div className="col-span-2 text-right">Ações</div>
        </div>

        {/* Conteúdo da Tabela */}
        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-xs text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin text-[#075BFF]" />
            <span>Carregando relação de embarcações...</span>
          </div>
        ) : filteredVessels.length === 0 ? (
          <div className="py-16 text-center space-y-3 px-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#075BFF] flex items-center justify-center mx-auto border border-blue-100">
              <VesselSilhouetteIcon className="h-6 w-6" />
            </div>
            <p className="font-bold text-slate-800 text-sm">
              {searchTerm || categoryFilter !== "all"
                ? "Nenhuma embarcação encontrada com os filtros selecionados"
                : "Nenhuma embarcação cadastrada nesta empresa"}
            </p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {searchTerm || categoryFilter !== "all"
                ? "Tente alterar os termos pesquisados ou limpe os filtros."
                : "Cadastre novas embarcações vinculadas a clientes para gerenciar processos e documentos."}
            </p>
            {searchTerm || categoryFilter !== "all" ? (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  <span>Limpar filtros</span>
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
            {filteredVessels.map((v) => (
              <div
                key={v.id}
                className="p-4 sm:px-6 sm:py-4 grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 items-center hover:bg-slate-50/40 transition-colors"
              >
                {/* Coluna 1: Embarcação (Ícone, Nome e Inscrição) */}
                <div className="md:col-span-4 min-w-0 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 text-[#0B1739] flex items-center justify-center shrink-0 border border-slate-100">
                    <VesselSilhouetteIcon type={v.vessel_type} name={v.displayName} className="w-7 h-5 text-[#0B1739]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#0B1739] truncate">
                      {v.displayName}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">
                      {v.displayRegNumber}
                    </p>
                  </div>
                </div>

                {/* Coluna 2: Cliente Vinculado */}
                <div className="md:col-span-3 text-xs text-slate-600 flex items-center justify-between md:block">
                  <span className="md:hidden text-[11px] font-semibold text-slate-400">Cliente vinculado:</span>
                  {v.customer?.id ? (
                    <Link
                      to="/customers/$id"
                      params={{ id: v.customer.id }}
                      search={{ from: "vessels" }}
                      className="font-medium text-[#075BFF] hover:underline truncate block"
                    >
                      {v.displayCustomerName}
                    </Link>
                  ) : (
                    <span className="text-slate-500 font-medium block truncate">
                      {v.displayCustomerName}
                    </span>
                  )}
                </div>

                {/* Coluna 3: Categoria */}
                <div className="md:col-span-2 text-xs text-slate-600 flex items-center justify-between md:block">
                  <span className="md:hidden text-[11px] font-semibold text-slate-400">Categoria:</span>
                  <span className="truncate block font-medium">{v.displayCategory}</span>
                </div>

                {/* Coluna 4: Serviços */}
                <div className="md:col-span-1 text-xs text-slate-600 flex items-center justify-between md:block">
                  <span className="md:hidden text-[11px] font-semibold text-slate-400">Serviços:</span>
                  <span className="font-semibold text-slate-700">{v.servicesCount}</span>
                </div>

                {/* Coluna 5: Ações (Abrir + Lápis Editar) */}
                <div className="md:col-span-2 flex items-center justify-end gap-2">
                  <Link
                    to="/vessels/$id"
                    params={{ id: v.id }}
                    search={{ from: "vessels" }}
                    className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-xl border border-blue-200 bg-white hover:bg-blue-50/60 text-[#075BFF] text-xs font-bold shadow-2xs transition-all cursor-pointer whitespace-nowrap"
                  >
                    <span>Abrir</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>

                  <button
                    type="button"
                    onClick={(e) => handleEditVessel(v, e)}
                    aria-label="Editar embarcação"
                    className="p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-blue-50/60 text-slate-500 hover:text-[#075BFF] hover:border-blue-200 transition-all cursor-pointer"
                    title="Editar embarcação"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Rodapé da Listagem */}
        <div className="px-5 py-3.5 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400">
          <span>
            {filteredVessels.length === 1 
              ? "1 embarcação encontrada" 
              : `${filteredVessels.length} embarcações encontradas`}
          </span>
          <span>
            Cada embarcação permanece vinculada ao seu cliente.
          </span>
        </div>
      </div>

      {/* Modal de Edição de Embarcação (Reutilizado com o formulário padrão) */}
      <VesselEditModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingVessel(null);
        }}
        vessel={editingVessel}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
}
