import { createFileRoute } from "@tanstack/react-router";
import { 
  Building, Users, CreditCard, Shield, Globe, 
  MapPin, Phone, Mail, FileText, UserCheck, 
  CheckCircle2, Clock, MoreVertical, Plus, 
  Edit2, Trash2, ShieldAlert, Search, Loader2
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  component: CompanyTeamPage,
});

function CompanyTeamPage() {
  const [activeTab, setActiveTab] = useState("empresa");
  const [company, setCompany] = useState<any>(null);
  const [team, setTeam] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('*, companies(*)')
        .eq('id', user.id)
        .single();

      if (profile) {
        if (profile.companies) {
          setCompany(profile.companies);
          
          const { data: teamData } = await supabase
            .from('profiles')
            .select('*')
            .eq('company_id', profile.company_id);
          
          if (teamData) setTeam(teamData);
        }
      }
      setIsLoading(false);
    };

    fetchData();
  }, []);

  const tabs = [
    { id: "empresa", label: "Dados da Empresa", icon: <Building className="h-4 w-4" /> },
    { id: "equipe", label: "Gestão de Equipe", icon: <Users className="h-4 w-4" /> },
    { id: "permissoes", label: "Cargos e Permissões", icon: <Shield className="h-4 w-4" /> },
    { id: "assinatura", label: "Plano e Faturamento", icon: <CreditCard className="h-4 w-4" /> },
    { id: "seguranca", label: "Segurança e Logs", icon: <ShieldAlert className="h-4 w-4" /> },
  ];

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    
    const { error } = await supabase
      .from('companies')
      .update({
        name: company.name,
        cnpj: company.cnpj,
        email: company.email,
        phone: company.phone
      })
      .eq('id', company.id);

    if (error) {
      toast.error("Erro ao atualizar dados da empresa");
    } else {
      toast.success("Dados atualizados com sucesso!");
    }
  };

  const roles = [
    { name: "Admin Master", users: 0, permissions: "Acesso Total" },
    { name: "company_admin", users: team.filter(t => t.role === 'company_admin').length, permissions: "Gestão de Equipe e Financeiro" },
    { name: "engineer", users: team.filter(t => t.role === 'engineer').length, permissions: "Criação e Edição de Processos" },
    { name: "dispatcher", users: team.filter(t => t.role === 'dispatcher').length, permissions: "Gestão de Documentos" },
    { name: "operational", users: team.filter(t => t.role === 'operational').length, permissions: "Visualização e Upload" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-navy uppercase tracking-tight">Gestão Corporativa</h1>
          <p className="text-slate-500 font-medium italic">Ambiente corporativo: {company?.name || "Carregando..."}</p>
        </div>
        <div className="flex gap-3">
           <button className="bg-slate-50 border border-slate-200 text-navy px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-100 transition-all">Exportar Dados</button>
           <button className="bg-primary text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-primary/20">Upgrade para Enterprise</button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="w-full lg:w-72 space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-[1.5rem] text-sm font-bold transition-all border ${
                activeTab === tab.id
                  ? "bg-navy text-white shadow-xl shadow-navy/20 border-navy"
                  : "text-slate-500 hover:bg-slate-100 border-transparent"
              }`}
            >
              <div className={`${activeTab === tab.id ? 'text-primary' : 'text-slate-400'}`}>
                {tab.icon}
              </div>
              {tab.label}
            </button>
          ))}

          <div className="mt-8 p-6 bg-primary/5 rounded-[2rem] border border-primary/10">
             <div className="flex items-center gap-2 mb-4">
                <Shield className="h-4 w-4 text-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">Status do Plano</span>
             </div>
             <p className="font-black text-navy text-lg mb-1">PRO ANUAL</p>
             <p className="text-[10px] text-slate-500 font-bold mb-4 uppercase">4/10 Usuários Utilizados</p>
             <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-primary w-[40%]" />
             </div>
          </div>
        </aside>

        <div className="flex-grow">
           {activeTab === "empresa" && (
             <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 md:p-10 shadow-sm space-y-10 animate-in slide-in-from-right-4 duration-500">
                <div className="flex flex-col md:flex-row gap-10 items-start md:items-center pb-10 border-b border-slate-100">
                   <div className="h-32 w-32 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300 p-4 text-center group hover:border-primary/50 transition-all cursor-pointer">
                      <Building className="h-8 w-8 mb-2 opacity-30 group-hover:text-primary transition-all" />
                      <span className="text-[10px] font-black uppercase tracking-tight">Logo da Empresa</span>
                   </div>
                   <div className="space-y-4">
                      <div>
                         <h3 className="text-2xl font-black text-navy uppercase tracking-tight">Almeida Engenharia Naval LTDA</h3>
                         <p className="text-sm text-slate-400 font-medium">Desde Outubro de 2023 • ID: COR-8829-X</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                         <span className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-emerald-100 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Conta Verificada
                         </span>
                         <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-blue-100 flex items-center gap-1">
                            <Globe className="h-3 w-3" /> White-label Ativo
                         </span>
                      </div>
                   </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Razão Social</label>
                      <input type="text" defaultValue="Almeida Engenharia Naval LTDA" className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-navy focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">CNPJ</label>
                      <input type="text" defaultValue="12.345.678/0001-90" className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-navy focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">E-mail Administrativo</label>
                      <input type="email" defaultValue="admin@almeidanaval.com.br" className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-navy focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Telefone Corporativo</label>
                      <input type="text" defaultValue="(11) 4004-9090" className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-navy focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                   </div>
                   <div className="space-y-2 md:col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Endereço Sede</label>
                      <input type="text" defaultValue="Av. Marítima, 1000 - Porto Central, Santos/SP" className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-navy focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                   </div>
                </div>

                <div className="pt-8 flex justify-end">
                   <button className="bg-navy text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:scale-105 transition-all shadow-xl shadow-navy/20 active:scale-95">Salvar Configurações</button>
                </div>
             </div>
           )}

           {activeTab === "equipe" && (
             <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden animate-in slide-in-from-right-4 duration-500">
                <div className="p-8 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                   <div className="relative flex-grow max-w-md">
                      <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
                      <input placeholder="Buscar na equipe..." className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
                   </div>
                   <button className="w-full md:w-auto flex items-center justify-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-primary/20">
                      <Plus className="h-4 w-4" /> Convidar Membro
                   </button>
                </div>

                <div className="overflow-x-auto">
                   <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                           <th className="px-8 py-5">Membro</th>
                           <th className="px-8 py-5">Cargo / Role</th>
                           <th className="px-8 py-5">Status</th>
                           <th className="px-8 py-5">Última Atividade</th>
                           <th className="px-8 py-5"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {team.map((user, i) => (
                          <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="px-8 py-6">
                               <div className="flex items-center gap-4">
                                  <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-navy text-xs">
                                     {user.name.split(' ').map(n => n[0]).join('')}
                                  </div>
                                  <div>
                                     <p className="font-black text-navy text-sm">{user.name}</p>
                                     <p className="text-xs text-slate-400 font-medium">{user.email}</p>
                                  </div>
                               </div>
                            </td>
                            <td className="px-8 py-6">
                               <span className="bg-navy/5 text-navy px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border border-navy/10">
                                  {user.role}
                               </span>
                            </td>
                            <td className="px-8 py-6">
                               <div className="flex items-center gap-2">
                                  <div className={`h-2 w-2 rounded-full ${user.status === 'Online' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                                  <span className="text-xs font-bold text-slate-600 uppercase tracking-tighter">{user.status}</span>
                               </div>
                            </td>
                            <td className="px-8 py-6 text-xs font-bold text-slate-500 uppercase tracking-tight">{user.lastActive}</td>
                            <td className="px-8 py-6 text-right">
                               <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button className="p-2 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition-all"><Edit2 className="h-4 w-4 text-slate-400" /></button>
                                  <button className="p-2 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-100 transition-all"><Trash2 className="h-4 w-4 text-red-400" /></button>
                               </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                   </table>
                </div>
             </div>
           )}

           {activeTab === "permissoes" && (
             <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 md:p-10 shadow-sm animate-in slide-in-from-right-4 duration-500">
                <div className="flex justify-between items-center mb-10">
                   <h3 className="text-xl font-black text-navy uppercase tracking-tight">Cargos e Níveis de Acesso</h3>
                   <button className="text-xs font-black uppercase tracking-widest text-primary hover:underline">+ Criar Cargo Customizado</button>
                </div>

                <div className="space-y-6">
                   {roles.map((role, i) => (
                     <div key={i} className="p-6 bg-slate-50 rounded-[1.5rem] border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-md hover:bg-white transition-all group">
                        <div>
                           <div className="flex items-center gap-3 mb-1">
                              <p className="font-black text-navy uppercase tracking-tight text-sm">{role.name}</p>
                              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px] font-black">{role.users} usuários</span>
                           </div>
                           <p className="text-xs text-slate-400 font-medium italic">{role.permissions}</p>
                        </div>
                        <button className="text-[10px] font-black uppercase tracking-widest bg-navy text-white px-5 py-2.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">Configurar Acessos</button>
                     </div>
                   ))}
                </div>

                <div className="mt-12 p-8 bg-amber-50 rounded-[2rem] border border-amber-100 border-dashed">
                   <div className="flex items-center gap-3 mb-4">
                      <ShieldAlert className="h-5 w-5 text-amber-600" />
                      <p className="font-black text-amber-900 uppercase tracking-tight text-xs">Proteção de Dados Corporativos</p>
                   </div>
                   <p className="text-xs text-amber-800/70 font-medium leading-relaxed">
                      A gestão de permissões afeta a visualização de documentos sensíveis, geração de memoriais e acesso ao financeiro. 
                      Mudanças nestas configurações são registradas no log de auditoria global.
                   </p>
                </div>
             </div>
           )}

           {activeTab !== "empresa" && activeTab !== "equipe" && activeTab !== "permissoes" && (
              <div className="bg-white rounded-[2.5rem] border border-slate-100 p-20 shadow-sm text-center flex flex-col items-center animate-in slide-in-from-right-4 duration-500">
                 <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-6">
                    <Globe className="h-10 w-10 opacity-30" />
                 </div>
                 <h3 className="text-xl font-black text-navy uppercase tracking-tight mb-2">Interface em Otimização</h3>
                 <p className="text-sm text-slate-400 max-w-xs mx-auto italic font-medium">O módulo de {activeTab} está sendo finalizado para oferecer a melhor experiência enterprise.</p>
              </div>
           )}
        </div>
      </div>
    </div>
  );
}
