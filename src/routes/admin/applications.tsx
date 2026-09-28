import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { 
  Layers, 
  Search, 
  Building, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  XCircle, 
  ExternalLink, 
  Edit2, 
  Filter, 
  Plus, 
  ShieldCheck, 
  Shield, 
  Lock, 
  Unlock, 
  Calendar, 
  RefreshCw, 
  Loader2, 
  MoreVertical, 
  Info, 
  Sparkles, 
  HelpCircle, 
  Check, 
  X, 
  FileSpreadsheet, 
  Award, 
  CalendarClock,
  Briefcase,
  Sliders,
  Eye,
  EyeOff
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useState, useMemo } from "react";
import { formatDistanceToNow, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/applications")({
  component: AdminApplicationsPage,
  head: () => ({
    meta: [
      { title: "Aplicativos e Direitos de Acesso — Painel Administrativo | NavalDocs Pro" },
      { name: "robots", content: "noindex, nofollow" }
    ]
  })
});

// Definição Oficial dos Aplicativos da Plataforma
export interface ProductApp {
  id: "navaldocs-pro" | "app-arrais" | "central-vencimentos";
  title: string;
  description: string;
  productStatus: "available" | "in_preparation" | "unavailable";
  productStatusLabel: string;
  productBadgeColor: string;
  routeUrl?: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const PLATFORM_APPS: ProductApp[] = [
  {
    id: "navaldocs-pro",
    title: "NavalDocs Pro",
    description: "Geração e organização completa de documentos e despachos para embarcações e armadores.",
    productStatus: "available",
    productStatusLabel: "Disponível e publicado",
    productBadgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
    routeUrl: "/home",
    icon: FileSpreadsheet,
  },
  {
    id: "app-arrais",
    title: "App Arrais",
    description: "Organização de documentos e gestão de alunos para habilitação náutica de amadores (Mestre, Arrais e Capitão).",
    productStatus: "in_preparation",
    productStatusLabel: "Em preparação",
    productBadgeColor: "bg-amber-50 text-amber-700 border-amber-200",
    icon: Award,
  },
  {
    id: "central-vencimentos",
    title: "Central de Vencimentos",
    description: "Acompanhamento preventivo de prazos, vistorias, renovações de certificados e validade de documentos navais.",
    productStatus: "in_preparation",
    productStatusLabel: "Em preparação",
    productBadgeColor: "bg-blue-50 text-blue-700 border-blue-200",
    icon: CalendarClock,
  },
];

// Helper de formatação de CNPJ
function formatCnpj(val?: string | null): string {
  if (!val) return "Não informado";
  const digits = val.replace(/\D/g, "");
  if (digits.length !== 14) return val;
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

const originLabels: Record<string, { label: string; color: string }> = {
  plan_included: {
    label: "Incluído no plano",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  contracted_separately: {
    label: "Contratado separadamente",
    color: "bg-blue-50 text-blue-700 border-blue-200",
  },
  manual_grant: {
    label: "Concedido manualmente",
    color: "bg-purple-50 text-purple-700 border-purple-200",
  },
  no_access: {
    label: "Sem acesso",
    color: "bg-slate-100 text-slate-600 border-slate-200",
  },
};

function AdminApplicationsPage() {
  const queryClient = useQueryClient();
  const { profile, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Estados de Filtro
  const [selectedAppId, setSelectedAppId] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("all");
  const [selectedOriginFilter, setSelectedOriginFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Estados de Modais
  const [isGrantModalOpen, setIsGrantModalOpen] = useState(false);
  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<any | null>(null);
  const [targetAppId, setTargetAppId] = useState<string>("app-arrais");
  const [grantOrigin, setGrantOrigin] = useState<string>("manual_grant");
  const [grantDuration, setGrantDuration] = useState<"permanent" | "30_days" | "90_days" | "custom">("permanent");
  const [customExpiresAt, setCustomExpiresAt] = useState("");
  const [grantReason, setGrantReason] = useState("");

  // 1. Verificação de Autorização
  const isGlobalAdmin = useMemo(() => {
    return (
      profile?.role === "admin_master_global" ||
      profile?.role === "superadmin" ||
      profile?.role === "admin_master" ||
      profile?.email === "joaovitor.f0725@gmail.com" ||
      profile?.email === "douglas_faresi@hotmail.com"
    );
  }, [profile]);

  const isCompanyAdmin = useMemo(() => {
    return profile?.role === "admin" || isGlobalAdmin;
  }, [profile, isGlobalAdmin]);

  if (!authLoading && !isCompanyAdmin) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center font-sans">
        <Card className="p-8 border-red-200 bg-red-50/50 rounded-2xl shadow-xs space-y-3">
          <Shield className="h-10 w-10 text-red-500 mx-auto" />
          <h2 className="text-base font-bold text-[#0B1739]">Acesso Restrito</h2>
          <p className="text-xs text-slate-600">
            Você não possui privilégios de administrador para gerenciar direitos de acesso a aplicativos.
          </p>
          <Button
            onClick={() => navigate({ to: "/dashboard" })}
            className="mt-3 bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-semibold rounded-xl"
          >
            Voltar ao painel
          </Button>
        </Card>
      </div>
    );
  }

  // 2. Consulta de Empresas e Direitos de Aplicativos
  const { data: companies = [], isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["admin-applications-companies-list", isGlobalAdmin, profile?.company_id],
    queryFn: async () => {
      let query = supabase
        .from("companies")
        .select(`
          id,
          name,
          fantasy_name,
          cnpj,
          email,
          plan,
          is_active,
          is_pilot,
          billing_status,
          metadata,
          created_at,
          subscriptions (
            id,
            status,
            current_period_end,
            plans (
              name,
              billing_cycle
            )
          )
        `);

      if (!isGlobalAdmin && profile?.company_id) {
        query = query.eq("id", profile.company_id);
      }

      const { data, error } = await query.order("name", { ascending: true });
      if (error) {
        console.error("[AdminApplications] Erro ao carregar empresas:", error);
        throw error;
      }

      return (data || []).map((comp: any) => {
        const meta = (comp.metadata || {}) as Record<string, any>;
        const appAccess = (meta.applications_access || {}) as Record<string, any>;
        const sub = comp.subscriptions?.[0];

        // Direitos computados por aplicativo
        // 1. NavalDocs Pro: padrão para todas as empresas ativas
        const navaldocsAccess = appAccess["navaldocs-pro"] || {
          status: comp.is_active !== false ? "active" : "inactive",
          origin: "plan_included",
          granted_at: comp.created_at,
        };

        // 2. App Arrais
        const appArraisAccess = appAccess["app-arrais"] || {
          status: comp.is_pilot ? "active" : "no_access",
          origin: comp.is_pilot ? "manual_grant" : "no_access",
          grant_reason: comp.is_pilot ? "Empresa Piloto da Plataforma" : undefined,
        };

        // 3. Central de Vencimentos
        const centralVencAccess = appAccess["central-vencimentos"] || {
          status: "in_preparation",
          origin: "plan_included",
        };

        return {
          ...comp,
          meta,
          appAccess: {
            "navaldocs-pro": navaldocsAccess,
            "app-arrais": appArraisAccess,
            "central-vencimentos": centralVencAccess,
          },
          subStatus: sub?.status || comp.billing_status || (comp.is_pilot ? "trial" : "active"),
          planDisplayName: sub?.plans?.name || comp.plan || "Profissional",
        };
      });
    },
    enabled: !!profile
  });

  // 3. Métricas de Cobertura de Acesso por Aplicativo
  const appMetrics = useMemo(() => {
    let navaldocsCount = 0;
    let appArraisCount = 0;
    let centralVencCount = 0;

    companies.forEach((comp: any) => {
      if (comp.appAccess["navaldocs-pro"]?.status === "active") navaldocsCount++;
      if (comp.appAccess["app-arrais"]?.status === "active") appArraisCount++;
      if (comp.appAccess["central-vencimentos"]?.status === "active") centralVencCount++;
    });

    return {
      "navaldocs-pro": navaldocsCount,
      "app-arrais": appArraisCount,
      "central-vencimentos": centralVencCount,
    };
  }, [companies]);

  // 4. Mapeamento e Filtros da Tabela
  const flattenedRows = useMemo(() => {
    const rows: any[] = [];

    companies.forEach((comp: any) => {
      PLATFORM_APPS.forEach((app) => {
        if (selectedAppId !== "all" && app.id !== selectedAppId) return;

        const accessInfo = comp.appAccess[app.id];
        const status = accessInfo?.status || "no_access";
        const origin = accessInfo?.origin || "no_access";

        // Filtro por termo de busca
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          const matchCompName = (comp.name || "").toLowerCase().includes(term);
          const matchFantasy = (comp.fantasy_name || "").toLowerCase().includes(term);
          const matchCnpj = (comp.cnpj || "").toLowerCase().includes(term);
          const matchEmail = (comp.email || "").toLowerCase().includes(term);
          if (!matchCompName && !matchFantasy && !matchCnpj && !matchEmail) return;
        }

        // Filtro por Situação do Acesso
        if (selectedStatusFilter !== "all") {
          if (selectedStatusFilter === "active" && status !== "active") return;
          if (selectedStatusFilter === "no_access" && status !== "no_access") return;
          if (selectedStatusFilter === "temporary" && !accessInfo?.expires_at) return;
        }

        // Filtro por Origem
        if (selectedOriginFilter !== "all" && origin !== selectedOriginFilter) {
          return;
        }

        rows.push({
          companyId: comp.id,
          companyName: comp.fantasy_name || comp.name,
          companyOfficialName: comp.name,
          cnpj: comp.cnpj,
          email: comp.email,
          plan: comp.planDisplayName,
          subStatus: comp.subStatus,
          appId: app.id,
          appTitle: app.title,
          accessStatus: status,
          accessOrigin: origin,
          grantedAt: accessInfo?.granted_at,
          grantedBy: accessInfo?.granted_by,
          grantReason: accessInfo?.grant_reason,
          expiresAt: accessInfo?.expires_at,
          rawCompany: comp,
        });
      });
    });

    return rows;
  }, [companies, selectedAppId, searchTerm, selectedStatusFilter, selectedOriginFilter]);

  const totalPages = Math.ceil(flattenedRows.length / itemsPerPage) || 1;
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return flattenedRows.slice(start, start + itemsPerPage);
  }, [flattenedRows, currentPage]);

  // Mutação: Conceder / Alterar Acesso
  const grantAccessMutation = useMutation({
    mutationFn: async ({
      comp,
      appId,
      origin,
      duration,
      customDate,
      reason,
    }: {
      comp: any;
      appId: string;
      origin: string;
      duration: string;
      customDate?: string;
      reason: string;
    }) => {
      if (!isGlobalAdmin) throw new Error("Apenas administradores globais podem conceder direitos de acesso");
      if (!reason.trim()) throw new Error("O motivo da alteração manual é obrigatório");

      let expiresAt: string | null = null;
      if (duration === "30_days") {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        expiresAt = d.toISOString();
      } else if (duration === "90_days") {
        const d = new Date();
        d.setDate(d.getDate() + 90);
        expiresAt = d.toISOString();
      } else if (duration === "custom" && customDate) {
        expiresAt = new Date(customDate).toISOString();
      }

      const currentMeta = comp.meta || {};
      const currentApps = currentMeta.applications_access || {};

      const updatedApps = {
        ...currentApps,
        [appId]: {
          status: "active",
          origin: origin,
          granted_by: user?.email || user?.id,
          granted_at: new Date().toISOString(),
          expires_at: expiresAt,
          grant_reason: reason.trim(),
        },
      };

      const { error } = await supabase
        .from("companies")
        .update({
          metadata: {
            ...currentMeta,
            applications_access: updatedApps,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", comp.id);

      if (error) throw error;

      // Auditoria
      await supabase.from("activity_logs").insert({
        company_id: comp.id,
        user_id: user?.id,
        action: "admin.application_access_granted",
        resource_type: "company_app_access",
        resource_id: comp.id,
        details: {
          appId,
          origin,
          expiresAt,
          reason: reason.trim(),
          operator: user?.email,
        },
      });
    },
    onSuccess: () => {
      toast.success("Direito de acesso concedido com sucesso!");
      setIsGrantModalOpen(false);
      setSelectedCompany(null);
      setGrantReason("");
      queryClient.invalidateQueries({ queryKey: ["admin-applications-companies-list"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao conceder acesso");
    },
  });

  // Mutação: Revogar Acesso
  const revokeAccessMutation = useMutation({
    mutationFn: async ({ comp, appId, reason }: { comp: any; appId: string; reason: string }) => {
      if (!isGlobalAdmin) throw new Error("Apenas administradores globais podem revogar acessos");

      const currentMeta = comp.meta || {};
      const currentApps = currentMeta.applications_access || {};

      const updatedApps = {
        ...currentApps,
        [appId]: {
          status: "no_access",
          origin: "no_access",
          revoked_by: user?.email || user?.id,
          revoked_at: new Date().toISOString(),
          revoke_reason: reason.trim() || "Revogação administrativa manual",
        },
      };

      const { error } = await supabase
        .from("companies")
        .update({
          metadata: {
            ...currentMeta,
            applications_access: updatedApps,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", comp.id);

      if (error) throw error;

      // Auditoria
      await supabase.from("activity_logs").insert({
        company_id: comp.id,
        user_id: user?.id,
        action: "admin.application_access_revoked",
        resource_type: "company_app_access",
        resource_id: comp.id,
        details: {
          appId,
          reason: reason.trim(),
          operator: user?.email,
        },
      });
    },
    onSuccess: () => {
      toast.success("Acesso revogado com sucesso!");
      setIsRevokeModalOpen(false);
      setSelectedCompany(null);
      setGrantReason("");
      queryClient.invalidateQueries({ queryKey: ["admin-applications-companies-list"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao revogar acesso");
    },
  });

  const handleOpenGrantModal = (comp: any, appId: string) => {
    setSelectedCompany(comp);
    setTargetAppId(appId);
    setGrantOrigin("manual_grant");
    setGrantDuration("permanent");
    setGrantReason("");
    setIsGrantModalOpen(true);
  };

  const handleOpenRevokeModal = (comp: any, appId: string) => {
    setSelectedCompany(comp);
    setTargetAppId(appId);
    setGrantReason("");
    setIsRevokeModalOpen(true);
  };

  return (
    <TooltipProvider>
      <div className="space-y-6 max-w-7xl mx-auto pb-20 font-sans">
        {/* ========================================================================= */}
        {/* 1. CABEÇALHO */}
        {/* ========================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0B1739]">
                Aplicativos
              </h1>
              <Badge className="bg-blue-50 text-[#075BFF] border-blue-200 text-[10px] font-bold">
                {PLATFORM_APPS.length} Soluções
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Monitore a disponibilidade dos produtos da plataforma e controle os direitos de acesso das empresas.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="gap-1.5 text-xs font-semibold rounded-xl border-slate-200"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
              <span>Atualizar</span>
            </Button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. OS TRÊS CARTÕES DOS APLICATIVOS */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLATFORM_APPS.map((app) => {
            const Icon = app.icon;
            const accessCount = appMetrics[app.id] || 0;
            const isSelected = selectedAppId === app.id;

            return (
              <Card
                key={app.id}
                className={`bg-white border rounded-2xl p-6 flex flex-col justify-between shadow-xs transition-all ${
                  isSelected
                    ? "border-[#075BFF] ring-2 ring-blue-500/15 shadow-sm"
                    : "border-slate-200/90 hover:border-blue-200"
                }`}
              >
                <div className="space-y-4">
                  {/* Ícone e Badge de Situação do Produto */}
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#075BFF] flex items-center justify-center border border-blue-100 shadow-2xs">
                      <Icon className="h-6 w-6" />
                    </div>

                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${app.productBadgeColor}`}>
                      {app.productStatus === "available" && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                      {app.productStatus === "in_preparation" && <Clock className="h-3 w-3 text-amber-500" />}
                      {app.productStatusLabel}
                    </span>
                  </div>

                  {/* Título e Descrição */}
                  <div>
                    <h2 className="text-base font-bold text-[#0B1739]">{app.title}</h2>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      {app.description}
                    </p>
                  </div>
                </div>

                {/* Rodapé do Cartão */}
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-xs">
                    <span className="text-[11px] text-slate-400 block font-medium">Empresas com acesso</span>
                    <span className="font-bold text-[#0B1739] text-sm">
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin inline" /> : `${accessCount} de ${companies.length}`}
                    </span>
                  </div>

                  <Button
                    size="sm"
                    variant={isSelected ? "default" : "outline"}
                    onClick={() => {
                      setSelectedAppId(isSelected ? "all" : app.id);
                      setCurrentPage(1);
                    }}
                    className={`text-xs font-bold rounded-xl h-8 px-3 ${
                      isSelected 
                        ? "bg-[#075BFF] hover:bg-blue-600 text-white" 
                        : "border-slate-200 hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    {isSelected ? "Exibindo empresas" : "Ver empresas"}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

        {/* ========================================================================= */}
        {/* 3. FILTROS E PESQUISA DE DIREITOS DE ACESSO */}
        {/* ========================================================================= */}
        <Card className="bg-white p-4 sm:p-5 rounded-2xl border-slate-200/90 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#0B1739] flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[#075BFF]" />
              <span>Direitos de Acesso por Empresa</span>
            </h2>

            {selectedAppId !== "all" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedAppId("all")}
                className="text-[11px] text-slate-500 hover:text-slate-800 h-7"
              >
                <X className="h-3 w-3 mr-1" /> Limpar filtro de aplicativo
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
            {/* Busca */}
            <div className="sm:col-span-4 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Buscar por empresa, CNPJ ou e-mail..."
                className="pl-9 h-10 text-xs rounded-xl bg-slate-50/70 border-slate-200 focus:bg-white text-[#0B1739]"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Filtro de Aplicativo */}
            <div className="sm:col-span-3">
              <Select
                value={selectedAppId}
                onValueChange={(val) => {
                  setSelectedAppId(val);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-10 text-xs rounded-xl bg-slate-50/70 border-slate-200 text-[#0B1739] font-medium">
                  <SelectValue placeholder="Aplicativo" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="all">Todos os aplicativos</SelectItem>
                  {PLATFORM_APPS.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro de Situação do Acesso */}
            <div className="sm:col-span-3">
              <Select
                value={selectedStatusFilter}
                onValueChange={(val) => {
                  setSelectedStatusFilter(val);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-10 text-xs rounded-xl bg-slate-50/70 border-slate-200 text-[#0B1739] font-medium">
                  <SelectValue placeholder="Situação do Acesso" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="all">Todas as situações</SelectItem>
                  <SelectItem value="active">Com acesso ativo</SelectItem>
                  <SelectItem value="temporary">Acesso temporário</SelectItem>
                  <SelectItem value="no_access">Sem acesso</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtro de Origem */}
            <div className="sm:col-span-2">
              <Select
                value={selectedOriginFilter}
                onValueChange={(val) => {
                  setSelectedOriginFilter(val);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-10 text-xs rounded-xl bg-slate-50/70 border-slate-200 text-[#0B1739] font-medium">
                  <SelectValue placeholder="Origem" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="all">Todas as origens</SelectItem>
                  <SelectItem value="plan_included">Incluído no plano</SelectItem>
                  <SelectItem value="manual_grant">Concedido manual</SelectItem>
                  <SelectItem value="contracted_separately">Contratado</SelectItem>
                  <SelectItem value="no_access">Sem acesso</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* ========================================================================= */}
        {/* 4. TABELA DE DIREITOS DE ACESSO (DESKTOP & MOBILE) */}
        {/* ========================================================================= */}
        {isLoading ? (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-16 flex flex-col items-center justify-center gap-3 text-xs text-slate-500 shadow-xs">
            <Loader2 className="h-7 w-7 animate-spin text-[#075BFF]" />
            <p className="font-semibold">Consultando direitos de acesso das empresas...</p>
          </div>
        ) : isError ? (
          <Card className="p-8 border-red-200 bg-red-50/40 text-center max-w-xl mx-auto shadow-md rounded-2xl space-y-3">
            <AlertTriangle className="h-10 w-10 text-red-500 mx-auto" />
            <h3 className="text-base font-bold text-[#0B1739]">Erro ao consultar direitos de acesso</h3>
            <p className="text-xs text-slate-600">Não foi possível carregar a relação de permissões das empresas.</p>
            <Button
              onClick={() => refetch()}
              className="mt-2 gap-2 bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-semibold rounded-xl"
            >
              <RefreshCw className="h-4 w-4" /> Tentar novamente
            </Button>
          </Card>
        ) : paginatedRows.length === 0 ? (
          <Card className="bg-white p-16 text-center rounded-2xl border-slate-200/90 shadow-xs space-y-3">
            <Layers className="h-10 w-10 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-[#0B1739]">Nenhum registro encontrado</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Tente ajustar os filtros selecionados ou o termo de pesquisa.
            </p>
          </Card>
        ) : (
          <Card className="bg-white rounded-2xl border-slate-200/90 shadow-xs overflow-hidden">
            {/* TABELA DESKTOP */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-100">
                    <th className="px-6 py-4">Empresa</th>
                    <th className="px-6 py-4">Aplicativo</th>
                    <th className="px-6 py-4">Plano / Assinatura</th>
                    <th className="px-6 py-4">Situação do Acesso</th>
                    <th className="px-6 py-4">Origem</th>
                    <th className="px-6 py-4">Validade</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[#0B1739]">
                  {paginatedRows.map((row: any, idx: number) => {
                    const originDef = originLabels[row.accessOrigin] || originLabels.no_access;
                    const isAccessActive = row.accessStatus === "active";

                    return (
                      <tr key={`${row.companyId}-${row.appId}-${idx}`} className="hover:bg-slate-50/60 transition-colors">
                        {/* Empresa */}
                        <td className="px-6 py-4">
                          <Link
                            to="/admin/companies/$id"
                            params={{ id: row.companyId }}
                            className="font-bold text-xs text-[#0B1739] hover:text-[#075BFF] transition-colors block truncate max-w-[200px]"
                          >
                            {row.companyName}
                          </Link>
                          <span className="font-mono text-[10px] text-slate-400 block mt-0.5">
                            {formatCnpj(row.cnpj)}
                          </span>
                        </td>

                        {/* Aplicativo */}
                        <td className="px-6 py-4">
                          <span className="font-semibold text-xs text-[#0B1739]">{row.appTitle}</span>
                        </td>

                        {/* Plano / Assinatura */}
                        <td className="px-6 py-4">
                          <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-[10px] font-bold capitalize">
                            {row.plan}
                          </Badge>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            Status: {row.subStatus === "active" ? "Regular" : "Piloto / Padrão"}
                          </span>
                        </td>

                        {/* Situação do Acesso */}
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            isAccessActive ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${isAccessActive ? "bg-emerald-500" : "bg-slate-400"}`} />
                            {isAccessActive ? "Com acesso" : "Sem acesso"}
                          </span>
                        </td>

                        {/* Origem */}
                        <td className="px-6 py-4">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border cursor-help ${originDef.color}`}>
                                {originDef.label}
                                {row.grantReason && <Info className="h-3 w-3 opacity-60 ml-0.5" />}
                              </span>
                            </TooltipTrigger>
                            {row.grantReason && (
                              <TooltipContent className="max-w-xs text-xs bg-slate-900 text-white p-2.5 rounded-xl">
                                <p className="font-bold">Motivo da Concessão:</p>
                                <p className="text-slate-300 text-[11px] mt-0.5">{row.grantReason}</p>
                                {row.grantedBy && <span className="text-[10px] text-slate-400 block mt-1">Por {row.grantedBy}</span>}
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </td>

                        {/* Validade */}
                        <td className="px-6 py-4 text-slate-500 text-[11px]">
                          {row.expiresAt ? (
                            <span className="text-amber-700 font-semibold flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Até {format(parseISO(row.expiresAt), "dd/MM/yyyy")}
                            </span>
                          ) : isAccessActive ? (
                            <span className="text-slate-600">Contínuo</span>
                          ) : (
                            "—"
                          )}
                        </td>

                        {/* Ações */}
                        <td className="px-6 py-4 text-right">
                          {isGlobalAdmin ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:text-slate-700">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48 bg-white border-slate-200 shadow-md rounded-xl text-xs">
                                {isAccessActive ? (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() => handleOpenGrantModal(row.rawCompany, row.appId)}
                                      className="gap-2 cursor-pointer"
                                    >
                                      <Edit2 className="h-3.5 w-3.5 text-slate-500" />
                                      <span>Ajustar validade / origem</span>
                                    </DropdownMenuItem>

                                    <DropdownMenuItem
                                      onClick={() => handleOpenRevokeModal(row.rawCompany, row.appId)}
                                      className="gap-2 text-red-600 hover:text-red-700 cursor-pointer font-bold"
                                    >
                                      <Lock className="h-3.5 w-3.5" />
                                      <span>Revogar acesso</span>
                                    </DropdownMenuItem>
                                  </>
                                ) : (
                                  <DropdownMenuItem
                                    onClick={() => handleOpenGrantModal(row.rawCompany, row.appId)}
                                    className="gap-2 text-emerald-600 hover:text-emerald-700 cursor-pointer font-bold"
                                  >
                                    <Unlock className="h-3.5 w-3.5" />
                                    <span>Conceder acesso</span>
                                  </DropdownMenuItem>
                                )}

                                <DropdownMenuSeparator />

                                <DropdownMenuItem asChild>
                                  <Link
                                    to="/admin/companies/$id"
                                    params={{ id: row.companyId }}
                                    className="gap-2 cursor-pointer flex items-center"
                                  >
                                    <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
                                    <span>Detalhes da empresa</span>
                                  </Link>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : (
                            <span className="text-[11px] text-slate-400">Somente leitura</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* CARTÕES MOBILE */}
            <div className="block md:hidden divide-y divide-slate-100">
              {paginatedRows.map((row: any, idx: number) => {
                const originDef = originLabels[row.accessOrigin] || originLabels.no_access;
                const isAccessActive = row.accessStatus === "active";

                return (
                  <div key={`m-${row.companyId}-${row.appId}-${idx}`} className="p-4 space-y-3 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Link
                          to="/admin/companies/$id"
                          params={{ id: row.companyId }}
                          className="font-bold text-xs text-[#0B1739] hover:text-[#075BFF]"
                        >
                          {row.companyName}
                        </Link>
                        <p className="text-[11px] text-slate-500 font-semibold mt-0.5">{row.appTitle}</p>
                      </div>

                      {isGlobalAdmin && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:text-slate-700">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 bg-white border-slate-200 shadow-md rounded-xl text-xs">
                            {isAccessActive ? (
                              <>
                                <DropdownMenuItem
                                  onClick={() => handleOpenGrantModal(row.rawCompany, row.appId)}
                                  className="gap-2 cursor-pointer"
                                >
                                  <Edit2 className="h-3.5 w-3.5 text-slate-500" />
                                  <span>Ajustar validade</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleOpenRevokeModal(row.rawCompany, row.appId)}
                                  className="gap-2 text-red-600 font-bold cursor-pointer"
                                >
                                  <Lock className="h-3.5 w-3.5" />
                                  <span>Revogar acesso</span>
                                </DropdownMenuItem>
                              </>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => handleOpenGrantModal(row.rawCompany, row.appId)}
                                className="gap-2 text-emerald-600 font-bold cursor-pointer"
                              >
                                <Unlock className="h-3.5 w-3.5" />
                                <span>Conceder acesso</span>
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        isAccessActive ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-100 text-slate-600 border-slate-200"
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${isAccessActive ? "bg-emerald-500" : "bg-slate-400"}`} />
                        {isAccessActive ? "Com acesso" : "Sem acesso"}
                      </span>

                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${originDef.color}`}>
                        {originDef.label}
                      </span>
                    </div>

                    {row.expiresAt && (
                      <p className="text-[11px] text-amber-700 font-semibold">
                        Expira em: {format(parseISO(row.expiresAt), "dd/MM/yyyy")}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Página {currentPage} de {totalPages}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="h-8 px-3 rounded-lg text-xs"
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="h-8 px-3 rounded-lg text-xs"
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* ========================================================================= */}
        {/* MODAL: CONCEDER / ALTERAR ACESSO */}
        {/* ========================================================================= */}
        <Dialog open={isGrantModalOpen} onOpenChange={setIsGrantModalOpen}>
          <DialogContent className="max-w-md bg-white rounded-2xl p-6 font-sans">
            <DialogHeader>
              <div className="h-10 w-10 rounded-xl bg-blue-50 text-[#075BFF] flex items-center justify-center mb-2">
                <Unlock className="h-5 w-5" />
              </div>
              <DialogTitle className="text-base font-bold text-[#0B1739]">
                Conceder Direito de Acesso
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Defina os parâmetros de liberação para a empresa:
                <strong className="block text-slate-800 mt-0.5">{selectedCompany?.fantasy_name || selectedCompany?.name}</strong>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              {/* Aplicativo */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">Aplicativo Alvo</label>
                <Select value={targetAppId} onValueChange={setTargetAppId}>
                  <SelectTrigger className="h-9 text-xs rounded-xl bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {PLATFORM_APPS.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.title} ({a.productStatusLabel})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Origem do Acesso */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">Origem da Concessão</label>
                <Select value={grantOrigin} onValueChange={setGrantOrigin}>
                  <SelectTrigger className="h-9 text-xs rounded-xl bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="manual_grant">Concedido manualmente (Cortesia / Piloto)</SelectItem>
                    <SelectItem value="contracted_separately">Contratado separadamente</SelectItem>
                    <SelectItem value="plan_included">Incluído no plano</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Duração / Validade */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">Duração do Acesso</label>
                <Select value={grantDuration} onValueChange={(val: any) => setGrantDuration(val)}>
                  <SelectTrigger className="h-9 text-xs rounded-xl bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="permanent">Contínuo (Sem data de expiração)</SelectItem>
                    <SelectItem value="30_days">Temporário: 30 dias</SelectItem>
                    <SelectItem value="90_days">Temporário: 90 dias</SelectItem>
                    <SelectItem value="custom">Personalizado (Data específica)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {grantDuration === "custom" && (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Data de Término</label>
                  <Input
                    type="date"
                    value={customExpiresAt}
                    onChange={(e) => setCustomExpiresAt(e.target.value)}
                    className="h-9 text-xs rounded-xl"
                  />
                </div>
              )}

              {/* Motivo Obrigatório */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">Motivo da Concessão (Obrigatório) *</label>
                <Textarea
                  value={grantReason}
                  onChange={(e) => setGrantReason(e.target.value)}
                  placeholder="Ex: Acesso piloto autorizado para testes do App Arrais..."
                  className="text-xs rounded-xl resize-none h-16"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsGrantModalOpen(false)}
                className="text-xs rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={() => grantAccessMutation.mutate({
                  comp: selectedCompany,
                  appId: targetAppId,
                  origin: grantOrigin,
                  duration: grantDuration,
                  customDate: customExpiresAt,
                  reason: grantReason
                })}
                disabled={grantAccessMutation.isPending || !grantReason.trim()}
                className="bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-bold rounded-xl"
              >
                {grantAccessMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Check className="h-4 w-4 mr-1.5" />}
                Confirmar concessão
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ========================================================================= */}
        {/* MODAL: REVOGAR ACESSO */}
        {/* ========================================================================= */}
        <Dialog open={isRevokeModalOpen} onOpenChange={setIsRevokeModalOpen}>
          <DialogContent className="max-w-md bg-white rounded-2xl p-6 font-sans">
            <DialogHeader>
              <div className="h-10 w-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mb-2">
                <Lock className="h-5 w-5" />
              </div>
              <DialogTitle className="text-base font-bold text-[#0B1739]">
                Revogar Direito de Acesso
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Tem certeza que deseja bloquear o acesso ao aplicativo <strong className="text-slate-800">{PLATFORM_APPS.find(a => a.id === targetAppId)?.title}</strong> para a empresa:
                <strong className="block text-slate-800 mt-1">{selectedCompany?.fantasy_name || selectedCompany?.name}</strong>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">Motivo da Revogação</label>
                <Textarea
                  value={grantReason}
                  onChange={(e) => setGrantReason(e.target.value)}
                  placeholder="Informe o motivo da revogação..."
                  className="text-xs rounded-xl resize-none h-16"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsRevokeModalOpen(false)}
                className="text-xs rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={() => revokeAccessMutation.mutate({
                  comp: selectedCompany,
                  appId: targetAppId,
                  reason: grantReason
                })}
                disabled={revokeAccessMutation.isPending}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl"
              >
                {revokeAccessMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Lock className="h-4 w-4 mr-1.5" />}
                Confirmar revogação
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
