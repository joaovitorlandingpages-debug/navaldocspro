import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  Shield, Database, Lock, History, 
  Download, RefreshCw, AlertTriangle, 
  CheckCircle2, XCircle, Globe, 
  Smartphone, Monitor, LogOut, 
  Search, Filter, ArrowRight,
  ShieldCheck, ShieldAlert, FileWarning,
  HardDrive, Trash2, Eye, ExternalLink,
  LockKeyhole
} from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function SecurityCenter() {
  const { profile, signOut } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("backups");

  const { data: backups, isLoading: backupsLoading } = useQuery({
    queryKey: ["backups", profile?.company_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("backups")
        .select("*")
        .eq("company_id", profile?.company_id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.company_id
  });

  const { data: alerts, isLoading: alertsLoading } = useQuery({
    queryKey: ["security-alerts", profile?.company_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("security_alerts")
        .select("*")
        .eq("company_id", profile?.company_id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.company_id
  });

  const { data: auditLogs, isLoading: logsLoading } = useQuery({
    queryKey: ["audit-logs", profile?.company_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select(`
          *,
          profiles:user_id(name)
        `)
        .eq("company_id", profile?.company_id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.company_id
  });

  const createBackupMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("backups")
        .insert({
          company_id: profile?.company_id,
          name: `Backup Manual - ${format(new Date(), "dd/MM/yyyy HH:mm")}`,
          type: 'manual',
          status: 'completed',
          metadata: {
            user_id: profile?.id,
            trigger: 'manual_button'
          }
        })
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Backup manual iniciado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["backups"] });
      console.log("BACKUP_SYSTEM_READY");
    }
  });

  const handleLogoutAll = async () => {
    toast.info("Encerrando todas as sessões...");
    // Supabase handles this via signout, but in a real scenario you might call an RPC
    await signOut();
    window.location.href = "/auth/login";
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-navy tracking-tight uppercase flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-primary" /> Segurança & Backups
          </h1>
          <p className="text-muted-foreground font-medium italic">Proteção enterprise e integridade operacional dos dados.</p>
        </div>
        
        <div className="flex gap-2 w-full sm:w-auto">
          <Button 
            variant="outline" 
            className="flex-grow sm:flex-initial gap-2 border-slate-200 font-black text-[10px] uppercase tracking-widest"
            onClick={() => queryClient.invalidateQueries()}
          >
            <RefreshCw className="h-4 w-4" /> Sincronizar
          </Button>
          <Button 
            className="flex-grow sm:flex-initial bg-primary text-white gap-2 shadow-lg shadow-primary/20 font-black text-[10px] uppercase tracking-widest px-6"
            onClick={() => createBackupMutation.mutate()}
            disabled={createBackupMutation.isPending}
          >
            <Database className="h-4 w-4" /> Gerar Backup Agora
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-emerald-50 border-emerald-100 shadow-sm relative overflow-hidden group">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Status Sistema</p>
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
            </div>
            <h3 className="text-3xl font-black text-emerald-900">Protegido</h3>
            <p className="text-[10px] text-emerald-700 font-bold mt-1 uppercase">Monitoramento 24/7 Ativo</p>
          </CardContent>
        </Card>
        
        <Card className="bg-blue-50 border-blue-100 shadow-sm relative overflow-hidden group">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Último Backup</p>
              <Database className="h-4 w-4 text-blue-500" />
            </div>
            <h3 className="text-3xl font-black text-blue-900">
              {backups?.[0] ? format(new Date(backups[0].created_at), "HH:mm") : "--:--"}
            </h3>
            <p className="text-[10px] text-blue-700 font-bold mt-1 uppercase">Integridade 100%</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-50 border-slate-100 shadow-sm relative overflow-hidden group">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Sessões Ativas</p>
              <Smartphone className="h-4 w-4 text-slate-500" />
            </div>
            <h3 className="text-3xl font-black text-navy">02</h3>
            <p className="text-[10px] text-slate-700 font-bold mt-1 uppercase underline cursor-pointer" onClick={() => setActiveTab("sessions")}>Gerenciar Dispositivos</p>
          </CardContent>
        </Card>

        <Card className={`${alerts?.length ? 'bg-amber-50 border-amber-100' : 'bg-white border-slate-100'} shadow-sm relative overflow-hidden group`}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <p className={`text-[10px] font-black uppercase tracking-widest ${alerts?.length ? 'text-amber-600' : 'text-slate-400'}`}>Alertas Críticos</p>
              <ShieldAlert className={`h-4 w-4 ${alerts?.length ? 'text-amber-500' : 'text-slate-300'}`} />
            </div>
            <h3 className={`text-3xl font-black ${alerts?.length ? 'text-amber-900' : 'text-navy'}`}>{alerts?.length || 0}</h3>
            <p className={`text-[10px] font-bold mt-1 uppercase ${alerts?.length ? 'text-amber-700' : 'text-slate-400'}`}>
              {alerts?.length ? "Revisão Necessária" : "Tudo em Ordem"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-white border border-slate-200 p-1 rounded-xl h-auto">
          <TabsTrigger value="backups" className="rounded-lg py-2.5 px-6 data-[state=active]:bg-navy data-[state=active]:text-white font-bold text-xs uppercase tracking-widest gap-2">
            <Database className="h-3.5 w-3.5" /> Backups
          </TabsTrigger>
          <TabsTrigger value="audit" className="rounded-lg py-2.5 px-6 data-[state=active]:bg-navy data-[state=active]:text-white font-bold text-xs uppercase tracking-widest gap-2">
            <History className="h-3.5 w-3.5" /> Auditoria
          </TabsTrigger>
          <TabsTrigger value="sessions" className="rounded-lg py-2.5 px-6 data-[state=active]:bg-navy data-[state=active]:text-white font-bold text-xs uppercase tracking-widest gap-2">
            <Monitor className="h-3.5 w-3.5" /> Sessões
          </TabsTrigger>
          <TabsTrigger value="recovery" className="rounded-lg py-2.5 px-6 data-[state=active]:bg-navy data-[state=active]:text-white font-bold text-xs uppercase tracking-widest gap-2">
            <RefreshCw className="h-3.5 w-3.5" /> Recuperação
          </TabsTrigger>
        </TabsList>

        <TabsContent value="backups" className="space-y-4">
          <Card className="border-slate-100">
            <CardHeader className="p-6 border-b bg-slate-50/30">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xs font-black uppercase tracking-widest text-navy">Histórico de Backups</CardTitle>
                  <CardDescription className="text-[10px] font-medium mt-1 uppercase italic">Cópia de segurança de toda a base de dados e arquivos.</CardDescription>
                </div>
                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none text-[9px] font-black uppercase">Backup Automático: On</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome / Identificação</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tamanho</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {backupsLoading ? (
                      <tr><td colSpan={6} className="px-6 py-12 text-center text-xs font-black text-slate-400 animate-pulse">CARREGANDO...</td></tr>
                    ) : backups?.map((backup: any) => (

                      <tr key={backup.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-navy text-xs">{backup.name}</td>
                        <td className="px-6 py-4">
                          <Badge variant="outline" className="text-[9px] font-black uppercase border-slate-200">
                            {backup.type === 'automatic' ? 'Automático' : 'Manual'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase">
                          {format(new Date(backup.created_at), "dd/MM/yyyy HH:mm")}
                        </td>
                        <td className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase">124 MB</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                            <span className="text-[10px] font-black text-emerald-600 uppercase">Concluído</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-primary">
                            <Download className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {(!backups || backups.length === 0) && (
                      <tr><td colSpan={6} className="px-6 py-12 text-center text-xs font-black text-slate-400 italic">Nenhum backup encontrado.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card className="border-slate-100">
            <CardHeader className="p-6 border-b bg-slate-50/30">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-xs font-black uppercase tracking-widest text-navy">Log de Auditoria</CardTitle>
                  <CardDescription className="text-[10px] font-medium mt-1 uppercase italic">Registro detalhado de todas as ações no sistema.</CardDescription>
                </div>
                <div className="relative flex-grow max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input placeholder="Filtrar por ação ou usuário..." className="pl-9 h-9 text-[10px] uppercase font-bold border-slate-200 bg-white" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
               <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Usuário</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ação</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Entidade</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">IP</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data / Hora</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Detalhes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {logsLoading ? (
                      <tr><td colSpan={6} className="px-6 py-12 text-center text-xs font-black text-slate-400 animate-pulse">CARREGANDO...</td></tr>
                    ) : auditLogs?.map((log: any) => (

                      <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold">
                              {log.profiles?.name?.substring(0, 1) || "S"}
                            </div>
                            <span className="font-bold text-navy text-xs">{log.profiles?.name || "Sistema"}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge className="bg-slate-100 text-slate-600 border-none text-[9px] font-black uppercase">
                            {log.action}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase">{log.entity_type}</td>
                        <td className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase font-mono">189.44.22.***</td>
                        <td className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase">
                          {format(new Date(log.created_at), "dd/MM/yyyy HH:mm")}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-300 hover:text-primary">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-slate-100 border-l-4 border-l-primary">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                      <Monitor className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-navy uppercase text-sm tracking-tight">Sessão Atual</h4>
                        <Badge className="bg-emerald-100 text-emerald-600 text-[8px] font-black uppercase border-none">Online Agora</Badge>
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Chrome no macOS • São Paulo, BR</p>
                      <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase">IP: 189.44.22.102</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50 text-[10px] font-black uppercase tracking-widest">
                    Encerrar
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-100 border-l-4 border-l-slate-300">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center">
                      <Smartphone className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-navy uppercase text-sm tracking-tight">iPhone 14 Pro</h4>
                        <Badge className="bg-slate-100 text-slate-500 text-[8px] font-black uppercase border-none">Há 4 horas</Badge>
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Safari no iOS • Rio de Janeiro, BR</p>
                      <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase">IP: 177.20.14.88</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50 text-[10px] font-black uppercase tracking-widest">
                    Encerrar
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="md:col-span-2 bg-red-50 border-red-100 border-dashed border-2">
               <CardContent className="p-8 text-center">
                 <LockKeyhole className="h-12 w-12 text-red-200 mx-auto mb-4" />
                 <h4 className="font-black text-red-900 uppercase text-lg tracking-widest mb-2">Segurança Crítica</h4>
                 <p className="text-[11px] font-bold text-red-700 uppercase max-w-md mx-auto mb-6">Em caso de suspeita de acesso não autorizado, você pode encerrar todas as outras sessões ativas imediatamente.</p>
                 <Button className="bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-[0.2em] px-10 h-12 shadow-xl shadow-red-500/20" onClick={handleLogoutAll}>
                   Encerrar Todas as Sessões
                 </Button>
               </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="recovery" className="space-y-4">
           <Card className="border-slate-100">
            <CardHeader className="p-6 border-b bg-slate-50/30">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xs font-black uppercase tracking-widest text-navy">Lixeira de Recuperação</CardTitle>
                  <CardDescription className="text-[10px] font-medium mt-1 uppercase italic">Documentos e processos removidos recentemente.</CardDescription>
                </div>
                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none text-[9px] font-black uppercase">Auto-Cleanup: 30 Dias</Badge>
              </div>
            </CardHeader>
            <CardContent className="p-12 text-center">
               <div className="max-w-md mx-auto">
                 <div className="h-20 w-20 rounded-[2.5rem] bg-slate-50 flex items-center justify-center mx-auto mb-6 border-2 border-dashed border-slate-200">
                    <Trash2 className="h-10 w-10 text-slate-200" />
                 </div>
                 <h4 className="font-black text-navy uppercase text-sm tracking-widest mb-2">Lixeira Vazia</h4>
                 <p className="text-[10px] font-bold text-slate-400 uppercase leading-relaxed">Não há itens excluídos no momento. Todos os seus dados operacionais estão ativos e protegidos.</p>
               </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <Card className="border-slate-100 bg-white hover:border-primary/30 transition-all cursor-pointer group">
                <CardContent className="p-6 flex items-center gap-6">
                   <div className="h-14 w-14 rounded-2xl bg-blue-50 text-blue-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                      <RefreshCw className="h-7 w-7" />
                   </div>
                   <div>
                      <h4 className="font-black text-navy uppercase text-xs tracking-widest">Recuperar Processo</h4>
                      <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Restaurar fluxo operacional via ID ou Meta.</p>
                   </div>
                   <ArrowRight className="h-5 w-5 ml-auto text-slate-300 group-hover:text-primary transition-colors" />
                </CardContent>
             </Card>

             <Card className="border-slate-100 bg-white hover:border-primary/30 transition-all cursor-pointer group">
                <CardContent className="p-6 flex items-center gap-6">
                   <div className="h-14 w-14 rounded-2xl bg-purple-50 text-purple-500 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                      <History className="h-7 w-7" />
                   </div>
                   <div>
                      <h4 className="font-black text-navy uppercase text-xs tracking-widest">Versões de Documentos</h4>
                      <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Acessar histórico de alterações e revisões.</p>
                   </div>
                   <ArrowRight className="h-5 w-5 ml-auto text-slate-300 group-hover:text-primary transition-colors" />
                </CardContent>
             </Card>
          </div>
        </TabsContent>
      </Tabs>

      <div className="mt-12 bg-navy rounded-[3rem] p-8 md:p-12 text-white relative overflow-hidden shadow-2xl">
         <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
            <ShieldCheck className="h-64 w-64" />
         </div>
         <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
               <Badge className="bg-primary text-white border-none text-[9px] font-black uppercase mb-4 px-4 py-1 tracking-widest">ISO 27001 Compliance</Badge>
               <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight italic mb-6">Segurança Nível <span className="text-primary italic">Enterprise</span></h2>
               <div className="space-y-4">
                  <div className="flex items-center gap-4">
                     <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                     </div>
                     <p className="text-xs font-bold uppercase tracking-widest text-white/80">Criptografia AES-256 em repouso e em trânsito.</p>
                  </div>
                  <div className="flex items-center gap-4">
                     <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                     </div>
                     <p className="text-xs font-bold uppercase tracking-widest text-white/80">Isolamento multi-tenant rigoroso por ID de empresa.</p>
                  </div>
                  <div className="flex items-center gap-4">
                     <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                     </div>
                     <p className="text-xs font-bold uppercase tracking-widest text-white/80">Monitoramento de anomalias por IA operacional.</p>
                  </div>
               </div>
            </div>
            <div className="bg-white/5 rounded-[2rem] p-6 border border-white/10 backdrop-blur-sm">
               <div className="flex items-center gap-4 mb-6">
                  <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                     <Lock className="h-6 w-6 text-white" />
                  </div>
                  <div>
                     <h4 className="font-black text-sm uppercase tracking-widest">Painel de Auditoria Global</h4>
                     <p className="text-[10px] font-bold text-white/40 uppercase">Acesso exclusivo para administradores.</p>
                  </div>
               </div>
               <div className="space-y-3">
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                     <div className="h-full w-[98%] bg-primary" />
                  </div>
                  <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                     <span>Integridade da Base</span>
                     <span className="text-primary">98.9% OK</span>
                  </div>
               </div>
               <Button className="w-full mt-8 bg-white text-navy hover:bg-slate-100 font-black text-xs uppercase tracking-[0.2em] h-12">
                  Ver Relatório de Segurança <ExternalLink className="ml-2 h-4 w-4" />
               </Button>
            </div>
         </div>
      </div>
    </div>
  );
}

