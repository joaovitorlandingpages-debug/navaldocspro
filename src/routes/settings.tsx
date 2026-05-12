import { createFileRoute } from "@tanstack/react-router";
import { User, Mail, Shield, Bell, AppWindow, Building, Save } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const [activeTab, setActiveTab] = useState("perfil");

  const tabs = [
    { id: "perfil", label: "Perfil", icon: <User className="h-4 w-4" /> },
    { id: "empresa", label: "Empresa", icon: <Building className="h-4 w-4" /> },
    { id: "notificacoes", label: "Notificações", icon: <Bell className="h-4 w-4" /> },
    { id: "seguranca", label: "Segurança", icon: <Shield className="h-4 w-4" /> },
    { id: "preferencias", label: "Preferências", icon: <AppWindow className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div>
        <h1 className="text-3xl font-bold text-navy tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">Gerencie suas preferências e dados da conta.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar de Abas */}
        <aside className="w-full md:w-72 space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-bold transition-all border ${
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
        </aside>

        {/* Conteúdo da Aba */}
        <div className="flex-grow bg-white rounded-[2.5rem] border border-slate-100 p-8 md:p-12 shadow-sm">
          {activeTab === "perfil" && (
            <div className="space-y-10">
              <div className="flex items-center gap-6 pb-8 border-b border-slate-100">
                <div className="h-24 w-24 rounded-3xl bg-primary flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-primary/30">
                  RA
                </div>
                <div>
                   <h3 className="text-xl font-black text-navy">Ricardo Almeida</h3>
                   <p className="text-sm text-slate-400 mb-4 italic">Engenheiro Naval Responsável</p>
                   <button className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline">Alterar Foto de Perfil</button>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Nome Completo</label>
                  <input
                    type="text"
                    defaultValue="Ricardo Almeida"
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-navy focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">E-mail Profissional</label>
                  <input
                    type="email"
                    defaultValue="ricardo@almeida.com"
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-navy focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    defaultValue="(11) 98888-7777"
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-navy focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Registro Profissional (CREA)</label>
                  <input
                    type="text"
                    defaultValue="SP-123456789"
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-navy focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
              </div>
              <div className="pt-8 flex justify-end">
                <button className="bg-navy text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-navy/20">
                  <Save className="h-4 w-4 text-primary" /> Salvar Perfil
                </button>
              </div>
            </div>
          )}

          {activeTab === "empresa" && (
            <div className="space-y-10">
              <div>
                <h3 className="text-xl font-black text-navy mb-2 uppercase tracking-tight">Identidade Corporativa</h3>
                <p className="text-sm text-slate-400 font-medium leading-relaxed">Estes dados aparecerão no cabeçalho dos seus documentos gerados.</p>
              </div>
              
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Razão Social</label>
                  <input
                    type="text"
                    defaultValue="Almeida Engenharia Naval LTDA"
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-navy focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">CNPJ / Identificação Fiscal</label>
                  <input
                    type="text"
                    defaultValue="12.345.678/0001-90"
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-navy focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400">Inscrição Municipal</label>
                  <input
                    type="text"
                    defaultValue="987654-0"
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-navy focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 flex flex-col md:flex-row items-center gap-8">
                 <div className="h-32 w-48 bg-white border border-dashed border-slate-200 rounded-2xl flex items-center justify-center text-slate-300 text-xs font-bold text-center p-4">
                    Logo da Empresa (PNG transparente)
                 </div>
                 <div className="flex-grow">
                    <h4 className="font-bold text-navy mb-2">Papel Timbrado</h4>
                    <p className="text-xs text-slate-400 mb-6">O logotipo será usado em todos os relatórios e memoriais automatizados.</p>
                    <button className="px-6 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-navy hover:bg-slate-50 transition-all">Fazer Upload</button>
                 </div>
              </div>

              <div className="pt-8 flex justify-end">
                <button className="bg-navy text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-navy/20">
                  <Save className="h-4 w-4 text-primary" /> Atualizar Empresa
                </button>
              </div>
            </div>
          )}
          
          {activeTab !== "perfil" && activeTab !== "empresa" && (
            <div className="flex flex-col items-center justify-center py-32 text-center">
               <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-6 border border-slate-100">
                 <AppWindow className="h-10 w-10 opacity-50" />
               </div>
               <h3 className="text-xl font-black text-navy mb-2 uppercase tracking-tight">Módulo em Desenvolvimento</h3>
               <p className="font-medium text-sm text-slate-400 max-w-xs mx-auto leading-relaxed">As configurações de {activeTab} estão sendo otimizadas para a próxima versão master.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
