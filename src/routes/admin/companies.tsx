import { createFileRoute, Navigate } from "@tanstack/react-router";
import { 
  Building, 
  Search, 
  Plus, 
  Filter, 
  Download, 
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
  FileText
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { useState, useMemo } from "react";

export const Route = createFileRoute("/admin/companies")({
  component: AdminCompaniesPage,
});

function AdminCompaniesPage() {
  const queryClient = useQueryClient();
  const { profile, loading } = useAuth();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPlanFilter, setSelectedPlanFilter] = useState("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("all");
  const [selectedCompany, setSelectedCompany] = useState<any | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Permissão de acesso administrativo
  if (loading) return null;
  const isAuthorized = 
    profile?.role === 'admin_master_global' || 
    profile?.role === 'admin_master' || 
    profile?.role === 'superadmin' ||
    profile?.email === 'joaovitor.f0725@gmail.com';

  if (!isAuthorized) {
    return <Navigate to="/dashboard" />;
  }

  const { data: companies, isLoading } = useQuery({
    queryKey: ["admin-companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select(`
          *,
          profiles(count),
          subscriptions(
            *,
            plan:plans(*)
          )
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  // Filtros aplicados no cliente
  const filteredCompanies = useMemo(() => {
    if (!companies) return [];
    return companies.filter((c: any) => {
      const search = searchTerm.toLowerCase();
      const matchesSearch = 
        !searchTerm ||
        c.name?.toLowerCase().includes(search) ||
        c.cnpj?.includes(search) ||
        c.email?.toLowerCase().includes(search) ||
        c.responsible_name?.toLowerCase().includes(search);

      const sub = c.subscriptions?.[0];
      const planName = sub?.plan?.name?.toLowerCase() || "";
      const matchesPlan = 
        selectedPlanFilter === "all" ||
        (selectedPlanFilter === "essencial" && planName.includes("essencial")) ||
        (selectedPlanFilter === "profissional" && planName.includes("profissional")) ||
        (selectedPlanFilter === "equipe" && planName.includes("equipe")) ||
        (selectedPlanFilter === "legado" && !planName.includes("essencial") && !planName.includes("profissional") && !planName.includes("equipe"));

      const isTrial = Boolean(c.is_pilot);
      const isActive = c.is_active !== false;
      const matchesStatus = 
        selectedStatusFilter === "all" ||
        (selectedStatusFilter === "active" && isActive && !isTrial) ||
        (selectedStatusFilter === "trial" && isTrial) ||
        (selectedStatusFilter === "suspended" && !isActive);

      return matchesSearch && matchesPlan && matchesStatus;
    });
  }, [companies, searchTerm, selectedPlanFilter, selectedStatusFilter]);

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ companyId, currentActive }: { companyId: string, currentActive: boolean }) => {
      const { error } = await supabase
        .from("companies")
        .update({ 
          is_active: !currentActive,
          suspended_at: currentActive ? new Date().toISOString() : null,
          suspended_reason: currentActive ? "Suspensão manual pelo administrador" : null,
          updated_at: new Date().toISOString()
        })
        .eq("id", companyId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-companies"] });
      toast.success("Situação do escritório atualizada com sucesso!");
      setIsDetailOpen(false);
    },
    onError: (err: any) => {
      toast.error(`Erro ao atualizar situação: ${err.message}`);
    }
  });

  const handleOpenDetail = (company: any) => {
    setSelectedCompany(company);
    setIsDetailOpen(true);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 antialiased">
      {/* 1. CABEÇALHO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0d2342] tracking-tight">
            Escritórios
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Gestão de escritórios credenciados, consumo, responsáveis técnicos e assinaturas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge className="bg-blue-50 text-[#1868db] border-blue-200 text-xs font-bold px-3 py-1">
            {companies?.length || 0} Escritórios Registrados
          </Badge>
        </div>
      </div>

      {/* 2. BARRA DE FILTROS */}
      <Card className="bg-white p-4 sm:p-5 rounded-2xl border-slate-200/80 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Busca */}
          <div className="sm:col-span-6 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, CNPJ, responsável ou e-mail..."
              className="pl-10 h-10 text-xs rounded-xl bg-slate-50/50 border-slate-200 focus:bg-white"
            />
          </div>

          {/* Filtro de Plano */}
          <div className="sm:col-span-3">
            <Select value={selectedPlanFilter} onValueChange={setSelectedPlanFilter}>
              <SelectTrigger className="h-10 text-xs rounded-xl bg-slate-50/50 border-slate-200">
                <SelectValue placeholder="Plano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Planos</SelectItem>
                <SelectItem value="essencial">Essencial</SelectItem>
                <SelectItem value="profissional">Profissional</SelectItem>
                <SelectItem value="equipe">Equipe</SelectItem>
                <SelectItem value="legado">Planos Legados</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filtro de Situação */}
          <div className="sm:col-span-3">
            <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
              <SelectTrigger className="h-10 text-xs rounded-xl bg-slate-50/50 border-slate-200">
                <SelectValue placeholder="Situação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Situações</SelectItem>
                <SelectItem value="active">Ativo (Pago)</SelectItem>
                <SelectItem value="trial">Em Teste Gratuito</SelectItem>
                <SelectItem value="suspended">Suspenso</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* 3. TABELA DE ESCRITÓRIOS */}
      <Card className="bg-white rounded-2xl border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-100">
                <th className="px-6 py-4">Escritório & Responsável</th>
                <th className="px-6 py-4">Plano Contratado</th>
                <th className="px-6 py-4">Situação</th>
                <th className="px-6 py-4">Equipe / Limite</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    Carregando escritórios...
                  </td>
                </tr>
              ) : filteredCompanies.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    <Building className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-600">Nenhum escritório encontrado</p>
                    <p className="text-[11px] mt-0.5">Ajuste os filtros ou aguarde novas adesões à plataforma.</p>
                  </td>
                </tr>
              ) : (
                filteredCompanies.map((company: any) => {
                  const sub = company.subscriptions?.[0];
                  const plan = sub?.plan;
                  const isTrial = Boolean(company.is_pilot);
                  const isActive = company.is_active !== false;

                  return (
                    <tr 
                      key={company.id} 
                      className="hover:bg-slate-50/60 transition-colors cursor-pointer group"
                      onClick={() => handleOpenDetail(company)}
                    >
                      {/* Nome e Responsável */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-xl bg-blue-50 text-[#1868db] font-bold flex items-center justify-center shrink-0">
                            {company.name?.[0]?.toUpperCase() || "E"}
                          </div>
                          <div>
                            <p className="font-bold text-[#0d2342] text-sm group-hover:text-[#1868db] transition-colors">
                              {company.name}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {company.responsible_name || company.cnpj || "Responsável não informado"}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Plano */}
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <Badge 
                            className={`text-[10px] font-bold px-2 py-0.5 ${
                              plan?.slug === "profissional"
                                ? "bg-blue-50 text-[#1868db] border-blue-100"
                                : "bg-slate-100 text-slate-600 border-none"
                            }`}
                          >
                            {plan?.name || (isTrial ? "Período de Teste" : "Sem Plano")}
                          </Badge>
                          <p className="text-[10px] text-slate-400">
                            {sub?.current_period_end 
                              ? `Renova em: ${new Date(sub.current_period_end).toLocaleDateString("pt-BR")}`
                              : "Cobrança não iniciada"}
                          </p>
                        </div>
                      </td>

                      {/* Situação */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span 
                            className={`h-2 w-2 rounded-full ${
                              !isActive 
                                ? "bg-rose-500" 
                                : isTrial 
                                ? "bg-blue-500" 
                                : "bg-emerald-500"
                            }`} 
                          />
                          <span className="text-xs font-semibold text-slate-700">
                            {!isActive ? "Suspenso" : isTrial ? "Em Teste" : "Ativo"}
                          </span>
                        </div>
                      </td>

                      {/* Usuários */}
                      <td className="px-6 py-4">
                        <div className="space-y-1.5 max-w-[140px]">
                          <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                            <span>{company.profiles?.[0]?.count || 1} membros</span>
                            <span className="text-slate-400">max {plan?.user_limit || 1}</span>
                          </div>
                          <Progress 
                            value={plan?.user_limit ? ((company.profiles?.[0]?.count || 1) / plan.user_limit) * 100 : 30} 
                            className="h-1 bg-slate-100" 
                          />
                        </div>
                      </td>

                      {/* Ações */}
                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenDetail(company)}
                          className="h-8 text-xs font-semibold text-slate-600 hover:text-[#1868db] hover:border-[#1868db]"
                        >
                          Detalhes
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

      {/* 4. MODAL DE DETALHES DO ESCRITÓRIO */}
      {selectedCompany && (
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-xl bg-white rounded-2xl p-6 sm:p-8">
            <DialogHeader className="border-b border-slate-100 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-[#1868db] font-bold text-base">
                    {selectedCompany.name?.[0]?.toUpperCase() || "E"}
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-bold text-[#0d2342]">
                      {selectedCompany.name}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500 mt-0.5">
                      CNPJ: {selectedCompany.cnpj || "Não cadastrado"} • Cidade: {selectedCompany.city || "Não informada"}
                    </DialogDescription>
                  </div>
                </div>

                <Badge 
                  className={`text-[11px] font-bold px-2.5 py-0.5 ${
                    selectedCompany.is_active === false 
                      ? "bg-rose-50 text-rose-700 border-rose-200" 
                      : "bg-emerald-50 text-emerald-700 border-emerald-200"
                  }`}
                >
                  {selectedCompany.is_active === false ? "Suspenso" : "Ativo"}
                </Badge>
              </div>
            </DialogHeader>

            <div className="space-y-4 py-3 text-xs">
              {/* Contatos */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50/70 rounded-xl border border-slate-100">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Responsável</span>
                  <p className="font-semibold text-slate-800 mt-0.5">{selectedCompany.responsible_name || "Não informado"}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">E-mail de Contato</span>
                  <p className="font-semibold text-slate-800 mt-0.5 truncate">{selectedCompany.email || selectedCompany.contact_email || "Não informado"}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Telefone / WhatsApp</span>
                  <p className="font-semibold text-slate-800 mt-0.5">{selectedCompany.phone || selectedCompany.contact_whatsapp || "Não informado"}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Data de Cadastro</span>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {selectedCompany.created_at ? new Date(selectedCompany.created_at).toLocaleDateString("pt-BR") : "---"}
                  </p>
                </div>
              </div>

              {/* Informações da Assinatura */}
              <div className="p-4 bg-blue-50/40 rounded-xl border border-blue-100/70 space-y-2">
                <h4 className="font-bold text-[#0d2342] flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-[#1868db]" /> Dados da Assinatura
                </h4>
                <div className="grid grid-cols-2 gap-2 pt-1 text-slate-700">
                  <p>Plano: <strong>{selectedCompany.subscriptions?.[0]?.plan?.name || (selectedCompany.is_pilot ? "Teste Gratuito" : "Nenhum")}</strong></p>
                  <p>Status Financeiro: <strong>{selectedCompany.subscriptions?.[0]?.status || "Sem cobrança"}</strong></p>
                  <p>Origem da Cobrança: <strong>{selectedCompany.subscriptions?.[0]?.mercado_pago_subscription_id ? "Mercado Pago" : "Stripe"}</strong></p>
                  <p>Identificador: <span className="font-mono text-[11px] text-slate-500">{selectedCompany.id.substring(0, 13)}...</span></p>
                </div>
              </div>
            </div>

            <DialogFooter className="border-t border-slate-100 pt-4 flex-col sm:flex-row gap-2 sm:gap-0 justify-between">
              <Button
                variant={selectedCompany.is_active === false ? "outline" : "destructive"}
                size="sm"
                className="text-xs font-semibold"
                onClick={() => toggleStatusMutation.mutate({ 
                  companyId: selectedCompany.id, 
                  currentActive: selectedCompany.is_active !== false 
                })}
              >
                {selectedCompany.is_active === false ? "Reativar Escritório" : "Suspender Escritório"}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDetailOpen(false)}
                className="text-xs font-semibold"
              >
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
