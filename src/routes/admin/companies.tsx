import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { 
  Building, 
  Search, 
  Plus, 
  Filter, 
  ExternalLink, 
  ShieldCheck, 
  Activity, 
  TrendingUp, 
  Users, 
  AlertTriangle,
  ChevronRight,
  Sparkles,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  FileText,
  MoreVertical,
  Edit2,
  Lock,
  Unlock,
  Eye,
  CreditCard,
  BarChart3,
  Loader2,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  X,
  Mail,
  Phone,
  MapPin,
  Save,
  Trash2
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useState, useMemo, useCallback } from "react";

export const Route = createFileRoute("/admin/companies")({
  component: AdminCompaniesPage,
});

interface CompanyFormData {
  name: string;
  fantasy_name: string;
  cnpj: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  responsible_name: string;
  plan: string;
  status: "active" | "trial" | "suspended" | "canceled" | "blocked";
}

function AdminCompaniesPage() {
  const queryClient = useQueryClient();
  const { profile, user, loading: authLoading } = useAuth();
  
  // Estados de Filtros e Busca
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPlanFilter, setSelectedPlanFilter] = useState("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState<"recent" | "name_asc" | "name_desc">("recent");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Estados de Modais
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSuspendModalOpen, setIsSuspendModalOpen] = useState(false);
  const [isReactivateModalOpen, setIsReactivateModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<any | null>(null);
  const [suspendReason, setSuspendReason] = useState("");

  // Formulário de Cadastro / Edição
  const [formData, setFormData] = useState<CompanyFormData>({
    name: "",
    fantasy_name: "",
    cnpj: "",
    email: "",
    phone: "",
    city: "",
    state: "SP",
    responsible_name: "",
    plan: "profissional",
    status: "active",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Permissão de acesso administrativo global
  if (authLoading) return null;
  const isAuthorized = 
    profile?.role === 'admin_master_global' || 
    profile?.role === 'admin_master' || 
    profile?.role === 'superadmin' ||
    profile?.role === 'admin' ||
    profile?.email === 'joaovitor.f0725@gmail.com' ||
    profile?.email === 'douglas_faresi@hotmail.com';

  if (!isAuthorized) {
    return <Navigate to="/dashboard" />;
  }

  // 1. Consulta Consolidada de Empresas do Supabase
  const { data: companiesData, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["admin-companies-list"],
    queryFn: async () => {
      // Buscar empresas
      const { data: companies, error: compErr } = await supabase
        .from("companies")
        .select(`
          id,
          name,
          fantasy_name,
          cnpj,
          email,
          phone,
          is_active,
          is_pilot,
          billing_status,
          plan,
          created_at,
          updated_at,
          metadata
        `)
        .order("created_at", { ascending: false });

      if (compErr) {
        console.error("[AdminCompanies] Erro ao carregar empresas:", compErr);
        throw compErr;
      }

      // Buscar contagens de usuários por empresa
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, company_id, name, email, role");

      // Buscar contagens de processos por empresa
      const { data: processesData } = await supabase
        .from("processes")
        .select("id, company_id");

      // Mapear contagens e responsáveis
      const profilesMap = new Map<string, any[]>();
      (profilesData || []).forEach((p) => {
        if (p.company_id) {
          const list = profilesMap.get(p.company_id) || [];
          list.push(p);
          profilesMap.set(p.company_id, list);
        }
      });

      const processesMap = new Map<string, number>();
      (processesData || []).forEach((pr) => {
        if (pr.company_id) {
          processesMap.set(pr.company_id, (processesMap.get(pr.company_id) || 0) + 1);
        }
      });

      return (companies || []).map((comp: any) => {
        const compProfiles = profilesMap.get(comp.id) || [];
        const adminUser = compProfiles.find((p) => p.role === "admin" || p.role === "admin_master") || compProfiles[0];
        const procCount = processesMap.get(comp.id) || 0;

        // Determinar situação
        let status: "active" | "trial" | "suspended" | "canceled" | "blocked" = "active";
        if (comp.is_active === false || comp.billing_status === "suspended") {
          status = "suspended";
        } else if (comp.billing_status === "canceled") {
          status = "canceled";
        } else if (comp.billing_status === "blocked") {
          status = "blocked";
        } else if (comp.is_pilot || comp.billing_status === "trial") {
          status = "trial";
        }

        return {
          ...comp,
          status,
          usersCount: compProfiles.length || 1,
          processesCount: procCount,
          responsible_name: adminUser?.name || comp.metadata?.responsible_name || "Administrador",
          responsible_email: adminUser?.email || comp.email || "Sem e-mail",
          displayPlan: comp.plan || comp.metadata?.plan || "Profissional",
        };
      });
    },
    staleTime: 1000 * 60 * 2,
  });

  // Formatação de CNPJ
  const formatCnpj = (val: string) => {
    const raw = (val || "").replace(/\D/g, "").slice(0, 14);
    if (raw.length > 12) {
      return `${raw.slice(0, 2)}.${raw.slice(2, 5)}.${raw.slice(5, 8)}/${raw.slice(8, 12)}-${raw.slice(12, 14)}`;
    }
    if (raw.length > 8) {
      return `${raw.slice(0, 2)}.${raw.slice(2, 5)}.${raw.slice(5, 8)}/${raw.slice(8)}`;
    }
    if (raw.length > 5) {
      return `${raw.slice(0, 2)}.${raw.slice(2, 5)}.${raw.slice(5)}`;
    }
    if (raw.length > 2) {
      return `${raw.slice(0, 2)}.${raw.slice(2)}`;
    }
    return raw;
  };

  // 2. Filtros e Ordenação no Cliente
  const filteredCompanies = useMemo(() => {
    if (!companiesData) return [];

    let list = companiesData.filter((c) => {
      const search = searchTerm.toLowerCase().trim();
      const matchesSearch = 
        !search ||
        c.name?.toLowerCase().includes(search) ||
        c.fantasy_name?.toLowerCase().includes(search) ||
        c.cnpj?.replace(/\D/g, "").includes(search) ||
        c.email?.toLowerCase().includes(search) ||
        c.responsible_name?.toLowerCase().includes(search);

      const matchesPlan = 
        selectedPlanFilter === "all" ||
        c.displayPlan?.toLowerCase().includes(selectedPlanFilter.toLowerCase());

      const matchesStatus = 
        selectedStatusFilter === "all" ||
        c.status === selectedStatusFilter;

      return matchesSearch && matchesPlan && matchesStatus;
    });

    // Ordenação
    if (sortOrder === "name_asc") {
      list.sort((a, b) => (a.fantasy_name || a.name).localeCompare(b.fantasy_name || b.name, "pt-BR"));
    } else if (sortOrder === "name_desc") {
      list.sort((a, b) => (b.fantasy_name || b.name).localeCompare(a.fantasy_name || a.name, "pt-BR"));
    } else {
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return list;
  }, [companiesData, searchTerm, selectedPlanFilter, selectedStatusFilter, sortOrder]);

  // Paginação
  const totalPages = Math.ceil(filteredCompanies.length / itemsPerPage) || 1;
  const paginatedCompanies = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredCompanies.slice(start, start + itemsPerPage);
  }, [filteredCompanies, currentPage]);

  // 3. Mutação: Salvar / Cadastrar Empresa com Auditoria
  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) errors.name = "Razão social é obrigatória.";
    if (!formData.email.trim()) errors.email = "E-mail principal é obrigatório.";
    if (formData.cnpj.trim()) {
      const rawCnpj = formData.cnpj.replace(/\D/g, "");
      if (rawCnpj.length !== 14) errors.cnpj = "CNPJ deve conter 14 dígitos.";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const currentAdminName = profile?.name || user?.email?.split("@")[0] || "Admin Global";

      if (selectedCompany) {
        // Modo Edição
        const { error: editErr } = await supabase
          .from("companies")
          .update({
            name: formData.name,
            fantasy_name: formData.fantasy_name || formData.name,
            cnpj: formData.cnpj,
            email: formData.email,
            phone: formData.phone,
            plan: formData.plan,
            is_active: formData.status === "active" || formData.status === "trial",
            billing_status: formData.status,
            metadata: {
              ...selectedCompany.metadata,
              city: formData.city,
              state: formData.state,
              responsible_name: formData.responsible_name,
              updated_by_admin: currentAdminName,
            },
            updated_at: now,
          } as any)
          .eq("id", selectedCompany.id);

        if (editErr) throw editErr;

        // Registrar auditoria
        await supabase.from("activity_logs").insert({
          action: "company_updated",
          module: "admin",
          company_id: selectedCompany.id,
          description: `Empresa ${formData.name} atualizada pelo administrador ${currentAdminName}`,
          user_id: user?.id || null,
        });

        toast.success("Empresa atualizada com sucesso!");
        setIsEditModalOpen(false);
      } else {
        // Modo Cadastro Novo
        // Verificar duplicidade de CNPJ se informado
        if (formData.cnpj.trim()) {
          const { data: existing } = await supabase
            .from("companies")
            .select("id")
            .eq("cnpj", formData.cnpj.trim())
            .maybeSingle();

          if (existing) {
            setFormErrors({ cnpj: "Já existe uma empresa cadastrada com este CNPJ." });
            setIsSaving(false);
            return;
          }
        }

        const { data: newComp, error: createErr } = await supabase
          .from("companies")
          .insert({
            name: formData.name,
            fantasy_name: formData.fantasy_name || formData.name,
            cnpj: formData.cnpj,
            email: formData.email,
            phone: formData.phone,
            plan: formData.plan,
            is_active: formData.status === "active" || formData.status === "trial",
            billing_status: formData.status,
            is_pilot: formData.status === "trial",
            metadata: {
              city: formData.city,
              state: formData.state,
              responsible_name: formData.responsible_name,
              created_by_admin: currentAdminName,
            },
            created_at: now,
            updated_at: now,
          } as any)
          .select()
          .single();

        if (createErr) throw createErr;

        // Registrar auditoria
        if (newComp) {
          await supabase.from("activity_logs").insert({
            action: "company_created",
            module: "admin",
            company_id: newComp.id,
            description: `Nova empresa ${formData.name} cadastrada pelo administrador ${currentAdminName}`,
            user_id: user?.id || null,
          });
        }

        toast.success("Nova empresa cadastrada com sucesso!");
        setIsCreateModalOpen(false);
      }

      queryClient.invalidateQueries({ queryKey: ["admin-companies-list"] });
    } catch (err: any) {
      console.error("Erro ao salvar empresa:", err);
      toast.error(err?.message || "Erro ao salvar empresa.");
    } finally {
      setIsSaving(false);
    }
  };

  // 4. Mutação: Suspender Empresa com Motivo e Auditoria
  const handleSuspendCompany = async () => {
    if (!selectedCompany || !suspendReason.trim()) {
      toast.error("Informe o motivo da suspensão.");
      return;
    }

    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const currentAdminName = profile?.name || user?.email?.split("@")[0] || "Admin Global";

      const { error } = await supabase
        .from("companies")
        .update({
          is_active: false,
          billing_status: "suspended",
          metadata: {
            ...selectedCompany.metadata,
            suspend_reason: suspendReason,
            suspended_at: now,
            suspended_by: currentAdminName,
          },
          updated_at: now,
        } as any)
        .eq("id", selectedCompany.id);

      if (error) throw error;

      await supabase.from("activity_logs").insert({
        action: "company_suspended",
        module: "admin",
        company_id: selectedCompany.id,
        description: `Empresa suspensa por ${currentAdminName}. Motivo: ${suspendReason}`,
        user_id: user?.id || null,
      });

      toast.success("Empresa suspensa com sucesso.");
      setIsSuspendModalOpen(false);
      setSuspendReason("");
      queryClient.invalidateQueries({ queryKey: ["admin-companies-list"] });
    } catch (err: any) {
      console.error("Erro ao suspender empresa:", err);
      toast.error("Erro ao suspender empresa.");
    } finally {
      setIsSaving(false);
    }
  };

  // 5. Mutação: Reativar Empresa com Auditoria
  const handleReactivateCompany = async () => {
    if (!selectedCompany) return;

    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const currentAdminName = profile?.name || user?.email?.split("@")[0] || "Admin Global";

      const { error } = await supabase
        .from("companies")
        .update({
          is_active: true,
          billing_status: "active",
          metadata: {
            ...selectedCompany.metadata,
            reactivated_at: now,
            reactivated_by: currentAdminName,
          },
          updated_at: now,
        } as any)
        .eq("id", selectedCompany.id);

      if (error) throw error;

      await supabase.from("activity_logs").insert({
        action: "company_reactivated",
        module: "admin",
        company_id: selectedCompany.id,
        description: `Empresa reativada por ${currentAdminName}`,
        user_id: user?.id || null,
      });

      toast.success("Empresa reativada com sucesso!");
      setIsReactivateModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin-companies-list"] });
    } catch (err: any) {
      console.error("Erro ao reativar empresa:", err);
      toast.error("Erro ao reativar empresa.");
    } finally {
      setIsSaving(false);
    }
  };

  const openCreateModal = () => {
    setSelectedCompany(null);
    setFormData({
      name: "",
      fantasy_name: "",
      cnpj: "",
      email: "",
      phone: "",
      city: "",
      state: "SP",
      responsible_name: "",
      plan: "profissional",
      status: "active",
    });
    setFormErrors({});
    setIsCreateModalOpen(true);
  };

  const openEditModal = (comp: any) => {
    setSelectedCompany(comp);
    setFormData({
      name: comp.name || "",
      fantasy_name: comp.fantasy_name || "",
      cnpj: comp.cnpj || "",
      email: comp.email || "",
      phone: comp.phone || "",
      city: comp.metadata?.city || "",
      state: comp.metadata?.state || "SP",
      responsible_name: comp.responsible_name || "",
      plan: comp.displayPlan?.toLowerCase() || "profissional",
      status: comp.status || "active",
    });
    setFormErrors({});
    setIsEditModalOpen(true);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 font-sans">
      {/* ========================================================================= */}
      {/* 1. CABEÇALHO */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0B1739]">
              Empresas
            </h1>
            <Badge className="bg-blue-50 text-[#075BFF] border-blue-200 text-[10px] font-bold">
              {filteredCompanies.length} de {companiesData?.length || 0}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Gerencie as empresas cadastradas na plataforma e acompanhe seus usuários e consumo.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <Button
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Cadastrar empresa</span>
          </Button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. BARRA DE FILTROS E PESQUISA */}
      {/* ========================================================================= */}
      <Card className="bg-white p-4 sm:p-5 rounded-2xl border-slate-200/90 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Busca */}
          <div className="sm:col-span-5 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Buscar por razão social, nome fantasia, CNPJ ou e-mail..."
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

          {/* Filtro de Situação */}
          <div className="sm:col-span-3">
            <Select 
              value={selectedStatusFilter} 
              onValueChange={(val) => {
                setSelectedStatusFilter(val);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-10 text-xs rounded-xl bg-slate-50/70 border-slate-200 text-[#0B1739] font-medium">
                <SelectValue placeholder="Situação" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="all">Todas as situações</SelectItem>
                <SelectItem value="active">Ativa</SelectItem>
                <SelectItem value="trial">Em avaliação</SelectItem>
                <SelectItem value="suspended">Suspensa</SelectItem>
                <SelectItem value="canceled">Cancelada</SelectItem>
                <SelectItem value="blocked">Bloqueada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filtro de Plano */}
          <div className="sm:col-span-2">
            <Select 
              value={selectedPlanFilter} 
              onValueChange={(val) => {
                setSelectedPlanFilter(val);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-10 text-xs rounded-xl bg-slate-50/70 border-slate-200 text-[#0B1739] font-medium">
                <SelectValue placeholder="Plano" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="all">Todos os planos</SelectItem>
                <SelectItem value="essencial">Essencial</SelectItem>
                <SelectItem value="profissional">Profissional</SelectItem>
                <SelectItem value="equipe">Equipe</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Ordenação */}
          <div className="sm:col-span-2">
            <Select 
              value={sortOrder} 
              onValueChange={(val: any) => setSortOrder(val)}
            >
              <SelectTrigger className="h-10 text-xs rounded-xl bg-slate-50/70 border-slate-200 text-[#0B1739] font-medium">
                <SelectValue placeholder="Ordem" />
              </SelectTrigger>
              <SelectContent className="bg-white">
                <SelectItem value="recent">Mais recentes</SelectItem>
                <SelectItem value="name_asc">Nome (A-Z)</SelectItem>
                <SelectItem value="name_desc">Nome (Z-A)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* ========================================================================= */}
      {/* 3. LISTAGEM DE EMPRESAS (TABELA DESKTOP / CARDS MOBILE) */}
      {/* ========================================================================= */}
      {isLoading ? (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-16 flex flex-col items-center justify-center gap-3 text-xs text-slate-500 shadow-xs">
          <Loader2 className="h-7 w-7 animate-spin text-[#075BFF]" />
          <span className="font-medium">Carregando lista de empresas...</span>
        </div>
      ) : isError ? (
        <Card className="p-8 border-red-200 bg-red-50/40 text-center rounded-2xl shadow-xs">
          <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-[#0B1739]">Erro ao carregar empresas</h3>
          <p className="text-xs text-slate-600 mt-1">
            Não foi possível consultar as empresas cadastradas no momento.
          </p>
          <Button
            onClick={() => refetch()}
            className="mt-4 gap-2 bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-semibold rounded-xl"
          >
            <RefreshCw className="h-4 w-4" /> Tentar novamente
          </Button>
        </Card>
      ) : paginatedCompanies.length === 0 ? (
        <Card className="bg-white p-16 text-center rounded-2xl border-slate-200/90 shadow-xs space-y-3">
          <Building className="h-10 w-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-[#0B1739]">Nenhuma empresa encontrada</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {searchTerm || selectedStatusFilter !== "all" || selectedPlanFilter !== "all"
              ? "Tente ajustar os termos de pesquisa ou filtros aplicados."
              : "Nenhuma empresa cadastrada na plataforma ainda."}
          </p>
        </Card>
      ) : (
        <Card className="bg-white rounded-2xl border-slate-200/90 shadow-xs overflow-hidden">
          {/* VISUALIZAÇÃO DESKTOP: TABELA */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-100">
                  <th className="px-6 py-4">Empresa</th>
                  <th className="px-6 py-4">CNPJ</th>
                  <th className="px-6 py-4">Administrador</th>
                  <th className="px-6 py-4">Usuários</th>
                  <th className="px-6 py-4">Plano</th>
                  <th className="px-6 py-4">Processos</th>
                  <th className="px-6 py-4">Situação</th>
                  <th className="px-6 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[#0B1739]">
                {paginatedCompanies.map((comp) => {
                  const statusColors = {
                    active: "bg-emerald-50 text-emerald-700 border-emerald-200",
                    trial: "bg-blue-50 text-[#075BFF] border-blue-200",
                    suspended: "bg-red-50 text-red-700 border-red-200",
                    canceled: "bg-slate-100 text-slate-600 border-slate-200",
                    blocked: "bg-rose-50 text-rose-800 border-rose-200",
                  };

                  const statusLabels = {
                    active: "Ativa",
                    trial: "Em avaliação",
                    suspended: "Suspensa",
                    canceled: "Cancelada",
                    blocked: "Bloqueada",
                  };

                  return (
                    <tr key={comp.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Empresa */}
                      <td className="px-6 py-4">
                        <Link 
                          to="/admin/companies/$id"
                          params={{ id: comp.id }}
                          className="flex items-center gap-3 group/item cursor-pointer"
                        >
                          <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#075BFF] font-bold flex items-center justify-center shrink-0 border border-blue-100 uppercase text-xs group-hover/item:bg-[#075BFF] group-hover/item:text-white transition-colors">
                            {(comp.fantasy_name || comp.name).slice(0, 2)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-xs truncate text-[#0B1739] group-hover/item:text-[#075BFF] transition-colors">{comp.fantasy_name || comp.name}</p>
                            <p className="text-[11px] text-slate-400 truncate">{comp.name}</p>
                          </div>
                        </Link>
                      </td>

                      {/* CNPJ */}
                      <td className="px-6 py-4 font-mono text-slate-600 text-[11px]">
                        {comp.cnpj ? formatCnpj(comp.cnpj) : "Não informado"}
                      </td>

                      {/* Administrador */}
                      <td className="px-6 py-4">
                        <p className="font-semibold text-xs">{comp.responsible_name}</p>
                        <p className="text-[11px] text-slate-400 truncate">{comp.responsible_email}</p>
                      </td>

                      {/* Usuários */}
                      <td className="px-6 py-4 text-slate-600 font-medium">
                        {comp.usersCount} {comp.usersCount === 1 ? "usuário" : "usuários"}
                      </td>

                      {/* Plano */}
                      <td className="px-6 py-4">
                        <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-[10px] font-bold capitalize">
                          {comp.displayPlan}
                        </Badge>
                      </td>

                      {/* Processos */}
                      <td className="px-6 py-4 font-bold text-slate-700">
                        {comp.processesCount}
                      </td>

                      {/* Situação */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusColors[comp.status as keyof typeof statusColors]}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${comp.status === "active" ? "bg-emerald-500" : comp.status === "trial" ? "bg-blue-500" : "bg-red-500"}`} />
                          {statusLabels[comp.status as keyof typeof statusLabels]}
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="px-6 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:text-slate-700">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 bg-white border-slate-200 shadow-md rounded-xl text-xs">
                            <DropdownMenuItem asChild>
                              <Link 
                                to="/admin/companies/$id"
                                params={{ id: comp.id }}
                                className="gap-2 cursor-pointer font-bold text-[#075BFF] flex items-center"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                <span>Abrir empresa</span>
                              </Link>
                            </DropdownMenuItem>

                            <DropdownMenuItem 
                              onClick={() => openEditModal(comp)}
                              className="gap-2 cursor-pointer"
                            >
                              <Edit2 className="h-3.5 w-3.5 text-slate-500" />
                              <span>Editar empresa</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem asChild>
                              <Link to="/admin/users" className="gap-2 cursor-pointer flex items-center">
                                <Users className="h-3.5 w-3.5 text-slate-500" />
                                <span>Ver usuários</span>
                              </Link>
                            </DropdownMenuItem>

                            <DropdownMenuItem asChild>
                              <Link to="/admin/saas-metrics" className="gap-2 cursor-pointer flex items-center">
                                <BarChart3 className="h-3.5 w-3.5 text-slate-500" />
                                <span>Ver consumo</span>
                              </Link>
                            </DropdownMenuItem>

                            <DropdownMenuItem asChild>
                              <Link to="/admin/billing" className="gap-2 cursor-pointer flex items-center">
                                <CreditCard className="h-3.5 w-3.5 text-slate-500" />
                                <span>Ver assinatura</span>
                              </Link>
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            {comp.status === "suspended" ? (
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedCompany(comp);
                                  setIsReactivateModalOpen(true);
                                }}
                                className="gap-2 text-emerald-600 hover:text-emerald-700 cursor-pointer font-bold"
                              >
                                <Unlock className="h-3.5 w-3.5" />
                                <span>Reativar empresa</span>
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedCompany(comp);
                                  setSuspendReason("");
                                  setIsSuspendModalOpen(true);
                                }}
                                className="gap-2 text-red-600 hover:text-red-700 cursor-pointer font-bold"
                              >
                                <Lock className="h-3.5 w-3.5" />
                                <span>Suspender empresa</span>
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* VISUALIZAÇÃO MOBILE: CARTÕES */}
          <div className="block md:hidden divide-y divide-slate-100">
            {paginatedCompanies.map((comp) => {
              const statusColors = {
                active: "bg-emerald-50 text-emerald-700 border-emerald-200",
                trial: "bg-blue-50 text-[#075BFF] border-blue-200",
                suspended: "bg-red-50 text-red-700 border-red-200",
                canceled: "bg-slate-100 text-slate-600 border-slate-200",
                blocked: "bg-rose-50 text-rose-800 border-rose-200",
              };

              const statusLabels = {
                active: "Ativa",
                trial: "Em avaliação",
                suspended: "Suspensa",
                canceled: "Cancelada",
                blocked: "Bloqueada",
              };

              return (
                <div key={comp.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      to="/admin/companies/$id"
                      params={{ id: comp.id }}
                      className="flex items-center gap-2.5 flex-1 min-w-0"
                    >
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#075BFF] font-bold flex items-center justify-center shrink-0 border border-blue-100 uppercase text-xs">
                        {(comp.fantasy_name || comp.name).slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-xs text-[#0B1739] truncate">{comp.fantasy_name || comp.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono truncate">{comp.cnpj ? formatCnpj(comp.cnpj) : "Sem CNPJ"}</p>
                      </div>
                    </Link>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:text-slate-700">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 bg-white border-slate-200 shadow-md rounded-xl text-xs">
                        <DropdownMenuItem asChild>
                          <Link 
                            to="/admin/companies/$id"
                            params={{ id: comp.id }}
                            className="gap-2 cursor-pointer font-bold text-[#075BFF] flex items-center"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span>Abrir empresa</span>
                          </Link>
                        </DropdownMenuItem>

                        <DropdownMenuItem 
                          onClick={() => openEditModal(comp)}
                          className="gap-2 cursor-pointer"
                        >
                          <Edit2 className="h-3.5 w-3.5 text-slate-500" />
                          <span>Editar empresa</span>
                        </DropdownMenuItem>

                        <DropdownMenuItem asChild>
                          <Link to="/admin/users" className="gap-2 cursor-pointer flex items-center">
                            <Users className="h-3.5 w-3.5 text-slate-500" />
                            <span>Ver usuários</span>
                          </Link>
                        </DropdownMenuItem>

                        <DropdownMenuItem asChild>
                          <Link to="/admin/saas-metrics" className="gap-2 cursor-pointer flex items-center">
                            <BarChart3 className="h-3.5 w-3.5 text-slate-500" />
                            <span>Ver consumo</span>
                          </Link>
                        </DropdownMenuItem>

                        <DropdownMenuItem asChild>
                          <Link to="/admin/billing" className="gap-2 cursor-pointer flex items-center">
                            <CreditCard className="h-3.5 w-3.5 text-slate-500" />
                            <span>Ver assinatura</span>
                          </Link>
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        {comp.status === "suspended" ? (
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedCompany(comp);
                              setIsReactivateModalOpen(true);
                            }}
                            className="gap-2 text-emerald-600 hover:text-emerald-700 cursor-pointer font-bold"
                          >
                            <Unlock className="h-3.5 w-3.5" />
                            <span>Reativar empresa</span>
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedCompany(comp);
                              setSuspendReason("");
                              setIsSuspendModalOpen(true);
                            }}
                            className="gap-2 text-red-600 hover:text-red-700 cursor-pointer font-bold"
                          >
                            <Lock className="h-3.5 w-3.5" />
                            <span>Suspender empresa</span>
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusColors[comp.status as keyof typeof statusColors]}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${comp.status === "active" ? "bg-emerald-500" : comp.status === "trial" ? "bg-blue-500" : "bg-red-500"}`} />
                      {statusLabels[comp.status as keyof typeof statusLabels]}
                    </span>

                    <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-[10px] font-bold capitalize">
                      Plano {comp.displayPlan}
                    </Badge>

                    <span className="text-[10px] text-slate-400 font-medium">
                      {comp.usersCount} {comp.usersCount === 1 ? "usuário" : "usuários"} • {comp.processesCount} proc.
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-50 pt-2">
                    <span className="truncate">Admin: {comp.responsible_name}</span>
                    <Link
                      to="/admin/companies/$id"
                      params={{ id: comp.id }}
                      className="text-[#075BFF] font-bold hover:underline shrink-0 text-[11px] flex items-center gap-0.5"
                    >
                      <span>Detalhes</span>
                      <ChevronRight className="h-3 w-3" />
                    </Link>
                  </div>
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
      {/* 4. MODAL DE CADASTRO / EDIÇÃO DE EMPRESA */}
      {/* ========================================================================= */}
      <Dialog open={isCreateModalOpen || isEditModalOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateModalOpen(false);
          setIsEditModalOpen(false);
        }
      }}>
        <DialogContent className="max-w-xl bg-white rounded-2xl p-6 sm:p-7">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#0B1739] flex items-center gap-2">
              <Building className="h-5 w-5 text-[#075BFF]" />
              <span>{selectedCompany ? "Editar dados da empresa" : "Cadastrar nova empresa"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Preencha os dados cadastrais da empresa e seu plano inicial na plataforma.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCompany} className="space-y-4 pt-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Razão Social */}
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-semibold text-slate-700">Razão Social *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Escritório Náutico São Paulo Ltda"
                  className="text-xs h-9.5 rounded-xl"
                />
                {formErrors.name && <span className="text-[11px] text-red-500">{formErrors.name}</span>}
              </div>

              {/* Nome Fantasia */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Nome Fantasia</label>
                <Input
                  value={formData.fantasy_name}
                  onChange={(e) => setFormData({ ...formData, fantasy_name: e.target.value })}
                  placeholder="Ex: Naval SP"
                  className="text-xs h-9.5 rounded-xl"
                />
              </div>

              {/* CNPJ */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">CNPJ</label>
                <Input
                  value={formData.cnpj}
                  onChange={(e) => setFormData({ ...formData, cnpj: formatCnpj(e.target.value) })}
                  placeholder="00.000.000/0000-00"
                  className="text-xs h-9.5 rounded-xl font-mono"
                />
                {formErrors.cnpj && <span className="text-[11px] text-red-500">{formErrors.cnpj}</span>}
              </div>

              {/* E-mail */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">E-mail principal *</label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="contato@empresa.com.br"
                  className="text-xs h-9.5 rounded-xl"
                />
                {formErrors.email && <span className="text-[11px] text-red-500">{formErrors.email}</span>}
              </div>

              {/* Telefone */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Telefone</label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(11) 98888-7777"
                  className="text-xs h-9.5 rounded-xl"
                />
              </div>

              {/* Responsável */}
              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-semibold text-slate-700">Administrador Responsável</label>
                <Input
                  value={formData.responsible_name}
                  onChange={(e) => setFormData({ ...formData, responsible_name: e.target.value })}
                  placeholder="Nome do despachante ou gestor responsável"
                  className="text-xs h-9.5 rounded-xl"
                />
              </div>

              {/* Plano */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Plano</label>
                <Select value={formData.plan} onValueChange={(val) => setFormData({ ...formData, plan: val })}>
                  <SelectTrigger className="h-9.5 text-xs rounded-xl bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="essencial">Essencial</SelectItem>
                    <SelectItem value="profissional">Profissional</SelectItem>
                    <SelectItem value="equipe">Equipe</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Situação */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Situação</label>
                <Select value={formData.status} onValueChange={(val: any) => setFormData({ ...formData, status: val })}>
                  <SelectTrigger className="h-9.5 text-xs rounded-xl bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="active">Ativa</SelectItem>
                    <SelectItem value="trial">Em avaliação</SelectItem>
                    <SelectItem value="suspended">Suspensa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="border-t border-slate-100 pt-4 mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setIsEditModalOpen(false);
                }}
                className="text-xs rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-bold rounded-xl"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
                <span>{selectedCompany ? "Salvar alterações" : "Cadastrar empresa"}</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* 5. MODAL DE CONFIRMAÇÃO DE SUSPENSÃO */}
      {/* ========================================================================= */}
      <Dialog open={isSuspendModalOpen} onOpenChange={setIsSuspendModalOpen}>
        <DialogContent className="max-w-md bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span>Suspender empresa?</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 pt-2 space-y-2">
              <p>
                Ao suspender <strong>{selectedCompany?.name}</strong>:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-slate-600">
                <li>Os usuários desta empresa não conseguirão emitir novos documentos ou processos.</li>
                <li>Os dados cadastrais e documentos históricos permanecerão salvos com segurança.</li>
              </ul>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5 py-2">
            <label className="text-xs font-semibold text-slate-700">Motivo da suspensão *</label>
            <textarea
              rows={3}
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              placeholder="Descreva o motivo (ex: inadimplência, solicitação do cliente ou auditoria)..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-[#0B1739] focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-500/20"
            />
          </div>

          <DialogFooter className="mt-4 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsSuspendModalOpen(false)}
              className="text-xs rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={!suspendReason.trim() || isSaving}
              onClick={handleSuspendCompany}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              <span>Confirmar suspensão</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* 6. MODAL DE CONFIRMAÇÃO DE REATIVAÇÃO */}
      {/* ========================================================================= */}
      <Dialog open={isReactivateModalOpen} onOpenChange={setIsReactivateModalOpen}>
        <DialogContent className="max-w-md bg-white rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#0B1739] flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <span>Reativar empresa?</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 pt-2">
              A empresa <strong>{selectedCompany?.name}</strong> terá o acesso totalmente restaurado à plataforma NavalDocs Pro.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-4 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsReactivateModalOpen(false)}
              className="text-xs rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={isSaving}
              onClick={handleReactivateCompany}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              <span>Confirmar reativação</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
