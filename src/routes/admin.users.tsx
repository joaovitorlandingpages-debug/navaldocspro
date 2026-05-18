import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users, Search, Filter, 
  UserPlus, MoreVertical, Shield,
  Mail, MapPin
} from "lucide-react";

export const Route = createFileRoute("/admin/users")({
  component: AdminUsers,
});

function AdminUsers() {
  const { data: users, isLoading } = useQuery({
    queryKey: ["admin_users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*, companies(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-navy uppercase tracking-tight">Usuários Global</h1>
          <p className="text-slate-500 font-medium">Gestão de acessos e permissões de toda a plataforma.</p>
        </div>
        <div className="flex gap-4">
           <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input 
                placeholder="Buscar por nome ou e-mail..."
                className="pl-10 pr-4 py-2 bg-white border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
           </div>
           <button className="bg-primary text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-primary/20">
              <UserPlus className="h-4 w-4" /> Criar Usuário
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {isLoading ? (
           <div className="col-span-full py-20 text-center text-slate-400">Carregando usuários...</div>
         ) : (
           users?.map((user: any) => (
             <div key={user.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all group relative">
                <button className="absolute top-6 right-6 p-2 text-slate-300 hover:text-navy transition-all">
                   <MoreVertical className="h-5 w-5" />
                </button>
                
                <div className="flex items-center gap-4 mb-6">
                   <div className="h-14 w-14 rounded-2xl bg-slate-50 flex items-center justify-center text-primary font-black text-xl border border-slate-100 group-hover:bg-primary group-hover:text-white transition-all">
                      {user.name?.substring(0, 2).toUpperCase()}
                   </div>
                   <div>
                      <h4 className="font-bold text-navy truncate pr-8">{user.name}</h4>
                      <p className="text-[10px] font-black uppercase text-primary">{user.role || "User"}</p>
                   </div>
                </div>

                <div className="space-y-3">
                   <div className="flex items-center gap-3 text-xs text-slate-500">
                      <Mail className="h-4 w-4 opacity-40" />
                      <span className="truncate">{user.email}</span>
                   </div>
                   <div className="flex items-center gap-3 text-xs text-slate-500">
                      <Shield className="h-4 w-4 opacity-40" />
                      <span>{user.companies?.name || "Sem Empresa"}</span>
                   </div>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-50 flex justify-between items-center">
                   <span className="text-[10px] font-bold text-slate-400 uppercase">Acesso: {new Date(user.created_at).toLocaleDateString()}</span>
                   <button className="text-[10px] font-black uppercase text-primary hover:underline">Editar Perfil</button>
                </div>
             </div>
           ))
         )}
      </div>
    </div>
  );
}
