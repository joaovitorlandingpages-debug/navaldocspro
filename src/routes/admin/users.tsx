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
  if (!profile?.isAdmin && profile?.role !== 'admin_master' && profile?.role !== 'admin_master_global' && profile?.email !== 'joaovitor.f0725@gmail.com') {
    return <Navigate to="/dashboard" />;
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
            <h1 className="text-3xl font-black text-navy uppercase tracking-tight">Gestão de Usuários</h1>
            <p className="text-slate-500 font-medium italic mt-1">Controle global de credenciais e permissões na plataforma.</p>
          </div>
          <button className="bg-primary text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:opacity-90 transition-all shadow-xl shadow-primary/20">
             <Plus className="h-5 w-5" /> Novo Usuário Master
          </button>
       </div>

       <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
          <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row gap-6 items-center justify-between bg-slate-50/50">
             <div className="relative w-full md:max-w-md">
                <Search className="absolute left-4 top-3 h-4 w-4 text-slate-400" />
                <input placeholder="Buscar por nome, email ou empresa..." className="w-full bg-white border border-slate-200 pl-12 pr-4 py-3 rounded-2xl text-xs text-navy outline-none focus:ring-4 focus:ring-primary/10 transition-all" />
             </div>
             <div className="flex gap-2">
                <button className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-navy hover:bg-slate-50 transition-all flex items-center gap-2">
                   <Filter className="h-4 w-4" /> Filtros Avançados
                </button>
                <div className="h-10 w-[1px] bg-slate-200 mx-2 hidden md:block" />
                <div className="flex bg-slate-100 rounded-2xl p-1 border border-slate-200">
                   <button className="px-5 py-2 rounded-xl text-[9px] font-black uppercase bg-navy text-white shadow-lg">Todos</button>
                   <button className="px-5 py-2 rounded-xl text-[9px] font-black uppercase text-slate-400 hover:text-navy">Empresas</button>
                   <button className="px-5 py-2 rounded-xl text-[9px] font-black uppercase text-slate-400 hover:text-navy">Staff ND</button>
                </div>
             </div>
          </div>

          <div className="overflow-x-auto">
             <table className="w-full text-left">
                <thead>
                   <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] border-b">
                      <th className="px-8 py-5">USUÁRIO</th>
                      <th className="px-8 py-5">ROLE / PERMISSÃO</th>
                      <th className="px-8 py-5">EMPRESA / PLANO</th>
                      <th className="px-8 py-5">STATUS</th>
                      <th className="px-8 py-5 text-right">AÇÕES</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-sm">
                    {isLoading ? (
                      <tr><td colSpan={5} className="p-12 text-center italic text-slate-400">Sincronizando diretório master...</td></tr>
                    ) : users?.map((u: any, i: number) => {
                      const planName = u.company?.subscriptions?.[0]?.plan?.name || "Sem Plano";
                      
                      return (
                        <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                           <td className="px-8 py-6">
                              <div className="flex items-center gap-4">
                                 <div className="h-10 w-10 rounded-2xl bg-slate-100 flex items-center justify-center text-primary font-black border border-slate-200 group-hover:bg-primary group-hover:text-white transition-all shadow-inner">
                                    {u.name?.substring(0,2).toUpperCase() || "ND"}
                                 </div>
                                 <div>
                                    <p className="font-bold text-navy">{u.name}</p>
                                    <p className="text-[10px] text-slate-400 font-mono">{u.email}</p>
                                 </div>
                              </div>
                           </td>
                           <td className="px-6 py-5">
                              <Badge variant="outline" className="border-primary/20 text-primary bg-primary/5 font-black text-[9px] uppercase tracking-widest px-2.5 py-1 rounded-lg">
                                {u.role?.toUpperCase()}
                              </Badge>
                           </td>
                           <td className="px-6 py-5">
                              <p className="font-bold text-navy text-xs flex items-center gap-2">
                                <Building className="h-3 w-3 text-slate-300" /> {u.company?.name || "---"}
                              </p>
                              <p className="text-[9px] text-slate-400 font-black uppercase tracking-tighter mt-1">{planName} LEVEL</p>
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
                                 <button title="Editar" className="p-2.5 bg-slate-50 hover:bg-primary/10 rounded-xl text-slate-400 hover:text-primary transition-all shadow-sm">
                                    <Edit2 className="h-4 w-4" />
                                 </button>
                                 <button title="Bloquear" className="p-2.5 bg-slate-50 hover:bg-rose-100 rounded-xl text-slate-400 hover:text-rose-600 transition-all shadow-sm">
                                    <Ban className="h-4 w-4" />
                                 </button>
                                 <button className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-slate-400 transition-all shadow-sm">
                                    <MoreVertical className="h-4 w-4" />
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
