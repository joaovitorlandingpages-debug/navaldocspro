import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { 
  Users as UsersIcon, 
  Search, 
  MoreVertical, 
  ShieldCheck, 
  Mail, 
  Briefcase, 
  Plus, 
  Filter, 
  Edit2, 
  Ban, 
  CheckCircle2, 
  Building, 
  Clock, 
  UserCheck, 
  Shield, 
  AlertTriangle, 
  RefreshCw, 
  Loader2, 
  Send, 
  RotateCcw, 
  Trash2, 
  Copy, 
  Check, 
  HelpCircle, 
  X, 
  ChevronRight, 
  Lock, 
  Unlock,
  UserX,
  ExternalLink,
  Sparkles,
  Info
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
import { useState, useMemo, useCallback } from "react";
import { formatDistanceToNow, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/users")({
  component: AdminUsersPage,
  head: () => ({
    meta: [
      { title: "Usuários e Acessos — Painel Administrativo | NavalDocs Pro" },
      { name: "robots", content: "noindex, nofollow" }
    ]
  })
});

// Definição e explicação dos papéis reais
export const ROLE_DEFINITIONS: Record<string, { label: string; desc: string; color: string; isGlobal?: boolean }> = {
  admin_master_global: {
    label: "Super Admin Global",
    desc: "Acesso irrestrito a todos os tenants, configurações globais e faturamento da plataforma.",
    color: "bg-purple-50 text-purple-700 border-purple-200",
    isGlobal: true,
  },
  superadmin: {
    label: "Super Admin",
    desc: "Acesso administrativo amplo a todas as empresas cadastradas.",
    color: "bg-indigo-50 text-indigo-700 border-indigo-200",
    isGlobal: true,
  },
  admin: {
    label: "Administrador da Empresa",
    desc: "Gerencia clientes, embarcações, processos, equipe e configurações da sua própria empresa.",
    color: "bg-blue-50 text-[#075BFF] border-blue-200",
    isGlobal: false,
  },
  admin_master: {
    label: "Administrador Titular",
    desc: "Gestor principal da empresa contratante, com controle de funcionários e processos.",
    color: "bg-blue-50 text-[#075BFF] border-blue-200",
    isGlobal: false,
  },
  member: {
    label: "Operador Naval",
    desc: "Cria e edita processos, gera documentos e anexa protocolos no dia a dia.",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    isGlobal: false,
  },
  operator: {
    label: "Operador",
    desc: "Executa rotinas de atendimento, cadastro e emissão documental.",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    isGlobal: false,
  },
  auditor: {
    label: "Auditor / Leitor",
    desc: "Visualiza processos, clientes e documentos emitidos sem permissão para alteração.",
    color: "bg-slate-100 text-slate-700 border-slate-200",
    isGlobal: false,
  },
  viewer: {
    label: "Visualizador",
    desc: "Consulta dados e status de processos em modo somente leitura.",
    color: "bg-slate-100 text-slate-700 border-slate-200",
    isGlobal: false,
  },
};

const statusLabels: Record<string, { label: string; color: string; dot: string }> = {
  active: {
    label: "Ativo",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
  pending_invite: {
    label: "Convite Pendente",
    color: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
  },
  inactive: {
    label: "Desativado",
    color: "bg-slate-100 text-slate-600 border-slate-200",
    dot: "bg-slate-400",
  },
  blocked: {
    label: "Bloqueado",
    color: "bg-rose-50 text-rose-700 border-rose-200",
    dot: "bg-rose-500",
  },
};

function AdminUsersPage() {
  const queryClient = useQueryClient();
  const { profile, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Estados de Filtros e Busca
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState("all");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState<"name_asc" | "name_desc" | "recent">("name_asc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Estados de Modais
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isChangeRoleModalOpen, setIsChangeRoleModalOpen] = useState(false);
  const [isToggleStatusModalOpen, setIsToggleStatusModalOpen] = useState(false);
  const [isRevokeModalOpen, setIsRevokeModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  // Estados dos Formulários
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteCompanyId, setInviteCompanyId] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [newRole, setNewRole] = useState("");
  const [statusReason, setStatusReason] = useState("");

  // 1. Verificação de Autorização e Escopo
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

  // 2. Consulta de Empresas no escopo autorizado
  const { data: companies = [], isLoading: isLoadingCompanies } = useQuery({
    queryKey: ["admin-users-companies-list", isGlobalAdmin, profile?.company_id],
    enabled: !authLoading && isCompanyAdmin,
    queryFn: async () => {
      let query = supabase.from("companies").select("id, name, fantasy_name, plan, is_active");
      if (!isGlobalAdmin && profile?.company_id) {
        query = query.eq("id", profile.company_id);
      }
      const { data, error } = await query.order("name", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  // 3. Consulta Consolidada de Usuários / Profiles
  const { 
    data: usersData = [], 
    isLoading: isLoadingUsers, 
    isError: isErrorUsers, 
    refetch: refetchUsers,
    isFetching: isFetchingUsers 
  } = useQuery({
    queryKey: ["admin-users-list", isGlobalAdmin, profile?.company_id],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select(`
          id,
          name,
          email,
          role,
          company_id,
          created_at,
          updated_at,
          metadata,
          company:companies (
            id,
            name,
            fantasy_name,
            plan,
            is_active
          )
        `);

      if (!isGlobalAdmin && profile?.company_id) {
        query = query.eq("company_id", profile.company_id);
      }

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) {
        console.error("[AdminUsers] Erro ao carregar usuários:", error);
        throw error;
      }

      // Normalizar status
      return (data || []).map((u: any) => {
        const meta = (u.metadata || {}) as Record<string, any>;
        let status: "active" | "pending_invite" | "inactive" | "blocked" = "active";

        if (meta.status === "inactive" || meta.is_active === false) {
          status = "inactive";
        } else if (meta.status === "blocked") {
          status = "blocked";
        } else if (meta.status === "pending_invite" || meta.invited_at) {
          status = "pending_invite";
        }

        return {
          ...u,
          status,
          meta,
          displayName: u.name || meta.name || u.email?.split("@")[0] || "Usuário",
          companyName: u.company?.fantasy_name || u.company?.name || "Sem Empresa",
          lastActivity: u.updated_at || u.created_at,
        };
      });
    },
    enabled: !!profile
  });

  // 4. Cálculo de Vagas e Limites por Empresa
  const companySeatsInfo = useMemo(() => {
    const targetCompId = isGlobalAdmin 
      ? (selectedCompanyFilter !== "all" ? selectedCompanyFilter : null)
      : profile?.company_id;

    if (!targetCompId) return null;

    const compUsers = usersData.filter((u: any) => u.company_id === targetCompId && u.status !== "inactive");
    const compObj = companies.find((c: any) => c.id === targetCompId);
    const planName = compObj?.plan?.toLowerCase() || "profissional";

    let maxSeats = 5;
    if (planName.includes("essencial")) maxSeats = 2;
    else if (planName.includes("profissional") || planName.includes("pro")) maxSeats = 5;
    else if (planName.includes("equipe") || planName.includes("enterprise") || planName.includes("empresarial")) maxSeats = 15;

    return {
      companyName: compObj?.fantasy_name || compObj?.name || "Empresa Selecionada",
      usedSeats: compUsers.length,
      maxSeats,
      isFull: compUsers.length >= maxSeats,
    };
  }, [usersData, companies, isGlobalAdmin, selectedCompanyFilter, profile?.company_id]);

  // 5. Filtragem e Busca
  const filteredUsers = useMemo(() => {
    return usersData.filter((u: any) => {
      // Busca
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchName = u.displayName.toLowerCase().includes(term);
        const matchEmail = (u.email || "").toLowerCase().includes(term);
        const matchCompany = u.companyName.toLowerCase().includes(term);
        if (!matchName && !matchEmail && !matchCompany) return false;
      }

      // Filtro de Empresa
      if (selectedCompanyFilter !== "all" && u.company_id !== selectedCompanyFilter) {
        return false;
      }

      // Filtro de Papel
      if (selectedRoleFilter !== "all") {
        if (selectedRoleFilter === "global" && !ROLE_DEFINITIONS[u.role]?.isGlobal) return false;
        if (selectedRoleFilter === "admin" && u.role !== "admin" && u.role !== "admin_master") return false;
        if (selectedRoleFilter === "member" && u.role !== "member" && u.role !== "operator") return false;
        if (selectedRoleFilter === "auditor" && u.role !== "auditor" && u.role !== "viewer") return false;
      }

      // Filtro de Situação
      if (selectedStatusFilter !== "all" && u.status !== selectedStatusFilter) {
        return false;
      }

      return true;
    });
  }, [usersData, searchTerm, selectedCompanyFilter, selectedRoleFilter, selectedStatusFilter]);

  // 6. Ordenação
  const sortedUsers = useMemo(() => {
    return [...filteredUsers].sort((a, b) => {
      if (sortOrder === "name_asc") {
        return a.displayName.localeCompare(b.displayName);
      }
      if (sortOrder === "name_desc") {
        return b.displayName.localeCompare(a.displayName);
      }
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });
  }, [filteredUsers, sortOrder]);

  // 7. Paginação
  const totalPages = Math.ceil(sortedUsers.length / itemsPerPage) || 1;
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedUsers.slice(start, start + itemsPerPage);
  }, [sortedUsers, currentPage]);

  // Mutação: Convidar Usuário
  const inviteUserMutation = useMutation({
    mutationFn: async ({ email, name, companyId, role }: { email: string; name: string; companyId: string; role: string }) => {
      if (!email || !email.includes("@")) throw new Error("Informe um e-mail válido");
      if (!companyId) throw new Error("Selecione a empresa do usuário");

      // Validação de Escopo: Admin de Empresa não pode convidar papéis globais
      if (!isGlobalAdmin && ROLE_DEFINITIONS[role]?.isGlobal) {
        throw new Error("Você não possui permissão para conceder papéis globais");
      }

      // Validar duplicidade de convite / usuário
      const existing = usersData.find((u: any) => u.email?.toLowerCase() === email.toLowerCase() && u.company_id === companyId);
      if (existing && existing.status !== "inactive") {
        throw new Error("Este e-mail já possui cadastro ou convite ativo nesta empresa");
      }

      // Validar limite de vagas
      const compUsers = usersData.filter((u: any) => u.company_id === companyId && u.status !== "inactive");
      const compObj = companies.find((c: any) => c.id === companyId);
      const planName = compObj?.plan?.toLowerCase() || "profissional";
      let maxSeats = 5;
      if (planName.includes("essencial")) maxSeats = 2;
      else if (planName.includes("profissional") || planName.includes("pro")) maxSeats = 5;
      else if (planName.includes("equipe") || planName.includes("enterprise")) maxSeats = 15;

      if (compUsers.length >= maxSeats) {
        throw new Error(`Limite do plano atingido (${compUsers.length}/${maxSeats} vagas ocupadas). Faça upgrade do plano para convidar novos usuários.`);
      }

      // Criação ou atualização do perfil com status de convite pendente
      const tempId = existing?.id || crypto.randomUUID();
      const meta = {
        name: name.trim() || email.split("@")[0],
        status: "pending_invite",
        invited_at: new Date().toISOString(),
        invited_by: user?.email || user?.id,
        invite_role: role
      };

      const { error: upsertErr } = await supabase
        .from("profiles")
        .upsert({
          id: tempId,
          company_id: companyId,
          name: name.trim() || email.split("@")[0],
          email: email.trim().toLowerCase(),
          role: role,
          metadata: meta,
          updated_at: new Date().toISOString()
        });

      if (upsertErr) throw upsertErr;

      // Auditoria
      await supabase.from("activity_logs").insert({
        company_id: companyId,
        user_id: user?.id,
        action: "admin.user_invited",
        resource_type: "user",
        resource_id: tempId,
        details: {
          email,
          role,
          companyId,
          invited_by: user?.email
        }
      });
    },
    onSuccess: () => {
      toast.success("Convite enviado com sucesso!");
      setIsInviteModalOpen(false);
      setInviteEmail("");
      setInviteName("");
      queryClient.invalidateQueries({ queryKey: ["admin-users-list"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Falha ao enviar convite");
    }
  });

  // Mutação: Alterar Papel
  const changeRoleMutation = useMutation({
    mutationFn: async ({ targetUser, nextRole }: { targetUser: any; nextRole: string }) => {
      if (!targetUser || !nextRole) throw new Error("Dados incompletos");

      // Validação de Escopo
      if (!isGlobalAdmin && ROLE_DEFINITIONS[nextRole]?.isGlobal) {
        throw new Error("Você não possui permissão para conceder papéis globais");
      }

      // Proteção do último administrador
      if (targetUser.role === "admin" || targetUser.role === "admin_master") {
        const otherAdmins = usersData.filter(
          (u: any) => u.company_id === targetUser.company_id && 
                      (u.role === "admin" || u.role === "admin_master") && 
                      u.id !== targetUser.id && 
                      u.status === "active"
        );
        if (otherAdmins.length === 0 && nextRole !== "admin" && nextRole !== "admin_master") {
          throw new Error("Não é possível alterar o papel do único administrador ativo da empresa. Nomeie outro administrador antes.");
        }
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          role: nextRole,
          updated_at: new Date().toISOString()
        })
        .eq("id", targetUser.id);

      if (error) throw error;

      // Auditoria
      await supabase.from("activity_logs").insert({
        company_id: targetUser.company_id,
        user_id: user?.id,
        action: "admin.user_role_changed",
        resource_type: "user",
        resource_id: targetUser.id,
        details: {
          target_email: targetUser.email,
          previous_role: targetUser.role,
          next_role: nextRole,
          updated_by: user?.email
        }
      });
    },
    onSuccess: () => {
      toast.success("Papel do usuário atualizado com sucesso!");
      setIsChangeRoleModalOpen(false);
      setSelectedUser(null);
      queryClient.invalidateQueries({ queryKey: ["admin-users-list"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao alterar papel");
    }
  });

  // Mutação: Desativar / Reativar Acesso
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ targetUser, nextStatus, reason }: { targetUser: any; nextStatus: "active" | "inactive"; reason: string }) => {
      if (!targetUser) throw new Error("Usuário não selecionado");

      // Proteção do último administrador na desativação
      if (nextStatus === "inactive" && (targetUser.role === "admin" || targetUser.role === "admin_master")) {
        const otherAdmins = usersData.filter(
          (u: any) => u.company_id === targetUser.company_id && 
                      (u.role === "admin" || u.role === "admin_master") && 
                      u.id !== targetUser.id && 
                      u.status === "active"
        );
        if (otherAdmins.length === 0) {
          throw new Error("Ação bloqueada: esta empresa ficaria sem administradores ativos.");
        }
      }

      const newMeta = {
        ...targetUser.meta,
        status: nextStatus,
        status_changed_at: new Date().toISOString(),
        status_changed_by: user?.email || user?.id,
        status_change_reason: reason.trim() || undefined
      };

      const { error } = await supabase
        .from("profiles")
        .update({
          metadata: newMeta,
          updated_at: new Date().toISOString()
        })
        .eq("id", targetUser.id);

      if (error) throw error;

      // Auditoria
      await supabase.from("activity_logs").insert({
        company_id: targetUser.company_id,
        user_id: user?.id,
        action: nextStatus === "active" ? "admin.user_reactivated" : "admin.user_deactivated",
        resource_type: "user",
        resource_id: targetUser.id,
        details: {
          target_email: targetUser.email,
          reason: reason.trim(),
          operator: user?.email
        }
      });
    },
    onSuccess: (_, vars) => {
      toast.success(vars.nextStatus === "active" ? "Acesso reativado com sucesso!" : "Acesso desativado com sucesso!");
      setIsToggleStatusModalOpen(false);
      setSelectedUser(null);
      setStatusReason("");
      queryClient.invalidateQueries({ queryKey: ["admin-users-list"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao alterar situação do acesso");
    }
  });

  // Mutação: Reenviar Convite
  const resendInviteMutation = useMutation({
    mutationFn: async (targetUser: any) => {
      const newMeta = {
        ...targetUser.meta,
        last_invite_resent_at: new Date().toISOString(),
        invited_by: user?.email
      };

      const { error } = await supabase
        .from("profiles")
        .update({
          metadata: newMeta,
          updated_at: new Date().toISOString()
        })
        .eq("id", targetUser.id);

      if (error) throw error;

      await supabase.from("activity_logs").insert({
        company_id: targetUser.company_id,
        user_id: user?.id,
        action: "admin.user_invite_resent",
        resource_type: "user",
        resource_id: targetUser.id,
        details: { target_email: targetUser.email, operator: user?.email }
      });
    },
    onSuccess: () => {
      toast.success("Convite reenviado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["admin-users-list"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao reenviar convite");
    }
  });

  // Mutação: Revogar Convite Pendente
  const revokeInviteMutation = useMutation({
    mutationFn: async (targetUser: any) => {
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", targetUser.id);

      if (error) throw error;

      await supabase.from("activity_logs").insert({
        company_id: targetUser.company_id,
        user_id: user?.id,
        action: "admin.user_invite_revoked",
        resource_type: "user",
        resource_id: targetUser.id,
        details: { target_email: targetUser.email, operator: user?.email }
      });
    },
    onSuccess: () => {
      toast.success("Convite revogado com sucesso!");
      setIsRevokeModalOpen(false);
      setSelectedUser(null);
      queryClient.invalidateQueries({ queryKey: ["admin-users-list"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao revogar convite");
    }
  });

  const handleOpenInvite = () => {
    setInviteEmail("");
    setInviteName("");
    setInviteCompanyId(isGlobalAdmin ? (selectedCompanyFilter !== "all" ? selectedCompanyFilter : companies[0]?.id || "") : (profile?.company_id || ""));
    setInviteRole("member");
    setIsInviteModalOpen(true);
  };

  const handleOpenChangeRole = (u: any) => {
    setSelectedUser(u);
    setNewRole(u.role || "member");
    setIsChangeRoleModalOpen(true);
  };

  const handleOpenToggleStatus = (u: any) => {
    setSelectedUser(u);
    setStatusReason("");
    setIsToggleStatusModalOpen(true);
  };

  if (!authLoading && !isCompanyAdmin) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center font-sans">
        <Card className="p-8 border-red-200 bg-red-50/50 rounded-2xl shadow-xs space-y-3">
          <Shield className="h-10 w-10 text-red-500 mx-auto" />
          <h2 className="text-base font-bold text-[#0B1739]">Acesso Restrito</h2>
          <p className="text-xs text-slate-600">
            Você não possui privilégios de administrador para gerenciar usuários e acessos da plataforma.
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
                Usuários e acessos
              </h1>
              <Badge className="bg-blue-50 text-[#075BFF] border-blue-200 text-[10px] font-bold">
                {filteredUsers.length} de {usersData.length}
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Controle de credenciais, convites e permissões de login na plataforma.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto">
            {/* Indicador de Vagas de Plano (quando filtrado por empresa) */}
            {companySeatsInfo && (
              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                <span className="text-slate-500 font-medium">Vagas no plano:</span>
                <span className={`font-bold ${companySeatsInfo.isFull ? "text-amber-600" : "text-[#075BFF]"}`}>
                  {companySeatsInfo.usedSeats} / {companySeatsInfo.maxSeats}
                </span>
              </div>
            )}

            <Button
              onClick={handleOpenInvite}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Convidar usuário</span>
            </Button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. BARRA DE FILTROS E PESQUISA */}
        {/* ========================================================================= */}
        <Card className="bg-white p-4 sm:p-5 rounded-2xl border-slate-200/90 shadow-xs space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            {/* Busca */}
            <div className="sm:col-span-4 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Buscar por nome, e-mail ou empresa..."
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

            {/* Filtro por Empresa (se for admin global) */}
            {isGlobalAdmin && (
              <div className="sm:col-span-3">
                <Select
                  value={selectedCompanyFilter}
                  onValueChange={(val) => {
                    setSelectedCompanyFilter(val);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="h-10 text-xs rounded-xl bg-slate-50/70 border-slate-200 text-[#0B1739] font-medium">
                    <SelectValue placeholder="Todas as Empresas" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="all">Todas as empresas</SelectItem>
                    {companies.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.fantasy_name || c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Filtro por Papel */}
            <div className={isGlobalAdmin ? "sm:col-span-2" : "sm:col-span-4"}>
              <Select
                value={selectedRoleFilter}
                onValueChange={(val) => {
                  setSelectedRoleFilter(val);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-10 text-xs rounded-xl bg-slate-50/70 border-slate-200 text-[#0B1739] font-medium">
                  <SelectValue placeholder="Papel" />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="all">Todos os papéis</SelectItem>
                  {isGlobalAdmin && <SelectItem value="global">Administradores Globais</SelectItem>}
                  <SelectItem value="admin">Administradores de Empresa</SelectItem>
                  <SelectItem value="member">Operadores Navais</SelectItem>
                  <SelectItem value="auditor">Auditores / Leitores</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por Situação */}
            <div className="sm:col-span-2">
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
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="pending_invite">Convite pendente</SelectItem>
                  <SelectItem value="inactive">Desativado</SelectItem>
                  <SelectItem value="blocked">Bloqueado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Ordenação */}
            <div className={isGlobalAdmin ? "sm:col-span-1" : "sm:col-span-2"}>
              <Select
                value={sortOrder}
                onValueChange={(val: any) => setSortOrder(val)}
              >
                <SelectTrigger className="h-10 text-xs rounded-xl bg-slate-50/70 border-slate-200 text-[#0B1739] font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="name_asc">A-Z</SelectItem>
                  <SelectItem value="name_desc">Z-A</SelectItem>
                  <SelectItem value="recent">Recentes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* ========================================================================= */}
        {/* 3. LISTAGEM DE USUÁRIOS (TABELA DESKTOP / CARTÕES MOBILE) */}
        {/* ========================================================================= */}
        {isLoadingUsers ? (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-16 flex flex-col items-center justify-center gap-3 text-xs text-slate-500 shadow-xs">
            <Loader2 className="h-7 w-7 animate-spin text-[#075BFF]" />
            <p className="font-semibold">Carregando usuários e permissões...</p>
          </div>
        ) : isErrorUsers ? (
          <Card className="p-8 border-red-200 bg-red-50/40 text-center max-w-xl mx-auto shadow-md rounded-2xl space-y-3">
            <AlertTriangle className="h-10 w-10 text-red-500 mx-auto" />
            <h3 className="text-base font-bold text-[#0B1739]">Erro ao carregar lista de usuários</h3>
            <p className="text-xs text-slate-600">Não foi possível consultar os usuários autorizados da plataforma.</p>
            <Button
              onClick={() => refetchUsers()}
              className="mt-2 gap-2 bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-semibold rounded-xl"
            >
              <RefreshCw className="h-4 w-4" /> Tentar novamente
            </Button>
          </Card>
        ) : paginatedUsers.length === 0 ? (
          <Card className="bg-white p-16 text-center rounded-2xl border-slate-200/90 shadow-xs space-y-3">
            <UsersIcon className="h-10 w-10 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-[#0B1739]">Nenhum usuário encontrado</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {searchTerm || selectedRoleFilter !== "all" || selectedStatusFilter !== "all" || selectedCompanyFilter !== "all"
                ? "Tente ajustar os filtros ou os termos de pesquisa."
                : "Nenhum usuário cadastrado no seu escopo administrativo."}
            </p>
          </Card>
        ) : (
          <Card className="bg-white rounded-2xl border-slate-200/90 shadow-xs overflow-hidden">
            {/* TABELA DESKTOP */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-100">
                    <th className="px-6 py-4">Usuário</th>
                    <th className="px-6 py-4">Empresa</th>
                    <th className="px-6 py-4">Papel no Sistema</th>
                    <th className="px-6 py-4">Situação</th>
                    <th className="px-6 py-4">Última Atividade</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[#0B1739]">
                  {paginatedUsers.map((u: any) => {
                    const roleDef = ROLE_DEFINITIONS[u.role] || {
                      label: u.role || "Membro",
                      desc: "Usuário padrão do sistema",
                      color: "bg-slate-100 text-slate-700 border-slate-200"
                    };
                    const statusDef = statusLabels[u.status] || statusLabels.active;
                    const isSelf = u.id === user?.id || u.email === user?.email;

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                        {/* Usuário */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#075BFF] font-bold flex items-center justify-center shrink-0 border border-blue-100 uppercase text-xs">
                              {u.displayName.slice(0, 2)}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="font-bold text-xs truncate text-[#0B1739]">{u.displayName}</p>
                                {isSelf && (
                                  <Badge className="bg-slate-100 text-slate-600 text-[9px] font-bold py-0">Você</Badge>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400 font-mono truncate">{u.email}</p>
                            </div>
                          </div>
                        </td>

                        {/* Empresa */}
                        <td className="px-6 py-4">
                          <p className="font-semibold text-xs truncate">{u.companyName}</p>
                        </td>

                        {/* Papel */}
                        <td className="px-6 py-4">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border cursor-help ${roleDef.color}`}>
                                {roleDef.label}
                                <HelpCircle className="h-3 w-3 opacity-60 ml-0.5" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs text-xs bg-slate-900 text-white p-2.5 rounded-xl shadow-lg">
                              <p className="font-bold mb-0.5">{roleDef.label}</p>
                              <p className="text-slate-300 text-[11px]">{roleDef.desc}</p>
                            </TooltipContent>
                          </Tooltip>
                        </td>

                        {/* Situação */}
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusDef.color}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${statusDef.dot}`} />
                            {statusDef.label}
                          </span>
                        </td>

                        {/* Última Atividade */}
                        <td className="px-6 py-4 text-slate-500 text-[11px]">
                          {u.lastActivity ? formatDistanceToNow(parseISO(u.lastActivity), { addSuffix: true, locale: ptBR }) : "—"}
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
                              <DropdownMenuItem
                                onClick={() => handleOpenChangeRole(u)}
                                className="gap-2 cursor-pointer"
                              >
                                <Edit2 className="h-3.5 w-3.5 text-slate-500" />
                                <span>Alterar papel</span>
                              </DropdownMenuItem>

                              {u.status === "pending_invite" && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => resendInviteMutation.mutate(u)}
                                    disabled={resendInviteMutation.isPending}
                                    className="gap-2 cursor-pointer text-[#075BFF] font-bold"
                                  >
                                    <Send className="h-3.5 w-3.5" />
                                    <span>Reenviar convite</span>
                                  </DropdownMenuItem>

                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedUser(u);
                                      setIsRevokeModalOpen(true);
                                    }}
                                    className="gap-2 text-red-600 hover:text-red-700 cursor-pointer font-bold"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    <span>Revogar convite</span>
                                  </DropdownMenuItem>
                                </>
                              )}

                              {u.status !== "pending_invite" && (
                                <>
                                  <DropdownMenuSeparator />
                                  {u.status === "inactive" || u.status === "blocked" ? (
                                    <DropdownMenuItem
                                      onClick={() => handleOpenToggleStatus(u)}
                                      className="gap-2 text-emerald-600 hover:text-emerald-700 cursor-pointer font-bold"
                                    >
                                      <Unlock className="h-3.5 w-3.5" />
                                      <span>Reativar acesso</span>
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem
                                      onClick={() => handleOpenToggleStatus(u)}
                                      disabled={isSelf}
                                      className="gap-2 text-red-600 hover:text-red-700 cursor-pointer font-bold"
                                    >
                                      <Lock className="h-3.5 w-3.5" />
                                      <span>Desativar acesso</span>
                                    </DropdownMenuItem>
                                  )}
                                </>
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

            {/* CARTÕES MOBILE */}
            <div className="block md:hidden divide-y divide-slate-100">
              {paginatedUsers.map((u: any) => {
                const roleDef = ROLE_DEFINITIONS[u.role] || {
                  label: u.role || "Membro",
                  color: "bg-slate-100 text-slate-700 border-slate-200"
                };
                const statusDef = statusLabels[u.status] || statusLabels.active;
                const isSelf = u.id === user?.id || u.email === user?.email;

                return (
                  <div key={u.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#075BFF] font-bold flex items-center justify-center shrink-0 border border-blue-100 uppercase text-xs">
                          {u.displayName.slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-bold text-xs text-[#0B1739] truncate">{u.displayName}</p>
                            {isSelf && <Badge className="bg-slate-100 text-slate-600 text-[9px] py-0">Você</Badge>}
                          </div>
                          <p className="text-[11px] text-slate-400 font-mono truncate">{u.email}</p>
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:text-slate-700">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 bg-white border-slate-200 shadow-md rounded-xl text-xs">
                          <DropdownMenuItem
                            onClick={() => handleOpenChangeRole(u)}
                            className="gap-2 cursor-pointer"
                          >
                            <Edit2 className="h-3.5 w-3.5 text-slate-500" />
                            <span>Alterar papel</span>
                          </DropdownMenuItem>

                          {u.status === "pending_invite" && (
                            <>
                              <DropdownMenuItem
                                onClick={() => resendInviteMutation.mutate(u)}
                                className="gap-2 cursor-pointer text-[#075BFF] font-bold"
                              >
                                <Send className="h-3.5 w-3.5" />
                                <span>Reenviar convite</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedUser(u);
                                  setIsRevokeModalOpen(true);
                                }}
                                className="gap-2 text-red-600 hover:text-red-700 cursor-pointer font-bold"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span>Revogar convite</span>
                              </DropdownMenuItem>
                            </>
                          )}

                          {u.status !== "pending_invite" && (
                            <>
                              <DropdownMenuSeparator />
                              {u.status === "inactive" || u.status === "blocked" ? (
                                <DropdownMenuItem
                                  onClick={() => handleOpenToggleStatus(u)}
                                  className="gap-2 text-emerald-600 hover:text-emerald-700 cursor-pointer font-bold"
                                >
                                  <Unlock className="h-3.5 w-3.5" />
                                  <span>Reativar acesso</span>
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() => handleOpenToggleStatus(u)}
                                  disabled={isSelf}
                                  className="gap-2 text-red-600 hover:text-red-700 cursor-pointer font-bold"
                                >
                                  <Lock className="h-3.5 w-3.5" />
                                  <span>Desativar acesso</span>
                                </DropdownMenuItem>
                              )}
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusDef.color}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${statusDef.dot}`} />
                        {statusDef.label}
                      </span>

                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${roleDef.color}`}>
                        {roleDef.label}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-50 pt-2">
                      <span className="truncate">{u.companyName}</span>
                      <span className="text-[10px] text-slate-400">
                        {u.lastActivity ? formatDistanceToNow(parseISO(u.lastActivity), { addSuffix: true, locale: ptBR }) : ""}
                      </span>
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
        {/* MODAL: CONVIDAR USUÁRIO */}
        {/* ========================================================================= */}
        <Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
          <DialogContent className="max-w-lg bg-white rounded-2xl p-6 font-sans">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-[#0B1739] flex items-center gap-2">
                <Send className="h-5 w-5 text-[#075BFF]" />
                <span>Convidar Usuário para a Plataforma</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                O usuário receberá um convite por e-mail para autenticar-se e definir suas credenciais com segurança.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3 text-xs">
              {/* E-mail */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">E-mail Corporativo *</label>
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="usuario@empresa.com.br"
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              {/* Nome */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">Nome Completo (Opcional)</label>
                <Input
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="Ex: Carlos Eduardo"
                  className="h-9 text-xs rounded-xl"
                />
              </div>

              {/* Empresa (Seleção para Admin Global) */}
              {isGlobalAdmin ? (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700">Empresa Vinculada *</label>
                  <Select value={inviteCompanyId} onValueChange={setInviteCompanyId}>
                    <SelectTrigger className="h-9 text-xs rounded-xl bg-white">
                      <SelectValue placeholder="Selecione a empresa" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      {companies.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.fantasy_name || c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-0.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Empresa</span>
                  <p className="font-bold text-slate-800 text-xs">{profile?.companies?.name || "Sua Empresa"}</p>
                </div>
              )}

              {/* Papel */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">Papel / Nível de Acesso *</label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger className="h-9 text-xs rounded-xl bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {isGlobalAdmin && (
                      <>
                        <SelectItem value="admin_master_global">Super Admin Global</SelectItem>
                        <SelectItem value="superadmin">Super Admin</SelectItem>
                      </>
                    )}
                    <SelectItem value="admin">Administrador da Empresa</SelectItem>
                    <SelectItem value="member">Operador Naval (Cria processos e emite docs)</SelectItem>
                    <SelectItem value="auditor">Auditor / Visualizador</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Explicação do Papel Selecionado */}
              {ROLE_DEFINITIONS[inviteRole] && (
                <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl text-xs space-y-1">
                  <span className="font-bold text-blue-900 flex items-center gap-1.5">
                    <Info className="h-3.5 w-3.5 text-[#075BFF]" />
                    {ROLE_DEFINITIONS[inviteRole].label}
                  </span>
                  <p className="text-blue-700 text-[11px] leading-relaxed">
                    {ROLE_DEFINITIONS[inviteRole].desc}
                  </p>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsInviteModalOpen(false)}
                className="text-xs rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={() => inviteUserMutation.mutate({
                  email: inviteEmail,
                  name: inviteName,
                  companyId: inviteCompanyId,
                  role: inviteRole
                })}
                disabled={inviteUserMutation.isPending || !inviteEmail.trim() || !inviteCompanyId}
                className="bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-bold rounded-xl"
              >
                {inviteUserMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Send className="h-4 w-4 mr-1.5" />}
                Enviar convite
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ========================================================================= */}
        {/* MODAL: ALTERAR PAPEL */}
        {/* ========================================================================= */}
        <Dialog open={isChangeRoleModalOpen} onOpenChange={setIsChangeRoleModalOpen}>
          <DialogContent className="max-w-md bg-white rounded-2xl p-6 font-sans">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-[#0B1739]">
                Alterar Papel do Usuário
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Selecione as novas permissões para: <strong className="text-slate-700">{selectedUser?.displayName}</strong> ({selectedUser?.email})
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3 text-xs">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">Novo Papel</label>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger className="h-9 text-xs rounded-xl bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {isGlobalAdmin && (
                      <>
                        <SelectItem value="admin_master_global">Super Admin Global</SelectItem>
                        <SelectItem value="superadmin">Super Admin</SelectItem>
                      </>
                    )}
                    <SelectItem value="admin">Administrador da Empresa</SelectItem>
                    <SelectItem value="member">Operador Naval</SelectItem>
                    <SelectItem value="auditor">Auditor / Leitor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {ROLE_DEFINITIONS[newRole] && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
                  <span className="font-bold text-slate-800">{ROLE_DEFINITIONS[newRole].label}</span>
                  <p className="text-slate-600 text-[11px]">{ROLE_DEFINITIONS[newRole].desc}</p>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsChangeRoleModalOpen(false)}
                className="text-xs rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={() => changeRoleMutation.mutate({ targetUser: selectedUser, nextRole: newRole })}
                disabled={changeRoleMutation.isPending || newRole === selectedUser?.role}
                className="bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-bold rounded-xl"
              >
                {changeRoleMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <SaveIcon className="h-4 w-4 mr-1.5" />}
                Confirmar alteração
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ========================================================================= */}
        {/* MODAL: DESATIVAR / REATIVAR ACESSO */}
        {/* ========================================================================= */}
        <Dialog open={isToggleStatusModalOpen} onOpenChange={setIsToggleStatusModalOpen}>
          <DialogContent className="max-w-md bg-white rounded-2xl p-6 font-sans">
            <DialogHeader>
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center mb-2 ${selectedUser?.status === "inactive" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
                {selectedUser?.status === "inactive" ? <Unlock className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
              </div>
              <DialogTitle className="text-base font-bold text-[#0B1739]">
                {selectedUser?.status === "inactive" ? "Reativar Acesso do Usuário" : "Desativar Acesso do Usuário"}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                {selectedUser?.status === "inactive"
                  ? `Restaura a permissão de login para ${selectedUser?.displayName}.`
                  : `O usuário ${selectedUser?.displayName} não conseguirá mais efetuar login na plataforma.`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                <span className="font-bold text-amber-800 flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" /> Preservação Histórica:
                </span>
                <p className="text-amber-700 text-[11px]">
                  Os processos criados e documentos emitidos por este usuário permanecem preservados integralmente para auditoria legal.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700">Motivo (Opcional para auditoria)</label>
                <Textarea
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  placeholder="Informe observações sobre esta alteração..."
                  className="text-xs rounded-xl resize-none h-16"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsToggleStatusModalOpen(false)}
                className="text-xs rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={() => toggleStatusMutation.mutate({
                  targetUser: selectedUser,
                  nextStatus: selectedUser?.status === "inactive" ? "active" : "inactive",
                  reason: statusReason
                })}
                disabled={toggleStatusMutation.isPending}
                className={`text-white text-xs font-bold rounded-xl ${selectedUser?.status === "inactive" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"}`}
              >
                {toggleStatusMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                Confirmar {selectedUser?.status === "inactive" ? "reativação" : "desativação"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ========================================================================= */}
        {/* MODAL: REVOGAR CONVITE */}
        {/* ========================================================================= */}
        <Dialog open={isRevokeModalOpen} onOpenChange={setIsRevokeModalOpen}>
          <DialogContent className="max-w-md bg-white rounded-2xl p-6 font-sans">
            <DialogHeader>
              <div className="h-10 w-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mb-2">
                <Trash2 className="h-5 w-5" />
              </div>
              <DialogTitle className="text-base font-bold text-[#0B1739]">
                Revogar Convite Pendente
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Tem certeza que deseja cancelar o convite enviado para <strong className="text-slate-700">{selectedUser?.email}</strong>?
              </DialogDescription>
            </DialogHeader>

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
                onClick={() => revokeInviteMutation.mutate(selectedUser)}
                disabled={revokeInviteMutation.isPending}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl"
              >
                {revokeInviteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Trash2 className="h-4 w-4 mr-1.5" />}
                Confirmar revogação
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

function SaveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  );
}
