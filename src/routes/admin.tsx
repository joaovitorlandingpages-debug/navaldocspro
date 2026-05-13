import { createFileRoute } from "@tanstack/react-router";
import { UserPlus, ShieldCheck, Mail, Search, Trash2, MoreVertical, Building, Users } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/admin")({
  component: AdminMasterPage,
});

function AdminMasterPage() {
  const [activeTab, setActiveTab] = useState("empresas");

  const users = [
    { name: "Ricardo Almeida", email: "ricardo@almeida.com", role: "Admin Master", status: "Online", lastAccess: "Agora" },
    { name: "Mariana Souza", email: "mariana@eng.com", role: "Engenheira", status: "Offline", lastAccess: "2h atrás" },
    { name: "João Silva", email: "joao@desp.com", role: "Despachante", status: "Online", lastAccess: "Agora" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-navy tracking-tight uppercase">Painel de Controle Master</h1>
          <p className="text-muted-foreground font-medium">Gestão global de empresas, equipes e licenciamento.</p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-white px-5 py-3 rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-primary/20">
          <UserPlus className="h-4 w-4" /> Convidar Administrador
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: "Empresas Ativas", value: "12", color: "text-blue-600" },
          { label: "Usuários Totais", value: "156", color: "text-indigo-600" },
          { label: "Licenças Premium", value: "8", color: "text-emerald-600" },
          { label: "Uso da Plataforma", value: "78%", color: "text-purple-600" },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
            <h3 className={`text-3xl font-black ${stat.color} mt-2`}>{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
         <div className="flex border-b border-slate-100">
            {["empresas", "equipe", "logs"].map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-8 py-5 text-xs font-black uppercase tracking-widest transition-all ${
                  activeTab === tab ? "bg-slate-50 text-navy border-b-2 border-primary" : "text-slate-400 hover:text-navy"
                }`}
              >
                {tab}
              </button>
            ))}
         </div>

         <div className="p-8">
            {activeTab === "equipe" ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
                      <th className="px-6 py-4">Usuário</th>
                      <th className="px-6 py-4">Role</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Último Acesso</th>
                      <th className="px-6 py-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((user, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-navy">{user.name}</div>
                          <div className="text-xs text-slate-400">{user.email}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="bg-slate-100 text-navy px-3 py-1 rounded-lg text-[10px] font-bold uppercase">{user.role}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                             <div className={`h-2 w-2 rounded-full ${user.status === 'Online' ? 'bg-green-500' : 'bg-slate-300'}`} />
                             <span className="text-xs font-medium text-slate-600">{user.status}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500">{user.lastAccess}</td>
                        <td className="px-6 py-4 text-right">
                          <button className="text-slate-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                 <Building className="h-16 w-16 text-slate-200 mb-6" />
                 <h3 className="text-lg font-black text-navy uppercase tracking-tight">Gestão de Empresas</h3>
                 <p className="text-sm text-slate-400 max-w-sm mt-2">Navegue pelas empresas cadastradas no sistema, analise planos e consumo de recursos.</p>
              </div>
            )}
         </div>
      </div>
    </div>
  );
}
