import { createFileRoute } from "@tanstack/react-router";
import { Users as UsersIcon, Search, MoreVertical, ShieldCheck, Mail, Briefcase, Plus, Filter } from "lucide-react";

export const Route = createFileRoute("/admin/users")({
  component: AdminUsers,
});

function AdminUsers() {
  const users = [
    { name: "Ricardo Almeida", email: "ricardo@almeida.com", role: "Engenheiro", company: "Almeida Naval", plan: "Pro", status: "Ativo" },
    { name: "Juliana Costa", email: "juliana@despachos.com", role: "Despachante", company: "Costa Maritime", plan: "Enterprise", status: "Ativo" },
    { name: "Marcos Silveira", email: "marcos@marinha.com", role: "Empresa", company: "Marinha Mercante", plan: "Free Trial", status: "Pendente" },
    { name: "Ana Beatriz", email: "ana@eng.pro", role: "Engenheiro", company: "Freelance", plan: "Individual", status: "Inativo" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
       <div className="flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-black tracking-tight">Gestão de Usuários</h2>
            <p className="text-slate-500 font-mono text-xs">Visualização e controle de acessos da plataforma.</p>
          </div>
          <button className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
             <Plus className="h-4 w-4" /> Criar Usuário
          </button>
       </div>

       <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-white/10 flex gap-4">
             <div className="relative flex-grow">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input placeholder="Filtrar por nome, email ou empresa..." className="w-full bg-black/20 border-white/10 pl-10 pr-4 py-2 rounded-lg text-sm focus:ring-1 focus:ring-red-500 outline-none" />
             </div>
             <button className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm hover:bg-white/10">
                <Filter className="h-4 w-4" />
             </button>
          </div>

          <div className="overflow-x-auto">
             <table className="w-full text-left">
                <thead>
                   <tr className="bg-white/5 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                      <th className="px-6 py-4">USUÁRIO</th>
                      <th className="px-6 py-4">PERFIL</th>
                      <th className="px-6 py-4">EMPRESA / PLANO</th>
                      <th className="px-6 py-4">STATUS</th>
                      <th className="px-6 py-4"></th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm">
                   {users.map((u, i) => (
                     <tr key={i} className="hover:bg-white/5 transition-colors group">
                        <td className="px-6 py-4">
                           <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 font-black text-xs">
                                 {u.name.substring(0,2).toUpperCase()}
                              </div>
                              <div>
                                 <p className="font-bold">{u.name}</p>
                                 <p className="text-xs text-slate-500">{u.email}</p>
                              </div>
                           </div>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-slate-400">{u.role}</td>
                        <td className="px-6 py-4">
                           <p className="font-medium">{u.company}</p>
                           <p className="text-[10px] text-red-400 font-black uppercase tracking-tighter">{u.plan}</p>
                        </td>
                        <td className="px-6 py-4">
                           <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                             u.status === 'Ativo' ? 'bg-green-500/10 text-green-500' : 
                             u.status === 'Pendente' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-red-500/10 text-red-500'
                           }`}>
                              {u.status}
                           </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                           <button className="p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreVertical className="h-4 w-4" />
                           </button>
                        </td>
                     </tr>
                   ))}
                </tbody>
             </table>
          </div>
       </div>
    </div>
  );
}
