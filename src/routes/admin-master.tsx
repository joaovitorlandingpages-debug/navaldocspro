import { createFileRoute, Navigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  ShieldCheck, Building2, Users, FileText, Sparkles, BookOpen, FileArchive,
  DollarSign, Activity, Search, Loader2, Eye, Power, PowerOff, CreditCard,
  ArrowLeft, AlertTriangle,
} from "lucide-react";

export const Route = createFileRoute("/admin-master")({
  component: AdminMasterPage,
});

type Company = {
  id: string;
  name: string;
  cnpj: string | null;
  email: string | null;
  phone: string | null;
  responsible_name: string | null;
  plan_id: string | null;
  is_active: boolean;
  billing_status: string;
  billing_due_date: string | null;
  billing_monthly_amount: number | null;
  billing_payment_method: string | null;
  billing_notes: string | null;
  suspended_at: string | null;
  last_access_at: string | null;
  created_at: string;
};

type Plan = {
  id: string;
  slug: string;
  name: string;
  price: number;
  user_limit: number | null;
  process_limit: number | null;
  ocr_limit: number | null;
  storage_limit_gb: number | null;
  customer_limit: number | null;
  document_limit: number | null;
  features: Record<string, unknown> | null;
  is_active: boolean;
};

async function logMaster(event_type: string, target_company_id: string | null, message: string, metadata: Record<string, unknown> = {}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("master_audit_logs" as any).insert({
    actor_id: user.id,
    actor_email: user.email,
    target_company_id,
    event_type,
    message,
    metadata,
  });
}

function billingStatusBadge(status: string) {
  const map: Record<string, { label: string; className: string }> = {
    trial: { label: "Teste", className: "bg-blue-100 text-blue-800" },
    active: { label: "Ativo", className: "bg-emerald-100 text-emerald-800" },
    overdue: { label: "Vencido", className: "bg-amber-100 text-amber-800" },
    suspended: { label: "Suspenso", className: "bg-red-100 text-red-800" },
    cancelled: { label: "Cancelado", className: "bg-zinc-200 text-zinc-800" },
  };
  const v = map[status] ?? { label: status, className: "bg-zinc-100" };
  return <Badge className={v.className}>{v.label}</Badge>;
}

function AdminMasterPage() {
  const { profile, loading } = useAuth();

  useEffect(() => {
    if (!loading && profile && profile.role !== "admin_master_global") {
      logMaster("master_access_denied", null, "Tentativa de acesso ao painel master", { role: profile.role });
    }
  }, [loading, profile]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }
  if (!profile) return <Navigate to="/auth/login" />;
  if (profile.role !== "admin_master_global") return <Navigate to="/dashboard" />;

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white border-b border-slate-700">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-7 w-7 text-amber-400" />
            <div>
              <h1 className="text-lg font-black tracking-tight">PAINEL MASTER · NavalDocs Pro</h1>
              <p className="text-xs text-white/60 uppercase tracking-widest">Controle global SaaS</p>
            </div>
          </div>
          <Link to="/dashboard">
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">
              <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <Tabs defaultValue="overview">
          <TabsList className="bg-white border">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="companies">Empresas</TabsTrigger>
            <TabsTrigger value="plans">Planos</TabsTrigger>
            <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
            <TabsTrigger value="logs">Logs Master</TabsTrigger>
            <TabsTrigger value="debug">Debug</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6"><OverviewTab /></TabsContent>
          <TabsContent value="companies" className="mt-6"><CompaniesTab /></TabsContent>
          <TabsContent value="plans" className="mt-6"><PlansTab /></TabsContent>
          <TabsContent value="marketplace" className="mt-6"><MarketplaceTab /></TabsContent>
          <TabsContent value="logs" className="mt-6"><LogsTab /></TabsContent>
          <TabsContent value="debug" className="mt-6"><DebugTab /></TabsContent>
        </Tabs>

      </main>
    </div>
  );
}

/* ---------------- Debug ---------------- */
function DebugTab() {
  const { profile, user } = useAuth();
  const { data: checks } = useQuery({
    queryKey: ["master-debug", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const isMaster = await supabase.rpc("is_admin_master" as any);
      return {
        is_admin_master: isMaster.data ?? null,
        is_admin_master_error: isMaster.error?.message ?? null,
      };
    },

  });

  const rows: Array<[string, any]> = [
    ["user.id", user?.id],
    ["user.email", user?.email],
    ["profile.role", profile?.role],
    ["profile.company_id", profile?.company_id],
    ["profile.name", profile?.name],
    ["company.name", profile?.companies?.name],
    ["is_admin_master() rpc", checks?.is_admin_master],
    ["has_role(admin_master_global)", profile?.role === "admin_master_global"],
    ["acesso permitido", profile?.role === "admin_master_global"],
  ];

  return (
    <Card className="p-6">
      <h3 className="text-sm font-black uppercase tracking-widest mb-4 flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-amber-500" /> Diagnóstico de Permissão
      </h3>
      <div className="divide-y border rounded-lg overflow-hidden">
        {rows.map(([k, v]) => (
          <div key={k} className="grid grid-cols-2 gap-3 px-4 py-2 text-xs">
            <span className="font-semibold text-slate-600">{k}</span>
            <span className="font-mono text-slate-900 break-all">{String(v ?? "—")}</span>
          </div>
        ))}
      </div>
      {checks?.is_admin_master_error && (
        <p className="text-[11px] text-red-600 mt-3 font-mono">
          {checks.is_admin_master_error}
        </p>
      )}

    </Card>
  );
}


/* ---------------- Overview ---------------- */
function OverviewTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["master-overview"],
    queryFn: async () => {
      const [companies, profiles, processes, generatedDocs, ocrJobs, dossiers] = await Promise.all([
        supabase.from("companies").select("id, billing_status, is_active, billing_monthly_amount"),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("processes").select("id", { count: "exact", head: true }),
        supabase.from("generated_documents").select("id", { count: "exact", head: true }),
        supabase.from("ocr_jobs").select("id", { count: "exact", head: true }),
        supabase.from("process_dossiers").select("id", { count: "exact", head: true }),
      ]);

      const list = companies.data ?? [];
      const total = list.length;
      const active = list.filter((c: any) => c.is_active && c.billing_status === "active").length;
      const trial = list.filter((c: any) => c.billing_status === "trial").length;
      const overdue = list.filter((c: any) => ["overdue", "suspended"].includes(c.billing_status)).length;
      const revenue = list
        .filter((c: any) => c.billing_status === "active")
        .reduce((s: number, c: any) => s + Number(c.billing_monthly_amount ?? 0), 0);

      return {
        total, active, trial, overdue, revenue,
        users: profiles.count ?? 0,
        processes: processes.count ?? 0,
        docs: generatedDocs.count ?? 0,
        ocr: ocrJobs.count ?? 0,
        dossiers: dossiers.count ?? 0,
      };
    },
  });

  if (isLoading) return <div className="flex items-center gap-2 text-zinc-500"><Loader2 className="h-4 w-4 animate-spin" /> Carregando métricas…</div>;
  if (!data) return null;

  const cards = [
    { label: "Empresas cadastradas", value: data.total, icon: Building2, color: "text-blue-600" },
    { label: "Empresas ativas", value: data.active, icon: Power, color: "text-emerald-600" },
    { label: "Em teste", value: data.trial, icon: Sparkles, color: "text-violet-600" },
    { label: "Inadimplentes / suspensas", value: data.overdue, icon: AlertTriangle, color: "text-amber-600" },
    { label: "Usuários totais", value: data.users, icon: Users, color: "text-cyan-600" },
    { label: "Processos criados", value: data.processes, icon: FileText, color: "text-indigo-600" },
    { label: "Documentos gerados", value: data.docs, icon: BookOpen, color: "text-rose-600" },
    { label: "OCRs executados", value: data.ocr, icon: Activity, color: "text-fuchsia-600" },
    { label: "Dossiês gerados", value: data.dossiers, icon: FileArchive, color: "text-orange-600" },
    { label: "Receita estimada (mensal)", value: `R$ ${data.revenue.toFixed(2)}`, icon: DollarSign, color: "text-emerald-700" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((c) => (
        <Card key={c.label} className="p-5">
          <c.icon className={`h-5 w-5 mb-3 ${c.color}`} />
          <div className="text-xs text-zinc-500 uppercase tracking-wide">{c.label}</div>
          <div className="text-2xl font-black mt-1">{c.value}</div>
        </Card>
      ))}
    </div>
  );
}

/* ---------------- Companies ---------------- */
function CompaniesTab() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Company | null>(null);

  const { data: companies, isLoading } = useQuery({
    queryKey: ["master-companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*, plans:plan_id(name, slug, price)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const filtered = useMemo(() => {
    return (companies ?? []).filter((c: any) => {
      const s = search.toLowerCase();
      const matchSearch = !s
        || c.name?.toLowerCase().includes(s)
        || c.cnpj?.toLowerCase().includes(s)
        || c.email?.toLowerCase().includes(s);
      const matchStatus = statusFilter === "all" || c.billing_status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [companies, search, statusFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <Input placeholder="Buscar empresa, CNPJ ou e-mail…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-52"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="trial">Teste</SelectItem>
            <SelectItem value="active">Ativo</SelectItem>
            <SelectItem value="overdue">Vencido</SelectItem>
            <SelectItem value="suspended">Suspenso</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="p-8 flex items-center gap-2 text-zinc-500"><Loader2 className="h-4 w-4 animate-spin" /> Carregando empresas…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-zinc-500">
            <Building2 className="h-10 w-10 mx-auto mb-3 text-zinc-300" />
            <p>Nenhuma empresa encontrada.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50 text-zinc-600 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Empresa</th>
                  <th className="px-4 py-3 text-left">CNPJ</th>
                  <th className="px-4 py-3 text-left">Plano</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Vencimento</th>
                  <th className="px-4 py-3 text-left">Cadastro</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c: any) => (
                  <tr key={c.id} className="border-t hover:bg-zinc-50">
                    <td className="px-4 py-3">
                      <div className="font-semibold">{c.name}</div>
                      <div className="text-xs text-zinc-500">{c.email ?? "—"}</div>
                    </td>
                    <td className="px-4 py-3">{c.cnpj ?? "—"}</td>
                    <td className="px-4 py-3">{c.plans?.name ?? "—"}</td>
                    <td className="px-4 py-3">{billingStatusBadge(c.billing_status)}</td>
                    <td className="px-4 py-3">{c.billing_due_date ?? "—"}</td>
                    <td className="px-4 py-3">{new Date(c.created_at).toLocaleDateString("pt-BR")}</td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="ghost" onClick={() => setSelected(c)}>
                        <Eye className="h-4 w-4 mr-1" /> Detalhes
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {selected && <CompanyDetailDialog company={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

/* -------- Company Detail Dialog -------- */
function CompanyDetailDialog({ company, onClose }: { company: Company; onClose: () => void }) {
  const qc = useQueryClient();
  const [tab, setTab] = useState("info");
  const [form, setForm] = useState({
    plan_id: company.plan_id ?? "",
    billing_status: company.billing_status,
    billing_due_date: company.billing_due_date ?? "",
    billing_monthly_amount: company.billing_monthly_amount ?? 0,
    billing_payment_method: company.billing_payment_method ?? "",
    billing_notes: company.billing_notes ?? "",
  });

  const { data: plans } = useQuery({
    queryKey: ["master-plans-min"],
    queryFn: async () => {
      const { data } = await supabase.from("plans").select("id, name, slug, price").order("price");
      return data ?? [];
    },
  });

  const { data: usage } = useQuery({
    queryKey: ["company-usage", company.id],
    queryFn: async () => {
      const [users, processes, docs, ocr, dossiers] = await Promise.all([
        supabase.from("profiles").select("id, name, email, role").eq("company_id", company.id),
        supabase.from("processes").select("id", { count: "exact", head: true }).eq("company_id", company.id),
        supabase.from("generated_documents").select("id", { count: "exact", head: true }).eq("company_id", company.id),
        supabase.from("usage_metrics").select("ocr_usage, storage_usage_gb").eq("company_id", company.id).maybeSingle(),
        supabase.from("process_dossiers").select("id", { count: "exact", head: true }).eq("company_id", company.id),
      ]);
      return {
        users: users.data ?? [],
        processes: processes.count ?? 0,
        docs: docs.count ?? 0,
        ocr: (ocr.data as any)?.ocr_usage ?? 0,
        storage: (ocr.data as any)?.storage_usage_gb ?? 0,
        dossiers: dossiers.count ?? 0,
      };
    },
  });

  const { data: payments } = useQuery({
    queryKey: ["company-billing-history", company.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("company_billing_history" as any)
        .select("*")
        .eq("company_id", company.id)
        .order("paid_at", { ascending: false });
      return (data ?? []) as any[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        plan_id: form.plan_id || null,
        billing_status: form.billing_status,
        billing_due_date: form.billing_due_date || null,
        billing_monthly_amount: Number(form.billing_monthly_amount) || 0,
        billing_payment_method: form.billing_payment_method || null,
        billing_notes: form.billing_notes || null,
      };
      const { error } = await supabase.from("companies").update(payload).eq("id", company.id);
      if (error) throw error;
      await logMaster("master_billing_updated", company.id, `Cobrança atualizada para ${company.name}`, payload);
    },
    onSuccess: () => {
      toast.success("Empresa atualizada");
      qc.invalidateQueries({ queryKey: ["master-companies"] });
      qc.invalidateQueries({ queryKey: ["master-overview"] });
      onClose();
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao atualizar"),
  });

  const toggleSuspend = useMutation({
    mutationFn: async () => {
      const isSuspending = company.billing_status !== "suspended";
      const { error } = await supabase
        .from("companies")
        .update({
          billing_status: isSuspending ? "suspended" : "active",
          is_active: !isSuspending,
          suspended_at: isSuspending ? new Date().toISOString() : null,
        })
        .eq("id", company.id);
      if (error) throw error;
      await logMaster(
        isSuspending ? "master_company_suspended" : "master_company_reactivated",
        company.id,
        `${isSuspending ? "Suspensão" : "Reativação"} de ${company.name}`,
      );
    },
    onSuccess: () => {
      toast.success("Status alterado");
      qc.invalidateQueries({ queryKey: ["master-companies"] });
      onClose();
    },
  });

  useEffect(() => {
    logMaster("master_company_accessed", company.id, `Acesso aos detalhes de ${company.name}`);
  }, [company.id, company.name]);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" /> {company.name}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="info">Dados</TabsTrigger>
            <TabsTrigger value="billing">Cobrança</TabsTrigger>
            <TabsTrigger value="usage">Uso</TabsTrigger>
            <TabsTrigger value="users">Usuários</TabsTrigger>
            <TabsTrigger value="payments">Pagamentos</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-2 mt-4 text-sm">
            <div><b>CNPJ:</b> {company.cnpj ?? "—"}</div>
            <div><b>E-mail:</b> {company.email ?? "—"}</div>
            <div><b>Telefone:</b> {company.phone ?? "—"}</div>
            <div><b>Responsável:</b> {company.responsible_name ?? "—"}</div>
            <div><b>Status:</b> {billingStatusBadge(company.billing_status)}</div>
            <div><b>Cadastro:</b> {new Date(company.created_at).toLocaleString("pt-BR")}</div>
            <div><b>Último acesso:</b> {company.last_access_at ? new Date(company.last_access_at).toLocaleString("pt-BR") : "—"}</div>
          </TabsContent>

          <TabsContent value="billing" className="space-y-3 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Plano</Label>
                <Select value={form.plan_id} onValueChange={(v) => setForm({ ...form, plan_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {(plans ?? []).map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>{p.name} — R$ {Number(p.price).toFixed(2)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={form.billing_status} onValueChange={(v) => setForm({ ...form, billing_status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trial">Teste</SelectItem>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="overdue">Vencido</SelectItem>
                    <SelectItem value="suspended">Suspenso</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Vencimento</Label>
                <Input type="date" value={form.billing_due_date}
                  onChange={(e) => setForm({ ...form, billing_due_date: e.target.value })} />
              </div>
              <div>
                <Label>Valor mensal (R$)</Label>
                <Input type="number" step="0.01" value={form.billing_monthly_amount}
                  onChange={(e) => setForm({ ...form, billing_monthly_amount: Number(e.target.value) })} />
              </div>
              <div className="col-span-2">
                <Label>Forma de pagamento</Label>
                <Input value={form.billing_payment_method}
                  onChange={(e) => setForm({ ...form, billing_payment_method: e.target.value })}
                  placeholder="PIX, Boleto, Cartão…" />
              </div>
              <div className="col-span-2">
                <Label>Observações</Label>
                <Textarea value={form.billing_notes}
                  onChange={(e) => setForm({ ...form, billing_notes: e.target.value })} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="usage" className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <Card className="p-4"><div className="text-zinc-500 text-xs">Processos</div><div className="text-2xl font-black">{usage?.processes ?? 0}</div></Card>
            <Card className="p-4"><div className="text-zinc-500 text-xs">Documentos gerados</div><div className="text-2xl font-black">{usage?.docs ?? 0}</div></Card>
            <Card className="p-4"><div className="text-zinc-500 text-xs">OCRs</div><div className="text-2xl font-black">{usage?.ocr ?? 0}</div></Card>
            <Card className="p-4"><div className="text-zinc-500 text-xs">Dossiês</div><div className="text-2xl font-black">{usage?.dossiers ?? 0}</div></Card>
            <Card className="p-4 col-span-2"><div className="text-zinc-500 text-xs">Armazenamento usado (GB)</div><div className="text-2xl font-black">{usage?.storage ?? 0}</div></Card>
          </TabsContent>

          <TabsContent value="users" className="mt-4">
            {(usage?.users ?? []).length === 0 ? (
              <div className="text-sm text-zinc-500">Nenhum usuário.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
                  <tr><th className="px-3 py-2 text-left">Nome</th><th className="px-3 py-2 text-left">E-mail</th><th className="px-3 py-2 text-left">Perfil</th></tr>
                </thead>
                <tbody>
                  {(usage?.users ?? []).map((u: any) => (
                    <tr key={u.id} className="border-t">
                      <td className="px-3 py-2">{u.name}</td>
                      <td className="px-3 py-2">{u.email}</td>
                      <td className="px-3 py-2">{u.role}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </TabsContent>

          <TabsContent value="payments" className="mt-4">
            <PaymentsBlock companyId={company.id} payments={payments ?? []} />
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2 flex-wrap">
          <Button variant="outline" onClick={() => toggleSuspend.mutate()} disabled={toggleSuspend.isPending}>
            {company.billing_status === "suspended" ? <><Power className="h-4 w-4 mr-1" /> Reativar</> : <><PowerOff className="h-4 w-4 mr-1" /> Suspender</>}
          </Button>
          <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            <CreditCard className="h-4 w-4 mr-1" /> Salvar cobrança
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PaymentsBlock({ companyId, payments }: { companyId: string; payments: any[] }) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("");
  const [notes, setNotes] = useState("");

  const add = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("company_billing_history" as any).insert({
        company_id: companyId,
        amount: Number(amount) || 0,
        payment_method: method || null,
        notes: notes || null,
        created_by: user?.id,
      });
      if (error) throw error;
      await logMaster("master_billing_updated", companyId, "Pagamento manual registrado", { amount, method });
    },
    onSuccess: () => {
      toast.success("Pagamento registrado");
      setAmount(""); setMethod(""); setNotes("");
      qc.invalidateQueries({ queryKey: ["company-billing-history", companyId] });
    },
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <Input placeholder="Valor" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <Input placeholder="Método" value={method} onChange={(e) => setMethod(e.target.value)} />
        <Button onClick={() => add.mutate()} disabled={add.isPending || !amount}>Registrar</Button>
      </div>
      <Textarea placeholder="Observações" value={notes} onChange={(e) => setNotes(e.target.value)} />

      {payments.length === 0 ? (
        <div className="text-sm text-zinc-500">Nenhum pagamento registrado.</div>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
            <tr><th className="px-3 py-2 text-left">Data</th><th className="px-3 py-2 text-left">Valor</th><th className="px-3 py-2 text-left">Método</th><th className="px-3 py-2 text-left">Notas</th></tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="px-3 py-2">{new Date(p.paid_at).toLocaleDateString("pt-BR")}</td>
                <td className="px-3 py-2">R$ {Number(p.amount).toFixed(2)}</td>
                <td className="px-3 py-2">{p.payment_method ?? "—"}</td>
                <td className="px-3 py-2">{p.notes ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ---------------- Plans ---------------- */
function PlansTab() {
  const { data: plans, isLoading } = useQuery({
    queryKey: ["master-plans"],
    queryFn: async () => {
      const { data, error } = await supabase.from("plans").select("*").order("price");
      if (error) throw error;
      return data as Plan[];
    },
  });

  if (isLoading) return <div className="flex items-center gap-2 text-zinc-500"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {(plans ?? []).map((p) => (
        <Card key={p.id} className="p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="font-black uppercase tracking-wide">{p.name}</div>
            <Badge variant={p.is_active ? "default" : "secondary"}>{p.is_active ? "Ativo" : "Inativo"}</Badge>
          </div>
          <div className="text-2xl font-black mb-3">R$ {Number(p.price).toFixed(2)}<span className="text-xs text-zinc-500"> / mês</span></div>
          <ul className="text-sm text-zinc-700 space-y-1">
            <li>Usuários: {p.user_limit ?? "ilimitado"}</li>
            <li>Processos/mês: {p.process_limit ?? "ilimitado"}</li>
            <li>OCR/mês: {p.ocr_limit ?? "ilimitado"}</li>
            <li>Armazenamento: {p.storage_limit_gb ?? "—"} GB</li>
            <li>Clientes: {p.customer_limit ?? "ilimitado"}</li>
            <li>Documentos: {p.document_limit ?? "ilimitado"}</li>
          </ul>
        </Card>
      ))}
    </div>
  );
}

/* ---------------- Logs ---------------- */
function LogsTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["master-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("master_audit_logs" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  if (isLoading) return <div className="flex items-center gap-2 text-zinc-500"><Loader2 className="h-4 w-4 animate-spin" /> Carregando logs…</div>;

  return (
    <Card className="overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
          <tr>
            <th className="px-3 py-2 text-left">Quando</th>
            <th className="px-3 py-2 text-left">Evento</th>
            <th className="px-3 py-2 text-left">Mensagem</th>
            <th className="px-3 py-2 text-left">Ator</th>
          </tr>
        </thead>
        <tbody>
          {(data ?? []).length === 0 ? (
            <tr><td colSpan={4} className="px-3 py-6 text-center text-zinc-500">Sem registros.</td></tr>
          ) : (data ?? []).map((l) => (
            <tr key={l.id} className="border-t">
              <td className="px-3 py-2 text-zinc-600 text-xs">{new Date(l.created_at).toLocaleString("pt-BR")}</td>
              <td className="px-3 py-2"><Badge variant="outline">{l.event_type}</Badge></td>
              <td className="px-3 py-2">{l.message ?? "—"}</td>
              <td className="px-3 py-2 text-xs text-zinc-500">{l.actor_email ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

// ============================================================================
// Marketplace Tab — manage published templates and collections
// ============================================================================
function MarketplaceTab() {
  const [tab, setTab] = useState<"templates" | "collections">("templates");
  const [templates, setTemplates] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    const [t, c] = await Promise.all([
      supabase.from("marketplace_templates" as any).select("*").order("updated_at", { ascending: false }),
      supabase.from("marketplace_collections" as any).select("*").order("updated_at", { ascending: false }),
    ]);
    setTemplates((t.data as any[]) ?? []);
    setCollections((c.data as any[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { reload(); }, []);

  const update = async (table: string, id: string, patch: Record<string, unknown>) => {
    const { error } = await supabase.from(table as any).update(patch).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Atualizado");
    reload();
  };

  const setPrice = async (table: string, id: string, current: number) => {
    const v = window.prompt("Novo preço em centavos (0 para gratuito):", String(current ?? 0));
    if (v === null) return;
    const cents = Math.max(0, parseInt(v.replace(/\D/g, ""), 10) || 0);
    update(table, id, { price_cents: cents });
  };

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Button size="sm" variant={tab === "templates" ? "default" : "outline"} onClick={() => setTab("templates")}>
          Templates ({templates.length})
        </Button>
        <Button size="sm" variant={tab === "collections" ? "default" : "outline"} onClick={() => setTab("collections")}>
          Coleções ({collections.length})
        </Button>
      </div>

      {loading ? (
        <div className="text-sm text-zinc-500">Carregando…</div>
      ) : tab === "templates" ? (
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-zinc-600">
            <tr>
              <th className="text-left px-3 py-2">Nome</th>
              <th className="text-left px-3 py-2">Categoria</th>
              <th className="text-left px-3 py-2">Preço</th>
              <th className="text-left px-3 py-2">Status</th>
              <th className="text-left px-3 py-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {templates.map((t) => (
              <tr key={t.id} className="border-t">
                <td className="px-3 py-2 font-medium">{t.name}</td>
                <td className="px-3 py-2 text-xs">{t.category}</td>
                <td className="px-3 py-2 text-xs">{t.price_cents ? `R$ ${(t.price_cents / 100).toFixed(2)}` : "Grátis"}</td>
                <td className="px-3 py-2 text-xs flex gap-1">
                  {t.published ? <Badge className="bg-emerald-100 text-emerald-800">Publicado</Badge> : <Badge variant="outline">Rascunho</Badge>}
                  {t.is_featured && <Badge className="bg-amber-100 text-amber-800">Destaque</Badge>}
                </td>
                <td className="px-3 py-2 text-xs space-x-1">
                  <Button size="sm" variant="outline" onClick={() => update("marketplace_templates", t.id, { published: !t.published })}>
                    {t.published ? "Despublicar" : "Publicar"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => update("marketplace_templates", t.id, { is_featured: !t.is_featured })}>
                    {t.is_featured ? "Tirar destaque" : "Destacar"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setPrice("marketplace_templates", t.id, t.price_cents)}>
                    Preço
                  </Button>
                </td>
              </tr>
            ))}
            {templates.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-zinc-500">Nenhum template cadastrado.</td></tr>
            )}
          </tbody>
        </table>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-zinc-600">
            <tr>
              <th className="text-left px-3 py-2">Coleção</th>
              <th className="text-left px-3 py-2">Itens</th>
              <th className="text-left px-3 py-2">Preço</th>
              <th className="text-left px-3 py-2">Status</th>
              <th className="text-left px-3 py-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {collections.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="px-3 py-2 font-medium">{c.name}</td>
                <td className="px-3 py-2 text-xs">{(c.template_slugs ?? []).length}</td>
                <td className="px-3 py-2 text-xs">{c.price_cents ? `R$ ${(c.price_cents / 100).toFixed(2)}` : "Grátis"}</td>
                <td className="px-3 py-2 text-xs">
                  {c.published ? <Badge className="bg-emerald-100 text-emerald-800">Publicada</Badge> : <Badge variant="outline">Rascunho</Badge>}
                </td>
                <td className="px-3 py-2 text-xs space-x-1">
                  <Button size="sm" variant="outline" onClick={() => update("marketplace_collections", c.id, { published: !c.published })}>
                    {c.published ? "Despublicar" : "Publicar"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setPrice("marketplace_collections", c.id, c.price_cents)}>
                    Preço
                  </Button>
                </td>
              </tr>
            ))}
            {collections.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-zinc-500">Nenhuma coleção cadastrada.</td></tr>
            )}
          </tbody>
        </table>
      )}
    </Card>
  );
}
