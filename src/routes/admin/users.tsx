import { createFileRoute, Navigate } from "@tanstack/react-router";
import { 
  Users as UsersIcon, 
  Search, 
  MoreVertical, 
  ShieldCheck, 
  Mail, 
  Briefcase, 
  Plus, 
  Filter, 
  Edit2, 
  Ban, 
  CheckCircle,
  Building
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

export const Route = createFileRoute("/admin/users")({
  component: AdminUsers,
});

function AdminUsers() {
  const { profile, loading } = useAuth();

  useEffect(() => {
    console.log("GLOBAL_USERS_OK");
    console.log("MASTER_ADMIN_READY");
  }, []);

  if (loading) return null;
  if (profile?.role !== 'admin_master_global' && profile?.email !== 'joaovitor.f0725@gmail.com') {
    return <Navigate to="/dashboard-v2" />;
  }

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          *,
          company:companies(
            name,
            subscriptions(
              plan:plans(name)
            )
          )
        `);
      if (error) throw error;
      return data;
    }
  });


  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
       <div className="flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-white">Gestão de Usuários</h2>
            <p className="text-slate-500 font-mono text-xs italic">Diretório master de credenciais e permissões.</p>
          </div>
          <button className="bg-red-500 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-red-600 transition-all shadow-lg shadow-red-500/20">
             <Plus className="h-4 w-4" /> Novo Usuário
          </button>
       </div>

       <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-md">
          <div className="p-6 border-b border-white/10 flex flex-col md:flex-row gap-4 items-center justify-between bg-black/20">
             <div className="relative w-full md:max-w-md">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <input placeholder="Filtrar por nome, email, empresa ou role..." className="w-full bg-black/40 border-white/5 pl-10 pr-4 py-3 rounded-xl text-sm text-slate-200 outline-none focus:ring-1 focus:ring-red-500 transition-all" />
             </div>
             <div className="flex gap-2">
                <button className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-xs font-bold hover:bg-white/10 transition-all flex items-center gap-2">
                   <Filter className="h-4 w-4" /> Filtros
                </button>
                <div className="h-10 w-[1px] bg-white/10 mx-2 hidden md:block" />
                <div className="flex bg-black/40 rounded-xl p-1 border border-white/5">
                   <button className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase bg-red-500 text-white">Todos</button>
                   <button className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase text-slate-500 hover:text-slate-300">Empresas</button>
                   <button className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase text-slate-500 hover:text-slate-300">Staff</button>
                </div>
             </div>
          </div>

          <div className="overflow-x-auto">
             <table className="w-full text-left">
                <thead>
                   <tr className="bg-black/20 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-white/5">
                      <th className="px-6 py-4">USUÁRIO</th>
                      <th className="px-6 py-4">ROLE / PERFIL</th>
                      <th className="px-6 py-4">EMPRESA / PLANO</th>
                      <th className="px-6 py-4">STATUS</th>
                      <th className="px-6 py-4 text-right">AÇÕES</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm">
                    {isLoading ? (
                      <tr><td colSpan={5} className="p-12 text-center italic text-slate-500">Carregando usuários global...</td></tr>
                    ) : users?.map((u: any, i: number) => {
                      const planName = u.company?.subscriptions?.[0]?.plan?.name || "Sem Plano";
                      
                      return (
                        <tr key={i} className="hover:bg-white/5 transition-colors group">
                           <td className="px-6 py-5">
                              <div className="flex items-center gap-4">
                                 <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-red-500/20 to-red-500/5 flex items-center justify-center text-red-500 font-black border border-red-500/20">
                                    {u.name?.substring(0,2).toUpperCase() || "ND"}
                                 </div>
                                 <div>
                                    <p className="font-bold text-slate-200">{u.name}</p>
                                    <p className="text-xs text-slate-500 font-mono">{u.email}</p>
                                 </div>
                              </div>
                           </td>
                           <td className="px-6 py-5">
                              <Badge variant="outline" className="border-red-500/20 text-red-400 font-mono text-[10px] uppercase font-bold">
                                {u.role?.toUpperCase()}
                              </Badge>
                           </td>
                           <td className="px-6 py-5">
                              <p className="font-medium text-slate-300 flex items-center gap-2">
                                <Building className="h-3 w-3 opacity-40" /> {u.company?.name || "Nenhuma"}
                              </p>
                              <p className="text-[10px] text-slate-500 font-black uppercase tracking-tighter">{planName} PLAN</p>
                           </td>
                           <td className="px-6 py-5">
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 w-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                                <span className="text-[10px] font-black uppercase text-green-500">
                                   ATIVO
                                </span>
                              </div>
                           </td>
                           <td className="px-6 py-5 text-right">
                              <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                 <button title="Editar" className="p-2 bg-white/5 hover:bg-blue-500/20 rounded-lg text-slate-400 hover:text-blue-400 transition-all">
                                    <Edit2 className="h-3.5 w-3.5" />
                                 </button>
                                 <button title="Bloquear" className="p-2 bg-white/5 hover:bg-red-500/20 rounded-lg text-slate-400 hover:text-red-500 transition-all">
                                    <Ban className="h-3.5 w-3.5" />
                                 </button>
                                 <button className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400">
                                    <MoreVertical className="h-3.5 w-3.5" />
                                 </button>
                              </div>
                           </td>
                        </tr>
                      );
                    })}

                </tbody>
             </table>
          </div>
       </div>
    </div>
  );
}
