import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Building, CheckCircle, Clock, AlertCircle, 
  Search, Filter, MoreHorizontal, Mail, Phone 
} from "lucide-react";

export const Route = createFileRoute("/admin/companies")({
  component: AdminCompanies,
});

function AdminCompanies() {
  const { data: companies, isLoading } = useQuery({
    queryKey: ["admin_companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-navy uppercase tracking-tight">Gestão de Empresas</h1>
          <p className="text-slate-500 font-medium">Controle e suporte para todos os clientes ativos.</p>
        </div>
        <div className="flex gap-2">
           <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input 
                placeholder="Buscar por nome ou CNPJ..."
                className="pl-10 pr-4 py-2 bg-white border border-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20"
              />
           </div>
           <button className="bg-white p-2 border border-slate-100 rounded-xl text-slate-400 hover:text-navy transition-all">
              <Filter className="h-5 w-5" />
           </button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
           <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                 <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400">Empresa</th>
                 <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400">Plano</th>
                 <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400">Onboarding</th>
                 <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400">Status</th>
                 <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 text-right">Ações</th>
              </tr>
           </thead>
           <tbody className="divide-y divide-slate-50">
              {isLoading ? (
                <tr><td colSpan={5} className="p-20 text-center text-slate-400">Carregando empresas...</td></tr>
              ) : (
                companies?.map((company: any) => (
                  <tr key={company.id} className="hover:bg-slate-50/50 transition-all">
                     <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                           <div className="h-10 w-10 bg-slate-100 rounded-xl flex items-center justify-center text-primary font-bold">
                              {company.name?.substring(0, 2).toUpperCase()}
                           </div>
                           <div>
                              <p className="font-bold text-navy">{company.name}</p>
                              <p className="text-[10px] text-slate-400 font-bold">{company.cnpj || "CNPJ Não Inf."}</p>
                           </div>
                        </div>
                     </td>
                     <td className="px-8 py-6">
                        <span className="text-xs font-black uppercase px-3 py-1 bg-primary/10 text-primary rounded-full">
                           {company.plan || "Free"}
                        </span>
                     </td>
                     <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                           <div className="flex-grow h-1.5 w-24 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary transition-all duration-1000" 
                                style={{ width: `${(company.onboarding_step / 7) * 100}%` }}
                              />
                           </div>
                           <span className="text-[10px] font-bold text-slate-400 uppercase">Passo {company.onboarding_step}/7</span>
                        </div>
                     </td>
                     <td className="px-8 py-6">
                        {company.onboarding_status === 'completed' ? (
                          <div className="flex items-center gap-2 text-emerald-600">
                             <CheckCircle className="h-4 w-4" />
                             <span className="text-[10px] font-black uppercase">Ativo</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-amber-500">
                             <Clock className="h-4 w-4" />
                             <span className="text-[10px] font-black uppercase">Onboarding</span>
                          </div>
                        )}
                     </td>
                     <td className="px-8 py-6 text-right">
                        <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-all">
                           <MoreHorizontal className="h-5 w-5" />
                        </button>
                     </td>
                  </tr>
                ))
              )}
           </tbody>
        </table>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
         <div className="bg-navy text-white p-8 rounded-[2rem] shadow-xl">
            <h4 className="text-[10px] font-black uppercase text-primary tracking-widest mb-4">Suporte Ativo</h4>
            <p className="text-2xl font-bold mb-2">3 Empresas</p>
            <p className="text-xs text-white/50">Aguardando auxílio no onboarding hoje.</p>
         </div>
         <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Novas Leads</h4>
            <p className="text-2xl font-bold text-navy mb-2">12</p>
            <p className="text-xs text-slate-400">Cadastros realizados nas últimas 24h.</p>
         </div>
         <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
            <h4 className="text-[10px] font-black uppercase text-red-400 tracking-widest mb-4">Inadimplência</h4>
            <p className="text-2xl font-bold text-navy mb-2">0</p>
            <p className="text-xs text-slate-400">Excelente saúde financeira da base.</p>
         </div>
      </div>
    </div>
  );
}
