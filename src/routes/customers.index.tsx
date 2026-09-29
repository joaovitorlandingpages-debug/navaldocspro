import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { 
  Users, 
  Search, 
  Plus, 
  Pencil, 
  ChevronRight, 
  ChevronDown, 
  Mail, 
  Phone, 
  MapPin, 
  FolderOpen, 
  Ship, 
  FileText, 
  Loader2, 
  Check, 
  X, 
  Eye, 
  Download, 
  Trash2, 
  AlertCircle,
  Folder,
  User,
  ArrowUpDown
} from "lucide-react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/routes/dashboard";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { safeString } from "@/utils/safe-string";
import { maskCpfCnpj } from "@/lib/br-format";
import { CustomerEditModal } from "@/components/customers/CustomerEditModal";
import { ModalLayout } from "@/components/ui/ModalLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomerSignaturesTab } from "@/components/customers/CustomerSignaturesTab";
import { FileUploader } from "@/components/FileUploader";
import { useFiles } from "@/hooks/useFiles";
import { Badge } from "@/components/ui/badge";
import { openStoredFile } from "@/utils/file-preview";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { toast } from "sonner";

export const Route = createFileRoute("/customers/")({
  validateSearch: (search: Record<string, unknown>): {
    search?: string;
    type?: string;
    page?: number;
  } => ({
    ...(search.search ? { search: search.search as string } : {}),
    ...(search.type ? { type: search.type as string } : {}),
    ...(search.page ? { page: Number(search.page) } : {}),
  }),
  component: () => (
    <ProtectedRoute>
      <DashboardLayout>
        <RelacaoClientesPage />
      </DashboardLayout>
    </ProtectedRoute>
  ),
});

type CustomerFilterType = "all" | "pf" | "pj";

function RelacaoClientesPage() {
  const navigate = useNavigate();
  const { profile, companyId: authCompanyId, isGlobalAdmin, loading: authLoading } = useAuth();
  const companyId = profile?.company_id || authCompanyId;

  // Estado de listagem
  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // Pesquisa, filtro, ordenação e paginação
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<CustomerFilterType>("all");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const toggleSort = () => {
    setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    setPage(1);
  };

  // Modais de Edição e Detalhes
  const [customerToEdit, setCustomerToEdit] = useState<any | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Sub-dados para a visualização de detalhes
  const [customerVessels, setCustomerVessels] = useState<any[]>([]);
  const [customerProcesses, setCustomerProcesses] = useState<any[]>([]);
  const [fileToDelete, setFileToDelete] = useState<{ id: string; name: string } | null>(null);

  const { files, deleteFile } = useFiles(selectedCustomer ? { customerId: selectedCustomer.id } : undefined);

  // Consulta e Busca no Banco de Dados
  const fetchCustomers = useCallback(async () => {
    if (authLoading) return;
    if (!companyId && !isGlobalAdmin) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setIsError(false);

    try {
      // Usar a chave estrangeira explícita 'processes!processes_customer_id_fkey' para evitar erro PGRST201 de ambiguidade
      let query = supabase
        .from("customers")
        .select("*, vessels(count), processes:processes!processes_customer_id_fkey(count)", { count: "exact" });

      if (companyId) {
        query = query.eq("company_id", companyId);
      }

      // Busca por nome, email ou CPF/CNPJ
      if (searchTerm.trim()) {
        const cleanTerm = safeString(searchTerm).trim();
        const digitsOnly = cleanTerm.replace(/\D/g, "");
        if (digitsOnly.length > 2) {
          query = query.or(`name.ilike.%${cleanTerm}%,email.ilike.%${cleanTerm}%,cpf_cnpj.ilike.%${cleanTerm}%,cpf_cnpj.ilike.%${digitsOnly}%`);
        } else {
          query = query.or(`name.ilike.%${cleanTerm}%,email.ilike.%${cleanTerm}%,cpf_cnpj.ilike.%${cleanTerm}%`);
        }
      }

      // Ordenação alfabética pelo nome
      query = query.order("name", { ascending: sortDirection === "asc" });

      // Paginação no servidor (20 por página)
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, count, error } = await query;
      if (error) throw error;

      // Filtro por tipo (PF / PJ)
      let list = data || [];
      if (filterType === "pf") {
        list = list.filter((c: any) => (c.cpf_cnpj || "").replace(/\D/g, "").length <= 11);
      } else if (filterType === "pj") {
        list = list.filter((c: any) => (c.cpf_cnpj || "").replace(/\D/g, "").length > 11);
      }

      setCustomers(list);
      setTotalCount(count !== null ? count : list.length);
    } catch (err) {
      console.error("Erro ao carregar clientes:", err);
      setIsError(true);
      toast.error("Erro ao carregar lista de clientes.");
    } finally {
      setIsLoading(false);
    }
  }, [companyId, isGlobalAdmin, authLoading, searchTerm, filterType, sortDirection, page]);

  // Debounce para a busca
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchCustomers]);

  // Carrega embarcações e processos vinculados quando o cliente selecionado abre
  useEffect(() => {
    if (!selectedCustomer?.id) {
      setCustomerVessels([]);
      setCustomerProcesses([]);
      return;
    }

    (async () => {
      const [{ data: vs }, { data: ps }] = await Promise.all([
        supabase
          .from("vessels")
          .select("id, name, registration_number, vessel_type, current_owner_name, status")
          .eq("customer_id", selectedCustomer.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("processes")
          .select("id, process_type, status, created_at")
          .eq("customer_id", selectedCustomer.id)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);
      setCustomerVessels(vs || []);
      setCustomerProcesses(ps || []);
    })();
  }, [selectedCustomer?.id]);

  const handleOpenDetails = (c: any) => {
    navigate({
      to: "/customers/$id",
      params: { id: c.id },
      search: {
        from: "customers",
        search: searchTerm || undefined,
        page: page > 1 ? page : undefined,
        type: filterType !== "all" ? filterType : undefined,
      },
    });
  };

  const getInitials = (name?: string) => {
    if (!name) return "CL";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const getClientType = (cpfCnpj?: string) => {
    const digits = (cpfCnpj || "").replace(/\D/g, "");
    return digits.length > 11 ? "Pessoa jurídica" : "Pessoa física";
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  return (
    <div className="max-w-6xl mx-auto py-2 sm:py-6 px-2 sm:px-4">
      {/* 1. CABEÇALHO DA PÁGINA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0B1739] tracking-tight">
            Relação de clientes
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Encontre um cliente e acesse suas embarcações, processos e documentos.
          </p>
        </div>

        <Link
          to="/customers/novo"
          className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-semibold shadow-xs transition-colors shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Cadastrar cliente</span>
        </Link>
      </div>

      {/* 2. CARTÃO PRINCIPAL: PESQUISA, FILTROS E TABELA */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-xs mb-8">
        {/* Barra Superior: Campo de Pesquisa + Dropdown de Filtro */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Campo de Busca */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              placeholder="Pesquisar por nome, CPF ou CNPJ..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setPage(1);
                }}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filtro por Tipo */}
          <div className="relative shrink-0 sm:w-48">
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value as CustomerFilterType);
                setPage(1);
              }}
              className="w-full appearance-none px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#075BFF]/20 focus:border-[#075BFF] transition-all pr-8 cursor-pointer"
            >
              <option value="all">Todos os clientes</option>
              <option value="pf">Pessoa física</option>
              <option value="pj">Pessoa jurídica</option>
            </select>
            <ChevronDown className="absolute right-3 top-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Subtítulo da Ordem e Ações Rápidas */}
        <div className="flex flex-wrap items-center justify-between gap-2 mt-3 mb-4 sm:mb-6 pl-1">
          <button
            type="button"
            onClick={toggleSort}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#075BFF] transition-colors cursor-pointer py-1 px-2 -ml-2 rounded-lg hover:bg-slate-100"
            title="Alternar ordem alfabética"
          >
            <ArrowUpDown className="h-3.5 w-3.5 text-slate-400 group-hover:text-[#075BFF]" />
            <span>Ordem alfabética • {sortDirection === "asc" ? "A–Z (Crescente)" : "Z–A (Decrescente)"}</span>
          </button>
          <span className="text-xs text-slate-400">
            {totalCount === 1 ? "1 cliente" : `${totalCount} clientes`}
          </span>
        </div>

        {/* TABELA DESKTOP */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-semibold text-slate-500">
                <th 
                  className="pb-3 px-3 font-semibold cursor-pointer select-none hover:text-[#075BFF] transition-colors"
                  onClick={toggleSort}
                  title="Clique para alternar ordenação alfabética"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Cliente</span>
                    <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-[10px] text-slate-400 font-normal">({sortDirection === "asc" ? "A-Z" : "Z-A"})</span>
                  </div>
                </th>
                <th className="pb-3 px-3 font-semibold">Tipo</th>
                <th className="pb-3 px-3 font-semibold text-center">Embarcações</th>
                <th className="pb-3 px-3 font-semibold text-center">Processos</th>
                <th className="pb-3 px-3 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/80">
              {isLoading ? (
                // Skeleton de Carregamento
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="py-4 px-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-100" />
                        <div className="space-y-1.5">
                          <div className="h-4 w-36 bg-slate-100 rounded" />
                          <div className="h-3 w-24 bg-slate-50 rounded" />
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-3"><div className="h-3.5 w-20 bg-slate-100 rounded" /></td>
                    <td className="py-4 px-3 text-center"><div className="h-3.5 w-6 bg-slate-100 rounded mx-auto" /></td>
                    <td className="py-4 px-3 text-center"><div className="h-3.5 w-6 bg-slate-100 rounded mx-auto" /></td>
                    <td className="py-4 px-3 text-right"><div className="h-3.5 w-16 bg-slate-100 rounded ml-auto" /></td>
                  </tr>
                ))
              ) : isError ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-xs text-red-500">
                    <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
                    <p className="font-semibold text-sm text-red-600">Erro ao carregar lista de clientes</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      Ocorreu um erro ao carregar os clientes. Verifique sua conexão e tente novamente.
                    </p>
                    <button
                      type="button"
                      onClick={() => fetchCustomers()}
                      className="mt-3 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                    >
                      Tentar novamente
                    </button>
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-slate-400">
                    <Users className="h-10 w-10 text-slate-200 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-700">
                      {searchTerm ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
                    </p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      {searchTerm
                        ? "Tente buscar por outro termo ou limpe a pesquisa."
                        : "Cadastre seu primeiro cliente para começar a vincular embarcações e processos."}
                    </p>
                    {searchTerm ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchTerm("");
                          setPage(1);
                        }}
                        className="mt-4 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold"
                      >
                        Limpar pesquisa
                      </button>
                    ) : (
                      <Link
                        to="/customers/novo"
                        className="inline-flex items-center gap-1.5 mt-4 px-5 py-2.5 rounded-xl bg-[#075BFF] text-white text-xs font-semibold shadow-xs"
                      >
                        <Plus className="h-4 w-4" />
                        <span>Cadastrar cliente</span>
                      </Link>
                    )}
                  </td>
                </tr>
              ) : (
                customers.map((c) => {
                  const vesselCount = c.vessels?.[0]?.count || (Array.isArray(c.vessels) ? c.vessels.length : 0);
                  const processCount = c.processes?.[0]?.count || (Array.isArray(c.processes) ? c.processes.length : 0);
                  const initials = getInitials(c.name);
                  const typeLabel = getClientType(c.cpf_cnpj);

                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* Cliente */}
                      <td className="py-4 px-3">
                        <div 
                          className="flex items-center gap-3 cursor-pointer"
                          onClick={() => handleOpenDetails(c)}
                        >
                          <div className="w-9 h-9 rounded-full bg-[#EEF4FF] text-[#075BFF] font-bold text-xs flex items-center justify-center shrink-0 border border-blue-100">
                            {initials}
                          </div>
                          <div>
                            <p className="font-bold text-sm text-[#0B1739] group-hover:text-[#075BFF] transition-colors">
                              {c.name}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Tipo */}
                      <td className="py-4 px-3 text-xs text-slate-500">
                        {typeLabel}
                      </td>

                      {/* Embarcações */}
                      <td className="py-4 px-3 text-xs text-slate-700 font-medium text-center">
                        {vesselCount}
                      </td>

                      {/* Processos */}
                      <td className="py-4 px-3 text-xs text-slate-700 font-medium text-center">
                        {processCount}
                      </td>

                      {/* Ações */}
                      <td className="py-4 px-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setCustomerToEdit(c);
                            }}
                            className="p-1.5 text-slate-400 hover:text-[#075BFF] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Editar cliente"
                            aria-label={`Editar ${c.name}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenDetails(c)}
                            className="text-xs font-semibold text-[#075BFF] hover:underline flex items-center gap-0.5 cursor-pointer pl-2"
                          >
                            <span>Abrir</span>
                            <ChevronRight className="h-3.5 w-3.5" />
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

        {/* LISTA EM CARDS MOBILE */}
        <div className="md:hidden divide-y divide-slate-100">
          {isLoading ? (
            <div className="py-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 text-[#075BFF] animate-spin" />
              <span>Carregando clientes...</span>
            </div>
          ) : isError ? (
            <div className="py-12 text-center text-xs text-red-500">
              <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
              <p className="font-semibold text-sm text-red-600">Erro ao carregar lista de clientes</p>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                Ocorreu um erro ao carregar os clientes. Verifique sua conexão e tente novamente.
              </p>
              <button
                type="button"
                onClick={() => fetchCustomers()}
                className="mt-3 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
              >
                Tentar novamente
              </button>
            </div>
          ) : customers.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <Users className="h-8 w-8 text-slate-200 mx-auto mb-2" />
              <p className="font-semibold text-slate-700">
                {searchTerm ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                {searchTerm
                  ? "Tente buscar por outro termo ou limpe a pesquisa."
                  : "Cadastre seu primeiro cliente para começar a vincular embarcações e processos."}
              </p>
              {searchTerm ? (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setPage(1);
                  }}
                  className="mt-3 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Limpar pesquisa
                </button>
              ) : null}
            </div>
          ) : (
            customers.map((c) => {
              const vesselCount = c.vessels?.[0]?.count || 0;
              const processCount = c.processes?.[0]?.count || 0;
              const initials = getInitials(c.name);
              const typeLabel = getClientType(c.cpf_cnpj);

              return (
                <div
                  key={c.id}
                  className="py-4 space-y-3 cursor-pointer"
                  onClick={() => handleOpenDetails(c)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-[#EEF4FF] text-[#075BFF] font-bold text-xs flex items-center justify-center shrink-0 border border-blue-100">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-[#0B1739] truncate">{c.name}</p>
                        <p className="text-[11px] text-slate-400">{typeLabel}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => setCustomerToEdit(c)}
                        className="p-1.5 text-slate-400 hover:text-[#075BFF] rounded-lg"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 text-xs text-slate-600 bg-slate-50/70 p-2.5 rounded-xl">
                    <span><strong>{vesselCount}</strong> embarcações</span>
                    <span><strong>{processCount}</strong> processos</span>
                    <button
                      type="button"
                      onClick={() => handleOpenDetails(c)}
                      className="text-xs font-semibold text-[#075BFF] flex items-center gap-0.5"
                    >
                      <span>Abrir</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Rodapé da Listagem com Contagem e Paginação */}
        <div className="pt-4 mt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-400">
            {totalCount === 1 ? "1 cliente encontrado" : `${totalCount} clientes encontrados`}
          </p>

          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <span className="text-xs font-semibold text-slate-700">
                Página {page} de {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Próxima
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 3. MENSAGEM INFORMATIVA INFERIOR COM ÍCONE DE PASTA */}
      <div className="text-center py-6">
        <Folder className="h-8 w-8 text-slate-300 mx-auto mb-2" strokeWidth={1.5} />
        <p className="text-xs text-slate-400">
          Abra um cliente para consultar suas embarcações e documentos.
        </p>
      </div>

      {/* MODAL DE EDIÇÃO DE CLIENTE */}
      <CustomerEditModal
        isOpen={customerToEdit !== null}
        onClose={() => setCustomerToEdit(null)}
        customer={customerToEdit}
        onCustomerUpdated={() => fetchCustomers()}
      />

      {/* MODAL DE DETALHES DO CLIENTE */}
      <ModalLayout
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        title={selectedCustomer?.name || "Detalhes do Cliente"}
        maxWidth="4xl"
        footer={
          <div className="flex justify-between items-center w-full">
            <button
              type="button"
              onClick={() => {
                setCustomerToEdit(selectedCustomer);
                setIsDetailsOpen(false);
              }}
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
            >
              <Pencil className="h-3.5 w-3.5" />
              <span>Editar cadastro</span>
            </button>
            <button
              type="button"
              onClick={() => setIsDetailsOpen(false)}
              className="px-6 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-700"
            >
              Fechar
            </button>
          </div>
        }
      >
        <div className="p-1 space-y-6">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid grid-cols-4 w-full bg-slate-100 p-1 rounded-xl mb-6">
              <TabsTrigger value="overview" className="text-xs font-semibold rounded-lg">Visão Geral</TabsTrigger>
              <TabsTrigger value="vessels" className="text-xs font-semibold rounded-lg">
                Embarcações ({customerVessels.length})
              </TabsTrigger>
              <TabsTrigger value="processes" className="text-xs font-semibold rounded-lg">
                Processos ({customerProcesses.length})
              </TabsTrigger>
              <TabsTrigger value="documents" className="text-xs font-semibold rounded-lg">
                Documentos ({files?.length || 0})
              </TabsTrigger>
            </TabsList>

            {/* ABA 1: VISÃO GERAL */}
            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Documento</p>
                  <p className="text-sm font-bold text-[#0B1739]">{selectedCustomer?.cpf_cnpj || "Não informado"}</p>
                  {selectedCustomer?.rg && (
                    <p className="text-xs text-slate-500">RG: {selectedCustomer.rg}</p>
                  )}
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Contato</p>
                  <p className="text-xs text-slate-700 font-medium">
                    <strong>E-mail:</strong> {selectedCustomer?.email || "Não informado"}
                  </p>
                  <p className="text-xs text-slate-700 font-medium">
                    <strong>Telefone:</strong> {selectedCustomer?.phone || "Não informado"}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Endereço</p>
                <p className="text-sm font-semibold text-[#0B1739]">{selectedCustomer?.address || "Não informado"}</p>
                {selectedCustomer?.city && (
                  <p className="text-xs text-slate-500">{selectedCustomer.city} - {selectedCustomer.state}</p>
                )}
              </div>

              {selectedCustomer?.notes && (
                <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-100/80">
                  <p className="text-[10px] font-bold text-blue-700 uppercase mb-1">Observações</p>
                  <p className="text-xs text-slate-700 whitespace-pre-wrap">{selectedCustomer.notes}</p>
                </div>
              )}
            </TabsContent>

            {/* ABA 2: EMBARCAÇÕES VINCULADAS */}
            <TabsContent value="vessels" className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-xs font-semibold text-slate-600">Embarcações vinculadas a este cliente</p>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedCustomer?.id) {
                      setIsDetailsOpen(false);
                      window.location.href = `/vessels/novo?customerId=${selectedCustomer.id}`;
                    }
                  }}
                  className="text-xs font-semibold text-[#075BFF] hover:underline flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Cadastrar embarcação</span>
                </button>
              </div>

              {customerVessels.length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed border-slate-100 rounded-2xl text-slate-400 text-xs">
                  <Ship className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                  <p className="font-semibold text-slate-600">Nenhuma embarcação vinculada</p>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedCustomer?.id) {
                        setIsDetailsOpen(false);
                        window.location.href = `/vessels/novo?customerId=${selectedCustomer.id}`;
                      }
                    }}
                    className="mt-3 text-xs text-[#075BFF] font-semibold hover:underline"
                  >
                    + Vincular nova embarcação agora
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {customerVessels.map((v) => (
                    <div key={v.id} className="p-4 bg-white border border-slate-200/80 rounded-xl space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-sm text-[#0B1739]">{v.name}</p>
                        {v.status && <Badge className="bg-slate-100 text-slate-600 border-none text-[9px] uppercase">{v.status}</Badge>}
                      </div>
                      <p className="text-xs text-slate-500">Inscrição: {v.registration_number || "—"}</p>
                      <p className="text-xs text-slate-400">Tipo: {v.vessel_type || "—"}</p>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ABA 3: PROCESSOS */}
            <TabsContent value="processes" className="space-y-4">
              <p className="text-xs font-semibold text-slate-600">Histórico de processos</p>
              {customerProcesses.length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed border-slate-100 rounded-2xl text-slate-400 text-xs">
                  <FileText className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                  <p className="font-semibold text-slate-600">Nenhum processo iniciado</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {customerProcesses.map((p) => (
                    <div key={p.id} className="p-3.5 bg-white border border-slate-200/80 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-900">{p.process_type || "Processo Náutico"}</p>
                        <p className="text-[10px] text-slate-400">{new Date(p.created_at).toLocaleDateString("pt-BR")}</p>
                      </div>
                      <Badge className="bg-slate-100 text-slate-600 border-none text-[9px] uppercase">{p.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* ABA 4: DOCUMENTOS */}
            <TabsContent value="documents" className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-xs font-bold text-[#0B1739] mb-3">Enviar novo documento</p>
                <FileUploader
                  bucket="customer-documents"
                  category="client_id"
                  customerId={selectedCustomer?.id}
                />
              </div>

              {files && files.length > 0 && (
                <div className="space-y-2 pt-2">
                  {files.map((file) => (
                    <div key={file.id} className="p-3 bg-white border border-slate-200/80 rounded-xl flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5 truncate">
                        <FileText className="h-4 w-4 text-[#075BFF] shrink-0" />
                        <span className="font-medium text-slate-800 truncate">{file.file_name}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => openStoredFile(file)}
                          className="p-1.5 text-slate-400 hover:text-slate-700"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setFileToDelete({ id: file.id, name: file.file_name })}
                          className="p-1.5 text-slate-400 hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </ModalLayout>

      {/* DIÁLOGO DE EXCLUSÃO DE ARQUIVO */}
      <ConfirmDialog
        open={fileToDelete !== null}
        onOpenChange={(open) => { if (!open) setFileToDelete(null); }}
        title="Excluir Documento"
        description={`Deseja realmente excluir o documento "${fileToDelete?.name}"?`}
        confirmText="Excluir"
        cancelText="Cancelar"
        variant="destructive"
        loading={deleteFile.isPending}
        onConfirm={async () => {
          if (!fileToDelete) return;
          await deleteFile.mutateAsync(fileToDelete.id);
          setFileToDelete(null);
        }}
      />
    </div>
  );
}
