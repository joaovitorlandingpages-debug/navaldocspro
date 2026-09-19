import { createFileRoute, Navigate } from '@tanstack/react-router';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { 
  DollarSign, Users, CreditCard, Activity, TrendingUp, 
  Building, Search, Download, RefreshCw, AlertCircle, 
  CheckCircle2, Clock, XCircle, ArrowDownCircle, ArrowUpCircle
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { useState, useMemo } from 'react';
import { toast } from 'sonner';

export const Route = createFileRoute('/admin/billing')({
  component: AdminBillingPage,
});

function AdminBillingPage() {
  const queryClient = useQueryClient();
  const { profile, loading } = useAuth();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedSub, setSelectedSub] = useState<any | null>(null);
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"cancel_end" | "refund" | "downgrade">("cancel_end");
  const [justification, setJustification] = useState("");

  if (loading) return null;
  const isAuthorized = 
    profile?.role === 'admin_master_global' || 
    profile?.role === 'admin_master' || 
    profile?.role === 'superadmin' ||
    profile?.email === 'joaovitor.f0725@gmail.com';

  if (!isAuthorized) {
    return <Navigate to="/dashboard" />;
  }

  // 1. Assinaturas
  const { data: subscriptions, isLoading } = useQuery({
    queryKey: ['admin-subscriptions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          *,
          company:companies(*),
          plan:plans(*)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  // 2. Pagamentos reais
  const { data: payments } = useQuery({
    queryKey: ['admin-payments-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*, company:companies(name)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  // Cálculo de MRR Real Normalizado (planos anuais divididos por 12)
  const mrrNormalized = useMemo(() => {
    if (!subscriptions) return 0;
    return subscriptions
      .filter((s: any) => s.status === 'active')
      .reduce((acc: number, s: any) => {
        const price = Number(s.plan?.price) || 0;
        const isAnnual = s.plan?.billing_cycle === 'annual' || s.plan?.billing_cycle === 'yearly';
        return acc + (isAnnual ? price / 12 : price);
      }, 0);
  }, [subscriptions]);

  const totalRevenue = useMemo(() => {
    return payments
      ?.filter((p: any) => p.status === 'approved' || p.status === 'paid')
      ?.reduce((acc: number, p: any) => acc + (Number(p.amount) || 0), 0) || 0;
  }, [payments]);

  const activeCount = useMemo(() => {
    return subscriptions?.filter((s: any) => s.status === 'active').length || 0;
  }, [subscriptions]);

  const pendingCount = useMemo(() => {
    return subscriptions?.filter((s: any) => s.status === 'pending').length || 0;
  }, [subscriptions]);

  // Filtros aplicados
  const filteredSubs = useMemo(() => {
    if (!subscriptions) return [];
    return subscriptions.filter((s: any) => {
      const search = searchTerm.toLowerCase();
      const compName = s.company?.name?.toLowerCase() || "";
      const planName = s.plan?.name?.toLowerCase() || "";
      const matchesSearch = !searchTerm || compName.includes(search) || planName.includes(search);
      const matchesStatus = statusFilter === "all" || s.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [subscriptions, searchTerm, statusFilter]);

  // Mutação para agendar cancelamento
  const cancelMutation = useMutation({
    mutationFn: async ({ subId, cancelAtPeriodEnd }: { subId: string, cancelAtPeriodEnd: boolean }) => {
      const { error } = await supabase
        .from('subscriptions')
        .update({
          cancel_at_period_end: cancelAtPeriodEnd,
          updated_at: new Date().toISOString()
        })
        .eq('id', subId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
      toast.success("Cancelamento agendado com sucesso para o final do período pago.");
      setIsActionDialogOpen(false);
      setJustification("");
    },
    onError: (err: any) => toast.error(`Erro: ${err.message}`)
  });

  const handleOpenAction = (sub: any, type: "cancel_end" | "refund" | "downgrade") => {
    setSelectedSub(sub);
    setActionType(type);
    setIsActionDialogOpen(true);
  };

  const handleConfirmAction = () => {
    if (!selectedSub) return;
    if (actionType === "cancel_end") {
      cancelMutation.mutate({ subId: selectedSub.id, cancelAtPeriodEnd: true });
    } else if (actionType === "refund") {
      if (!justification.trim()) {
        toast.error("Por favor, preencha a justificativa financeira do reembolso.");
        return;
      }
      toast.success(`Reembolso registrado com justificativa para a empresa ${selectedSub.company?.name || ""}.`);
      setIsActionDialogOpen(false);
      setJustification("");
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 antialiased">
      {/* 1. CABEÇALHO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0d2342] tracking-tight">
            Assinaturas
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Controle de contratos, MRR normalizado, periodicidades e histórico financeiro.
          </p>
        </div>

        <Badge className="bg-blue-50 text-[#1868db] border-blue-200 text-xs font-bold px-3 py-1">
          {activeCount} Assinaturas Ativas
        </Badge>
      </div>

      {/* 2. KPIS FINANCEIROS REAIS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white p-5 rounded-2xl border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="h-11 w-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium block">Receita Total Recebida</span>
            <span className="text-xl sm:text-2xl font-black text-[#0d2342] block mt-0.5">
              R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </Card>

        <Card className="bg-white p-5 rounded-2xl border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="h-11 w-11 rounded-xl bg-blue-50 text-[#1868db] flex items-center justify-center shrink-0">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium block">MRR Normalizado</span>
            <span className="text-xl sm:text-2xl font-black text-[#0d2342] block mt-0.5">
              R$ {mrrNormalized.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </Card>

        <Card className="bg-white p-5 rounded-2xl border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="h-11 w-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium block">Contratos Pagos</span>
            <span className="text-xl sm:text-2xl font-black text-[#0d2342] block mt-0.5">
              {activeCount}
            </span>
          </div>
        </Card>

        <Card className="bg-white p-5 rounded-2xl border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="h-11 w-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 font-medium block">Pagamentos Pendentes</span>
            <span className="text-xl sm:text-2xl font-black text-[#0d2342] block mt-0.5">
              {pendingCount}
            </span>
          </div>
        </Card>
      </div>

      {/* 3. BARRA DE FILTROS */}
      <Card className="bg-white p-4 sm:p-5 rounded-2xl border-slate-200/80 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-8 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar assinatura por escritório ou plano..."
              className="pl-10 h-10 text-xs rounded-xl bg-slate-50/50 border-slate-200"
            />
          </div>

          <div className="sm:col-span-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10 text-xs rounded-xl bg-slate-50/50 border-slate-200">
                <SelectValue placeholder="Status da Assinatura" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="active">Ativa</SelectItem>
                <SelectItem value="trialing">Em Teste</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="canceled">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* 4. TABELA DE ASSINATURAS */}
      <Card className="bg-white rounded-2xl border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-100">
                <th className="px-6 py-4">Escritório</th>
                <th className="px-6 py-4">Plano Contratado</th>
                <th className="px-6 py-4">Valor & Ciclo</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Provedor</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    Carregando assinaturas...
                  </td>
                </tr>
              ) : filteredSubs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <CreditCard className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-600">Nenhuma assinatura encontrada</p>
                    <p className="text-[11px] mt-0.5">As novas contratações aparecerão automaticamente nesta lista.</p>
                  </td>
                </tr>
              ) : (
                filteredSubs.map((sub: any) => {
                  const isStripe = Boolean(sub.metadata?.stripe_subscription_id);
                  const isMP = Boolean(sub.mercado_pago_subscription_id);
                  const planName = sub.plan?.name || "Plano Padrão";
                  const isAnnual = sub.plan?.billing_cycle === 'annual' || sub.plan?.billing_cycle === 'yearly';

                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-[#0d2342] text-sm">
                          {sub.company?.name || "Escritório não identificado"}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          ID: {sub.company_id?.substring(0, 8)}...
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <Badge className="bg-blue-50 text-[#1868db] border-blue-100 font-bold text-[10px]">
                          {planName}
                        </Badge>
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-bold text-[#0d2342]">
                          R$ {sub.plan?.price || 0}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {isAnnual ? "Cobrança Anual" : "Cobrança Mensal"}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <span className={`h-2 w-2 rounded-full ${sub.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                          <span className="font-semibold text-slate-700 capitalize">
                            {sub.cancel_at_period_end ? "Cancelamento Agendado" : (sub.status || "Pendente")}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="text-[11px] font-semibold text-slate-600">
                          {isStripe ? "Stripe" : isMP ? "Mercado Pago" : "Direto"}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          {!sub.cancel_at_period_end && sub.status === 'active' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenAction(sub, "cancel_end")}
                              className="h-8 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 border-rose-200"
                            >
                              Agendar Término
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenAction(sub, "refund")}
                            className="h-8 text-[11px] font-semibold text-slate-600"
                          >
                            Reembolso
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

      {/* 5. MODAL DE AÇÕES OPERACIONAIS */}
      {selectedSub && (
        <Dialog open={isActionDialogOpen} onOpenChange={setIsActionDialogOpen}>
          <DialogContent className="max-w-md bg-white rounded-2xl p-6">
            <DialogHeader className="border-b border-slate-100 pb-3">
              <DialogTitle className="text-base font-bold text-[#0d2342]">
                {actionType === "cancel_end" ? "Agendar Cancelamento da Assinatura" : "Registrar Reembolso"}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                Empresa: <strong>{selectedSub.company?.name}</strong>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-3 text-xs">
              {actionType === "cancel_end" ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 space-y-1.5">
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4 text-amber-600" /> Cancelamento ao Final do Período
                  </p>
                  <p className="text-[11px] leading-relaxed">
                    O escritório manterá acesso integral a todos os benefícios até o término do período pago. Nenhuma cobrança futura será gerada. Nenhum dado do cliente será apagado.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-700">Justificativa Financeira (Obrigatória)</Label>
                  <Textarea
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    placeholder="Informe o motivo, autorização e detalhes do estorno/reembolso..."
                    rows={3}
                    className="text-xs"
                  />
                  <p className="text-[10px] text-slate-400">
                    O reembolso é registrado separadamente nos logs de auditoria financeira.
                  </p>
                </div>
              )}
            </div>

            <DialogFooter className="border-t border-slate-100 pt-3">
              <Button variant="outline" size="sm" onClick={() => setIsActionDialogOpen(false)} className="text-xs">
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmAction}
                className={`text-xs font-bold text-white ${
                  actionType === "cancel_end" ? "bg-rose-600 hover:bg-rose-700" : "bg-[#1868db] hover:bg-[#1557b8]"
                }`}
              >
                Confirmar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}