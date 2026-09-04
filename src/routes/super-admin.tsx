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
  ArrowUpRight,
  DollarSign,
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
import { NAVAL_PLANS } from "@/services/billing/plansConfig";

type CompanyItem = {
  id: string;
  name: string;
  cnpj?: string | null;
  email?: string | null;
  phone?: string | null;
  plan?: string | null;
  plan_id?: string | null;
  is_demo?: boolean;
  is_pilot?: boolean;
  billing_status?: string | null;
  created_at?: string;
  updated_at?: string;
};

export const Route = createFileRoute("/super-admin" as any)({
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
  const [selectedCompany, setSelectedCompany] = useState<any | null>(null);
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [newPlanId, setNewPlanId] = useState("");
  const [newStatus, setNewStatus] = useState("");

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
      return data || [];
    },
  });

  // 2. Consulta de Processos / OS emitidas para contagem
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

  // 3. Consulta de Webhooks do Mercado Pago / Logs de Auditoria
  const { data: webhookLogs = [] } = useQuery({
    queryKey: ["super-admin-webhook-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_logs")
        .select("*")
        .eq("module", "billing")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) return [];
      return data || [];
    },
  });

  // 4. Mapeamento de contagem de OS por empresa
  const processCountByCompany = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of processes) {
      if (p.company_id) {
        map[p.company_id] = (map[p.company_id] || 0) + 1;
      }
    }
    return map;
  }, [processes]);

  // 5. Métricas da Plataforma em Tempo Real
  const metrics = useMemo(() => {
    const total = companies.length;
    const active = companies.filter(
      (c) => c.billing_status === "active" || c.plan === "enterprise" || c.is_pilot
    ).length;
    const trialing = companies.filter(
      (c) => c.billing_status === "trial" || c.billing_status === "trialing" || (!c.billing_status && !c.is_pilot)
    ).length;
    const blocked = companies.filter(
      (c) => c.billing_status === "suspended" || c.billing_status === "cancelled"
    ).length;

    // Estimativa de MRR e ARR com base nos planos oficiais
    let calculatedMrr = 0;
    companies.forEach((c) => {
      if (c.billing_status === "active" || c.is_pilot) {
        if (c.plan?.includes("anual") || c.plan_id?.includes("annual")) {
          calculatedMrr += 890 / 12; // diluído
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

  // 6. Dados para gráfico Recharts de Planos
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

  // 7. Filtragem de oficinas
  const filteredCompanies = useMemo(() => {
    return companies.filter((c) => {
      const matchesSearch =
        !searchTerm ||
        c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.cnpj?.includes(searchTerm);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && (c.billing_status === "active" || c.is_pilot)) ||
        (statusFilter === "trial" && (c.billing_status === "trial" || (!c.billing_status && !c.is_pilot))) ||
        (statusFilter === "blocked" && (c.billing_status === "suspended" || c.billing_status === "cancelled"));

      return matchesSearch && matchesStatus;
    });
  }, [companies, searchTerm, statusFilter]);

  // 8. Mutation para atualizar plano/status da oficina (Ação Rápida Super Admin)
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

      const { error } = await supabase
        .from("companies")
        .update(updates)
        .eq("id", selectedCompany.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Oficina atualizada com sucesso!");
      setIsActionModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["super-admin-companies"] });
    },
    onError: (err: any) => {
      toast.error(`Erro ao atualizar oficina: ${err.message}`);
    },
  });

  const handleOpenActionModal = (company: any) => {
    setSelectedCompany(company);
    setNewPlanId(company.plan_id || company.plan || "naval-starter-monthly");
    setNewStatus(company.billing_status || (company.is_pilot ? "active" : "trial"));
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
                Global SaaS
              </Badge>
            </div>
            <p className="text-xs text-slate-400">
              Controle central, métricas em tempo real e auditoria de todas as oficinas clientes.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["super-admin-companies"] })}
            className="border-slate-800 hover:bg-slate-900 text-slate-300"
          >
            <RefreshCw className="w-4 h-4 mr-1.5" />
            Atualizar
          </Button>
          <Button asChild size="sm" className="bg-primary hover:bg-primary/90 text-white">
            <Link to="/dashboard">Voltar ao App</Link>
          </Button>
        </div>
      </div>

      {/* Cards de Métricas em Tempo Real */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-900 border-slate-800 text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total de Oficinas
            </CardTitle>
            <Building2 className="w-4 h-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-white">{metrics.total}</div>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <span className="text-emerald-400 font-semibold">{metrics.active} ativas</span> ·{" "}
              <span className="text-sky-400 font-semibold">{metrics.trialing} em trial</span>
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800 text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400">
              MRR (Recorrente Mensal)
            </CardTitle>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-emerald-400">
              R$ {metrics.mrr.toLocaleString("pt-BR")}
            </div>
            <p className="text-xs text-slate-400 mt-1">ARR projetado: R$ {metrics.arr.toLocaleString("pt-BR")}</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800 text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Ordens de Serviço
            </CardTitle>
            <Activity className="w-4 h-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-white">{processes.length}</div>
            <p className="text-xs text-slate-400 mt-1">Total acumulado na plataforma</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800 text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Taxa de Conversão
            </CardTitle>
            <TrendingUp className="w-4 h-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-white">
              {metrics.total > 0 ? Math.round((metrics.active / metrics.total) * 100) : 0}%
            </div>
            <p className="text-xs text-slate-400 mt-1">Oficinas convertidas / ativas</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos e Visão Geral */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-slate-900 border-slate-800 text-white">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Distribuição de Planos & Adesão
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Proporção de assinaturas ativas entre Trial, Mensal, Anual e Enterprise
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
              Composição de Clientes
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Status da base instalada de oficinas
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

      {/* Abas: Gestão de Oficinas vs. Webhooks & Logs */}
      <Tabs defaultValue="tenants" className="w-full space-y-4">
        <TabsList className="bg-slate-900 border border-slate-800">
          <TabsTrigger value="tenants" className="data-[state=active]:bg-primary">
            <Building2 className="w-4 h-4 mr-2" />
            Gestão de Oficinas ({filteredCompanies.length})
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="data-[state=active]:bg-primary">
            <Webhook className="w-4 h-4 mr-2" />
            Webhooks & Auditoria
          </TabsTrigger>
        </TabsList>

        {/* Tabela de Oficinas */}
        <TabsContent value="tenants" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
              <Input
                placeholder="Buscar por oficina, e-mail ou CNPJ..."
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
                    <th className="p-3">Oficina / Nome</th>
                    <th className="p-3">Contato / E-mail</th>
                    <th className="p-3">Plano Atual</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-center">OS Emitidas</th>
                    <th className="p-3 text-right">Ações</th>
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
                      const count = processCountByCompany[c.id] || 0;
                      const isPilot = c.is_pilot;
                      const status = c.billing_status || (isPilot ? "active" : "trial");

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
                            <div className="text-slate-300">{c.email || "Sem e-mail"}</div>
                            {c.phone && (
                              <span className="text-[11px] text-slate-500">{c.phone}</span>
                            )}
                          </td>
                          <td className="p-3">
                            <Badge variant="outline" className="border-slate-700 bg-slate-800 text-slate-200">
                              {c.plan || "Free / Trial"}
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
                            ) : (
                              <Badge variant="outline" className="border-slate-700 text-slate-400">
                                {status}
                              </Badge>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <span className="font-mono font-bold text-white">{count}</span>
                          </td>
                          <td className="p-3 text-right">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleOpenActionModal(c)}
                              className="bg-slate-800 hover:bg-slate-700 text-xs"
                            >
                              Gerenciar
                            </Button>
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

        {/* Auditoria & Webhooks */}
        <TabsContent value="webhooks" className="space-y-4">
          <Card className="bg-slate-900 border-slate-800 text-white">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Webhook className="w-4 h-4 text-emerald-400" />
                Histórico de Eventos do Mercado Pago e Auditoria
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Log dos últimos disparos de pagamentos, notificações e alterações de assinatura.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {webhookLogs.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center">
                    Nenhum log de webhook registrado recentemente.
                  </p>
                ) : (
                  webhookLogs.map((log: any) => (
                    <div
                      key={log.id}
                      className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="border-slate-700 text-slate-300">
                            {log.action}
                          </Badge>
                          <span className="font-semibold text-slate-200">
                            Empresa ID: {log.company_id || "Global"}
                          </span>
                        </div>
                        <p className="text-slate-400 text-[11px]">
                          {new Date(log.created_at).toLocaleString("pt-BR")}
                        </p>
                      </div>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    </div>
                  ))
                )}
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
              Ações manuais imediatas para renovação, alteração de plano ou bloqueio temporário.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <Label className="text-xs text-slate-300">Plano Selecionado</Label>
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
              <Label className="text-xs text-slate-300">Status da Assinatura</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="bg-slate-950 border-slate-800 text-white">
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-slate-800 text-white">
                  <SelectItem value="active">Ativo (Acesso Completo)</SelectItem>
                  <SelectItem value="trial">Trial (Período de Testes)</SelectItem>
                  <SelectItem value="suspended">Suspenso / Bloqueado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
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
              className="bg-primary hover:bg-primary/90 text-white"
            >
              {updateCompanyMutation.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
