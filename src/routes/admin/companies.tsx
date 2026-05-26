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
  AlertTriangle 
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

export const Route = createFileRoute("/admin/companies")({
  component: AdminCompanies,
});

function AdminCompanies() {
  const queryClient = useQueryClient();
  const { profile, loading } = useAuth();

  useEffect(() => {
    console.log("COMPANIES_ADMIN_OK");
  }, []);

  if (loading) return null;
  if (profile?.role !== 'admin_master_global' && profile?.role !== 'admin_master' && profile?.email !== 'joaovitor.f0725@gmail.com') {
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
        `);
      if (error) throw error;
      return data;
    }
  });

  const updatePlanMutation = useMutation({
    mutationFn: async ({ companyId, planId }: { companyId: string, planId: string }) => {
      const { error } = await supabase
        .from("subscriptions")
        .upsert({ 
          company_id: companyId, 
          plan_id: planId, 
          status: 'active',
          updated_at: new Date().toISOString()
        }, { onConflict: 'company_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-companies"] });
      toast.success("Plano atualizado manualmente");
    }
  });


  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black text-navy uppercase tracking-tight">Gestão de Empresas</h1>
          <p className="text-slate-500 font-medium">Controle de instâncias e clientes corporativos.</p>
        </div>
        <Button className="bg-primary text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:opacity-90 shadow-lg shadow-primary/20">
          <Plus className="h-4 w-4 mr-2" /> Nova Empresa
        </Button>
      </div>

      <Card className="rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/50">
           <div className="relative flex-grow max-w-md">
              <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
              <Input placeholder="Buscar empresa por nome, CNPJ ou e-mail..." className="pl-12 bg-white border-slate-200 rounded-xl" />
           </div>
           <div className="flex gap-2 w-full md:w-auto">
              <Button variant="outline" className="rounded-xl border-slate-200"><Filter className="h-4 w-4 mr-2" /> Filtros</Button>
              <Button variant="outline" className="rounded-xl border-slate-200"><Download className="h-4 w-4 mr-2" /> Exportar</Button>
           </div>
        </div>

        <div className="overflow-x-auto">
           <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/30 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                   <th className="px-8 py-5">Empresa / ID</th>
                   <th className="px-8 py-5">Plano</th>
                   <th className="px-8 py-5">Status</th>
                   <th className="px-8 py-5">Usuários</th>
                   <th className="px-8 py-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {isLoading ? (
                  <tr><td colSpan={5} className="p-12 text-center italic text-slate-400">Carregando instâncias...</td></tr>
                ) : companies?.map((company: any) => {
                  const sub = company.subscriptions?.[0];
                  const plan = sub?.plan;
                  
                  return (
                    <tr key={company.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-6">
                         <div className="flex items-center gap-4">
                             <div className="h-10 w-10 bg-navy text-white rounded-xl flex items-center justify-center font-bold">
                                {company.name[0]}
                             </div>
                             <div>
                                <p className="font-bold text-navy text-sm">{company.name}</p>
                                <p className="text-[10px] text-slate-400 font-mono uppercase">ID: {company.id.slice(0,8)}</p>
                             </div>
                         </div>
                      </td>
                      <td className="px-8 py-6">
                         <div className="space-y-1">
                            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-black text-[9px] uppercase tracking-widest">
                               {plan?.name || "Sem Plano"}
                            </Badge>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter italic">
                               Ref: {sub?.mercado_pago_subscription_id || "Manual / Sandbox"}
                            </p>
                         </div>
                      </td>
                      <td className="px-8 py-6">
                         <div className="flex items-center gap-2">
                            <div className={`h-1.5 w-1.5 rounded-full ${sub?.status === 'active' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                            <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">{sub?.status || 'Pendente'}</span>
                         </div>
                      </td>
                      <td className="px-8 py-6">
                         <div className="space-y-2">
                            <div className="flex justify-between text-[10px] font-black uppercase text-navy">
                               <span>{company.profiles?.[0]?.count || 0} Usuários</span>
                               <span>Max {plan?.user_limit || '---'}</span>
                            </div>
                            <Progress value={plan?.user_limit ? ((company.profiles?.[0]?.count || 0) / plan.user_limit) * 100 : 0} className="h-1" />
                         </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                         <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase text-primary tracking-widest">
                               <Activity className="h-3 w-3 mr-1" /> Uso
                            </Button>
                            <Button variant="outline" size="sm" className="h-8 rounded-lg text-[9px] font-black uppercase">
                               Gerenciar
                            </Button>
                         </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

           </table>
        </div>
      </Card>

      <div className="p-8 bg-navy text-white rounded-[3rem] shadow-xl relative overflow-hidden group">
         <ShieldCheck className="absolute -right-4 -bottom-4 h-48 w-48 text-white/5 group-hover:scale-110 transition-all duration-500" />
         <div className="relative z-10">
            <h3 className="text-xl font-bold mb-4 uppercase tracking-tighter text-primary">Auditoria de Instâncias</h3>
            <p className="text-sm opacity-60 max-w-2xl leading-relaxed">
               Cada empresa possui sua própria estrutura isolada de banco de dados e buckets de armazenamento. 
               O painel master permite a supervisão técnica sem comprometer a privacidade dos dados navais dos clientes.
            </p>
         </div>
      </div>
    </div>
  );
}
