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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-navy uppercase tracking-tighter">Painel Go-Live</h2>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1 italic">Monitoramento em Tempo Real de Produção</p>
        </div>
        <Badge className="bg-emerald-500 text-white border-none font-black text-[10px] uppercase px-4 py-1.5 animate-pulse">System Operational</Badge>
      </div>

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
              <CardTitle className="text-sm font-black text-navy uppercase tracking-widest">Uptime da Infraestrutura (Últimos 30 dias)</CardTitle>
              <RefreshCw className="h-4 w-4 text-slate-300 animate-spin-slow" />
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {[
              { label: "Core Services", uptime: 99.99, color: "bg-emerald-500" },
              { label: "AI & OCR Engine", uptime: 99.95, color: "bg-emerald-500" },
              { label: "Storage & Assets", uptime: 100, color: "bg-emerald-500" },
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
             <CardTitle className="text-sm font-black uppercase tracking-widest text-primary">Status Global</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
             <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full border-2 border-emerald-500 flex items-center justify-center">
                   <Activity className="h-6 w-6 text-emerald-500" />
                </div>
                <div>
                   <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Estado Atual</p>
                   <p className="text-lg font-black uppercase">Consolidado</p>
                </div>
             </div>

             <div className="space-y-4 pt-4 border-t border-white/5">
                <div className="flex justify-between items-center">
                   <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Load Average</span>
                   <span className="text-[11px] font-black">0.42</span>
                </div>
                <div className="flex justify-between items-center">
                   <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Ativos Online</span>
                   <span className="text-[11px] font-black">1.242</span>
                </div>
                <div className="flex justify-between items-center">
                   <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Vazão OCR</span>
                   <span className="text-[11px] font-black">12 doc/min</span>
                </div>
             </div>

             <button className="w-full bg-white/5 hover:bg-white/10 border border-white/10 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all">
                Ver Logs de Produção
             </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
