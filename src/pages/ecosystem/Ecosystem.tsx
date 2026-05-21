import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Building, Users, Briefcase, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/dashboard/ecosystem")({
  component: EcosystemPage,
});

function EcosystemPage() {
  const [activeTab, setActiveTab] = useState("partners");

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-navy uppercase tracking-tight">Parcerias & Ecossistema</h1>
          <p className="text-slate-500 font-medium">Conecte-se a estaleiros, vistorias e serviços navais.</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 font-black uppercase text-xs tracking-widest">
          <Plus className="h-4 w-4 mr-2" /> Novo Parceiro
        </Button>
      </div>

      <div className="flex gap-4 border-b border-slate-200">
        {["partners", "teams", "network"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-4 px-2 font-black uppercase text-[10px] tracking-widest ${
              activeTab === tab ? "text-primary border-b-2 border-primary" : "text-slate-400"
            }`}
          >
            {tab === "partners" ? "Parceiros" : tab === "teams" ? "Equipes" : "Rede Operacional"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-6 border-slate-100 shadow-sm hover:shadow-lg transition-all">
            <div className="flex items-center gap-4 mb-4">
              <div className="h-12 w-12 bg-slate-100 rounded-2xl flex items-center justify-center text-navy">
                <Building className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-bold text-navy">Estaleiro Naval {i}</h3>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Serviços de Manutenção</p>
              </div>
            </div>
            <Button variant="outline" className="w-full text-[10px] uppercase font-black tracking-widest">Ver Perfil</Button>
          </Card>
        ))}
      </div>

      {/* Log para monitoramento */}
      {(() => { console.log("ECOSYSTEM_READY"); return null; })()}
    </div>
  );
}
