import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Building, Users, Briefcase, Plus, Search, Globe, Shield, Activity, Users2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function EcosystemPage() {
  const [activeTab, setActiveTab] = useState("partners");


  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-semibold text-navy">Parcerias & Ecossistema</h1>
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

      {activeTab === "partners" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-500">
          {[
            { name: "Estaleiro Atlântico", type: "Estaleiro", icon: Building },
            { name: "Marinha Serviços", type: "Vistoriador", icon: Shield },
            { name: "Engenharia Naval Pro", type: "Engenheiro", icon: Users2 },
          ].map((partner, i) => (
            <Card key={i} className="p-6 border-slate-100 shadow-sm hover:shadow-xl transition-all group rounded-2xl overflow-hidden bg-white">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-14 w-14 bg-slate-50 rounded-2xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform border border-slate-100">
                  <partner.icon className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="font-semibold text-navy text-sm">{partner.name}</h3>
                  <Badge variant="outline" className="text-[8px] font-black border-primary/20 text-primary bg-primary/5 uppercase tracking-widest px-2">{partner.type}</Badge>
                </div>
              </div>
              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <span>Rating</span>
                  <span className="text-amber-500 italic">4.9/5.0</span>
                </div>
                <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <span>Projetos</span>
                  <span className="text-navy">12 Ativos</span>
                </div>
              </div>
              <Button variant="outline" className="w-full text-[10px] uppercase font-black tracking-widest rounded-xl hover:bg-navy hover:text-white transition-all">Ver Perfil Corporativo</Button>
            </Card>
          ))}
        </div>
      )}

      {activeTab === "teams" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in slide-in-from-bottom-4 duration-500">
          <Card className="p-8 border-slate-100 shadow-sm rounded-3xl">
            <h3 className="font-semibold text-navy text-xs tracking-[0.2em] mb-6 flex items-center gap-2 italic">
              <Users className="h-5 w-5 text-primary" /> Gestão de Departamentos
            </h3>
            <div className="space-y-4">
              {[
                { name: "Operações Navais", staff: 12, performance: 94 },
                { name: "Compliance & Legal", staff: 4, performance: 98 },
                { name: "Técnico / Engenharia", staff: 8, performance: 89 },
              ].map((dept, i) => (
                <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black text-navy uppercase tracking-widest">{dept.name}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{dept.staff} Colaboradores</p>
                  </div>
                  <Badge className="bg-emerald-50 text-emerald-600 border-none font-black text-[9px]">{dept.performance}% Eficácia</Badge>
                </div>
              ))}
              <Button variant="ghost" className="w-full text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5">
                <Plus className="h-3 w-3 mr-2" /> Criar Departamento
              </Button>
            </div>
          </Card>

          <Card className="p-8 bg-navy text-white border-none rounded-3xl shadow-2xl relative overflow-hidden group">
            <Activity className="absolute -right-10 -bottom-10 h-64 w-64 text-primary opacity-5 group-hover:scale-110 transition-transform duration-1000" />
            <div className="relative z-10">
              <h3 className="text-xl font-semibold italic mb-4">Escala de <span className="text-primary">Equipes</span></h3>
              <p className="text-sm text-slate-400 font-medium leading-relaxed mb-8">
                Otimize seu fluxo operacional dividindo responsabilidades por departamentos. Permissões granulares garantem a segurança dos dados.
              </p>
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-[9px] font-black uppercase tracking-widest opacity-60">
                    <span>Carga Operacional</span>
                    <span>72%</span>
                  </div>
                  <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: '72%' }} />
                  </div>
                </div>
                <Button className="bg-primary text-white border-none rounded-xl font-black text-[10px] uppercase tracking-widest px-8">Configurar Permissões</Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === "network" && (
        <div className="space-y-8 animate-in zoom-in-95 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: "Compartilhamentos", val: "24", icon: Globe },
              { label: "Assinaturas Externas", val: "12", icon: Shield },
              { label: "Laudos Solicitados", val: "8", icon: Activity },
              { label: "Consultorias", val: "3", icon: Users2 },
            ].map((stat, i) => (
              <Card key={i} className="p-6 border-slate-100 shadow-sm bg-white rounded-3xl">
                <stat.icon className="h-5 w-5 text-primary mb-3" />
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                <h4 className="text-xl font-semibold text-navy">{stat.val}</h4>
              </Card>
            ))}
          </div>
          <Card className="p-8 border-slate-100 shadow-sm rounded-3xl">
            <h3 className="font-semibold text-navy text-xs tracking-[0.2em] mb-6 flex items-center gap-2 italic">
              <Globe className="h-5 w-5 text-primary" /> Workflow Colaborativo Ativo
            </h3>
            <div className="divide-y divide-slate-50">
              {[1, 2].map((i) => (
                <div key={i} className="py-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-slate-100 rounded-xl flex items-center justify-center">
                      <Briefcase className="h-5 w-5 text-navy" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-navy">Processo: Renovação CSN #{i}482</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Compartilhado com: Engenheiro Ricardo Souza</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className="bg-blue-50 text-blue-600 border-none text-[8px] font-black uppercase tracking-widest">Aguardando Laudo</Badge>
                    <Button variant="ghost" size="sm" className="text-[9px] font-black uppercase tracking-widest">Gerenciar</Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}


      {/* Log para monitoramento */}
      {(() => { console.log("ECOSYSTEM_READY"); return null; })()}
    </div>
  );
}
