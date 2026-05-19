import { createFileRoute } from "@tanstack/react-router";
import { 
  Sparkles, Bot, Search, MessageSquare, 
  Zap, ShieldCheck, Brain, FileSearch, 
  Lightbulb, ArrowRight, Mic, Send, 
  RefreshCw, Terminal, Cpu
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/ai-center")({
  component: AICenterPage,
});

function AICenterPage() {
  const [query, setQuery] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [userName, setUserName] = useState("Usuário");

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', user.id)
          .single();
        if (profile?.name) setUserName(profile.name);
      }
    };
    fetchUser();
  }, []);

  const aiCapabilities = [
    { title: "Análise de Riscos", icon: <ShieldCheck className="h-6 w-6" />, desc: "Identifica potenciais atrasos ou inconsistências em processos navais." },
    { title: "Geração Inteligente", icon: <Sparkles className="h-6 w-6" />, desc: "Preenche automaticamente memoriais descritivos baseados nos dados da embarcação." },
    { title: "Extração OCR", icon: <FileSearch className="h-6 w-6" />, desc: "Lê documentos digitalizados e extrai dados técnicos com 99% de precisão." },
    { title: "Predição de Prazo", icon: <Brain className="h-6 w-6" />, desc: "Calcula a data provável de conclusão baseado no histórico da Capitania." },
  ];

  const handleSuggest = () => {
    setIsProcessing(true);
    setTimeout(() => setIsProcessing(false), 2000);
  };

  return (
    <div className="space-y-10 animate-in fade-in zoom-in-95 duration-700 pb-20 max-w-6xl mx-auto">
      {/* AI Hero Section */}
      <div className="relative p-12 bg-gradient-to-br from-navy via-slate-900 to-indigo-950 rounded-[3.5rem] overflow-hidden text-white shadow-2xl border border-white/5 group">
         <div className="absolute top-0 right-0 p-20 opacity-10 group-hover:rotate-12 transition-transform duration-1000">
            <Cpu className="h-96 w-96 text-primary" />
         </div>
         <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
            <div className="max-w-xl text-center md:text-left">
               <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/20 border border-primary/30 rounded-full text-primary text-[10px] font-black uppercase tracking-widest mb-6">
                  <Sparkles className="h-3 w-3 animate-pulse" /> NavalDocs AI Enterprise
               </div>
               <h1 className="text-4xl md:text-6xl font-black mb-6 tracking-tight leading-tight">Sua inteligência <span className="text-primary italic">operacional</span> avançada.</h1>
               <p className="text-lg text-slate-400 font-medium leading-relaxed mb-8">
                  Analise processos, gere documentos e identifique gargalos automaticamente com a rede neural proprietária treinada em normas navais.
               </p>
               <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                  <button className="px-8 py-4 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 transition-all">Ativar Copilot</button>
                  <button className="px-8 py-4 bg-white/5 border border-white/10 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all">Ver Documentação</button>
               </div>
            </div>
            
            <div className="w-full md:w-96 bg-black/40 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 shadow-2xl relative">
               <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
                  <div className="h-8 w-8 bg-primary/20 rounded-xl flex items-center justify-center">
                     <Terminal className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Status da Rede Neural</span>
                  <div className="ml-auto h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
               </div>
               <div className="space-y-4 font-mono text-[10px]">
                  <p className="text-emerald-400"># Initializing AI Core v4.2...</p>
                  <p className="text-slate-400"># Scanning active processes (14)...</p>
                  <p className="text-slate-400"># No critical anomalies detected.</p>
                  <p className="text-primary"># Suggestion: Update vessel Phoenix specs.</p>
                  <div className="flex gap-1 mt-6">
                     <div className="h-1 flex-grow bg-primary/20 rounded-full overflow-hidden">
                        <div className="h-full bg-primary animate-progress" style={{ width: '75%' }} />
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </div>

      {/* Capabilities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         {aiCapabilities.map((cap, i) => (
            <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group hover:-translate-y-1">
               <div className="h-12 w-12 bg-slate-50 rounded-2xl flex items-center justify-center text-primary mb-6 group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                  {cap.icon}
               </div>
               <h3 className="font-black text-navy uppercase text-xs tracking-widest mb-3">{cap.title}</h3>
               <p className="text-xs text-slate-400 font-medium leading-relaxed">{cap.desc}</p>
            </div>
         ))}
      </div>

      {/* AI Chat Interface */}
      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-xl overflow-hidden flex flex-col md:flex-row min-h-[600px]">
         {/* Sidebar/Context */}
         <div className="w-full md:w-80 bg-slate-50 border-r border-slate-100 p-8">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-8">Sugestões de IA</h4>
            <div className="space-y-4">
                {[
                  { title: "Resumir Processo Ativo", icon: <MessageSquare className="h-4 w-4" /> },
                  { title: "Verificar Pendências Técnicas", icon: <ShieldCheck className="h-4 w-4" /> },
                  { title: "Sugerir Automação de Documento", icon: <Lightbulb className="h-4 w-4" /> },
                  { title: "Analista de Riscos de Prazo", icon: <Brain className="h-4 w-4" /> },
                ].map((item, i) => (
                  <button key={i} className="w-full p-4 bg-white border border-slate-100 rounded-2xl text-left hover:border-primary hover:shadow-md transition-all group flex items-center gap-3">
                    <div className="h-8 w-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                       {item.icon}
                    </div>
                    <span className="text-[11px] font-black text-navy uppercase tracking-tight">{item.title}</span>
                  </button>
                ))}
            </div>

            <div className="mt-12 p-6 bg-navy text-white rounded-[2rem] shadow-lg relative overflow-hidden">
               <Zap className="absolute -right-4 -bottom-4 h-20 w-20 text-white/10" />
               <p className="text-[10px] font-black uppercase tracking-widest mb-2 text-primary">Upgrade Pro</p>
               <p className="text-xs font-bold leading-relaxed">Libere IA ilimitada e automação de documentos em massa.</p>
               <button className="mt-4 text-[10px] font-black uppercase text-primary hover:underline">Saber Mais</button>
            </div>
         </div>

         {/* Chat Area */}
         <div className="flex-grow flex flex-col p-8 md:p-12">
            <div className="flex-grow space-y-8 overflow-y-auto max-h-[400px] mb-8 pr-4 custom-scrollbar">
               {/* Welcome Message */}
               <div className="flex gap-4">
                  <div className="h-10 w-10 bg-primary rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/20">
                     <Bot className="h-5 w-5 text-white" />
                  </div>
                  <div className="bg-slate-50 p-6 rounded-[2rem] rounded-tl-none border border-slate-100 max-w-lg">
                     <p className="text-sm text-navy font-medium leading-relaxed">
                        Olá {userName}! Eu sou o assistente IA do NavalDocs Pro. Como posso otimizar sua operação hoje?
                     </p>
                     <div className="mt-4 flex flex-wrap gap-2">
                        <button onClick={handleSuggest} className="px-3 py-1.5 bg-white border border-slate-200 rounded-full text-[10px] font-bold text-navy hover:bg-slate-100 transition-all">Resumir semana</button>
                        <button onClick={handleSuggest} className="px-3 py-1.5 bg-white border border-slate-200 rounded-full text-[10px] font-bold text-navy hover:bg-slate-100 transition-all">Ver riscos</button>
                     </div>
                  </div>
               </div>

               {isProcessing && (
                  <div className="flex gap-4 animate-in fade-in slide-in-from-bottom-2">
                     <div className="h-10 w-10 bg-primary rounded-2xl flex items-center justify-center flex-shrink-0">
                        <RefreshCw className="h-5 w-5 text-white animate-spin" />
                     </div>
                     <div className="bg-slate-50 p-6 rounded-[2rem] rounded-tl-none border border-slate-100 italic text-slate-400 text-sm">
                        Analisando dados em tempo real...
                     </div>
                  </div>
               )}
            </div>

            {/* Input Area */}
            <div className="relative">
               <div className="absolute left-6 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <button className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-400"><Mic className="h-5 w-5" /></button>
               </div>
               <input 
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Pergunte sobre processos, embarcações ou documentos..."
                  className="w-full pl-16 pr-20 py-6 bg-slate-50 border border-slate-100 rounded-[2.5rem] text-sm font-medium focus:ring-4 focus:ring-primary/10 focus:bg-white outline-none transition-all shadow-inner"
                  onKeyDown={(e) => e.key === 'Enter' && handleSuggest()}
               />
               <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <button 
                    onClick={handleSuggest}
                    className="h-12 w-12 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                  >
                     <Send className="h-5 w-5" />
                  </button>
               </div>
            </div>
            <p className="mt-4 text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">IA NavalDocs treinada em NORMAM-01, 02 e 03 • v4.2 stable</p>
         </div>
      </div>
    </div>
  );
}
