import { createFileRoute } from "@tanstack/react-router";
import { BarChart3, Users, Building2, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/sales-center")({
  component: SalesCenterPage,
});

function SalesCenterPage() {
  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold">Centro Comercial</h1>
      <div className="grid md:grid-cols-4 gap-6">
         {[ { label: "Leads Novos", val: "12", icon: Users }, { label: "Demonstrações", val: "5", icon: TrendingUp }, { label: "Propostas Ativas", val: "8", icon: BarChart3 }, { label: "Parceiros", val: "3", icon: Building2 } ].map((stat, i) => (
            <div key={i} className="p-6 bg-white border rounded-xl shadow-sm flex items-center gap-4">
               <div className="p-3 bg-primary/10 text-primary rounded-lg">
                  <stat.icon className="h-6 w-6" />
               </div>
               <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-black">{stat.val}</p>
               </div>
            </div>
         ))}
      </div>
      <div className="p-8 bg-white border rounded-xl shadow-sm">
         <h2 className="text-xl font-bold mb-6">Pipeline de Vendas</h2>
         <p className="text-muted-foreground">Em desenvolvimento: Sistema de gestão de pipeline e CRM de alta performance.</p>
      </div>
    </div>
  );
}
