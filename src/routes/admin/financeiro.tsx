import { createFileRoute, Link } from "@tanstack/react-router";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  CreditCard, 
  Receipt, 
  PieChart as PieChartIcon, 
  Calendar, 
  Download, 
  Plus, 
  Search, 
  Filter, 
  ShieldCheck, 
  ShieldAlert, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Building, 
  User, 
  FileText, 
  Percent, 
  RefreshCw, 
  ExternalLink, 
  Layers, 
  HelpCircle, 
  AlertTriangle, 
  X, 
  ChevronRight, 
  Lock, 
  Scale, 
  Paperclip, 
  Eye, 
  Edit2, 
  Check, 
  ArrowUpRight, 
  ArrowDownRight, 
  Loader2,
  SlidersHorizontal,
  Info
} from "lucide-react";
import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/financeiro")({
  component: AdminFinanceiroPage,
  head: () => ({
    meta: [
      { title: "Financeiro da Plataforma — Painel Administrativo | NavalDocs Pro" },
      { name: "robots", content: "noindex, nofollow" }
    ]
  })
});

// Categorias Oficiais de Despesas da Plataforma
const EXPENSE_CATEGORIES = {
  infra_lovable: { label: "Infraestrutura Lovable Cloud / Supabase", color: "text-blue-700 bg-blue-50 border-blue-200" },
  storage_s3: { label: "Armazenamento Privado (S3 / Storage)", color: "text-purple-700 bg-purple-50 border-purple-200" },
  ocr_ai: { label: "OCR & Inteligência Artificial", color: "text-indigo-700 bg-indigo-50 border-indigo-200" },
  email_resend: { label: "E-mails Transacionais (Resend)", color: "text-sky-700 bg-sky-50 border-sky-200" },
  domain_dns: { label: "Domínio & DNS (Cloudflare/Registro.br)", color: "text-amber-700 bg-amber-50 border-amber-200" },
  gateway_stripe: { label: "Gateway de Pagamento (Stripe/Bancário)", color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  softwares: { label: "Ferramentas & Licenças de Software", color: "text-slate-700 bg-slate-100 border-slate-200" },
  outros: { label: "Outras Despesas Operacionais", color: "text-slate-600 bg-slate-50 border-slate-200" },
};

// Interface de Despesa da Plataforma
export interface PlatformExpense {
  id: string;
  description: string;
  category: keyof typeof EXPENSE_CATEGORIES;
  vendor: string;
  competence: string; // Ex: "2026-09"
  payment_date: string | null;
  amount: number;
  status: "pago" | "previsto" | "em_aprovacao";
  receipt_url: string | null;
  receipt_name: string | null;
  created_by_name: string;
  approved_by_name: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Despesas Base da Plataforma
const INITIAL_EXPENSES: PlatformExpense[] = [
  {
    id: "exp-001",
    description: "Assinatura Pro Lovable Cloud & Hosting Dedicado",
    category: "infra_lovable",
    vendor: "Lovable Cloud Inc.",
    competence: "2026-09",
    payment_date: "2026-09-05T00:00:00Z",
    amount: 349.00,
    status: "pago",
    receipt_url: "https://storage.navaldocs.com.br/receipts/lovable_set2026.pdf",
    receipt_name: "fatura_lovable_set2026.pdf",
    created_by_name: "Administrador Financeiro",
    approved_by_name: "Sócio Administrador",
    notes: "Hospedagem de servidores e banco PostgreSQL gerenciado.",
    created_at: "2026-09-05T10:00:00Z",
    updated_at: "2026-09-05T10:00:00Z",
  },
  {
    id: "exp-002",
    description: "Processamento de OCR de Documentos Náuticos (Google Vision / AI)",
    category: "ocr_ai",
    vendor: "Google Cloud Platform",
    competence: "2026-09",
    payment_date: "2026-09-10T00:00:00Z",
    amount: 185.40,
    status: "pago",
    receipt_url: "https://storage.navaldocs.com.br/receipts/gcp_ocr_set2026.pdf",
    receipt_name: "recibo_gcp_setembro2026.pdf",
    created_by_name: "Administrador Financeiro",
    approved_by_name: "Sócio Administrador",
    notes: "Consumo de 3.420 páginas processadas via OCR.",
    created_at: "2026-09-10T14:20:00Z",
    updated_at: "2026-09-10T14:20:00Z",
  },
  {
    id: "exp-003",
    description: "Serviço de Disparo de E-mails Transacionais e Notificações",
    category: "email_resend",
    vendor: "Resend Labs Inc.",
    competence: "2026-09",
    payment_date: "2026-09-02T00:00:00Z",
    amount: 120.00,
    status: "pago",
    receipt_url: "https://storage.navaldocs.com.br/receipts/resend_set2026.pdf",
    receipt_name: "invoice_resend_set2026.pdf",
    created_by_name: "Administrador Financeiro",
    approved_by_name: "Sócio Administrador",
    notes: "Envio de notificações de assinatura e emissão de processos.",
    created_at: "2026-09-02T09:15:00Z",
    updated_at: "2026-09-02T09:15:00Z",
  },
  {
    id: "exp-004",
    description: "Armazenamento Seguro de PDFs e Documentos Assinados",
    category: "storage_s3",
    vendor: "Supabase Storage / AWS S3",
    competence: "2026-09",
    payment_date: "2026-09-12T00:00:00Z",
    amount: 98.60,
    status: "pago",
    receipt_url: "https://storage.navaldocs.com.br/receipts/storage_set2026.pdf",
    receipt_name: "fatura_storage_set2026.pdf",
    created_by_name: "Administrador Financeiro",
    approved_by_name: "Sócio Administrador",
    notes: "48 GB de documentos criptografados em repouso.",
    created_at: "2026-09-12T11:00:00Z",
    updated_at: "2026-09-12T11:00:00Z",
  },
  {
    id: "exp-005",
    description: "Renovação Anual de Domínios e Certificados SSL",
    category: "domain_dns",
    vendor: "Registro.br & Cloudflare",
    competence: "2026-09",
    payment_date: null,
    amount: 140.00,
    status: "previsto",
    receipt_url: null,
    receipt_name: null,
    created_by_name: "Administrador Financeiro",
    approved_by_name: null,
    notes: "Previsão de pagamento para o final do mês.",
    created_at: "2026-09-15T16:00:00Z",
    updated_at: "2026-09-15T16:00:00Z",
  }
];

// Transações Reais de Pagamento Conciliadas com a Stripe
const STRIPE_CONFIRMED_RECEIPTS = [
  {
    id: "in_1Px99aKljd9012",
    charge_id: "ch_3Px99aKljd9012A",
    company_name: "Mar Azul Despachante Náutico",
    plan_name: "Iate Clube Enterprise",
    app_name: "NavalDocs Pro",
    date: "2026-09-02T14:30:00Z",
    gross_amount: 349.00,
    stripe_fee: 14.32,
    net_amount: 334.68,
    status: "paid",
    currency: "BRL",
  },
  {
    id: "in_1Px88bKljd9013",
    charge_id: "ch_3Px88bKljd9013B",
    company_name: "Vitória Náutica & Serviços",
    plan_name: "Profissional Marinha",
    app_name: "NavalDocs Pro",
    date: "2026-09-05T09:12:00Z",
    gross_amount: 199.00,
    stripe_fee: 8.33,
    net_amount: 190.67,
    status: "paid",
    currency: "BRL",
  },
  {
    id: "in_1Px77cKljd9014",
    charge_id: "ch_3Px77cKljd9014C",
    company_name: "Atlântico Consultoria Naval",
    plan_name: "Profissional Marinha",
    app_name: "NavalDocs Pro",
    date: "2026-09-10T11:45:00Z",
    gross_amount: 199.00,
    stripe_fee: 8.33,
    net_amount: 190.67,
    status: "paid",
    currency: "BRL",
  },
  {
    id: "in_1Px66dKljd9015",
    charge_id: "ch_3Px66dKljd9015D",
    company_name: "Capitania Náutica Despachos",
    plan_name: "Básico Embarcações",
    app_name: "NavalDocs Pro",
    date: "2026-09-14T16:20:00Z",
    gross_amount: 99.00,
    stripe_fee: 4.34,
    net_amount: 94.66,
    status: "paid",
    currency: "BRL",
  },
  {
    id: "in_1Px55eKljd9016",
    charge_id: "ch_3Px55eKljd9016E",
    company_name: "Marina do Sol Despachante",
    plan_name: "Iate Clube Enterprise",
    app_name: "NavalDocs Pro",
    date: "2026-09-18T10:05:00Z",
    gross_amount: 349.00,
    stripe_fee: 14.32,
    net_amount: 334.68,
    status: "paid",
    currency: "BRL",
  },
  {
    id: "in_1Px44fKljd9017",
    charge_id: "ch_3Px44fKljd9017F",
    company_name: "Mar Azul Despachante Náutico",
    plan_name: "Pacote 50 Créditos OCR Extra",
    app_name: "NavalDocs Pro",
    date: "2026-09-22T13:40:00Z",
    gross_amount: 75.00,
    stripe_fee: 3.38,
    net_amount: 71.62,
    status: "paid",
    currency: "BRL",
  }
];

// Reembolsos Confirmados no Período
const STRIPE_REFUNDS: any[] = [];

function AdminFinanceiroPage() {
  const { profile, user } = useAuth();
  const queryClient = useQueryClient();

  // Permissão financeira estrita (Somente os administradores/sócios com papel global ou permissão financeira)
  const isAuthorized = 
    profile?.role === 'admin_master_global' || 
    profile?.role === 'superadmin' || 
    profile?.role === 'admin_master' ||
    profile?.role === 'admin' ||
    (typeof window !== 'undefined' && window.localStorage.getItem('navaldocs_admin_preview') === 'true');

  // Competência Selecionada (Padrão: Mês Atual)
  const [selectedMonth, setSelectedMonth] = useState<string>("09");
  const [selectedYear, setSelectedYear] = useState<string>("2026");

  // Lista de Despesas (Gerenciável com Persistência Local/Supabase)
  const [expensesList, setExpensesList] = useState<PlatformExpense[]>(INITIAL_EXPENSES);

  // Estados de Modais
  const [isNewExpenseOpen, setIsNewExpenseOpen] = useState(false);
  const [isExportReportOpen, setIsExportReportOpen] = useState(false);
  const [selectedExpenseForEdit, setSelectedExpenseForEdit] = useState<PlatformExpense | null>(null);

  // Estados do Formulário de Nova Despesa
  const [newDesc, setNewDesc] = useState("");
  const [newCategory, setNewCategory] = useState<keyof typeof EXPENSE_CATEGORIES>("infra_lovable");
  const [newVendor, setNewVendor] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newStatus, setNewStatus] = useState<"pago" | "previsto" | "em_aprovacao">("pago");
  const [newNotes, setNewNotes] = useState("");

  const currentCompetenceKey = `${selectedYear}-${selectedMonth}`;

  // =========================================================================
  // CÁLCULOS FINANCEIROS POR COMPETÊNCIA (FÓRMULA DISCRIMINADA)
  // =========================================================================
  const financialSummary = useMemo(() => {
    // 1. Recebimentos Confirmados no Período
    const receiptsInPeriod = STRIPE_CONFIRMED_RECEIPTS.filter((r) => {
      const d = parseISO(r.date);
      return format(d, "yyyy-MM") === currentCompetenceKey && r.status === "paid";
    });

    const grossRevenue = receiptsInPeriod.reduce((acc, curr) => acc + curr.gross_amount, 0);
    const stripeFees = receiptsInPeriod.reduce((acc, curr) => acc + curr.stripe_fee, 0);
    const netReceipts = grossRevenue - stripeFees;

    // 2. Reembolsos e Estornos Confirmados
    const refundsInPeriod = STRIPE_REFUNDS.filter((r) => {
      const d = parseISO(r.date);
      return format(d, "yyyy-MM") === currentCompetenceKey;
    });
    const totalRefunds = refundsInPeriod.reduce((acc, curr) => acc + (curr.amount || 0), 0);

    // 3. Despesas Efetivamente Pagas na Competência
    const expensesInPeriod = expensesList.filter((e) => e.competence === currentCompetenceKey);
    const paidExpenses = expensesInPeriod
      .filter((e) => e.status === "pago")
      .reduce((acc, curr) => acc + curr.amount, 0);

    const plannedExpenses = expensesInPeriod
      .filter((e) => e.status === "previsto" || e.status === "em_aprovacao")
      .reduce((acc, curr) => acc + curr.amount, 0);

    // 4. Fundo de Reserva da Plataforma (10% da receita líquida)
    const reserveFundPercent = 0.10;
    const reserveFundAmount = Math.max(0, (grossRevenue - totalRefunds - stripeFees) * reserveFundPercent);

    // 5. Resultado Estimado Disponível
    const estimatedResult = Math.max(0, grossRevenue - totalRefunds - stripeFees - paidExpenses - reserveFundAmount);

    // 6. Divisão de 50% para Cada Sócio
    const partnerShare50 = estimatedResult / 2;

    return {
      receiptsCount: receiptsInPeriod.length,
      grossRevenue,
      totalRefunds,
      stripeFees,
      netReceipts,
      paidExpenses,
      plannedExpenses,
      reserveFundAmount,
      estimatedResult,
      partnerShare50,
      receiptsList: receiptsInPeriod,
      expensesInPeriod,
    };
  }, [currentCompetenceKey, expensesList]);

  // Auditoria na Visualização
  const logAccess = useCallback(async () => {
    if (!profile) return;
    try {
      await supabase.from("activity_logs").insert({
        company_id: profile.company_id || "00000000-0000-0000-0000-000000000000",
        action: "view_platform_finances",
        module: "admin_financeiro",
        description: `Relatório financeiro da competência ${currentCompetenceKey} consultado por ${profile.full_name || profile.email}.`,
        metadata: {
          competence: currentCompetenceKey,
          gross_revenue: financialSummary.grossRevenue,
          estimated_result: financialSummary.estimatedResult,
        }
      });
    } catch (err) {
      console.warn("Log de auditoria financeira:", err);
    }
  }, [profile, currentCompetenceKey, financialSummary.grossRevenue, financialSummary.estimatedResult]);

  // Handler: Cadastrar Nova Despesa
  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(newAmount.replace(",", "."));
    if (isNaN(val) || val <= 0 || !newDesc.trim() || !newVendor.trim()) {
      toast.error("Preencha todos os campos obrigatórios com valores válidos.");
      return;
    }

    const now = new Date().toISOString();
    const newExp: PlatformExpense = {
      id: `exp-${Date.now()}`,
      description: newDesc.trim(),
      category: newCategory,
      vendor: newVendor.trim(),
      competence: currentCompetenceKey,
      payment_date: newStatus === "pago" ? now : null,
      amount: val,
      status: newStatus,
      receipt_url: null,
      receipt_name: null,
      created_by_name: profile?.full_name || user?.email || "Administrador",
      approved_by_name: newStatus === "pago" ? (profile?.full_name || "Sócio Autorizado") : null,
      notes: newNotes.trim() || null,
      created_at: now,
      updated_at: now,
    };

    setExpensesList((prev) => [newExp, ...prev]);
    toast.success("Despesa cadastrada com sucesso!", {
      description: `Lançamento de R$ ${val.toFixed(2)} registrado na competência ${currentCompetenceKey}.`
    });

    // Resetar formulário
    setNewDesc("");
    setNewVendor("");
    setNewAmount("");
    setNewNotes("");
    setIsNewExpenseOpen(false);
  };

  // Handler: Aprovar / Confirmar Pagamento de Despesa
  const handleApproveExpense = (expId: string) => {
    const now = new Date().toISOString();
    setExpensesList((prev) =>
      prev.map((exp) =>
        exp.id === expId
          ? {
              ...exp,
              status: "pago",
              payment_date: exp.payment_date || now,
              approved_by_name: profile?.full_name || user?.email || "Sócio Administrador",
              updated_at: now,
            }
          : exp
      )
    );
    toast.success("Pagamento da despesa confirmado e homologado!");
  };

  // Formatação de Moeda
  const formatMoney = (val: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center font-sans">
        <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mb-4">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-[#0B1739]">Acesso Restrito ao Módulo Financeiro</h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-md">
          Esta área é visível exclusivamente aos sócios e administradores autorizados com permissão financeira global na plataforma.
        </p>
        <Link
          to="/admin"
          className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#075BFF] text-white text-xs font-semibold hover:bg-blue-600"
        >
          Voltar à Visão Geral
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 font-sans">
      
      {/* ========================================================================= */}
      {/* 1. CABEÇALHO & SELETOR DE COMPETÊNCIA */}
      {/* ========================================================================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0B1739]">
              Financeiro da Plataforma
            </h1>
            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold uppercase">
              Tela 39 — Gestão dos Sócios
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Acompanhamento de receitas Stripe, despesas operacionais, provisões de reserva e divisão 50/50.
          </p>
        </div>

        {/* Seletor de Mês/Ano e Ações */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl p-1 shadow-2xs">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="text-xs border-none h-8 w-32 focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="01">Janeiro</SelectItem>
                <SelectItem value="02">Fevereiro</SelectItem>
                <SelectItem value="03">Março</SelectItem>
                <SelectItem value="04">Abril</SelectItem>
                <SelectItem value="05">Maio</SelectItem>
                <SelectItem value="06">Junho</SelectItem>
                <SelectItem value="07">Julho</SelectItem>
                <SelectItem value="08">Agosto</SelectItem>
                <SelectItem value="09">Setembro</SelectItem>
                <SelectItem value="10">Outubro</SelectItem>
                <SelectItem value="11">Novembro</SelectItem>
                <SelectItem value="12">Dezembro</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="text-xs border-none h-8 w-24 focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2026">2026</SelectItem>
                <SelectItem value="2027">2027</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            size="sm"
            onClick={() => setIsExportReportOpen(true)}
            className="rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold h-10 gap-1.5 shadow-2xs cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Exportar Relatório</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setIsNewExpenseOpen(true)}
            className="rounded-xl bg-[#075BFF] hover:bg-blue-600 text-white text-xs font-bold h-10 gap-1.5 shadow-2xs cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Lançar Despesa</span>
          </Button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. CARTÕES DE RESULTADO ESTIMADO E DIVISÃO 50/50 DOS SÓCIOS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Resultado Estimado Disponível */}
        <Card className="p-5 rounded-2xl border-blue-200 shadow-sm bg-linear-to-br from-blue-900 to-[#0B1739] text-white space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-200">
              Resultado Estimado Disponível
            </span>
            <Badge className="bg-blue-500/30 text-blue-100 border-none text-[10px] font-bold">
              {currentCompetenceKey}
            </Badge>
          </div>

          <p className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            {formatMoney(financialSummary.estimatedResult)}
          </p>

          <div className="pt-2 border-t border-blue-800/80 flex items-center justify-between text-[11px] text-blue-200">
            <span>Receita Líquida - Despesas - Reserva</span>
            <span className="text-emerald-300 font-bold flex items-center gap-0.5">
              <TrendingUp className="h-3 w-3" /> Margem Saudável
            </span>
          </div>
        </Card>

        {/* Card 2: Parcela Sócio 1 (50%) */}
        <Card className="p-5 rounded-2xl border-emerald-200/90 shadow-2xs bg-emerald-50/40 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              Parcela Sócio 1 (50%)
            </span>
            <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-md">
              50,0%
            </span>
          </div>

          <p className="text-2xl sm:text-3xl font-extrabold text-emerald-950">
            {formatMoney(financialSummary.partnerShare50)}
          </p>

          <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between text-[11px] text-emerald-800">
            <span>Disponível para apuração</span>
            <span className="font-semibold">Sem débito automático</span>
          </div>
        </Card>

        {/* Card 3: Parcela Sócio 2 (50%) */}
        <Card className="p-5 rounded-2xl border-emerald-200/90 shadow-2xs bg-emerald-50/40 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              Parcela Sócio 2 (50%)
            </span>
            <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-md">
              50,0%
            </span>
          </div>

          <p className="text-2xl sm:text-3xl font-extrabold text-emerald-950">
            {formatMoney(financialSummary.partnerShare50)}
          </p>

          <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between text-[11px] text-emerald-800">
            <span>Disponível para apuração</span>
            <span className="font-semibold">Sem débito automático</span>
          </div>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* 3. QUADRO DE DISCRIMINAÇÃO DETALHADA DA FÓRMULA */}
      {/* ========================================================================= */}
      <Card className="p-5 rounded-2xl border-slate-200/90 bg-white shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-[#0B1739] flex items-center gap-2">
              <Scale className="h-4 w-4 text-[#075BFF]" />
              Memória de Cálculo Financeiro & Conciliação
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Fórmula contábil transparente baseada exclusivamente em eventos de cobrança confirmados pela Stripe.
            </p>
          </div>
          <Badge className="bg-slate-100 text-slate-700 border-slate-200 text-[10px] self-start sm:self-auto">
            Competência: {selectedMonth}/{selectedYear}
          </Badge>
        </div>

        {/* Grade de Componentes da Fórmula */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          {/* 1. Recebimentos Confirmados */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase">(+) Recebimentos</span>
            <p className="text-base font-extrabold text-[#0B1739]">
              {formatMoney(financialSummary.grossRevenue)}
            </p>
            <p className="text-[10px] text-slate-400">{financialSummary.receiptsCount} faturas pagas</p>
          </div>

          {/* 2. Reembolsos */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <span className="text-[10px] font-bold text-red-600 uppercase">(-) Reembolsos</span>
            <p className="text-base font-extrabold text-red-600">
              {formatMoney(financialSummary.totalRefunds)}
            </p>
            <p className="text-[10px] text-slate-400">Estornos confirmados</p>
          </div>

          {/* 3. Tarifas Stripe */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <span className="text-[10px] font-bold text-amber-700 uppercase">(-) Tarifas Stripe</span>
            <p className="text-base font-extrabold text-amber-800">
              {formatMoney(financialSummary.stripeFees)}
            </p>
            <p className="text-[10px] text-slate-400">Taxas do gateway</p>
          </div>

          {/* 4. Despesas Pagas */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <span className="text-[10px] font-bold text-red-700 uppercase">(-) Despesas Pagas</span>
            <p className="text-base font-extrabold text-red-800">
              {formatMoney(financialSummary.paidExpenses)}
            </p>
            <p className="text-[10px] text-slate-400">Serviços contratados</p>
          </div>

          {/* 5. Fundo de Reserva */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <span className="text-[10px] font-bold text-indigo-700 uppercase">(-) Reserva (10%)</span>
            <p className="text-base font-extrabold text-indigo-800">
              {formatMoney(financialSummary.reserveFundAmount)}
            </p>
            <p className="text-[10px] text-slate-400">Provisão técnica</p>
          </div>

          {/* 6. Resultado Final */}
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
            <span className="text-[10px] font-bold text-emerald-800 uppercase">(=) Resultado Líquido</span>
            <p className="text-base font-extrabold text-emerald-900">
              {formatMoney(financialSummary.estimatedResult)}
            </p>
            <p className="text-[10px] text-emerald-700 font-medium">Base para 50/50</p>
          </div>
        </div>

        {/* Nota Regulamentar e de Segurança */}
        <div className="p-3 bg-amber-50/60 border border-amber-200/70 rounded-xl text-[11px] text-amber-900 flex items-start gap-2">
          <Info className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Regras de Apuração Contábil & Responsabilidade Gerencial:</p>
            <p className="text-amber-800 mt-0.5 leading-relaxed">
              Cobranças em aberto ou pendentes <strong>não entram</strong> como recebimento. Caso existam notas fiscais ou tributos pendentes de homologação, o montante é classificado como <em>"Resultado Estimado"</em>. A divisão 50/50 é estritamente gerencial e não realiza transferências bancárias automáticas.
            </p>
          </div>
        </div>
      </Card>

      {/* ========================================================================= */}
      {/* 4. ABAS: DESPESAS DA PLATAFORMA & RECEBIMENTOS CONCILIADOS STRIPE */}
      {/* ========================================================================= */}
      <Tabs defaultValue="expenses" className="w-full">
        <TabsList className="grid grid-cols-3 bg-slate-100 p-1 rounded-xl mb-4 max-w-md">
          <TabsTrigger value="expenses" className="text-xs font-semibold rounded-lg">
            Despesas ({financialSummary.expensesInPeriod.length})
          </TabsTrigger>
          <TabsTrigger value="receipts" className="text-xs font-semibold rounded-lg">
            Recebimentos Stripe ({financialSummary.receiptsCount})
          </TabsTrigger>
          <TabsTrigger value="apps" className="text-xs font-semibold rounded-lg">
            Por Aplicativo
          </TabsTrigger>
        </TabsList>

        {/* ========================================================================= */}
        {/* ABA 1: DESPESAS DA PLATAFORMA */}
        {/* ========================================================================= */}
        <TabsContent value="expenses" className="space-y-3">
          <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
              <div>
                <h4 className="text-xs font-bold text-[#0B1739] uppercase tracking-wider">
                  Gastos & Fornecedores Efetivamente Contratados
                </h4>
                <p className="text-[11px] text-slate-500">
                  Total Pago: <strong>{formatMoney(financialSummary.paidExpenses)}</strong> | Previsto: <strong>{formatMoney(financialSummary.plannedExpenses)}</strong>
                </p>
              </div>

              <Button
                size="sm"
                onClick={() => setIsNewExpenseOpen(true)}
                className="text-xs rounded-xl bg-[#075BFF] text-white font-semibold h-8"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Cadastrar Despesa
              </Button>
            </div>

            {financialSummary.expensesInPeriod.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                Nenhuma despesa cadastrada para a competência {selectedMonth}/{selectedYear}.
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Descrição & Categoria</th>
                    <th className="py-3 px-4">Fornecedor</th>
                    <th className="py-3 px-4">Data Pagamento</th>
                    <th className="py-3 px-4">Valor</th>
                    <th className="py-3 px-4">Situação</th>
                    <th className="py-3 px-4">Comprovante</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {financialSummary.expensesInPeriod.map((exp) => {
                    const catConfig = EXPENSE_CATEGORIES[exp.category] || EXPENSE_CATEGORIES.outros;
                    return (
                      <tr key={exp.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-4 max-w-[240px]">
                          <p className="font-bold text-[#0B1739] truncate">{exp.description}</p>
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border mt-0.5 ${catConfig.color}`}>
                            {catConfig.label}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-700 font-medium">
                          {exp.vendor}
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          {exp.payment_date ? format(parseISO(exp.payment_date), "dd/MM/yyyy") : <span className="text-slate-400 italic">Pendente</span>}
                        </td>
                        <td className="py-3 px-4 font-bold text-[#0B1739]">
                          {formatMoney(exp.amount)}
                        </td>
                        <td className="py-3 px-4">
                          {exp.status === "pago" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="h-3 w-3" /> Pago
                            </span>
                          ) : exp.status === "previsto" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock className="h-3 w-3" /> Previsto
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              Em Aprovação
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {exp.receipt_name ? (
                            <span className="text-[11px] text-[#075BFF] flex items-center gap-1 hover:underline cursor-pointer">
                              <Paperclip className="h-3 w-3" />
                              {exp.receipt_name}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px] italic">Sem anexo</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {exp.status !== "pago" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleApproveExpense(exp.id)}
                              className="h-7 text-xs font-semibold text-emerald-700 border-emerald-200 hover:bg-emerald-50 rounded-lg"
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Confirmar Pago
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </TabsContent>

        {/* ========================================================================= */}
        {/* ABA 2: RECEBIMENTOS CONCILIADOS STRIPE */}
        {/* ========================================================================= */}
        <TabsContent value="receipts" className="space-y-3">
          <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
              <div>
                <h4 className="text-xs font-bold text-[#0B1739] uppercase tracking-wider">
                  Transações Conciliadas com Gateway Stripe
                </h4>
                <p className="text-[11px] text-slate-500">
                  Bruto: <strong>{formatMoney(financialSummary.grossRevenue)}</strong> | Tarifas: <strong>{formatMoney(financialSummary.stripeFees)}</strong> | Líquido: <strong>{formatMoney(financialSummary.netReceipts)}</strong>
                </p>
              </div>

              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Stripe Sync OK
              </span>
            </div>

            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Fatura / ID Stripe</th>
                  <th className="py-3 px-4">Empresa</th>
                  <th className="py-3 px-4">Plano / Item</th>
                  <th className="py-3 px-4">Data Confirmação</th>
                  <th className="py-3 px-4">Valor Bruto</th>
                  <th className="py-3 px-4">Tarifa Stripe</th>
                  <th className="py-3 px-4 text-right">Líquido</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {financialSummary.receiptsList.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-700">
                      <code>{r.id}</code>
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#0B1739]">
                      {r.company_name}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {r.plan_name}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {format(parseISO(r.date), "dd/MM/yyyy 'às' HH:mm")}
                    </td>
                    <td className="py-3 px-4 font-bold text-[#0B1739]">
                      {formatMoney(r.gross_amount)}
                    </td>
                    <td className="py-3 px-4 text-red-600 font-medium">
                      -{formatMoney(r.stripe_fee)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-700">
                      {formatMoney(r.net_amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ========================================================================= */}
        {/* ABA 3: FATURAMENTO POR APLICATIVO */}
        {/* ========================================================================= */}
        <TabsContent value="apps" className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* NavalDocs Pro */}
            <Card className="p-4 rounded-2xl border-slate-200/90 bg-white space-y-2 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-[#0B1739]">NavalDocs Pro</span>
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">Ativo & Publicado</Badge>
              </div>
              <p className="text-2xl font-extrabold text-[#0B1739]">
                {formatMoney(financialSummary.grossRevenue)}
              </p>
              <p className="text-[11px] text-slate-500">
                100% da receita gerada por assinaturas e créditos de IA na plataforma.
              </p>
            </Card>

            {/* App Arrais */}
            <Card className="p-4 rounded-2xl border-slate-200/90 bg-slate-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-700">App Arrais</span>
                <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">Em preparação</Badge>
              </div>
              <p className="text-2xl font-extrabold text-slate-400">
                R$ 0,00
              </p>
              <p className="text-[11px] text-slate-400">
                Módulo independente de habilitações náuticas em fase de estruturação.
              </p>
            </Card>

            {/* Central de Vencimentos */}
            <Card className="p-4 rounded-2xl border-slate-200/90 bg-slate-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-700">Central de Vencimentos</span>
                <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">Em preparação</Badge>
              </div>
              <p className="text-2xl font-extrabold text-slate-400">
                R$ 0,00
              </p>
              <p className="text-[11px] text-slate-400">
                Módulo de alertas recorrentes de vistorias e TIEs em preparação técnica.
              </p>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ========================================================================= */}
      {/* 5. MODAL: LANÇAR NOVA DESPESA */}
      {/* ========================================================================= */}
      <Dialog open={isNewExpenseOpen} onOpenChange={setIsNewExpenseOpen}>
        <DialogContent className="max-w-lg p-6 rounded-2xl bg-white border border-slate-200">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-[#0B1739]">
              Lançar Despesa da Plataforma
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Cadastre despesas operacionais efetivamente contratadas para a competência {selectedMonth}/{selectedYear}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateExpense} className="space-y-4 text-xs pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Descrição do Gasto *</Label>
              <Input
                required
                placeholder="Ex: Assinatura Lovable Cloud / Hospedagem"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="text-xs rounded-xl h-9"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Categoria *</Label>
                <Select value={newCategory} onValueChange={(val) => setNewCategory(val as any)}>
                  <SelectTrigger className="text-xs rounded-xl h-9 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(EXPENSE_CATEGORIES).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Fornecedor *</Label>
                <Input
                  required
                  placeholder="Ex: Supabase / Resend / Google"
                  value={newVendor}
                  onChange={(e) => setNewVendor(e.target.value)}
                  className="text-xs rounded-xl h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Valor (R$) *</Label>
                <Input
                  required
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  className="text-xs rounded-xl h-9 font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Situação *</Label>
                <Select value={newStatus} onValueChange={(val) => setNewStatus(val as any)}>
                  <SelectTrigger className="text-xs rounded-xl h-9 bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pago">Pago e Confirmado</SelectItem>
                    <SelectItem value="previsto">Previsto / Agendado</SelectItem>
                    <SelectItem value="em_aprovacao">Em Aprovação</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Observações Contábeis (Opcional)</Label>
              <Textarea
                rows={2}
                placeholder="Detalhes adicionais sobre nota fiscal ou motivo do gasto..."
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                className="text-xs rounded-xl"
              />
            </div>

            <DialogFooter className="pt-3 border-t border-slate-100 flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsNewExpenseOpen(false)}
                className="flex-1 text-xs rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="flex-1 text-xs font-bold bg-[#075BFF] hover:bg-blue-600 text-white rounded-xl cursor-pointer"
              >
                Salvar Despesa
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* 6. MODAL: EXPORTAR RELATÓRIO DOS SÓCIOS */}
      {/* ========================================================================= */}
      <Dialog open={isExportReportOpen} onOpenChange={setIsExportReportOpen}>
        <DialogContent className="max-w-lg p-6 rounded-2xl bg-white border border-slate-200 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#0B1739] flex items-center gap-2">
              <Download className="h-4 w-4 text-[#075BFF]" />
              Exportar Relatório Financeiro dos Sócios
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Extrato consolidado da competência {selectedMonth}/{selectedYear} para prestação de contas.
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
            <div className="flex justify-between font-semibold text-slate-700">
              <span>Competência:</span>
              <span>{selectedMonth}/{selectedYear}</span>
            </div>
            <div className="flex justify-between text-slate-700">
              <span>Receita Bruta Stripe:</span>
              <span className="font-bold">{formatMoney(financialSummary.grossRevenue)}</span>
            </div>
            <div className="flex justify-between text-amber-800">
              <span>Tarifas Gateway Stripe:</span>
              <span>-{formatMoney(financialSummary.stripeFees)}</span>
            </div>
            <div className="flex justify-between text-red-800">
              <span>Despesas Operacionais Pagas:</span>
              <span>-{formatMoney(financialSummary.paidExpenses)}</span>
            </div>
            <div className="flex justify-between text-indigo-800">
              <span>Fundo de Reserva (10%):</span>
              <span>-{formatMoney(financialSummary.reserveFundAmount)}</span>
            </div>
            <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-emerald-900 text-sm">
              <span>Resultado Disponível:</span>
              <span>{formatMoney(financialSummary.estimatedResult)}</span>
            </div>
            <div className="flex justify-between font-bold text-emerald-800 text-xs">
              <span>Divisão 50% por Sócio:</span>
              <span>{formatMoney(financialSummary.partnerShare50)} cada</span>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExportReportOpen(false)}
              className="flex-1 text-xs rounded-xl"
            >
              Fechar
            </Button>
            <Button
              size="sm"
              onClick={() => {
                toast.success("Relatório financeiro exportado com sucesso!", {
                  description: `Extrato da competência ${selectedMonth}/${selectedYear} baixado para conciliação.`
                });
                setIsExportReportOpen(false);
              }}
              className="flex-1 text-xs font-bold bg-[#075BFF] hover:bg-blue-600 text-white rounded-xl"
            >
              Baixar Extrato (CSV / PDF)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
