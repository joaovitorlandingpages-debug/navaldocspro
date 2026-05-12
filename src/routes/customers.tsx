import { createFileRoute } from "@tanstack/react-router";
import { Users, Search, Plus, MoreHorizontal, Mail, MapPin, Filter } from "lucide-react";

export const Route = createFileRoute("/customers")({
  component: Customers,
});

function Customers() {
  const customers = [
    { name: "Marinha Mercante Ltda", type: "Empresa", location: "Santos, SP", contact: "contato@mercante.com", shipCount: 12 },
    { name: "Eng. Pedro Santos", type: "Individual", location: "Rio de Janeiro, RJ", contact: "pedro@eng.com", shipCount: 2 },
    { name: "Estaleiro Navegar", type: "Empresa", location: "Itajaí, SC", contact: "adm@navegar.com", shipCount: 45 },
    { name: "Dra. Ana Marina", type: "Individual", location: "Salvador, BA", contact: "ana@marina.pro", shipCount: 5 },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
       <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-navy tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">Gerencie sua base de clientes e contatos.</p>
        </div>
        <button className="bg-primary text-white px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-primary/20">
          <Plus className="h-5 w-5" /> Novo Cliente
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
         <div className="p-4 border-b bg-slate-50/50 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:max-w-md">
               <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
               <input placeholder="Filtrar clientes..." className="w-full pl-10 pr-4 py-2 bg-white rounded-lg text-sm border-slate-200 focus:ring-2 focus:ring-primary/20" />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium bg-white hover:bg-slate-50">
               <Filter className="h-4 w-4" /> Filtros Avançados
            </button>
         </div>

         <div className="overflow-x-auto">
            <table className="w-full text-left">
               <thead>
                  <tr className="bg-slate-50/50 text-slate-500 text-xs uppercase tracking-wider">
                     <th className="px-6 py-4 font-semibold">CLIENTE</th>
                     <th className="px-6 py-4 font-semibold">TIPO</th>
                     <th className="px-6 py-4 font-semibold">LOCALIZAÇÃO</th>
                     <th className="px-6 py-4 font-semibold">CONTATO</th>
                     <th className="px-6 py-4 font-semibold">EMBARCAÇÕES</th>
                     <th className="px-6 py-4 font-semibold"></th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {customers.map((c, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                       <td className="px-6 py-4">
                          <div className="font-bold text-navy">{c.name}</div>
                       </td>
                       <td className="px-6 py-4 text-sm">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${c.type === 'Empresa' ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-600'}`}>
                             {c.type}
                          </span>
                       </td>
                       <td className="px-6 py-4 text-sm text-slate-500">
                          <div className="flex items-center gap-1.5">
                             <MapPin className="h-3.5 w-3.5" /> {c.location}
                          </div>
                       </td>
                       <td className="px-6 py-4 text-sm text-slate-500">
                          <div className="flex items-center gap-1.5">
                             <Mail className="h-3.5 w-3.5" /> {c.contact}
                          </div>
                       </td>
                       <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                             <div className="h-1.5 w-12 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-primary" style={{ width: `${Math.min(c.shipCount * 2, 100)}%` }} />
                             </div>
                             <span className="text-sm font-bold">{c.shipCount}</span>
                          </div>
                       </td>
                       <td className="px-6 py-4 text-right">
                          <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400">
                             <MoreHorizontal className="h-5 w-5" />
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
