import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminGuard } from "@/components/auth/AdminGuard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  ShieldCheck,
  Building2,
  Users,
  CreditCard,
  Activity,
  TrendingUp,
  Search,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Clock,
  Sparkles,
  Lock,
  Unlock,
  Webhook,
  DollarSign,
  AlertOctagon,
  Calendar,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";

type CompanyItem = {
  id: string;
  name: string;
  cnpj?: string | null;
  email?: string | null;
  phone?: string | null;
  responsible_name?: string | null;
  plan?: string | null;
  plan_id?: string | null;
  is_demo?: boolean;
  is_pilot?: boolean;
  billing_status?: string | null;
  created_at?: string;
  updated_at?: string;
};

export const Route = createFileRoute("/super-admin")({
  component: SuperAdminPageRoute,
});

function SuperAdminPageRoute() {
  return (
    <AdminGuard fallbackPath="/dashboard">
      <SuperAdminDashboard />
    </AdminGuard>
  );
}

function SuperAdminDashboard() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedCompany, setSelectedCompany] = useState<CompanyItem | null>(null);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [newPlanId, setNewPlanId] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [extendTrialDays, setExtendTrialDays] = useState<number>(0);

  // 1. Consulta de Oficinas / Tenants
  const { data: companies = [], isLoading: isLoadingCompanies } = useQuery<CompanyItem[]>({
    queryKey: ["super-admin-companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select(`
          id,
          name,
          cnpj,
          email,
          phone,
          responsible_name,
          plan,
          plan_id,
          is_demo,
          is_pilot,
          billing_status,
          created_at,
          updated_at
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as CompanyItem[];
    },
  });

  // 2. Consulta de Processos / OS emitidas para contagem mensal
  const { data: processes = [] } = useQuery({
    queryKey: ["super-admin-process-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("processes")
        .select("id, company_id, status, created_at");
      if (error) return [];
      return data || [];
    },
  });

  // 3. Consulta de Webhooks recebidos do Mercado Pago
  const { data: webhookLogs = [], isLoading: isLoadingWebhooks } = useQuery({
    queryKey: ["super-admin-webhook-logs"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("payment_logs" as any)
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50);
        if (!error && data && data.length > 0) return data;
      } catch (e) {
        console.warn("Tabela payment_logs indisponível, usando fallback de activity_logs", e);
      }

      // Fallback para activity_logs
      const { data: fallbackData } = await supabase
        .from("activity_logs")
        .select("*")
        .eq("module", "billing")
        .order("created_at", { ascending: false })
        .limit(50);
      return fallbackData || [];
    },
  });

  // 4. Consulta de Logs de Erros e Sincronização (frontend_errors)
  const { data: errorLogs = [], isLoading: isLoadingErrors } = useQuery({
    queryKey: ["super-admin-error-logs"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("frontend_errors" as any)
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50);
        if (!error && data) return data;
      } catch (e) {
        console.warn("Tabela frontend_errors indisponível:", e);
      }
      return [];
    },
  });

  // 5. Mapeamento de contagem de OS emitidas no mês atual por oficina
  const processCountByCompany = useMemo(() => {
    const map: Record<string, number> = {};
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    for (const p of processes) {
      if (p.company_id) {
        const pDate = p.created_at ? new Date(p.created_at) : null;
        if (pDate && pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear) {
          map[p.company_id] = (map[p.company_id] || 0) + 1;
        }
      }
    }
    return map;
  }, [processes]);

  // 6. Métricas da Plataforma em Tempo Real
  const metrics = useMemo(() => {
    const total = companies.length;
    const active = companies.filter(
      (c) => c.billing_status === "active" || c.plan === "enterprise" || c.is_pilot
    ).length;
    const trialing = companies.filter(
      (c) =>
        c.billing_status === "trial" ||
        c.billing_status === "trialing" ||
        (!c.billing_status && !c.is_pilot)
    ).length;
    const blocked = companies.filter(
      (c) => c.billing_status === "suspended" || c.billing_status === "cancelled"
    ).length;

    // Cálculo estimado de MRR e ARR oficial
    let calculatedMrr = 0;
    companies.forEach((c) => {
      if (c.billing_status === "active" || c.is_pilot) {
        if (c.plan?.includes("anual") || c.plan_id?.includes("annual")) {
          calculatedMrr += 890 / 12; // R$ 74,16/mês diluído
        } else if (c.plan?.includes("mensal") || c.plan_id?.includes("monthly") || c.plan === "pro") {
          calculatedMrr += 89;
        } else if (c.plan === "enterprise") {
          calculatedMrr += 199;
        }
      }
    });

    return {
      total,
      active,
      trialing,
      blocked,
      mrr: Math.round(calculatedMrr),
      arr: Math.round(calculatedMrr * 12),
    };
  }, [companies]);

  // 7. Dados para gráfico Recharts de Planos e Adesão
  const planDistribution = useMemo(() => {
    const counts: Record<string, number> = {
      Trial: 0,
      Mensal: 0,
      Anual: 0,
      Enterprise: 0,
    };

    companies.forEach((c) => {
      if (c.is_pilot || c.plan === "enterprise") counts.Enterprise++;
      else if (c.plan?.includes("anual") || c.plan_id?.includes("annual")) counts.Anual++;
      else if (c.plan?.includes("mensal") || c.plan_id?.includes("monthly") || c.plan === "pro")
        counts.Mensal++;
      else counts.Trial++;
    });

    return [
      { name: "Trial Grátis", value: counts.Trial, color: "#38bdf8" },
      { name: "Plano Mensal", value: counts.Mensal, color: "#10b981" },
      { name: "Plano Anual", value: counts.Anual, color: "#f59e0b" },
      { name: "Enterprise / Piloto", value: counts.Enterprise, color: "#8b5cf6" },
    ];
  }, [companies]);

  // 8. Filtragem de oficinas
  const filteredCompanies = useMemo(() => {
    return companies.filter((c) => {
      const matchesSearch =
        !searchTerm ||
        c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.responsible_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.cnpj && c.cnpj.includes(searchTerm));

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && (c.billing_status === "active" || c.is_pilot)) ||
        (statusFilter === "trial" &&
          (c.billing_status === "trial" || (!c.billing_status && !c.is_pilot))) ||
        (statusFilter === "blocked" &&
          (c.billing_status === "suspended" || c.billing_status === "cancelled"));

      return matchesSearch && matchesStatus;
    });
  }, [companies, searchTerm, statusFilter]);

  // 9. Mutation para Ações Rápidas do Super Admin
  const updateCompanyMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCompany) return;

      const updates: any = {
        updated_at: new Date().toISOString(),
      };
      if (newPlanId) {
        updates.plan_id = newPlanId;
        updates.plan = newPlanId;
      }
      if (newStatus) {
        updates.billing_status = newStatus;
        if (newStatus === "active") {
          updates.is_pilot = true;
        } else if (newStatus === "suspended") {
          updates.is_pilot = false;
        }
      }

      // Se estendeu período de trial, atualizar subscriptions
      if (extendTrialDays > 0) {
        const newEnd = new Date();
        newEnd.setDate(newEnd.getDate() + extendTrialDays);

        await supabase
          .from("subscriptions")
          .update({
            current_period_end: newEnd.toISOString(),
            status: "trialing",
            updated_at: new Date().toISOString(),
          } as any)
          .eq("company_id", selectedCompany.id);
      }

      const { error } = await supabase
        .from("companies")
        .update(updates)
        .eq("id", selectedCompany.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Oficina atualizada com sucesso!");
      setIsActionModalOpen(false);
      setExtendTrialDays(0);
      queryClient.invalidateQueries({ queryKey: ["super-admin-companies"] });
      queryClient.invalidateQueries({ queryKey: ["super-admin-webhook-logs"] });
    },
    onError: (err: any) => {
      toast.error(`Erro ao atualizar oficina: ${err.message}`);
    },
  });

  const handleOpenActionModal = (company: CompanyItem) => {
    setSelectedCompany(company);
    setNewPlanId(company.plan_id || company.plan || "naval-starter-monthly");
    setNewStatus(company.billing_status || (company.is_pilot ? "active" : "trial"));
    setExtendTrialDays(0);
    setIsActionModalOpen(true);
  };

  const handleQuickHomologation = (company: CompanyItem) => {
    setSelectedCompany(company);
    setNewPlanId("enterprise");
    setNewStatus("active");
    setExtendTrialDays(365);
    setIsActionModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6">
      {/* Header do Super Admin */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
            <ShieldCheck className="w-7 h-7 text-amber-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-white">PAINEL SUPER ADMIN</h1>
              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-xs">
                Controle Global SaaS
              </Badge>
            </div>
            <p className="text-xs text-slate-400">
              Isolado dos dados operacionais: controle, métricas, webhooks e suporte a mecânicos.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ["super-admin-companies"] });
              queryClient.invalidateQueries({ queryKey: ["super-admin-webhook-logs"] });
              queryClient.invalidateQueries({ queryKey: ["super-admin-error-logs"] });
            }}
            className="border-slate-800 hover:bg-slate-900 text-slate-300"
          >
            <RefreshCw className="w-4 h-4 mr-1.5" />
            Atualizar Dados
          </Button>
          <Button asChild size="sm" className="bg-primary hover:bg-primary/90 text-white">
            <Link to="/dashboard">Voltar ao App</Link>
          </Button>
        </div>
      </div>

      {/* Cards de Métricas em Tempo Real */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-slate-900 border-slate-800 text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total de Oficinas
            </CardTitle>
            <Building2 className="w-4 h-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-white">{metrics.total}</div>
            <p className="text-xs text-slate-400 mt-1">Oficinas cadastradas</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800 text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Oficinas Ativas
            </CardTitle>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-emerald-400">{metrics.active}</div>
            <p className="text-xs text-slate-400 mt-1">Assinantes pagantes/piloto</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800 text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Em Trial / Teste
            </CardTitle>
            <Clock className="w-4 h-4 text-sky-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-sky-400">{metrics.trialing}</div>
            <p className="text-xs text-slate-400 mt-1">Período de validação</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800 text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400">
              MRR Mensal
            </CardTitle>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-emerald-400">
              R$ {metrics.mrr.toLocaleString("pt-BR")}
            </div>
            <p className="text-xs text-slate-400 mt-1">Receita Mensal Recorrente</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800 text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400">
              ARR Anual
            </CardTitle>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-amber-400">
              R$ {metrics.arr.toLocaleString("pt-BR")}
            </div>
            <p className="text-xs text-slate-400 mt-1">Receita Anual Projetada</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos Recharts de Adesão & Conversão */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-slate-900 border-slate-800 text-white">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Adesão e Conversão de Planos
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Distribuição da base de oficinas por modalidade de plano (Trial, Mensal, Anual, Enterprise)
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={planDistribution} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", color: "#fff" }}
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                  {planDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800 text-white">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Proporção da Base de Clientes
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Conversão e retenção das oficinas
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64 flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height="80%">
              <PieChart>
                <Pie
                  data={planDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {planDistribution.map((entry, index) => (
                    <Cell key={`pie-cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", color: "#fff" }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-3 text-[10px] text-slate-300">
              {planDistribution.map((p) => (
                <span key={p.name} className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                  {p.name}: {p.value}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Abas: Gestão de Oficinas, Webhooks MP e Logs de Erro */}
      <Tabs defaultValue="tenants" className="w-full space-y-4">
        <TabsList className="bg-slate-900 border border-slate-800">
          <TabsTrigger value="tenants" className="data-[state=active]:bg-primary">
            <Building2 className="w-4 h-4 mr-2" />
            Gestão de Oficinas ({filteredCompanies.length})
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="data-[state=active]:bg-primary">
            <Webhook className="w-4 h-4 mr-2" />
            Webhooks do Mercado Pago ({webhookLogs.length})
          </TabsTrigger>
          <TabsTrigger value="errors" className="data-[state=active]:bg-primary">
            <AlertOctagon className="w-4 h-4 mr-2" />
            Erros & Sincronização ({errorLogs.length})
          </TabsTrigger>
        </TabsList>

        {/* 1. Tabela de Gestão de Oficinas / Tenants */}
        <TabsContent value="tenants" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <Input
                placeholder="Buscar por oficina, responsável, e-mail ou CNPJ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-slate-900 border-slate-800 text-white"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] bg-slate-900 border-slate-800 text-white">
                <SelectValue placeholder="Filtrar status" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-slate-800 text-white">
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="trial">Em Trial</SelectItem>
                <SelectItem value="blocked">Bloqueados</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card className="bg-slate-900 border-slate-800 text-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950/70 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="p-3">Oficina / Razão Social</th>
                    <th className="p-3">E-mail / Dono</th>
                    <th className="p-3">Plano Atual</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-center">OS emitidas (Mês)</th>
                    <th className="p-3 text-right">Ações Rápidas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {isLoadingCompanies ? (
                    <tr>
                      <td colSpan={6} className="text-center p-8 text-slate-500">
                        Carregando oficinas...
                      </td>
                    </tr>
                  ) : filteredCompanies.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center p-8 text-slate-500">
                        Nenhuma oficina encontrada com os filtros atuais.
                      </td>
                    </tr>
                  ) : (
                    filteredCompanies.map((c) => {
                      const countMonth = processCountByCompany[c.id] || 0;
                      const isPilot = c.is_pilot;
                      const status = c.billing_status || (isPilot ? "active" : "trial");

                      const planDisplay = c.plan?.includes("anual") || c.plan_id?.includes("annual")
                        ? "Plano Anual"
                        : c.plan?.includes("mensal") || c.plan_id?.includes("monthly") || c.plan === "pro"
                        ? "Plano Mensal"
                        : isPilot || c.plan === "enterprise"
                        ? "Enterprise / Homologação"
                        : "Trial Grátis";

                      return (
                        <tr key={c.id} className="hover:bg-slate-800/50 transition-colors">
                          <td className="p-3">
                            <div className="font-semibold text-white">{c.name}</div>
                            {c.cnpj && (
                              <span className="text-[11px] text-slate-500 font-mono">
                                CNPJ: {c.cnpj}
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="text-slate-300 font-medium">
                              {c.responsible_name || "Responsável não informado"}
                            </div>
                            <span className="text-[11px] text-slate-400">{c.email || "Sem e-mail"}</span>
                          </td>
                          <td className="p-3">
                            <Badge variant="outline" className="border-slate-700 bg-slate-800 text-slate-200">
                              {planDisplay}
                            </Badge>
                          </td>
                          <td className="p-3">
                            {status === "active" ? (
                              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40">
                                Ativo
                              </Badge>
                            ) : status === "trial" ? (
                              <Badge className="bg-sky-500/20 text-sky-400 border-sky-500/40">
                                Trial Grátis
                              </Badge>
                            ) : status === "suspended" ? (
                              <Badge className="bg-red-500/20 text-red-400 border-red-500/40">
                                Bloqueado
                              </Badge>
                            ) : status === "cancelled" ? (
                              <Badge className="bg-zinc-500/20 text-zinc-400 border-zinc-500/40">
                                Cancelado
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-slate-700 text-slate-400">
                                {status}
                              </Badge>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <span className="font-mono font-bold text-white text-base">
                              {countMonth}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleQuickHomologation(c)}
                                className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 text-xs h-8"
                                title="Ativar para Homologação Ilimitada"
                              >
                                Homologar
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleOpenActionModal(c)}
                                className="bg-slate-800 hover:bg-slate-700 text-xs h-8"
                              >
                                Gerenciar
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* 2. Webhooks do Mercado Pago */}
        <TabsContent value="webhooks" className="space-y-4">
          <Card className="bg-slate-900 border-slate-800 text-white">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Webhook className="w-4 h-4 text-emerald-400" />
                Histórico de Webhooks e Transações do Mercado Pago
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Notificações de pagamento e sincronização automática de assinaturas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/70 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-3">ID Transação / Evento</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Empresa / Oficina</th>
                      <th className="p-3">Payload Resumido</th>
                      <th className="p-3 text-right">Data e Hora</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {isLoadingWebhooks ? (
                      <tr>
                        <td colSpan={5} className="text-center p-6 text-slate-500">
                          Carregando webhooks...
                        </td>
                      </tr>
                    ) : webhookLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center p-6 text-slate-500">
                          Nenhum webhook recebido ainda.
                        </td>
                      </tr>
                    ) : (
                      webhookLogs.map((log: any) => (
                        <tr key={log.id} className="hover:bg-slate-800/40">
                          <td className="p-3 font-mono font-semibold text-slate-200">
                            {log.payload?.payment_id || log.id?.slice(0, 12)}
                          </td>
                          <td className="p-3">
                            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40">
                              {log.status || log.event_type || "approved"}
                            </Badge>
                          </td>
                          <td className="p-3 font-mono text-slate-400">
                            {log.company_id?.slice(0, 8) || "Global"}
                          </td>
                          <td className="p-3 text-slate-300 max-w-xs truncate font-mono text-[11px]">
                            {log.message || JSON.stringify(log.payload || {})}
                          </td>
                          <td className="p-3 text-right text-slate-400">
                            {new Date(log.created_at).toLocaleString("pt-BR")}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. Log de Erros de Sincronização e Autenticação */}
        <TabsContent value="errors" className="space-y-4">
          <Card className="bg-slate-900 border-slate-800 text-white">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-red-400" />
                Erros de Sincronização e Suporte Rápido aos Mecânicos
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Monitoramento de falhas de tela, erros de rede e problemas de autenticação
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950/70 text-slate-400 uppercase tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-3">Erro Identificado</th>
                      <th className="p-3">Rota / Tela</th>
                      <th className="p-3">Empresa ID</th>
                      <th className="p-3 text-right">Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {isLoadingErrors ? (
                      <tr>
                        <td colSpan={4} className="text-center p-6 text-slate-500">
                          Carregando erros...
                        </td>
                      </tr>
                    ) : errorLogs.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center p-6 text-emerald-400">
                          Nenhum erro de sincronização registrado! Sistema operando normalmente.
                        </td>
                      </tr>
                    ) : (
                      errorLogs.map((err: any) => (
                        <tr key={err.id} className="hover:bg-slate-800/40">
                          <td className="p-3 font-semibold text-red-300 max-w-sm truncate">
                            {err.error_message || "Erro de execução"}
                          </td>
                          <td className="p-3 font-mono text-slate-400">
                            {err.route || "/"}
                          </td>
                          <td className="p-3 font-mono text-slate-400">
                            {err.company_id ? err.company_id.slice(0, 8) : "Anônimo"}
                          </td>
                          <td className="p-3 text-right text-slate-400">
                            {new Date(err.created_at).toLocaleString("pt-BR")}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de Ação Rápida Super Admin */}
      <Dialog open={isActionModalOpen} onOpenChange={setIsActionModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              Gerenciar Oficina: {selectedCompany?.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Ações manuais para alterar plano, renovar períodos de teste ou aplicar bloqueio.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <Label className="text-xs text-slate-300">Alterar Plano</Label>
              <Select value={newPlanId} onValueChange={setNewPlanId}>
                <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                  <SelectValue placeholder="Selecione o plano" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                  <SelectItem value="naval-starter-monthly">Starter Mensal (R$ 89/mês)</SelectItem>
                  <SelectItem value="naval-starter-annual">Starter Anual (R$ 890/ano)</SelectItem>
                  <SelectItem value="naval-pro-monthly">Pro Mensal (R$ 179/mês)</SelectItem>
                  <SelectItem value="naval-pro-annual">Pro Anual (R$ 1.790/ano)</SelectItem>
                  <SelectItem value="enterprise">Enterprise / Homologação Ilimitada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-slate-300">Status Operacional</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                  <SelectItem value="active">Ativo (Acesso Completo)</SelectItem>
                  <SelectItem value="trial">Trial (Período de Testes)</SelectItem>
                  <SelectItem value="suspended">Suspenso / Bloqueio Temporário</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-slate-300">Renovar Período de Teste</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant={extendTrialDays === 7 ? "default" : "outline"}
                  size="sm"
                  onClick={() => setExtendTrialDays(7)}
                  className="text-xs border-slate-800"
                >
                  +7 Dias
                </Button>
                <Button
                  type="button"
                  variant={extendTrialDays === 15 ? "default" : "outline"}
                  size="sm"
                  onClick={() => setExtendTrialDays(15)}
                  className="text-xs border-slate-800"
                >
                  +15 Dias
                </Button>
                <Button
                  type="button"
                  variant={extendTrialDays === 30 ? "default" : "outline"}
                  size="sm"
                  onClick={() => setExtendTrialDays(30)}
                  className="text-xs border-slate-800"
                >
                  +30 Dias
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsActionModalOpen(false)}
              className="border-slate-800 text-slate-300"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              disabled={updateCompanyMutation.isPending}
              onClick={() => updateCompanyMutation.mutate()}
              className="bg-primary hover:bg-primary/90 text-white font-medium"
            >
              {updateCompanyMutation.isPending ? "Salvando..." : "Confirmar Alteração"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
