import { createFileRoute } from "@tanstack/react-router";
import { Building, Search, Plus, Filter, Download, ExternalLink, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin/companies")({
  component: AdminCompanies,
});

function AdminCompanies() {
  const companies = [
    { id: "1", name: "Estaleiro Navegar", email: "adm@navegar.com", plan: "Enterprise", status: "Ativa", users: 12 },
    { id: "2", name: "Engenharia Marítima SA", email: "contato@maritima.com", plan: "Professional", status: "Ativa", users: 5 },
    { id: "3", name: "Despachante Porto Sul", email: "porto@sul.com", plan: "Starter", status: "Pendente", users: 2 },
  ];

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
                {companies.map((company) => (
                  <tr key={company.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-6">
                       <div className="flex items-center gap-4">
                           <div className="h-10 w-10 bg-slate-100 rounded-xl flex items-center justify-center text-navy font-bold">
                              {company.name[0]}
                           </div>
                           <div>
                              <p className="font-bold text-navy text-sm">{company.name}</p>
                              <p className="text-[10px] text-slate-400 font-mono uppercase">ID: {company.id}</p>
                           </div>
                       </div>
                    </td>
                    <td className="px-8 py-6">
                       <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-black text-[9px] uppercase tracking-widest">
                          {company.plan}
                       </Badge>
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex items-center gap-2">
                          <div className={`h-1.5 w-1.5 rounded-full ${company.status === 'Ativa' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                          <span className="text-xs font-bold text-slate-600 uppercase">{company.status}</span>
                       </div>
                    </td>
                    <td className="px-8 py-6 text-sm font-bold text-navy">{company.users}</td>
                    <td className="px-8 py-6 text-right">
                       <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase text-primary tracking-widest">
                          <ExternalLink className="h-3 w-3 mr-1" /> Gerenciar
                       </Button>
                    </td>
                  </tr>
                ))}
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
