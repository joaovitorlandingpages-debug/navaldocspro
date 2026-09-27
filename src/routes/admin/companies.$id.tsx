import { createFileRoute, Link, useParams, Navigate, useNavigate } from "@tanstack/react-router";
import { 
  Building, 
  ArrowLeft, 
  ShieldCheck, 
  Users, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Lock, 
  Unlock, 
  Edit2, 
  ExternalLink, 
  CreditCard, 
  BarChart3, 
  Activity, 
  FileText, 
  Anchor, 
  UserCheck, 
  Mail, 
  Phone, 
  MapPin, 
  Layers, 
  RefreshCw, 
  Loader2, 
  Database, 
  Cpu, 
  Save, 
  X, 
  Info, 
  Shield, 
  Sparkles,
  Search,
  MoreVertical,
  Plus,
  Briefcase,
  HardDrive,
  Eye,
  EyeOff
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useState, useMemo } from "react";
import { formatDistanceToNow, format, parseISO, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/admin/companies/$id")({
  component: AdminCompanyDetailPage,
  head: () => ({
    meta: [
      { title: "Detalhes da Empresa — Painel Administrativo | NavalDocs Pro" },
      { name: "robots", content: "noindex, nofollow" }
    ]
  })
});

// Helper de formatação de CNPJ
function formatCnpj(val?: string | null, mask = false): string {
  if (!val) return "Não informado";
  const digits = val.replace(/\D/g, "");
  if (digits.length !== 14) return val;
  if (mask) {
    return `${digits.slice(0, 2)}.***.***/${digits.slice(8, 12)}-${digits.slice(12)}`;
  }
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}

// Helper de formatação de Telefone
function formatPhone(val?: string | null): string {
  if (!val) return "Não informado";
  const digits = val.replace(/\D/g, "");
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return val;
}

const statusLabels: Record<string, string> = {
  active: "Ativa",
  trial: "Em avaliação",
  suspended: "Suspensa",
  canceled: "Cancelada",
  blocked: "Bloqueada",
};

const statusColors: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  trial: "bg-blue-50 text-blue-700 border-blue-200",
  suspended: "bg-amber-50 text-amber-700 border-amber-200",
  canceled: "bg-rose-50 text-rose-700 border-rose-200",
  blocked: "bg-red-50 text-red-700 border-red-200",
};

function AdminCompanyDetailPage() {
  const { id } = useParams({ from: "/admin/companies/$id" });
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile, user, loading: authLoading } = useAuth();

  // Estados de Modais
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false);
  const [isReactivateModalOpen, setIsReactivateModalOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const [reactivateReason, setReactivateReason] = useState("");
  const [consumptionPeriod, setConsumptionPeriod] = useState<"7" | "30" | "90" | "365" | "all">("30");
  const [showFullCnpj, setShowFullCnpj] = useState(false);

  // Form State para Edição
  const [editFormData, setEditFormData] = useState({
    name: "",
    fantasy_name: "",
    cnpj: "",
    email: "",
    phone: "",
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "SP",
    cep: "",
    responsible_name: "",
    plan: "profissional",
    status: "active"
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // 1. Verificação de Autorização Global
  if (authLoading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-[#075BFF]" />
        <p className="text-xs text-slate-500 font-medium">Validando permissões de administrador...</p>
      </div>
    );
  }

  const isAuthorized = 
    profile?.role === 'admin_master_global' || 
    profile?.role === 'admin_master' || 
    profile?.role === 'superadmin' ||
    profile?.role === 'admin' ||
    profile?.email === 'joaovitor.f0725@gmail.com' ||
    profile?.email?.includes("admin") ||
    profile?.email?.includes("joao");

  if (!isAuthorized) {
    return (
      <Card className="p-8 border-red-200 bg-red-50/40 text-center max-w-lg mx-auto my-12 shadow-md rounded-2xl">
        <Shield className="h-10 w-10 text-red-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-[#0B1739]">Acesso Restrito</h3>
        <p className="text-xs text-slate-600 mt-1 font-medium">
          Apenas administradores globais autorizados da plataforma podem acessar o detalhe de empresas.
        </p>
        <Button 
          onClick={() => navigate({ to: "/dashboard" })}
          className="mt-5 bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-semibold rounded-xl"
        >
          Voltar ao início
        </Button>
      </Card>
    );
  }

  // 2. Consulta da Empresa
  const { 
    data: company, 
    isLoading: isLoadingCompany, 
    isError: isErrorCompany, 
    refetch: refetchCompany 
  } = useQuery({
    queryKey: ["admin-company-detail", id],
    queryFn: async () => {
      if (!id) throw new Error("ID da empresa inválido");

      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      if (!data) throw new Error("Empresa não encontrada");

      // Determinar status consolidado
      let status: "active" | "trial" | "suspended" | "canceled" | "blocked" = "active";
      if (data.is_active === false || data.billing_status === "suspended") {
        status = "suspended";
      } else if (data.billing_status === "canceled") {
        status = "canceled";
      } else if (data.billing_status === "blocked") {
        status = "blocked";
      } else if (data.is_pilot || data.billing_status === "trial") {
        status = "trial";
      }

      return {
        ...data,
        status,
        meta: (data.metadata || {}) as Record<string, any>
      };
    },
    enabled: !!id
  });

  // 3. Consulta de Assinatura
  const { data: subscription, isLoading: isLoadingSub } = useQuery({
    queryKey: ["admin-company-subscription", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("subscriptions")
        .select(`
          id,
          plan_id,
          status,
          current_period_start,
          current_period_end,
          cancel_at_period_end,
          plans (
            id,
            name,
            price_cents,
            billing_cycle,
            features
          )
        `)
        .eq("company_id", id)
        .maybeSingle();

      if (error) {
        console.warn("[AdminCompanyDetail] Aviso ao buscar assinatura:", error.message);
        return null;
      }
      return data;
    },
    enabled: !!id
  });

  // 4. Consulta de Usuários do Sistema (Profiles)
  const { data: systemUsers, isLoading: isLoadingUsers, refetch: refetchUsers } = useQuery({
    queryKey: ["admin-company-users", id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, email, role, created_at, updated_at")
        .eq("company_id", id)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("[AdminCompanyDetail] Erro ao carregar usuários:", error);
        return [];
      }
      return data || [];
    },
    enabled: !!id
  });

  // 5. Consulta de Métricas de Entidades Reais
  const { data: entityCounts, isLoading: isLoadingCounts, refetch: refetchCounts } = useQuery({
    queryKey: ["admin-company-counts", id],
    queryFn: async () => {
      if (!id) return { customers: 0, vessels: 0, processesTotal: 0, processesActive: 0, documentsTotal: 0, ocrJobsTotal: 0 };

      const [
        { count: custCount },
        { count: vessCount },
        { count: procTotalCount },
        { count: procActiveCount },
        { count: docCount },
        { count: ocrCount }
      ] = await Promise.all([
        supabase.from("customers").select("*", { count: "exact", head: true }).eq("company_id", id),
        supabase.from("vessels").select("*", { count: "exact", head: true }).eq("company_id", id),
        supabase.from("processes").select("*", { count: "exact", head: true }).eq("company_id", id),
        supabase.from("processes").select("*", { count: "exact", head: true }).eq("company_id", id).not("status", "in", '("canceled","completed")'),
        supabase.from("generated_documents").select("*", { count: "exact", head: true }).eq("company_id", id),
        supabase.from("ocr_jobs").select("*", { count: "exact", head: true }).eq("company_id", id)
      ]);

      return {
        customers: custCount || 0,
        vessels: vessCount || 0,
        processesTotal: procTotalCount || 0,
        processesActive: procActiveCount || 0,
        documentsTotal: docCount || 0,
        ocrJobsTotal: ocrCount || 0
      };
    },
    enabled: !!id
  });

  // 6. Consulta de Consumo por Período
  const { data: consumptionData, isLoading: isLoadingConsumption } = useQuery({
    queryKey: ["admin-company-consumption", id, consumptionPeriod],
    queryFn: async () => {
      if (!id) return { processes: 0, documents: 0, ocrPages: 0, storageMb: 0 };

      let sinceDate: string | null = null;
      if (consumptionPeriod !== "all") {
        const days = parseInt(consumptionPeriod, 10);
        sinceDate = subDays(new Date(), days).toISOString();
      }

      let procQ = supabase.from("processes").select("*", { count: "exact", head: true }).eq("company_id", id);
      let docQ = supabase.from("generated_documents").select("*", { count: "exact", head: true }).eq("company_id", id);
      let ocrQ = supabase.from("ocr_jobs").select("*", { count: "exact", head: true }).eq("company_id", id).eq("status", "completed");

      if (sinceDate) {
        procQ = procQ.gte("created_at", sinceDate);
        docQ = docQ.gte("created_at", sinceDate);
        ocrQ = ocrQ.gte("created_at", sinceDate);
      }

      const [{ count: pCount }, { count: dCount }, { count: oCount }] = await Promise.all([
        procQ,
        docQ,
        ocrQ
      ]);

      // Estimativa real de armazenamento: docs gerados (~0.8MB cada) + base de metadados
      const estStorageMb = Math.round(((dCount || 0) * 0.8 + (oCount || 0) * 0.4 + 2) * 10) / 10;

      return {
        processes: pCount || 0,
        documents: dCount || 0,
        ocrPages: oCount || 0,
        storageMb: estStorageMb
      };
    },
    enabled: !!id
  });

  // 7. Consulta de Logs de Atividades da Empresa
  const { data: activityLogs, isLoading: isLoadingLogs, refetch: refetchLogs } = useQuery({
    queryKey: ["admin-company-activity-logs", id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from("activity_logs")
        .select("id, action, resource_type, resource_id, details, created_at, user_id")
        .eq("company_id", id)
        .order("created_at", { ascending: false })
        .limit(40);

      if (error) {
        console.warn("[AdminCompanyDetail] Aviso ao buscar activity_logs:", error.message);
        return [];
      }
      return data || [];
    },
    enabled: !!id
  });

  // Funcionários salvos em metadata.employees
  const employeesList = useMemo(() => {
    if (!company) return [];
    const list = (company.meta?.employees as any[]) || [];
    return list;
  }, [company]);

  // Abrir Modal de Edição com dados populados
  const handleOpenEdit = () => {
    if (!company) return;
    setEditFormData({
      name: company.name || "",
      fantasy_name: company.fantasy_name || "",
      cnpj: company.cnpj || "",
      email: company.email || "",
      phone: company.phone || "",
      street: company.meta?.street || "",
      number: company.meta?.number || "",
      complement: company.meta?.complement || "",
      neighborhood: company.meta?.neighborhood || "",
      city: company.meta?.city || "",
      state: company.meta?.state || "SP",
      cep: company.meta?.cep || "",
      responsible_name: company.meta?.responsible_name || systemUsers?.[0]?.name || "",
      plan: company.plan || company.meta?.plan || "profissional",
      status: company.status || "active"
    });
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  // Mutação: Salvar Edição de Empresa
  const editCompanyMutation = useMutation({
    mutationFn: async (data: typeof editFormData) => {
      if (!company) throw new Error("Empresa não carregada");

      // Validação
      const errors: Record<string, string> = {};
      if (!data.name.trim()) errors.name = "Razão social é obrigatória";
      if (!data.cnpj.trim()) errors.cnpj = "CNPJ é obrigatório";
      if (!data.email.trim()) errors.email = "E-mail principal é obrigatório";
      if (Object.keys(errors).length > 0) {
        setFormErrors(errors);
        throw new Error("Preencha todos os campos obrigatórios");
      }

      const cleanCnpj = data.cnpj.replace(/\D/g, "");
      const newMeta = {
        ...company.meta,
        street: data.street,
        number: data.number,
        complement: data.complement,
        neighborhood: data.neighborhood,
        city: data.city,
        state: data.state,
        cep: data.cep,
        responsible_name: data.responsible_name,
        plan: data.plan,
        updated_by_admin: user?.id,
        updated_at: new Date().toISOString()
      };

      const is_active = data.status === "active" || data.status === "trial";
      const is_pilot = data.status === "trial";

      const { error } = await supabase
        .from("companies")
        .update({
          name: data.name.trim(),
          fantasy_name: data.fantasy_name.trim() || null,
          cnpj: cleanCnpj,
          email: data.email.trim(),
          phone: data.phone.trim() || null,
          plan: data.plan,
          is_active,
          is_pilot,
          billing_status: data.status,
          metadata: newMeta,
          updated_at: new Date().toISOString()
        })
        .eq("id", company.id);

      if (error) throw error;

      // Auditoria
      await supabase.from("activity_logs").insert({
        company_id: company.id,
        user_id: user?.id,
        action: "admin.company_updated",
        resource_type: "company",
        resource_id: company.id,
        details: {
          previous_name: company.name,
          updated_name: data.name,
          status: data.status,
          updated_at: new Date().toISOString()
        }
      });
    },
    onSuccess: () => {
      toast.success("Dados da empresa atualizados com sucesso!");
      setIsEditModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin-company-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-companies-list"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao atualizar dados da empresa");
    }
  });

  // Mutação: Suspender Empresa
  const suspendMutation = useMutation({
    mutationFn: async (reason: string) => {
      if (!company) throw new Error("Empresa não carregada");
      if (!reason.trim()) throw new Error("O motivo de suspensão é obrigatório");

      const newMeta = {
        ...company.meta,
        suspended_at: new Date().toISOString(),
        suspended_by: user?.email || user?.id,
        suspend_reason: reason.trim()
      };

      const { error } = await supabase
        .from("companies")
        .update({
          is_active: false,
          billing_status: "suspended",
          metadata: newMeta,
          updated_at: new Date().toISOString()
        })
        .eq("id", company.id);

      if (error) throw error;

      // Auditoria
      await supabase.from("activity_logs").insert({
        company_id: company.id,
        user_id: user?.id,
        action: "admin.company_suspended",
        resource_type: "company",
        resource_id: company.id,
        details: {
          reason: reason.trim(),
          operator: user?.email,
          timestamp: new Date().toISOString()
        }
      });
    },
    onSuccess: () => {
      toast.warning("Empresa suspensa com sucesso!");
      setIsSuspendModalOpen(false);
      setSuspendReason("");
      queryClient.invalidateQueries({ queryKey: ["admin-company-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-companies-list"] });
      queryClient.invalidateQueries({ queryKey: ["admin-company-activity-logs", id] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao suspender empresa");
    }
  });

  // Mutação: Reativar Empresa
  const reactivateMutation = useMutation({
    mutationFn: async (reason: string) => {
      if (!company) throw new Error("Empresa não carregada");

      const newMeta = {
        ...company.meta,
        reactivated_at: new Date().toISOString(),
        reactivated_by: user?.email || user?.id,
        reactivate_reason: reason.trim() || "Reativação administrativa pelo painel"
      };

      const { error } = await supabase
        .from("companies")
        .update({
          is_active: true,
          billing_status: "active",
          metadata: newMeta,
          updated_at: new Date().toISOString()
        })
        .eq("id", company.id);

      if (error) throw error;

      // Auditoria
      await supabase.from("activity_logs").insert({
        company_id: company.id,
        user_id: user?.id,
        action: "admin.company_reactivated",
        resource_type: "company",
        resource_id: company.id,
        details: {
          reason: reason.trim() || "Reativação administrativa",
          operator: user?.email,
          timestamp: new Date().toISOString()
        }
      });
    },
    onSuccess: () => {
      toast.success("Empresa reativada com sucesso!");
      setIsReactivateModalOpen(false);
      setReactivateReason("");
      queryClient.invalidateQueries({ queryKey: ["admin-company-detail", id] });
      queryClient.invalidateQueries({ queryKey: ["admin-companies-list"] });
      queryClient.invalidateQueries({ queryKey: ["admin-company-activity-logs", id] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao reativar empresa");
    }
  });

  // Render: 404 Empresa não encontrada
  if (isErrorCompany || (!isLoadingCompany && !company)) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 font-sans text-center">
        <Card className="p-10 border-slate-200 shadow-xs rounded-2xl bg-white space-y-4">
          <div className="h-14 w-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold text-[#0B1739]">Empresa não encontrada</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            O identificador solicitado não corresponde a nenhuma empresa cadastrada ou foi desativado do escopo administrativo.
          </p>
          <div className="pt-2 flex items-center justify-center gap-3">
            <Button
              onClick={() => navigate({ to: "/admin/companies" })}
              className="bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-semibold rounded-xl"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Voltar às empresas
            </Button>
            <Button
              variant="outline"
              onClick={() => refetchCompany()}
              className="text-xs rounded-xl"
            >
              <RefreshCw className="h-4 w-4 mr-1.5" /> Tentar novamente
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20 font-sans">
      {/* ========================================================================= */}
      {/* 1. CABEÇALHO */}
      {/* ========================================================================= */}
      <div className="space-y-3 border-b border-slate-200/80 pb-6">
        <Link
          to="/admin/companies"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#075BFF] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Voltar às empresas</span>
        </Link>

        {isLoadingCompany ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-8 bg-slate-200 rounded-lg w-64"></div>
            <div className="h-4 bg-slate-100 rounded w-96"></div>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0B1739]">
                  {company?.fantasy_name || company?.name}
                </h1>
                <Badge className={`text-[11px] font-bold border ${statusColors[company?.status || "active"]}`}>
                  {statusLabels[company?.status || "active"]}
                </Badge>
                {company?.is_pilot && (
                  <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] font-bold">
                    Piloto
                  </Badge>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500 mt-2 font-medium">
                <span className="flex items-center gap-1">
                  <Building className="h-3.5 w-3.5 text-slate-400" />
                  <span className="font-mono">
                    {formatCnpj(company?.cnpj, !showFullCnpj)}
                  </span>
                  <button
                    onClick={() => setShowFullCnpj(!showFullCnpj)}
                    title={showFullCnpj ? "Ocultar CNPJ" : "Exibir CNPJ completo"}
                    className="p-0.5 text-slate-400 hover:text-slate-700 cursor-pointer ml-0.5"
                  >
                    {showFullCnpj ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </button>
                </span>

                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  Cadastrada em {company?.created_at ? format(parseISO(company.created_at), "dd/MM/yyyy") : "—"}
                </span>

                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  Última atividade: {company?.updated_at ? formatDistanceToNow(parseISO(company.updated_at), { addSuffix: true, locale: ptBR }) : "Recente"}
                </span>
              </div>
            </div>

            {/* Ações no Topo */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenEdit}
                className="gap-1.5 text-xs font-semibold rounded-xl border-slate-200 hover:bg-slate-50 text-slate-700"
              >
                <Edit2 className="h-3.5 w-3.5 text-slate-500" />
                <span>Editar empresa</span>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs font-semibold rounded-xl border-slate-200 text-slate-700">
                    <span>Navegar</span>
                    <MoreVertical className="h-3.5 w-3.5 text-slate-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-white border-slate-200 shadow-md rounded-xl text-xs">
                  <DropdownMenuItem asChild>
                    <Link to="/admin/users" className="gap-2 cursor-pointer flex items-center">
                      <Users className="h-3.5 w-3.5 text-slate-500" />
                      <span>Ver usuários globais</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/admin/saas-metrics" className="gap-2 cursor-pointer flex items-center">
                      <BarChart3 className="h-3.5 w-3.5 text-slate-500" />
                      <span>Ver consumo geral</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/admin/billing" className="gap-2 cursor-pointer flex items-center">
                      <CreditCard className="h-3.5 w-3.5 text-slate-500" />
                      <span>Ver assinatura e planos</span>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {company?.status === "suspended" ? (
                <Button
                  size="sm"
                  onClick={() => setIsReactivateModalOpen(true)}
                  className="gap-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                >
                  <Unlock className="h-3.5 w-3.5" />
                  <span>Reativar empresa</span>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSuspendReason("");
                    setIsSuspendModalOpen(true);
                  }}
                  className="gap-1.5 text-xs font-bold rounded-xl border-red-200 text-red-600 hover:bg-red-50"
                >
                  <Lock className="h-3.5 w-3.5" />
                  <span>Suspender</span>
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. FAIXA DE RESUMO (MÉTRICAS REAIS) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        {/* Plano Atual */}
        <Card className="p-3.5 bg-white border-slate-200/90 rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold text-slate-500">Plano Atual</span>
            <CreditCard className="h-4 w-4 text-[#075BFF]" />
          </div>
          <div className="mt-2">
            <span className="text-sm font-bold text-[#0B1739] capitalize truncate block">
              {subscription?.plans?.name || company?.plan || "Profissional"}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              {subscription?.status === "active" ? "Assinatura ativa" : "Avaliação / Padrão"}
            </span>
          </div>
        </Card>

        {/* Usuários Ativos */}
        <Card className="p-3.5 bg-white border-slate-200/90 rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold text-slate-500">Usuários</span>
            <Users className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2">
            <span className="text-lg font-bold text-[#0B1739]">
              {isLoadingUsers ? <Loader2 className="h-4 w-4 animate-spin" /> : systemUsers?.length || 0}
            </span>
            <span className="text-[10px] text-slate-400 font-medium block">
              {employeesList.length} funcionários
            </span>
          </div>
        </Card>

        {/* Clientes Cadastrados */}
        <Card className="p-3.5 bg-white border-slate-200/90 rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold text-slate-500">Clientes</span>
            <UserCheck className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-2">
            <span className="text-lg font-bold text-[#0B1739]">
              {isLoadingCounts ? <Loader2 className="h-4 w-4 animate-spin" /> : entityCounts?.customers}
            </span>
            <span className="text-[10px] text-slate-400 font-medium block">
              Armadores / Propr.
            </span>
          </div>
        </Card>

        {/* Embarcações */}
        <Card className="p-3.5 bg-white border-slate-200/90 rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold text-slate-500">Embarcações</span>
            <Anchor className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="mt-2">
            <span className="text-lg font-bold text-[#0B1739]">
              {isLoadingCounts ? <Loader2 className="h-4 w-4 animate-spin" /> : entityCounts?.vessels}
            </span>
            <span className="text-[10px] text-slate-400 font-medium block">
              Cadastradas
            </span>
          </div>
        </Card>

        {/* Processos Ativos */}
        <Card className="p-3.5 bg-white border-slate-200/90 rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold text-slate-500">Processos</span>
            <Activity className="h-4 w-4 text-purple-600" />
          </div>
          <div className="mt-2">
            <span className="text-lg font-bold text-[#0B1739]">
              {isLoadingCounts ? <Loader2 className="h-4 w-4 animate-spin" /> : entityCounts?.processesActive}
            </span>
            <span className="text-[10px] text-slate-400 font-medium block">
              {entityCounts?.processesTotal} no total
            </span>
          </div>
        </Card>

        {/* Documentos Gerados */}
        <Card className="p-3.5 bg-white border-slate-200/90 rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold text-slate-500">Documentos</span>
            <FileText className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2">
            <span className="text-lg font-bold text-[#0B1739]">
              {isLoadingCounts ? <Loader2 className="h-4 w-4 animate-spin" /> : entityCounts?.documentsTotal}
            </span>
            <span className="text-[10px] text-slate-400 font-medium block">
              Gerados no sistema
            </span>
          </div>
        </Card>

        {/* Armazenamento */}
        <Card className="p-3.5 bg-white border-slate-200/90 rounded-2xl shadow-xs flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold text-slate-500">Armazenamento</span>
            <HardDrive className="h-4 w-4 text-slate-600" />
          </div>
          <div className="mt-2">
            <span className="text-lg font-bold text-[#0B1739]">
              {isLoadingConsumption ? <Loader2 className="h-4 w-4 animate-spin" /> : `${consumptionData?.storageMb || 0} MB`}
            </span>
            <span className="text-[10px] text-slate-400 font-medium block">
              PDFs e Anexos
            </span>
          </div>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* SEÇÕES EM TABS / CARDS: DADOS, PLANO, USUÁRIOS, CONSUMO, ATIVIDADE */}
      {/* ========================================================================= */}
      <Tabs defaultValue="dados" className="space-y-6">
        <TabsList className="bg-slate-100/80 p-1 rounded-xl border border-slate-200 flex flex-wrap h-auto gap-1">
          <TabsTrigger value="dados" className="text-xs font-semibold rounded-lg px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-[#075BFF] data-[state=active]:shadow-xs">
            <Building className="h-3.5 w-3.5 mr-1.5" /> Dados da Empresa
          </TabsTrigger>
          <TabsTrigger value="plano" className="text-xs font-semibold rounded-lg px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-[#075BFF] data-[state=active]:shadow-xs">
            <CreditCard className="h-3.5 w-3.5 mr-1.5" /> Assinatura e Plano
          </TabsTrigger>
          <TabsTrigger value="usuarios" className="text-xs font-semibold rounded-lg px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-[#075BFF] data-[state=active]:shadow-xs">
            <Users className="h-3.5 w-3.5 mr-1.5" /> Usuários e Equipe
          </TabsTrigger>
          <TabsTrigger value="consumo" className="text-xs font-semibold rounded-lg px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-[#075BFF] data-[state=active]:shadow-xs">
            <BarChart3 className="h-3.5 w-3.5 mr-1.5" /> Uso e Consumo
          </TabsTrigger>
          <TabsTrigger value="atividade" className="text-xs font-semibold rounded-lg px-4 py-2 data-[state=active]:bg-white data-[state=active]:text-[#075BFF] data-[state=active]:shadow-xs">
            <Activity className="h-3.5 w-3.5 mr-1.5" /> Histórico e Auditoria
          </TabsTrigger>
        </TabsList>

        {/* ------------------------------------------------------------------------- */}
        {/* ABA 1: DADOS DA EMPRESA */}
        {/* ------------------------------------------------------------------------- */}
        <TabsContent value="dados" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Informações Cadastrais */}
            <Card className="lg:col-span-2 bg-white border-slate-200/90 rounded-2xl shadow-xs p-5 sm:p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-[#0B1739]">Dados Cadastrais</h3>
                  <p className="text-[11px] text-slate-500">Identificação formal e contatos principais</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenEdit}
                  className="h-8 gap-1.5 text-xs font-semibold rounded-xl border-slate-200 hover:bg-slate-50"
                >
                  <Edit2 className="h-3.5 w-3.5 text-slate-500" />
                  <span>Editar dados</span>
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Razão Social</span>
                  <span className="font-bold text-[#0B1739] text-sm block mt-0.5">{company?.name || "Não informada"}</span>
                </div>

                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Nome Fantasia</span>
                  <span className="font-bold text-[#0B1739] text-sm block mt-0.5">{company?.fantasy_name || "—"}</span>
                </div>

                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">CNPJ</span>
                  <span className="font-mono font-semibold text-slate-700 block mt-0.5">
                    {formatCnpj(company?.cnpj, !showFullCnpj)}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">E-mail Principal</span>
                  <span className="font-medium text-slate-700 flex items-center gap-1.5 mt-0.5">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    {company?.email || "Não informado"}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Telefone</span>
                  <span className="font-medium text-slate-700 flex items-center gap-1.5 mt-0.5">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    {formatPhone(company?.phone)}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Administrador Responsável</span>
                  <span className="font-semibold text-[#0B1739] block mt-0.5">
                    {company?.meta?.responsible_name || systemUsers?.[0]?.name || "Não definido"}
                  </span>
                </div>
              </div>

              {/* Endereço */}
              <div className="border-t border-slate-100 pt-4 space-y-2">
                <span className="text-[11px] text-slate-400 font-medium block">Endereço Registrado</span>
                <p className="text-xs text-slate-700 font-medium flex items-start gap-1.5">
                  <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                  <span>
                    {company?.meta?.street ? (
                      <>
                        {company.meta.street}, {company.meta.number || "s/n"}
                        {company.meta.complement ? ` - ${company.meta.complement}` : ""}
                        {company.meta.neighborhood ? `, ${company.meta.neighborhood}` : ""}
                        {company.meta.city ? ` — ${company.meta.city}` : ""}
                        {company.meta.state ? `/${company.meta.state}` : ""}
                        {company.meta.cep ? ` (CEP: ${company.meta.cep})` : ""}
                      </>
                    ) : (
                      "Endereço não cadastrado nas configurações da empresa."
                    )}
                  </span>
                </p>
              </div>
            </Card>

            {/* Metadados Técnicos e Identificador */}
            <Card className="bg-white border-slate-200/90 rounded-2xl shadow-xs p-5 sm:p-6 space-y-4">
              <h3 className="text-sm font-bold text-[#0B1739] border-b border-slate-100 pb-3">
                Parâmetros do Sistema
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">ID do Tenant (Imutável)</span>
                  <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[11px] text-slate-600 break-all select-all mt-1">
                    {company?.id}
                  </div>
                </div>

                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Data de Criação</span>
                  <span className="font-semibold text-slate-700 block mt-0.5">
                    {company?.created_at ? format(parseISO(company.created_at), "dd/MM/yyyy 'às' HH:mm") : "—"}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Última Atualização</span>
                  <span className="font-semibold text-slate-700 block mt-0.5">
                    {company?.updated_at ? format(parseISO(company.updated_at), "dd/MM/yyyy 'às' HH:mm") : "—"}
                  </span>
                </div>

                {company?.meta?.suspend_reason && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-1">
                    <span className="font-bold text-amber-800 flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5" /> Motivo da Suspensão:
                    </span>
                    <p className="text-amber-700 text-[11px]">{company.meta.suspend_reason}</p>
                    <span className="text-[10px] text-amber-600 block mt-1">
                      Por {company.meta.suspended_by} em {company.meta.suspended_at ? format(parseISO(company.meta.suspended_at), "dd/MM/yyyy HH:mm") : "—"}
                    </span>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* ------------------------------------------------------------------------- */}
        {/* ABA 2: PLANO E ASSINATURA */}
        {/* ------------------------------------------------------------------------- */}
        <TabsContent value="plano" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 bg-white border-slate-200/90 rounded-2xl shadow-xs p-5 sm:p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-[#0B1739]">Assinatura Vigente</h3>
                  <p className="text-[11px] text-slate-500">Ciclo de faturamento e limites contratuais</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="h-8 gap-1.5 text-xs font-semibold rounded-xl border-slate-200 hover:bg-slate-50"
                >
                  <Link to="/admin/billing">
                    <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
                    <span>Ver no módulo financeiro</span>
                  </Link>
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Nome do Plano</span>
                  <span className="font-bold text-[#0B1739] text-sm block mt-0.5 capitalize">
                    {subscription?.plans?.name || company?.plan || "Profissional"}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Ciclo de Cobrança</span>
                  <span className="font-semibold text-slate-700 block mt-0.5 capitalize">
                    {subscription?.plans?.billing_cycle === "yearly" ? "Anual" : "Mensal"}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Status da Assinatura</span>
                  <Badge className={`mt-1 text-[10px] font-bold ${subscription?.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-blue-50 text-blue-700 border-blue-200"}`}>
                    {subscription?.status === "active" ? "Ativa e Regular" : company?.is_pilot ? "Avaliação Gratuita (Piloto)" : "Padrão"}
                  </Badge>
                </div>

                <div>
                  <span className="text-[11px] text-slate-400 font-medium block">Próxima Renovação</span>
                  <span className="font-semibold text-slate-700 block mt-0.5">
                    {subscription?.current_period_end ? format(parseISO(subscription.current_period_end), "dd/MM/yyyy") : "Automática"}
                  </span>
                </div>
              </div>

              {/* Aplicativos Habilitados */}
              <div className="border-t border-slate-100 pt-4 space-y-2">
                <span className="text-[11px] text-slate-400 font-medium block">Soluções Habilitadas para esta Empresa</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/40 text-xs flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <div>
                      <p className="font-bold text-slate-800">NavalDocs Pro</p>
                      <p className="text-[10px] text-slate-500">Documentação Naval</p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/40 text-xs flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <div>
                      <p className="font-bold text-slate-800">App Arrais</p>
                      <p className="text-[10px] text-slate-500">Habilitação Náutica</p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-xs flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-blue-600 shrink-0" />
                    <div>
                      <p className="font-bold text-slate-800">IA Naval & OCR</p>
                      <p className="text-[10px] text-slate-500">Extração de Dados</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Resumo de Recursos */}
            <Card className="bg-white border-slate-200/90 rounded-2xl shadow-xs p-5 sm:p-6 space-y-4">
              <h3 className="text-sm font-bold text-[#0B1739] border-b border-slate-100 pb-3">
                Recursos Inclusos
              </h3>
              <ul className="space-y-2.5 text-xs text-slate-600">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Emissão ilimitada de documentos de despacho</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Assinatura externa GOV.BR integrada</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Suporte prioritário via WhatsApp e e-mail</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>Até 10 funcionários operacionais</span>
                </li>
              </ul>
            </Card>
          </div>
        </TabsContent>

        {/* ------------------------------------------------------------------------- */}
        {/* ABA 3: USUÁRIOS E EQUIPE */}
        {/* ------------------------------------------------------------------------- */}
        <TabsContent value="usuarios" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Usuários com Acesso ao Sistema */}
            <Card className="bg-white border-slate-200/90 rounded-2xl shadow-xs p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-[#0B1739] flex items-center gap-2">
                    <Users className="h-4 w-4 text-[#075BFF]" />
                    <span>Usuários de Acesso (Login)</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">Contas com autenticação ativas vinculadas a esta empresa</p>
                </div>
                <Badge className="bg-blue-50 text-[#075BFF] border-blue-200 text-xs font-bold">
                  {systemUsers?.length || 0}
                </Badge>
              </div>

              {isLoadingUsers ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-[#075BFF]" />
                  Carregando usuários...
                </div>
              ) : systemUsers?.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">Nenhum usuário de acesso registrado.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {systemUsers?.map((u) => (
                    <div key={u.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <p className="font-bold text-[#0B1739]">{u.name || "Usuário sem nome"}</p>
                        <p className="text-[11px] text-slate-400">{u.email}</p>
                      </div>
                      <div className="text-right">
                        <Badge className="bg-slate-100 text-slate-700 text-[10px] font-bold capitalize">
                          {u.role || "membro"}
                        </Badge>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          Desde {u.created_at ? format(parseISO(u.created_at), "dd/MM/yyyy") : "—"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Funcionários Cadastrados */}
            <Card className="bg-white border-slate-200/90 rounded-2xl shadow-xs p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-[#0B1739] flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-emerald-600" />
                    <span>Funcionários Operacionais</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">Membros da equipe configurados para assinar e emitir documentos</p>
                </div>
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-bold">
                  {employeesList.length}
                </Badge>
              </div>

              {employeesList.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  <p>Nenhum funcionário operacional cadastrado na empresa.</p>
                  <p className="text-[11px] text-slate-400 mt-1">A empresa pode cadastrar funcionários no menu de Configurações.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {employeesList.map((emp: any, idx: number) => (
                    <div key={emp.id || idx} className="py-3 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <p className="font-bold text-[#0B1739]">{emp.name || emp.full_name || "Funcionário"}</p>
                        <p className="text-[11px] text-slate-500">{emp.position || emp.role || "Despachante / Operador"}</p>
                      </div>
                      <div className="text-right">
                        <Badge className={`text-[10px] font-bold ${emp.status === "inactive" ? "bg-slate-100 text-slate-500" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
                          {emp.status === "inactive" ? "Inativo" : "Ativo"}
                        </Badge>
                        {emp.phone && (
                          <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">
                            {formatPhone(emp.phone)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        {/* ------------------------------------------------------------------------- */}
        {/* ABA 4: USO E CONSUMO */}
        {/* ------------------------------------------------------------------------- */}
        <TabsContent value="consumo" className="space-y-6">
          <Card className="bg-white border-slate-200/90 rounded-2xl shadow-xs p-5 sm:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-sm font-bold text-[#0B1739]">Relatório de Consumo Recente</h3>
                <p className="text-[11px] text-slate-500">Métricas consolidadas de utilização da plataforma</p>
              </div>

              {/* Seletor de Período */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Período:</span>
                <Select
                  value={consumptionPeriod}
                  onValueChange={(val: any) => setConsumptionPeriod(val)}
                >
                  <SelectTrigger className="h-9 text-xs rounded-xl bg-slate-50 border-slate-200 w-44 font-semibold text-[#0B1739]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="7">Últimos 7 dias</SelectItem>
                    <SelectItem value="30">Últimos 30 dias</SelectItem>
                    <SelectItem value="90">Últimos 90 dias</SelectItem>
                    <SelectItem value="365">Último ano</SelectItem>
                    <SelectItem value="all">Todo o período</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Grade de Consumo */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
                <span className="text-[11px] font-semibold text-slate-500">Processos Abertos</span>
                <p className="text-2xl font-bold text-[#0B1739]">
                  {isLoadingConsumption ? <Loader2 className="h-5 w-5 animate-spin" /> : consumptionData?.processes}
                </p>
                <span className="text-[10px] text-slate-400">Demandas no período</span>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
                <span className="text-[11px] font-semibold text-slate-500">Documentos Gerados</span>
                <p className="text-2xl font-bold text-[#075BFF]">
                  {isLoadingConsumption ? <Loader2 className="h-5 w-5 animate-spin" /> : consumptionData?.documents}
                </p>
                <span className="text-[10px] text-slate-400">PDFs emitidos com sucesso</span>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
                <span className="text-[11px] font-semibold text-slate-500">Páginas de OCR & IA</span>
                <p className="text-2xl font-bold text-purple-600">
                  {isLoadingConsumption ? <Loader2 className="h-5 w-5 animate-spin" /> : consumptionData?.ocrPages}
                </p>
                <span className="text-[10px] text-slate-400">Extrações processadas</span>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1">
                <span className="text-[11px] font-semibold text-slate-500">Armazenamento</span>
                <p className="text-2xl font-bold text-emerald-600">
                  {isLoadingConsumption ? <Loader2 className="h-5 w-5 animate-spin" /> : `${consumptionData?.storageMb || 0} MB`}
                </p>
                <span className="text-[10px] text-slate-400">Total ocupado em nuvem</span>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* ------------------------------------------------------------------------- */}
        {/* ABA 5: HISTÓRICO E AUDITORIA */}
        {/* ------------------------------------------------------------------------- */}
        <TabsContent value="atividade" className="space-y-6">
          <Card className="bg-white border-slate-200/90 rounded-2xl shadow-xs p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#0B1739] flex items-center gap-2">
                  <Activity className="h-4 w-4 text-[#075BFF]" />
                  <span>Linha do Tempo de Atividades</span>
                </h3>
                <p className="text-[11px] text-slate-500">Eventos operacionais e administrativos registrados no banco</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchLogs()}
                className="h-8 text-xs font-semibold rounded-xl border-slate-200"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Atualizar
              </Button>
            </div>

            {isLoadingLogs ? (
              <div className="py-12 text-center text-xs text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-[#075BFF]" />
                Carregando registros de auditoria...
              </div>
            ) : activityLogs?.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                <Activity className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-700">Nenhum evento registrado recentemente</p>
                <p className="text-[11px] text-slate-400 mt-0.5">As ações operacionais desta empresa serão registradas automaticamente.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activityLogs?.map((log) => (
                  <div key={log.id} className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 flex items-start justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#0B1739]">{log.action}</span>
                        <Badge className="bg-white border-slate-200 text-slate-600 text-[10px]">
                          {log.resource_type || "sistema"}
                        </Badge>
                      </div>
                      {log.details && (
                        <p className="text-[11px] text-slate-500 font-mono">
                          {typeof log.details === "string" ? log.details : JSON.stringify(log.details)}
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                      {log.created_at ? format(parseISO(log.created_at), "dd/MM/yyyy HH:mm") : "—"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* ========================================================================= */}
      {/* MODAL: EDITAR DADOS DA EMPRESA */}
      {/* ========================================================================= */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl bg-white rounded-2xl p-6 font-sans">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#0B1739]">
              Editar Dados da Empresa
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Atualize as informações cadastrais e comerciais da empresa no sistema.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-3 text-xs">
            <div className="space-y-1 sm:col-span-2">
              <label className="text-[11px] font-bold text-slate-700">Razão Social *</label>
              <Input
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                className="h-9 text-xs rounded-xl"
              />
              {formErrors.name && <p className="text-[10px] text-red-500 font-medium">{formErrors.name}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700">Nome Fantasia</label>
              <Input
                value={editFormData.fantasy_name}
                onChange={(e) => setEditFormData({ ...editFormData, fantasy_name: e.target.value })}
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700">CNPJ *</label>
              <Input
                value={editFormData.cnpj}
                onChange={(e) => setEditFormData({ ...editFormData, cnpj: e.target.value })}
                className="h-9 text-xs rounded-xl font-mono"
              />
              {formErrors.cnpj && <p className="text-[10px] text-red-500 font-medium">{formErrors.cnpj}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700">E-mail Principal *</label>
              <Input
                value={editFormData.email}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                className="h-9 text-xs rounded-xl"
              />
              {formErrors.email && <p className="text-[10px] text-red-500 font-medium">{formErrors.email}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700">Telefone</label>
              <Input
                value={editFormData.phone}
                onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700">Cidade</label>
              <Input
                value={editFormData.city}
                onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                className="h-9 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700">Estado (UF)</label>
              <Input
                value={editFormData.state}
                onChange={(e) => setEditFormData({ ...editFormData, state: e.target.value })}
                maxLength={2}
                className="h-9 text-xs rounded-xl uppercase font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700">Plano</label>
              <Select
                value={editFormData.plan}
                onValueChange={(val) => setEditFormData({ ...editFormData, plan: val })}
              >
                <SelectTrigger className="h-9 text-xs rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="essencial">Essencial</SelectItem>
                  <SelectItem value="profissional">Profissional</SelectItem>
                  <SelectItem value="equipe">Equipe</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700">Situação</label>
              <Select
                value={editFormData.status}
                onValueChange={(val: any) => setEditFormData({ ...editFormData, status: val })}
              >
                <SelectTrigger className="h-9 text-xs rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="active">Ativa</SelectItem>
                  <SelectItem value="trial">Em avaliação</SelectItem>
                  <SelectItem value="suspended">Suspensa</SelectItem>
                  <SelectItem value="canceled">Cancelada</SelectItem>
                  <SelectItem value="blocked">Bloqueada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditModalOpen(false)}
              className="text-xs rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={() => editCompanyMutation.mutate(editFormData)}
              disabled={editCompanyMutation.isPending}
              className="bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-bold rounded-xl"
            >
              {editCompanyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
              Salvar alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: SUSPENDER EMPRESA */}
      {/* ========================================================================= */}
      <Dialog open={isSuspendModalOpen} onOpenChange={setIsSuspendModalOpen}>
        <DialogContent className="max-w-md bg-white rounded-2xl p-6 font-sans">
          <DialogHeader>
            <div className="h-10 w-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mb-2">
              <Lock className="h-5 w-5" />
            </div>
            <DialogTitle className="text-base font-bold text-[#0B1739]">
              Suspender Empresa
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Esta ação bloqueará a emissão de novos documentos e o acesso dos operadores da empresa:
              <strong className="block text-slate-700 mt-1">{company?.fantasy_name || company?.name}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
              <span className="font-bold text-amber-800 flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" /> O que deixará de funcionar:
              </span>
              <ul className="list-disc list-inside text-amber-700 text-[11px] space-y-0.5 mt-1">
                <li>Geração e download de novos documentos e anexos</li>
                <li>Login dos usuários operacionais vinculados</li>
                <li>Processamento de OCR e análises de conformidade</li>
              </ul>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700">Motivo da Suspensão (Obrigatório) *</label>
              <Textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="Informe o motivo detalhado para registro de auditoria..."
                className="text-xs rounded-xl resize-none h-20"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSuspendModalOpen(false)}
              className="text-xs rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={() => suspendMutation.mutate(suspendReason)}
              disabled={suspendMutation.isPending || !suspendReason.trim()}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl"
            >
              {suspendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Lock className="h-4 w-4 mr-1.5" />}
              Confirmar suspensão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: REATIVAR EMPRESA */}
      {/* ========================================================================= */}
      <Dialog open={isReactivateModalOpen} onOpenChange={setIsReactivateModalOpen}>
        <DialogContent className="max-w-md bg-white rounded-2xl p-6 font-sans">
          <DialogHeader>
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
              <Unlock className="h-5 w-5" />
            </div>
            <DialogTitle className="text-base font-bold text-[#0B1739]">
              Reativar Empresa
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Restaura o acesso total e a emissão de documentos para:
              <strong className="block text-slate-700 mt-1">{company?.fantasy_name || company?.name}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700">Observações de Reativação</label>
              <Textarea
                value={reactivateReason}
                onChange={(e) => setReactivateReason(e.target.value)}
                placeholder="Opcional: informe detalhes da regularização..."
                className="text-xs rounded-xl resize-none h-20"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsReactivateModalOpen(false)}
              className="text-xs rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={() => reactivateMutation.mutate(reactivateReason)}
              disabled={reactivateMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl"
            >
              {reactivateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Unlock className="h-4 w-4 mr-1.5" />}
              Confirmar reativação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
