import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import { 
  Search,
  Users,
  Ship,
  FileText,
  X,
  Loader2,
  AlertCircle,
  ChevronRight,
  Clock,
  ArrowRight,
  Sparkles,
  Command,
  FileBox,
  Building2,
  Tag
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";

// Status mapeados para processos
const PROCESS_STATUS_MAP: Record<string, { label: string; color: string }> = {
  draft: { label: "Rascunho", color: "bg-slate-100 text-slate-700 border-slate-200" },
  preparing: { label: "Em preparação", color: "bg-blue-50 text-blue-700 border-blue-200" },
  pending_docs: { label: "Doc. pendente", color: "bg-amber-50 text-amber-700 border-amber-200" },
  ready_for_protocol: { label: "Pronto p/ protocolo", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  in_progress: { label: "Em andamento", color: "bg-sky-50 text-sky-700 border-sky-200" },
  completed: { label: "Concluído", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  cancelled: { label: "Cancelado", color: "bg-red-50 text-red-700 border-red-200" },
};

export interface GlobalSearchProps {
  variant?: "header" | "home" | "button";
  placeholder?: string;
  className?: string;
}

export function GlobalSearch({ 
  variant = "header", 
  placeholder = "Buscar cliente, embarcação ou processo...",
  className = ""
}: GlobalSearchProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [activeTab, setActiveTab] = React.useState<"todos" | "clientes" | "embarcacoes" | "processos">("todos");
  
  const [isLoading, setIsLoading] = React.useState(false);
  const [isError, setIsError] = React.useState(false);

  const [customers, setCustomers] = React.useState<any[]>([]);
  const [vessels, setVessels] = React.useState<any[]>([]);
  const [processes, setProcesses] = React.useState<any[]>([]);

  const { profile } = useAuth();
  const companyId = profile?.company_id;
  const navigate = useNavigate();
  const searchInputRef = React.useRef<HTMLInputElement | null>(null);

  // Atalho de teclado global: Ctrl+K ou Cmd+K
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    const handleCustomOpen = () => setIsOpen(true);

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("open-global-search", handleCustomOpen);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("open-global-search", handleCustomOpen);
    };
  }, []);

  // Foco automático no input ao abrir
  React.useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    } else {
      setQuery("");
      setCustomers([]);
      setVessels([]);
      setProcesses([]);
      setIsError(false);
      setActiveTab("todos");
    }
  }, [isOpen]);

  // Função central de busca com isolamento da empresa
  const executeSearch = React.useCallback(async (searchTerm: string) => {
    const term = searchTerm.trim();
    if (!term || term.length < 2 || !companyId) {
      setCustomers([]);
      setVessels([]);
      setProcesses([]);
      setIsLoading(false);
      setIsError(false);
      return;
    }

    setIsLoading(true);
    setIsError(false);

    try {
      const cleanTerm = term.replace(/[%_]/g, "");

      // 1. Busca de Clientes (Nome, Nome Fantasia ou CPF/CNPJ)
      const customersPromise = supabase
        .from("customers")
        .select("id, name, fantasy_name, cpf_cnpj, email, phone, city, state")
        .eq("company_id", companyId)
        .or(`name.ilike.%${cleanTerm}%,fantasy_name.ilike.%${cleanTerm}%,cpf_cnpj.ilike.%${cleanTerm}%`)
        .order("name", { ascending: true })
        .limit(8);

      // 2. Busca de Embarcações (Nome da Embarcação ou Número de Inscrição TIE)
      // Traz o cliente proprietário vinculado
      const vesselsPromise = supabase
        .from("vessels")
        .select(`
          id,
          name,
          registration_number,
          category,
          vessel_type,
          customer_id,
          customer:customers!vessels_customer_id_fkey(id, name, fantasy_name, cpf_cnpj)
        `)
        .eq("company_id", companyId)
        .or(`name.ilike.%${cleanTerm}%,registration_number.ilike.%${cleanTerm}%`)
        .order("name", { ascending: true })
        .limit(8);

      // 3. Busca de Processos (Título, Tipo de Serviço ou Número de Protocolo)
      // Traz cliente proprietário, embarcação vinculada, serviço e status
      const processesPromise = supabase
        .from("processes")
        .select(`
          id,
          title,
          process_type,
          protocol_number,
          status,
          created_at,
          customer_id,
          vessel_id,
          customer:customers!processes_customer_id_fkey(id, name, fantasy_name, cpf_cnpj),
          vessel:vessels!processes_vessel_id_fkey(id, name, registration_number, category, vessel_type)
        `)
        .eq("company_id", companyId)
        .or(`title.ilike.%${cleanTerm}%,process_type.ilike.%${cleanTerm}%,protocol_number.ilike.%${cleanTerm}%`)
        .order("created_at", { ascending: false })
        .limit(8);

      const [cRes, vRes, pRes] = await Promise.all([
        customersPromise,
        vesselsPromise,
        processesPromise,
      ]);

      if (cRes.error) throw cRes.error;
      if (vRes.error) throw vRes.error;
      if (pRes.error) throw pRes.error;

      let matchedCustomers = cRes.data || [];
      let matchedVessels = vRes.data || [];
      let matchedProcesses = pRes.data || [];

      // Enriquecimento inteligente: se encontrou clientes ou embarcações, busca processos vinculados se houver poucos
      if (matchedProcesses.length < 5 && matchedCustomers.length > 0) {
        const custIds = matchedCustomers.map((c: any) => c.id).slice(0, 4);
        const { data: extraProcs } = await supabase
          .from("processes")
          .select(`
            id,
            title,
            process_type,
            protocol_number,
            status,
            created_at,
            customer_id,
            vessel_id,
            customer:customers!processes_customer_id_fkey(id, name, fantasy_name, cpf_cnpj),
            vessel:vessels!processes_vessel_id_fkey(id, name, registration_number, category, vessel_type)
          `)
          .eq("company_id", companyId)
          .in("customer_id", custIds)
          .limit(5);

        if (extraProcs && extraProcs.length > 0) {
          const existingIds = new Set(matchedProcesses.map((p: any) => p.id));
          for (const ep of extraProcs) {
            if (!existingIds.has(ep.id)) {
              matchedProcesses.push(ep);
              existingIds.add(ep.id);
            }
          }
        }
      }

      setCustomers(matchedCustomers);
      setVessels(matchedVessels);
      setProcesses(matchedProcesses);
    } catch (err) {
      console.error("Erro na busca geral:", err);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  // Debounce na digitação da busca
  React.useEffect(() => {
    const timer = setTimeout(() => {
      executeSearch(query);
    }, 250);

    return () => clearTimeout(timer);
  }, [query, executeSearch]);

  // Contagens
  const customerCount = customers.length;
  const vesselCount = vessels.length;
  const processCount = processes.length;
  const totalResults = customerCount + vesselCount + processCount;

  // Navegações aos registros
  const handleSelectCustomer = (customerId: string) => {
    setIsOpen(false);
    navigate({
      to: "/customers/$id",
      params: { id: customerId },
    });
  };

  const handleSelectVessel = (vesselId: string) => {
    setIsOpen(false);
    navigate({
      to: "/vessels/$id",
      params: { id: vesselId },
    });
  };

  const handleSelectProcess = (processId: string) => {
    setIsOpen(false);
    navigate({
      to: "/processes/$id",
      params: { id: processId },
    });
  };

  return (
    <>
      {/* ===================================================================== */}
      {/* GATILHOS VISUAIS CONFORME A VARIANTE */}
      {/* ===================================================================== */}

      {/* 1. Variante HOME (Barra de busca destacada na página inicial) */}
      {variant === "home" && (
        <div className={`relative w-full ${className}`}>
          <div
            role="button"
            tabIndex={0}
            onClick={() => setIsOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setIsOpen(true);
              }
            }}
            className="w-full bg-white border border-slate-200/90 hover:border-[#075BFF] focus:border-[#075BFF] rounded-2xl p-3 sm:p-3.5 flex items-center justify-between shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#075BFF] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Search className="h-4.5 w-4.5" />
              </div>
              <div className="text-left min-w-0">
                <span className="text-xs sm:text-sm font-medium text-slate-500 group-hover:text-slate-700 block truncate">
                  {placeholder}
                </span>
                <span className="text-[11px] text-slate-400 hidden sm:block">
                  Clientes, embarcações, inscrição no TIE ou processos
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-500 font-mono text-[11px] font-semibold">
                <Command className="h-3 w-3" /> K
              </span>
              <div className="px-3 py-1.5 rounded-xl bg-[#075BFF] text-white text-xs font-semibold group-hover:bg-blue-600 transition-colors shadow-xs">
                Buscar
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Variante HEADER (Barra de busca no topo de todas as páginas) */}
      {variant === "header" && (
        <div className={className}>
          {/* Versão Desktop: Campo expansível e clicável */}
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="hidden md:flex items-center justify-between gap-3 w-64 lg:w-80 px-3.5 py-2 rounded-xl bg-slate-100/80 hover:bg-slate-100 border border-slate-200/80 text-xs text-slate-400 hover:text-slate-600 transition-all text-left group cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-[#075BFF]/30"
          >
            <div className="flex items-center gap-2 min-w-0 truncate">
              <Search className="h-3.5 w-3.5 text-slate-400 group-hover:text-[#075BFF] transition-colors shrink-0" />
              <span className="truncate">Buscar cliente, barco ou processo...</span>
            </div>
            <kbd className="pointer-events-none inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono text-[10px] text-slate-400 shadow-2xs shrink-0">
              <span className="text-[9px]">⌘</span>K
            </kbd>
          </button>

          {/* Versão Mobile: Botão com ícone discreto no topo */}
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
            title="Buscar no sistema"
            aria-label="Buscar no sistema"
          >
            <Search className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL / DIALOG RESPONSIVO DE BUSCA GERAL UNIFICADA */}
      {/* ===================================================================== */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="p-0 max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden font-sans text-slate-800">
          
          {/* 1. CAMPO DE ENTRADA DA BUSCA */}
          <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center gap-3 bg-white">
            <Search className="h-5 w-5 text-[#075BFF] shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Digite o nome do cliente, da embarcação, TIE ou processo..."
              className="flex-1 bg-transparent text-sm sm:text-base text-slate-900 placeholder:text-slate-400 outline-none border-none focus:ring-0"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                title="Limpar busca"
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-100 border border-slate-200 rounded">
                ESC
              </kbd>
            )}
          </div>

          {/* 2. ABAS DE FILTRO POR GRUPO (Aparecem quando há resultados ou busca ativa) */}
          {query.trim().length >= 2 && !isLoading && !isError && totalResults > 0 && (
            <div className="px-3 sm:px-4 py-2 bg-slate-50/70 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto text-xs">
              <button
                type="button"
                onClick={() => setActiveTab("todos")}
                className={`px-3 py-1 rounded-lg font-semibold transition-all shrink-0 cursor-pointer ${
                  activeTab === "todos"
                    ? "bg-white text-[#075BFF] shadow-2xs border border-slate-200/80"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Todos ({totalResults})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("clientes")}
                className={`px-3 py-1 rounded-lg font-semibold transition-all shrink-0 cursor-pointer inline-flex items-center gap-1 ${
                  activeTab === "clientes"
                    ? "bg-white text-[#075BFF] shadow-2xs border border-slate-200/80"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <span>Clientes</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-50 text-[#075BFF]">
                  {customerCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("embarcacoes")}
                className={`px-3 py-1 rounded-lg font-semibold transition-all shrink-0 cursor-pointer inline-flex items-center gap-1 ${
                  activeTab === "embarcacoes"
                    ? "bg-white text-[#075BFF] shadow-2xs border border-slate-200/80"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <span>Embarcações</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-50 text-indigo-700">
                  {vesselCount}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("processos")}
                className={`px-3 py-1 rounded-lg font-semibold transition-all shrink-0 cursor-pointer inline-flex items-center gap-1 ${
                  activeTab === "processos"
                    ? "bg-white text-[#075BFF] shadow-2xs border border-slate-200/80"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <span>Processos</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-sky-50 text-sky-700">
                  {processCount}
                </span>
              </button>
            </div>
          )}

          {/* 3. CORPO DOS RESULTADOS */}
          <div className="max-h-[60vh] sm:max-h-[460px] overflow-y-auto p-3 sm:p-4 space-y-4 custom-scrollbar">
            
            {/* ESTADO 1: CARREGANDO */}
            {isLoading && (
              <div className="py-12 text-center space-y-3">
                <Loader2 className="h-6 w-6 animate-spin text-[#075BFF] mx-auto" />
                <p className="text-xs text-slate-500 font-medium">
                  Buscando em clientes, embarcações e processos...
                </p>
              </div>
            )}

            {/* ESTADO 2: ERRO */}
            {!isLoading && isError && (
              <div className="py-10 text-center space-y-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center mx-auto">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#0B1739]">
                    Erro ao realizar a busca
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Não foi possível consultar os registros. Tente novamente em alguns instantes.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => executeSearch(query)}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors"
                >
                  Tentar novamente
                </button>
              </div>
            )}

            {/* ESTADO 3: NENHUM RESULTADO */}
            {!isLoading && !isError && query.trim().length >= 2 && totalResults === 0 && (
              <div className="py-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 border border-slate-100 flex items-center justify-center mx-auto">
                  <Search className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#0B1739]">
                    Nenhum resultado encontrado para &quot;{query}&quot;
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                    Verifique se o nome do cliente, da embarcação, número de inscrição no TIE ou código do processo foram digitados corretamente.
                  </p>
                </div>
              </div>
            )}

            {/* ESTADO 4: DIGITE PARA BUSCAR (INICIAL) */}
            {!isLoading && !isError && query.trim().length < 2 && (
              <div className="py-8 px-2 text-center space-y-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#075BFF] flex items-center justify-center mx-auto">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-[#0B1739]">
                    Busca geral e unificada
                  </h4>
                  <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                    Digite pelo menos 2 caracteres para localizar clientes, embarcações e processos de forma instantânea.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 max-w-lg mx-auto text-left pt-2">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#0B1739]">
                      <Users className="h-3.5 w-3.5 text-[#075BFF]" />
                      <span>Clientes</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Por nome, nome fantasia ou CPF/CNPJ
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#0B1739]">
                      <Ship className="h-3.5 w-3.5 text-indigo-600" />
                      <span>Embarcações</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Por nome do barco ou nº de inscrição (TIE)
                    </p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#0B1739]">
                      <FileText className="h-3.5 w-3.5 text-sky-600" />
                      <span>Processos</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Por serviço, protocolo ou situação
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ESTADO 5: LISTAGEM ORGANIZADA EM 3 GRUPOS */}
            {!isLoading && !isError && totalResults > 0 && (
              <div className="space-y-5">
                
                {/* ------------------------------------------------------------- */}
                {/* GRUPO 1: CLIENTES */}
                {/* ------------------------------------------------------------- */}
                {(activeTab === "todos" || activeTab === "clientes") && customerCount > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-[#075BFF]" />
                        <h3 className="text-xs font-bold text-[#0B1739] uppercase tracking-wider">
                          Clientes ({customerCount})
                        </h3>
                      </div>
                      <span className="text-[10px] text-slate-400">Pessoas e Empresas</span>
                    </div>

                    <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-xl overflow-hidden bg-white">
                      {customers.map((c) => (
                        <div
                          key={c.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => handleSelectCustomer(c.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleSelectCustomer(c.id);
                            }
                          }}
                          className="p-3 hover:bg-blue-50/40 transition-colors flex items-center justify-between gap-3 cursor-pointer group text-left"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#075BFF] flex items-center justify-center shrink-0">
                              <Users className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs sm:text-sm font-bold text-[#0B1739] group-hover:text-[#075BFF] transition-colors truncate">
                                {c.fantasy_name || c.name}
                              </h4>
                              <div className="flex items-center gap-2 text-[11px] text-slate-400 truncate">
                                <span className="font-mono text-slate-500">
                                  {c.cpf_cnpj || "Documento não informado"}
                                </span>
                                {c.city && <span>• {c.city}</span>}
                                {c.phone && <span>• {c.phone}</span>}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 text-[11px] text-[#075BFF] font-semibold shrink-0">
                            <span>Ver cliente</span>
                            <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* GRUPO 2: EMBARCAÇÕES */}
                {/* ------------------------------------------------------------- */}
                {(activeTab === "todos" || activeTab === "embarcacoes") && vesselCount > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-2">
                        <Ship className="h-4 w-4 text-indigo-600" />
                        <h3 className="text-xs font-bold text-[#0B1739] uppercase tracking-wider">
                          Embarcações ({vesselCount})
                        </h3>
                      </div>
                      <span className="text-[10px] text-slate-400">Embarcações Cadastradas</span>
                    </div>

                    <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-xl overflow-hidden bg-white">
                      {vessels.map((v) => {
                        const ownerName = v.customer?.fantasy_name || v.customer?.name || "Proprietário não informado";
                        return (
                          <div
                            key={v.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => handleSelectVessel(v.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                handleSelectVessel(v.id);
                              }
                            }}
                            className="p-3 hover:bg-indigo-50/40 transition-colors flex items-center justify-between gap-3 cursor-pointer group text-left"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                                <Ship className="h-4 w-4" />
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-xs sm:text-sm font-bold text-[#0B1739] group-hover:text-indigo-600 transition-colors truncate">
                                  {v.name}
                                </h4>
                                <div className="flex items-center gap-2 text-[11px] text-slate-500 truncate flex-wrap">
                                  <span className="font-semibold text-slate-700">
                                    Proprietário: {ownerName}
                                  </span>
                                  <span>•</span>
                                  <span className="font-mono text-slate-500">
                                    {v.registration_number ? `TIE: ${v.registration_number}` : "Sem inscrição"}
                                  </span>
                                  {v.vessel_type && (
                                    <>
                                      <span>•</span>
                                      <span className="text-slate-400">{v.vessel_type}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 text-[11px] text-indigo-600 font-semibold shrink-0">
                              <span>Ver embarcação</span>
                              <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ------------------------------------------------------------- */}
                {/* GRUPO 3: PROCESSOS */}
                {/* ------------------------------------------------------------- */}
                {(activeTab === "todos" || activeTab === "processos") && processCount > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-sky-600" />
                        <h3 className="text-xs font-bold text-[#0B1739] uppercase tracking-wider">
                          Processos ({processCount})
                        </h3>
                      </div>
                      <span className="text-[10px] text-slate-400">Serviços em Andamento</span>
                    </div>

                    <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-xl overflow-hidden bg-white">
                      {processes.map((p) => {
                        const clientName = p.customer?.fantasy_name || p.customer?.name || "Cliente não informado";
                        const boatName = p.vessel?.name || "Embarcação não vinculada";
                        const serviceName = p.process_type || p.title || "Serviço Náutico";
                        const statusObj = PROCESS_STATUS_MAP[p.status] || {
                          label: p.status || "Em andamento",
                          color: "bg-slate-100 text-slate-700 border-slate-200",
                        };

                        return (
                          <div
                            key={p.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => handleSelectProcess(p.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                handleSelectProcess(p.id);
                              }
                            }}
                            className="p-3 hover:bg-sky-50/40 transition-colors flex items-center justify-between gap-3 cursor-pointer group text-left"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                                <FileText className="h-4 w-4" />
                              </div>
                              <div className="min-w-0 space-y-0.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="text-xs sm:text-sm font-bold text-[#0B1739] group-hover:text-[#075BFF] transition-colors truncate">
                                    {p.title || p.process_type || "Processo Náutico"}
                                  </h4>
                                  <span className={`px-2 py-0.2 rounded-full text-[10px] font-semibold border ${statusObj.color}`}>
                                    {statusObj.label}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500 truncate flex items-center gap-1.5 flex-wrap">
                                  <span>Cliente: <strong className="text-slate-700">{clientName}</strong></span>
                                  <span>•</span>
                                  <span>Barco: <strong className="text-slate-700">{boatName}</strong></span>
                                  <span>•</span>
                                  <span>Serviço: <span className="text-slate-600">{serviceName}</span></span>
                                  {p.protocol_number && (
                                    <>
                                      <span>•</span>
                                      <span className="font-mono text-slate-500">Prot: {p.protocol_number}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 text-[11px] text-[#075BFF] font-semibold shrink-0">
                              <span>Abrir</span>
                              <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>

          {/* 4. RODAPÉ INFORMATIVO */}
          <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span className="truncate">
              {companyId ? "Filtrado para sua empresa com isolamento estrito" : "Pesquisa global"}
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <span className="hidden sm:inline">Navegue com o mouse ou teclado</span>
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px]">Enter para abrir</kbd>
            </div>
          </div>

        </DialogContent>
      </Dialog>
    </>
  );
}
