import { createFileRoute } from "@tanstack/react-router";
import { Users as UsersIcon, Search, MoreVertical, ShieldCheck, Mail, Briefcase, Plus, Filter, Edit2, Ban, CheckCircle } from "lucide-react";

export const Route = createFileRoute("/admin/users")({
  component: AdminUsers,
});

function AdminUsers() {
  const users = [
    { name: "Ricardo Almeida", email: "ricardo@almeida.com", role: "admin_master", company: "Almeida Naval", plan: "Pro", status: "Ativo" },
    { name: "Juliana Costa", email: "juliana@despachos.com", role: "despachante", company: "Costa Maritime", plan: "Enterprise", status: "Ativo" },
    { name: "Marcos Silveira", email: "marcos@marinha.com", role: "empresa", company: "Marinha Mercante", plan: "Free Trial", status: "Pendente" },
    { name: "Ana Beatriz", email: "ana@eng.pro", role: "engenheiro", company: "Freelance", plan: "Individual", status: "Inativo" },
  ];

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
                   {users.map((u, i) => (
                     <tr key={i} className="hover:bg-white/5 transition-colors group">
                        <td className="px-6 py-5">
                           <div className="flex items-center gap-4">
                              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-red-500/20 to-red-500/5 flex items-center justify-center text-red-500 font-black border border-red-500/20">
                                 {u.name.substring(0,2).toUpperCase()}
                              </div>
                              <div>
                                 <p className="font-bold text-slate-200">{u.name}</p>
                                 <p className="text-xs text-slate-500 font-mono">{u.email}</p>
                              </div>
                           </div>
                        </td>
                        <td className="px-6 py-5">
                           <span className="px-2 py-1 bg-white/5 border border-white/5 rounded-lg font-mono text-[10px] text-red-400 font-bold">
                             {u.role.toUpperCase()}
                           </span>
                        </td>
                        <td className="px-6 py-5">
                           <p className="font-medium text-slate-300">{u.company}</p>
                           <p className="text-[10px] text-slate-500 font-black uppercase tracking-tighter">{u.plan} PLAN</p>
                        </td>
                        <td className="px-6 py-5">
                           <div className="flex items-center gap-2">
                             <div className={`h-1.5 w-1.5 rounded-full ${
                               u.status === 'Ativo' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 
                               u.status === 'Pendente' ? 'bg-yellow-500' : 'bg-slate-600'
                             }`} />
                             <span className={`text-[10px] font-black uppercase ${
                               u.status === 'Ativo' ? 'text-green-500' : 
                               u.status === 'Pendente' ? 'text-yellow-500' : 'text-slate-500'
                             }`}>
                                {u.status}
                             </span>
                           </div>
                        </td>
                        <td className="px-6 py-5">
                           <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                              <button title="Editar" className="p-2 bg-white/5 hover:bg-blue-500/20 rounded-lg text-slate-400 hover:text-blue-400 transition-all">
                                 <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button title={u.status === 'Inativo' ? 'Ativar' : 'Bloquear'} className={`p-2 bg-white/5 rounded-lg transition-all ${
                                u.status === 'Inativo' ? 'hover:bg-green-500/20 text-slate-400 hover:text-green-500' : 'hover:bg-red-500/20 text-slate-400 hover:text-red-500'
                              }`}>
                                 {u.status === 'Inativo' ? <CheckCircle className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
                              </button>
                              <button className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400">
                                 <MoreVertical className="h-3.5 w-3.5" />
                              </button>
                           </div>
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
