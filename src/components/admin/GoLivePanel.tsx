import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, Activity, Database, Cloud, 
  FileText, CreditCard, Globe, Zap, 
  ShieldCheck, RefreshCw, Server, History, AlertTriangle, Settings, ArrowUpCircle, Info, Filter, Plus, Hammer, Trash2, Power
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export function GoLivePanel() {
  const queryClient = useQueryClient();
  const [activeSubTab, setActiveSubTab] = useState<'monitoring' | 'flags' | 'versioning' | 'incidents'>('monitoring');
  const [newFlagName, setNewFlagName] = useState("");

  const { data: flags } = useQuery({
    queryKey: ["admin-feature-flags"],
    queryFn: async () => {
      const { data, error } = await supabase.from("feature_flags").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const { data: version } = useQuery({
    queryKey: ["admin-system-version"],
    queryFn: async () => {
      const { data, error } = await supabase.from("system_settings").select("*").eq("key", "system_version").single();
      if (error) throw error;
      return data?.value;
    }
  });

  const { data: incidents } = useQuery({
    queryKey: ["admin-system-incidents"],
    queryFn: async () => {
      const { data, error } = await supabase.from("system_incidents").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const updateFlagMutation = useMutation({
    mutationFn: async ({ id, is_enabled }: { id: string, is_enabled: boolean }) => {
      const { error } = await supabase.from("feature_flags").update({ is_enabled }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-feature-flags"] });
      toast.success("Feature flag atualizada com sucesso");
    }
  });

  const addFlagMutation = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from("feature_flags").insert([{ name, is_enabled: false }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-feature-flags"] });
      setNewFlagName("");
      toast.success("Feature flag criada");
    }
  });

  const deleteFlagMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("feature_flags").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-feature-flags"] });
      toast.success("Feature flag removida");
    }
  });
  const statusItems = [
    { name: "OCR Processing", status: "Online", icon: Zap, latency: "240ms", color: "text-emerald-500" },
    { name: "PDF Generation", status: "Online", icon: FileText, latency: "450ms", color: "text-emerald-500" },
    { name: "Cloud Storage", status: "Online", icon: Cloud, latency: "85ms", color: "text-emerald-500" },
    { name: "Database Cluster", status: "Online", icon: Database, latency: "12ms", color: "text-emerald-500" },
    { name: "SaaS Billing (MP)", status: "Online", icon: CreditCard, latency: "110ms", color: "text-emerald-500" },
    { name: "Auth Service", status: "Online", icon: ShieldCheck, latency: "45ms", color: "text-emerald-500" },
    { name: "Webhooks Handler", status: "Online", icon: Globe, latency: "15ms", color: "text-emerald-500" },
    { name: "API Gateway", status: "Online", icon: Server, latency: "8ms", color: "text-emerald-500" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-navy uppercase tracking-tighter flex items-center gap-3">
             Painel de Maturidade & Evolução
             <Badge variant="outline" className="border-primary/20 text-primary text-[10px] font-black uppercase">v{version?.major}.{version?.minor}.{version?.patch}</Badge>
          </h2>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 italic">Gestão de Estabilidade, Performance & Feature Flags</p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-xl">
          {[
            { id: 'monitoring', label: 'Monitoring', icon: Activity },
            { id: 'flags', label: 'Feature Flags', icon: Settings },
            { id: 'incidents', label: 'Incidents', icon: AlertTriangle },
            { id: 'versioning', label: 'Versioning', icon: History }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeSubTab === tab.id ? 'bg-navy text-white shadow-lg' : 'text-slate-400 hover:text-navy'}`}
            >
              <tab.icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {activeSubTab === 'monitoring' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {statusItems.map((item, i) => (
              <Card key={i} className="border-slate-100 shadow-sm hover:shadow-md transition-all rounded-2xl overflow-hidden group">
                <CardContent className="p-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center ${item.color} group-hover:scale-110 transition-transform`}>
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{item.name}</p>
                      <p className="text-xs font-black text-navy uppercase">{item.status}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-bold text-slate-300 uppercase leading-none">Latência</p>
                    <p className="text-[10px] font-black text-emerald-600">{item.latency}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-slate-100 shadow-sm rounded-3xl overflow-hidden">
              <CardHeader className="border-b border-slate-50 bg-slate-50/50 p-6">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-black text-navy uppercase tracking-widest">Uptime da Infraestrutura (30 dias)</CardTitle>
                  <RefreshCw className="h-4 w-4 text-slate-300 animate-spin-slow" />
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {[
                  { label: "Core Services", uptime: 99.99, color: "bg-emerald-500" },
                  { label: "AI & OCR Engine", uptime: 99.95, color: "bg-emerald-500" },
                  { label: "Storage & Assets", uptime: 100, color: "bg-emerald-500" },
                  { label: "SaaS Multi-tenant RLS", uptime: 100, color: "bg-emerald-500" },
                ].map((svc, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between items-end">
                      <span className="text-[11px] font-black text-navy uppercase tracking-widest">{svc.label}</span>
                      <span className="text-[11px] font-black text-emerald-600">{svc.uptime}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${svc.color} transition-all duration-1000`} style={{ width: `${svc.uptime}%` }} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-slate-100 shadow-sm rounded-3xl overflow-hidden bg-navy text-white">
              <CardHeader className="p-6 border-b border-white/5">
                 <CardTitle className="text-sm font-black uppercase tracking-widest text-primary">Status Global Controlado</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                 <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full border-2 border-emerald-500 flex items-center justify-center">
                       <Activity className="h-6 w-6 text-emerald-500" />
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Estado Atual</p>
                       <p className="text-lg font-black uppercase">Operationally Mature</p>
                    </div>
                 </div>

                 <div className="space-y-4 pt-4 border-t border-white/5">
                    <div className="flex justify-between items-center">
                       <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Load Average</span>
                       <span className="text-[11px] font-black">0.38</span>
                    </div>
                    <div className="flex justify-between items-center">
                       <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">OCR Error Rate</span>
                       <span className="text-[11px] font-black text-emerald-400">0.02%</span>
                    </div>
                    <div className="flex justify-between items-center">
                       <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">PDF Success Rate</span>
                       <span className="text-[11px] font-black text-emerald-400">99.98%</span>
                    </div>
                 </div>

                 <button className="w-full bg-white/5 hover:bg-white/10 border border-white/10 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all">
                    Ver Telemetria Avançada
                 </button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {activeSubTab === 'flags' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <Card className="lg:col-span-2 border-slate-100 shadow-sm rounded-3xl overflow-hidden">
             <CardHeader className="p-6 border-b border-slate-50">
               <div className="flex items-center justify-between">
                 <CardTitle className="text-sm font-black text-navy uppercase tracking-widest">Central de Feature Flags</CardTitle>
                 <Settings className="h-4 w-4 text-slate-300" />
               </div>
             </CardHeader>
             <CardContent className="p-0">
               <div className="divide-y divide-slate-50">
                 {flags?.map((flag) => (
                   <div key={flag.id} className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                     <div className="flex items-center gap-4">
                       <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${flag.is_enabled ? 'bg-emerald-50 text-emerald-500' : 'bg-slate-50 text-slate-400'}`}>
                         {flag.is_enabled ? <Zap className="h-5 w-5" /> : <Power className="h-5 w-5" />}
                       </div>
                       <div>
                         <p className="text-xs font-black text-navy uppercase tracking-tight">{flag.name}</p>
                         <p className="text-[10px] text-slate-400 font-bold uppercase">{flag.description || 'Controle de módulo/recurso experimental'}</p>
                       </div>
                     </div>
                     <div className="flex items-center gap-4">
                       <Switch 
                         checked={flag.is_enabled} 
                         onCheckedChange={(checked) => updateFlagMutation.mutate({ id: flag.id, is_enabled: checked })}
                       />
                       <Button 
                         variant="ghost" 
                         size="icon" 
                         onClick={() => deleteFlagMutation.mutate(flag.id)}
                         className="text-slate-300 hover:text-red-500"
                       >
                         <Trash2 className="h-4 w-4" />
                       </Button>
                     </div>
                   </div>
                 ))}
                 {(!flags || flags.length === 0) && (
                   <div className="p-10 text-center">
                     <Settings className="h-8 w-8 text-slate-200 mx-auto mb-3" />
                     <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nenhuma feature flag cadastrada</p>
                   </div>
                 )}
               </div>
             </CardContent>
           </Card>

           <Card className="border-slate-100 shadow-sm rounded-3xl overflow-hidden">
             <CardHeader className="p-6 bg-navy text-white">
               <CardTitle className="text-xs font-black uppercase tracking-widest">Adicionar Flag</CardTitle>
               <CardDescription className="text-[10px] text-white/40 uppercase font-bold italic">Rollout controlado de novas funcionalidades.</CardDescription>
             </CardHeader>
             <CardContent className="p-6 space-y-4">
               <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome da Feature (Ex: BETA_OCR_V2)</label>
                 <Input 
                   value={newFlagName}
                   onChange={(e) => setNewFlagName(e.target.value)}
                   className="bg-slate-50 border-slate-100 rounded-xl"
                   placeholder="FEATURE_NAME"
                 />
               </div>
               <Button 
                 onClick={() => addFlagMutation.mutate(newFlagName)}
                 disabled={!newFlagName || addFlagMutation.isPending}
                 className="w-full bg-primary hover:bg-primary/90 text-white font-black text-[10px] uppercase tracking-widest py-6 rounded-2xl"
               >
                 {addFlagMutation.isPending ? "Processando..." : "Criar Feature Flag"}
               </Button>
               <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                    <Info className="h-4 w-4 text-blue-500 mt-0.5" />
                    <p className="text-[10px] font-bold text-blue-700 leading-relaxed uppercase">Flags desativadas por padrão. Ative para teste em QA antes do rollout total.</p>
                  </div>
               </div>
             </CardContent>
           </Card>
        </div>
      )}

      {activeSubTab === 'incidents' && (
        <div className="grid grid-cols-1 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <Card className="border-slate-100 shadow-sm rounded-3xl overflow-hidden">
             <CardHeader className="p-6 border-b border-slate-50 bg-slate-50/50 flex flex-row items-center justify-between">
               <div>
                 <CardTitle className="text-sm font-black text-navy uppercase tracking-widest">Status de Incidentes & Manutenção</CardTitle>
                 <CardDescription className="text-[10px] uppercase font-bold text-slate-400">Histórico de estabilidade operacional</CardDescription>
               </div>
               <Button variant="outline" size="sm" className="font-black text-[9px] uppercase tracking-widest border-slate-200">Relatar Incidente</Button>
             </CardHeader>
             <CardContent className="p-0">
               <div className="divide-y divide-slate-50">
                 {incidents?.map((incident) => (
                   <div key={incident.id} className="p-6 hover:bg-slate-50 transition-colors">
                     <div className="flex items-start justify-between">
                       <div className="flex items-start gap-4">
                         <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${incident.status === 'resolved' ? 'bg-emerald-50 text-emerald-500' : 'bg-amber-50 text-amber-500'}`}>
                           {incident.is_maintenance ? <Hammer className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                         </div>
                         <div>
                           <div className="flex items-center gap-3">
                             <h4 className="text-sm font-black text-navy uppercase tracking-tight">{incident.title}</h4>
                             <Badge className={incident.status === 'resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>{incident.status}</Badge>
                           </div>
                           <p className="text-xs text-slate-500 mt-1">{incident.description}</p>
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
                             {new Date(incident.starts_at).toLocaleString('pt-BR')}
                           </p>
                         </div>
                       </div>
                       <Badge variant="outline" className="border-slate-100 text-slate-400 font-black text-[10px]">{incident.severity}</Badge>
                     </div>
                   </div>
                 ))}
                 {(!incidents || incidents.length === 0) && (
                   <div className="p-20 text-center">
                     <div className="h-16 w-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                       <CheckCircle2 className="h-8 w-8" />
                     </div>
                     <h3 className="text-lg font-black text-navy uppercase">Sistema Impecável</h3>
                     <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Nenhum incidente registrado nos últimos 30 dias.</p>
                   </div>
                 )}
               </div>
             </CardContent>
           </Card>
        </div>
      )}

      {activeSubTab === 'versioning' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <Card className="border-slate-100 shadow-sm rounded-3xl overflow-hidden">
             <CardHeader className="p-8 border-b border-slate-50 text-center">
               <div className="h-20 w-20 bg-primary/10 text-primary rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/10">
                 <History className="h-10 w-10" />
               </div>
               <CardTitle className="text-2xl font-black text-navy uppercase tracking-tighter">Versão Atual: {version?.major}.{version?.minor}.{version?.patch}</CardTitle>
               <Badge className="bg-emerald-500 mt-2">{version?.label || 'Enterprise Certified'}</Badge>
             </CardHeader>
             <CardContent className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Última Release</p>
                    <p className="text-sm font-black text-navy">21 Mai 2026</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status QA</p>
                    <p className="text-sm font-black text-emerald-600 flex items-center gap-2">
                       <CheckCircle2 className="h-4 w-4" /> APROVADO
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                   <h5 className="text-[10px] font-black text-navy uppercase tracking-widest border-b border-slate-100 pb-2">Controle de Rollback</h5>
                   <div className="flex gap-4">
                      <Button variant="outline" className="flex-1 py-8 border-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest group">
                         <Hammer className="h-4 w-4 mr-2 text-slate-400 group-hover:text-primary" /> Rollback v1.4.x
                      </Button>
                      <Button variant="outline" className="flex-1 py-8 border-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-widest group">
                         <ShieldCheck className="h-4 w-4 mr-2 text-slate-400 group-hover:text-emerald-500" /> Snapshot Segurança
                      </Button>
                   </div>
                </div>
             </CardContent>
           </Card>

           <Card className="border-slate-100 shadow-sm rounded-3xl overflow-hidden">
             <CardHeader className="p-6 bg-slate-50 border-b border-slate-100">
               <CardTitle className="text-xs font-black uppercase tracking-widest text-navy">Notas de Release (Changelog)</CardTitle>
             </CardHeader>
             <CardContent className="p-6">
               <div className="space-y-6">
                 <div className="relative pl-8 border-l-2 border-primary/20">
                   <div className="absolute left-[-9px] top-0 h-4 w-4 rounded-full bg-primary border-4 border-white shadow-sm" />
                   <div>
                     <p className="text-xs font-black text-navy uppercase">v1.5.0 - Enterprise Evolution</p>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Hoje</p>
                     <ul className="space-y-1">
                        <li className="text-[11px] text-slate-600 flex items-center gap-2">
                           <div className="h-1 w-1 bg-primary rounded-full" /> Sistema de Feature Flags Enterprise
                        </li>
                        <li className="text-[11px] text-slate-600 flex items-center gap-2">
                           <div className="h-1 w-1 bg-primary rounded-full" /> Painel de Maturidade Operacional
                        </li>
                        <li className="text-[11px] text-slate-600 flex items-center gap-2">
                           <div className="h-1 w-1 bg-primary rounded-full" /> Auditoria Contínua de Segurança
                        </li>
                     </ul>
                   </div>
                 </div>

                 <div className="relative pl-8 border-l-2 border-slate-100">
                   <div className="absolute left-[-9px] top-0 h-4 w-4 rounded-full bg-slate-200 border-4 border-white shadow-sm" />
                   <div>
                     <p className="text-xs font-black text-slate-400 uppercase">v1.4.2 - Polish & Performance</p>
                     <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-2">Ontem</p>
                     <p className="text-[11px] text-slate-400 italic">Correções de performance no motor de OCR e refinamento UI do dashboard.</p>
                   </div>
                 </div>
               </div>
             </CardContent>
           </Card>
        </div>
      )}
    </div>
  );
}
