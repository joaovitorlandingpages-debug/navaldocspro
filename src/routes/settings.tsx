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
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold text-navy tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">Gerencie suas preferências e dados da conta.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar de Abas */}
        <aside className="w-full md:w-64 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-primary text-white shadow-lg shadow-primary/20"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </aside>

        {/* Conteúdo da Aba */}
        <div className="flex-grow bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
          {activeTab === "perfil" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-navy">Perfil Pessoal</h3>
                <p className="text-sm text-slate-500">Suas informações básicas de acesso.</p>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Nome Completo</label>
                  <input
                    type="text"
                    defaultValue="Ricardo Almeida"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">E-mail</label>
                  <input
                    type="email"
                    defaultValue="ricardo@almeida.com"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Telefone</label>
                  <input
                    type="text"
                    defaultValue="(11) 98888-7777"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Cargo</label>
                  <input
                    type="text"
                    defaultValue="Engenheiro Naval"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
              <div className="pt-4 flex justify-end">
                <button className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:opacity-90 transition-all">
                  <Save className="h-4 w-4" /> Salvar Alterações
                </button>
              </div>
            </div>
          )}

          {activeTab === "empresa" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-navy">Dados da Empresa</h3>
                <p className="text-sm text-slate-500">Informações corporativas e faturamento.</p>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Razão Social</label>
                  <input
                    type="text"
                    defaultValue="Almeida Engenharia Naval LTDA"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">CNPJ</label>
                  <input
                    type="text"
                    defaultValue="12.345.678/0001-90"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
            </div>
          )}
          
          {activeTab !== "perfil" && activeTab !== "empresa" && (
            <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400">
               <AppWindow className="h-12 w-12 mb-4 opacity-20" />
               <p className="font-medium text-sm">Configurações desta aba estarão disponíveis em breve.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
