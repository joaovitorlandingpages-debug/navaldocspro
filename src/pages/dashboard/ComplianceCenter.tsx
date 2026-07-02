import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  ShieldCheck, AlertTriangle, AlertCircle, 
  CheckCircle2, Clock, Search, Filter,
  ChevronRight, ArrowRight, FileWarning,
  Activity, Zap, Shield, Ban, HelpCircle
} from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";

export default function ComplianceCenter() {
  const { profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: complianceStats } = useQuery({
    queryKey: ["compliance-stats", profile?.company_id],
    queryFn: async () => {
      const { data: processes, error } = await supabase
        .from("processes")
        .select("compliance_status, compliance_score")
        .eq("company_id", profile?.company_id);
      
      if (error) throw error;
      
      const total = processes.length;
      const conforme = processes.filter((p: any) => p.compliance_status === 'conforme').length;
      const irregular = processes.filter((p: any) => ['incompleto', 'divergente', 'reprovado'].includes(p.compliance_status)).length;
      const score = total > 0 ? processes.reduce((acc: number, p: any) => acc + (p.compliance_score || 0), 0) / total : 0;
      
      return { total, conforme, irregular, score };
    },
    enabled: !!profile?.company_id
  });

  const { data: criticalIssues } = useQuery({
    queryKey: ["critical-compliance-issues", profile?.company_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("processes")
        .select("*, vessels:vessels!processes_vessel_id_fkey(name), customers:customers!processes_customer_id_fkey(name)")
        .eq("company_id", profile?.company_id)
        .in("compliance_status", ["incompleto", "divergente", "reprovado"])
        .order("created_at", { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.company_id
  });

  const { data: maritimeRules } = useQuery({
    queryKey: ["maritime-rules"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maritime_compliance_rules")
        .select("*")
        .eq("is_active", true);
      
      if (error) throw error;
      return data;
    }
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-navy flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-primary" /> Compliance Center
          </h1>
          <p className="text-muted-foreground font-medium">Monitoramento de conformidade e validação operacional naval.</p>
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" className="flex-grow sm:flex-initial gap-2 border-slate-200">
            <Activity className="h-4 w-4" /> Logs de Auditoria
          </Button>
          <Button className="flex-grow sm:flex-initial bg-primary text-white gap-2 shadow-lg shadow-primary/20">
            <Zap className="h-4 w-4" /> Rodar Validação Geral
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white border-slate-100 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Score de Conformidade</p>
              <Shield className="h-4 w-4 text-primary" />
            </div>
            <h3 className="text-2xl font-bold text-navy">{Math.round(complianceStats?.score || 0)}%</h3>
            <Progress value={complianceStats?.score || 0} className="h-1.5 mt-2" />
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-100 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Processos Conformes</p>
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
            <h3 className="text-2xl font-bold text-navy">{complianceStats?.conforme || 0}</h3>
            <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">Validado pela engine</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-100 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Alertas Críticos</p>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </div>
            <h3 className="text-2xl font-bold text-navy">{complianceStats?.irregular || 0}</h3>
            <p className="text-[10px] text-red-500 font-bold mt-1 uppercase">Bloqueando finalização</p>
          </CardContent>
        </Card>
        <Card className="bg-white border-slate-100 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Regras Ativas</p>
              <Zap className="h-4 w-4 text-amber-500" />
            </div>
            <h3 className="text-2xl font-bold text-navy">{maritimeRules?.length || 0}</h3>
            <p className="text-[10px] text-slate-400 font-bold mt-1 uppercase">Filtros Inteligentes</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="issues" className="space-y-6">
        <TabsList className="bg-white border border-slate-200 p-1 rounded-xl h-auto">
          <TabsTrigger value="issues" className="rounded-lg py-2.5 px-6 data-[state=active]:bg-red-600 data-[state=active]:text-white font-bold text-xs uppercase tracking-widest gap-2">
            <AlertTriangle className="h-4 w-4" /> Irregularidades
          </TabsTrigger>
          <TabsTrigger value="rules" className="rounded-lg py-2.5 px-6 data-[state=active]:bg-navy data-[state=active]:text-white font-bold text-xs uppercase tracking-widest gap-2">
            <Zap className="h-4 w-4" /> Regras Marítimas
          </TabsTrigger>
          <TabsTrigger value="monitor" className="rounded-lg py-2.5 px-6 data-[state=active]:bg-primary data-[state=active]:text-white font-bold text-xs uppercase tracking-widest gap-2">
            <Activity className="h-4 w-4" /> Monitor de Vencimentos
          </TabsTrigger>
          {profile?.role === 'admin_master' && (
            <TabsTrigger value="admin" className="rounded-lg py-2.5 px-6 data-[state=active]:bg-amber-500 data-[state=active]:text-white font-bold text-xs uppercase tracking-widest gap-2">
              <Shield className="h-4 w-4" /> Gestão Master
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="admin" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="border-slate-100 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-black uppercase tracking-widest text-navy">Painel de Controle de Regras Globais</CardTitle>
              <CardDescription className="text-xs">Configure validações obrigatórias e critérios de bloqueio para toda a rede NavalDocs.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100">
                    <h4 className="text-xs font-semibold text-navy mb-4">Políticas de Bloqueio</h4>
                    <div className="space-y-3">
                      {[
                        { label: "Bloquear finalização sem OCR validado", checked: true },
                        { label: "Bloquear geração sem CPF/CNPJ válido", checked: true },
                        { label: "Exigir assinatura digital em procurações", checked: true },
                        { label: "Alertar divergência de nome (Documento vs Cadastro)", checked: true },
                      ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100">
                          <span className="text-xs font-bold text-slate-600">{item.label}</span>
                          <div className={`w-10 h-6 rounded-full p-1 transition-colors ${item.checked ? 'bg-primary' : 'bg-slate-200'}`}>
                            <div className={`w-4 h-4 bg-white rounded-full transition-transform ${item.checked ? 'translate-x-4' : 'translate-x-0'}`} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="p-6 rounded-2xl bg-amber-50/50 border border-amber-100">
                    <h4 className="text-xs font-semibold text-amber-800 mb-4">Critérios de Rigor Operacional</h4>
                    <div className="space-y-4">
                       <p className="text-[10px] text-amber-700 font-medium leading-relaxed italic">
                         Configurações de Admin Master afetam todos os usuários. Alterações aqui são registradas nos logs de auditoria de sistema.
                       </p>
                       <Button className="w-full bg-amber-600 hover:bg-amber-700 text-white font-black uppercase tracking-widest text-[10px] h-11 rounded-xl">
                          Salvar Configurações Master
                       </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="issues">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-grow max-w-md">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input placeholder="Filtrar por processo ou embarcação..." className="pl-10 h-10 bg-white border-slate-200" />
              </div>
              <Button variant="outline" size="sm" className="gap-2 border-slate-200">
                <Filter className="h-4 w-4" /> Prioridade
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {criticalIssues?.map((issue: any) => (
                <Card key={issue.id} className="border-slate-100 group hover:border-red-200 transition-all overflow-hidden">
                  <div className="flex items-center">
                    <div className="w-2 bg-red-500 h-24 sm:h-20" />
                    <div className="p-4 flex-grow grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                      <div className="md:col-span-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Processo</span>
                          <Badge variant="outline" className="text-[9px] font-bold uppercase">{issue.process_type}</Badge>
                        </div>
                        <h4 className="font-bold text-navy truncate">#{issue.id.substring(0, 8).toUpperCase()}</h4>
                      </div>
                      
                      <div className="md:col-span-1">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Embarcação / Cliente</p>
                        <p className="text-xs font-bold text-navy truncate">{issue.vessels?.name || 'N/D'}</p>
                        <p className="text-[10px] text-slate-500 truncate">{issue.customers?.name}</p>
                      </div>

                      <div className="md:col-span-1">
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Divergência Detectada</p>
                        <div className="flex items-center gap-2 text-red-600">
                          <AlertCircle className="h-3.5 w-3.5" />
                          <span className="text-xs font-bold uppercase">{issue.compliance_status}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 italic">
                          {Array.isArray(issue.validation_errors) && issue.validation_errors.length > 0 
                            ? issue.validation_errors[0].message 
                            : 'Múltiplas inconsistências detectadas'}
                        </p>
                      </div>

                      <div className="md:col-span-1 flex justify-end gap-2">
                        <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-full hover:bg-red-50 text-red-600">
                           <Ban className="h-4 w-4" />
                        </Button>
                        <Button size="sm" className="bg-navy hover:bg-navy/90 text-white font-bold text-[9px] uppercase tracking-widest px-4 h-9 gap-2">
                           Corrigir <ArrowRight className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}

              {criticalIssues?.length === 0 && (
                <div className="py-20 flex flex-col items-center justify-center text-slate-400 bg-emerald-50/50 rounded-3xl border-2 border-dashed border-emerald-100">
                  <CheckCircle2 className="h-16 w-16 mb-4 text-emerald-500 opacity-20" />
                  <h3 className="text-lg font-bold text-emerald-900">100% em Conformidade</h3>
                  <p className="text-xs max-w-xs text-center mt-1 font-medium text-emerald-700">Não há irregularidades críticas bloqueando processos no momento.</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="rules">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {maritimeRules?.map((rule: any) => (
              <Card key={rule.id} className="border-slate-100 hover:shadow-lg transition-all">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant={rule.required_action === 'block_process' ? 'destructive' : 'secondary'} className="text-[9px] uppercase font-black tracking-widest">
                      {rule.required_action}
                    </Badge>
                    <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                      <Zap className="h-4 w-4" />
                    </div>
                  </div>
                  <CardTitle className="text-sm font-bold text-navy">{rule.rule_name}</CardTitle>
                  <CardDescription className="text-xs leading-relaxed">{rule.rule_description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-2">Lógica de Ativação</p>
                    <div className="flex items-center gap-2">
                      <code className="text-[10px] font-bold text-navy bg-white px-2 py-1 rounded border border-slate-200">
                        {rule.condition_logic.field} {rule.condition_logic.operator} {rule.condition_logic.value.toString()}
                      </code>
                    </div>
                  </div>
                  <div className="mt-4 flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status: Ativa</span>
                    <Button variant="ghost" size="sm" className="h-8 text-[9px] font-black uppercase tracking-widest">Editar</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            <Card className="border-dashed border-2 border-slate-200 hover:bg-slate-50 cursor-pointer flex flex-col items-center justify-center py-10 transition-all">
              <Plus className="h-8 w-8 text-slate-300 mb-2" />
              <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Nova Regra de Conformidade</p>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Plus({ className, ...props }: any) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}
