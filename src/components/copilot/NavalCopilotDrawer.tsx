import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, 
  Sparkles, 
  X, 
  Send, 
  Anchor, 
  ShieldCheck, 
  AlertCircle, 
  HelpCircle, 
  FileCheck2, 
  DollarSign, 
  Compass, 
  RefreshCw,
  Copy,
  ChevronRight,
  Maximize2,
  Minimize2,
  Mic,
  MicOff,
  Trash2,
  ExternalLink,
  ChevronDown,
  Clock,
  Layers,
  FileText,
  Ship,
  CheckCircle2,
  Flame,
  LifeBuoy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  processNavalCopilotPrompt, 
  fetchLiveSystemContext, 
  type CopilotAction, 
  type CopilotThoughtStep, 
  type LiveSystemContext 
} from '@/services/navalCopilotEngine';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: string;
  tags?: string[];
  thoughtSteps?: CopilotThoughtStep[];
  actions?: CopilotAction[];
  quickReplies?: string[];
  referencedNorms?: string[];
}

export function NavalCopilotDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputQuery, setInputQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [liveContext, setLiveContext] = useState<LiveSystemContext | null>(null);
  const [activeThought, setActiveThought] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg-welcome',
      sender: 'assistant',
      content: `⚓ **Olá! Eu sou o Copiloto NavalDocs Pro (Gemini 3.7 Ultra Neural Engine).**

Sou o assistente de inteligência artificial mais avançado do setor náutico brasileiro, integrado diretamente à sua base de dados, **NORMAMs (01, 02, 03, 11 e 211)**, **LESTA (Lei 9.537/97)** e à tabela de custas da **Diretoria de Portos e Costas (DPC 2026)**.

Como posso acelerar suas operações náuticas hoje?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      tags: ['NORMAM Compliance', 'Taxas GRU 28830-6', 'Auditoria TIE/CSN', 'Guardião de Prazos'],
      quickReplies: [
        'Como estão os prazos da minha frota?',
        'Quais as taxas de GRU da DPC?',
        'Salvatagem obrigatória para lancha',
        'Gerar modelo de Procuração Naval',
      ],
      referencedNorms: ['NORMAM-01/DPC', 'NORMAM-02/DPC', 'LESTA 9.537/97'],
    },
  ]);

  // Carregar contexto ao vivo do Supabase
  useEffect(() => {
    fetchLiveSystemContext().then((ctx) => {
      setLiveContext(ctx);
    });
  }, []);

  // Rolar para a última mensagem
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isTyping]);

  // Suporte a atalho Ctrl+K ou Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Reconhecimento de Voz (Web Speech API)
  const toggleSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error('Reconhecimento de voz não suportado pelo seu navegador.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'pt-BR';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
        toast.info('🎙️ Ouvindo... Fale sua dúvida sobre NORMAM ou processos.');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputQuery(transcript);
        setIsListening(false);
        handleSendPrompt(transcript);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      console.warn('Speech Recognition exception:', err);
      setIsListening(false);
    }
  };

  const handleSendPrompt = async (queryText: string) => {
    const text = queryText || inputQuery;
    if (!text.trim()) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsTyping(true);
    setActiveThought('Analisando intenção e correlacionando com base NORMAM & DPC...');

    try {
      // Simulação visual de Chain-of-Thought antes da resposta final
      setTimeout(() => {
        setActiveThought('Auditando base de embarcações e tabela de emolumentos 2026...');
      }, 400);

      const responseData = await processNavalCopilotPrompt(text, liveContext || undefined);

      setTimeout(() => {
        const assistantMsg: Message = {
          id: `assistant-${Date.now()}`,
          sender: 'assistant',
          content: responseData.text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          tags: responseData.tags,
          thoughtSteps: responseData.thoughtSteps,
          actions: responseData.actions,
          quickReplies: responseData.quickReplies,
          referencedNorms: responseData.referencedNorms,
        };

        setMessages((prev) => [...prev, assistantMsg]);
        setIsTyping(false);
        setActiveThought(null);
      }, 850);
    } catch (err) {
      console.error('Copilot processing error:', err);
      setIsTyping(false);
      setActiveThought(null);
      toast.error('Erro ao processar consulta com o motor neural.');
    }
  };

  const handleActionClick = (action: CopilotAction) => {
    if (action.actionType === 'copy_text' && action.payload?.text) {
      navigator.clipboard.writeText(action.payload.text);
      toast.success('📋 Minuta copiada com sucesso para a área de transferência!');
    } else if (action.actionType === 'navigate' && action.payload?.url) {
      window.location.href = action.payload.url;
    } else if (action.actionType === 'run_simulation' && action.payload?.query) {
      handleSendPrompt(action.payload.query);
    } else if (action.actionType === 'generate_checklist') {
      handleSendPrompt('Qual o checklist completo para transferência de embarcação?');
    }
  };

  const handleCopyMessage = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Resposta copiada para a área de transferência!');
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: 'msg-welcome-reset',
        sender: 'assistant',
        content: '⚓ **Histórico reiniciado.** O Copiloto NavalDocs Pro está pronto para uma nova análise.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        tags: ['Pronto para Nova Consulta'],
        quickReplies: [
          'Quais os prazos da minha frota?',
          'Quais as taxas de GRU da DPC?',
          'Salvatagem NORMAM-01',
          'Modelo de Procuração',
        ],
      },
    ]);
    toast.info('Histórico do Copiloto limpo.');
  };

  return (
    <>
      {/* Botão Flutuante Global Inteligente (posicionado em bottom-28 no mobile/tablet para ter espaço de sobra da bottom nav e bottom-8 no desktop) */}
      {!isOpen && (
        <div className={`fixed ${isMinimized ? 'top-1/2 -translate-y-1/2 right-0' : 'bottom-28 lg:bottom-8 right-4 sm:right-6'} z-[45] flex items-center gap-2 animate-in fade-in duration-300 transition-all`}>
          {/* Badge de Alerta se houver vencimentos críticos */}
          {liveContext?.deadlinesSummary && liveContext.deadlinesSummary.criticalCount > 0 && !isMinimized && (
            <div 
              onClick={() => {
                setIsOpen(true);
                handleSendPrompt('Quais são os prazos críticos que estão vencendo na minha frota?');
              }}
              className="cursor-pointer bg-amber-500 text-slate-950 font-black text-[10px] px-3 py-1.5 rounded-full shadow-xl border border-amber-300 flex items-center gap-1.5 hover:scale-105 transition-transform hidden sm:flex"
            >
              <AlertCircle className="h-3.5 w-3.5 text-slate-950 animate-bounce" />
              <span>{liveContext.deadlinesSummary.criticalCount} Prazo(s) Crítico(s)</span>
            </div>
          )}

          {/* Trigger Principal */}
          {isMinimized ? (
            <button
              onClick={() => setIsMinimized(false)}
              className="bg-navy/95 text-primary py-3 px-2 rounded-l-2xl shadow-2xl hover:bg-navy border-y border-l border-primary/40 transition-all flex flex-col items-center gap-1 group hover:pr-3"
              title="Expandir Copiloto IA (Ctrl+K)"
            >
              <Bot className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
              <span className="[writing-mode:vertical-lr] text-[9px] font-black uppercase text-white tracking-widest py-1">
                Copiloto IA
              </span>
            </button>
          ) : (
            <div className="flex items-center gap-1 bg-navy/95 backdrop-blur-md p-2 pl-4 rounded-full shadow-2xl border-2 border-primary/40 hover:border-primary transition-all group">
              <button
                onClick={() => setIsOpen(true)}
                className="flex items-center gap-3 text-left focus:outline-none cursor-pointer"
                title="Abrir Copiloto NavalDocs Pro (Ctrl+K)"
              >
                <div className="relative">
                  <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
                    <Bot className="h-5 w-5 text-primary group-hover:rotate-12 transition-transform duration-300" />
                  </div>
                  <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
                  </span>
                </div>
                <div className="flex flex-col pr-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black uppercase text-white tracking-wider">
                      Copiloto IA
                    </span>
                    <Badge className="bg-primary text-navy font-black text-[8px] py-0 px-1 hidden sm:inline border-none">
                      Gemini 3.7
                    </Badge>
                  </div>
                  <span className="text-[9px] text-slate-400 font-semibold hidden md:inline">
                    NORMAM &bull; GRU &bull; Auditoria
                  </span>
                </div>
                <kbd className="hidden lg:inline bg-white/10 px-2 py-0.5 rounded text-[9px] text-primary font-mono font-bold">
                  Ctrl+K
                </kbd>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMinimized(true);
                }}
                className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors ml-1"
                title="Minimizar para a lateral da tela"
              >
                <ChevronDown className="h-3.5 w-3.5 -rotate-90" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Drawer Lateral do Copiloto Ultra Inteligente */}
      {isOpen && (
        <>
          {/* Backdrop Transparente Suave em Mobile */}
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[95] lg:hidden animate-in fade-in duration-200"
            onClick={() => setIsOpen(false)}
          />

          <div 
            className={`fixed inset-y-0 right-0 z-[100] ${
              isExpanded ? 'w-full md:w-[760px]' : 'w-full sm:w-[500px] md:w-[540px]'
            } bg-slate-950/95 text-slate-100 shadow-2xl border-l border-primary/20 flex flex-col backdrop-blur-xl animate-in slide-in-from-right duration-300`}
          >
            {/* Header Super Tecnológico Naval */}
            <div className="bg-gradient-to-r from-navy via-slate-900 to-navy p-4 border-b border-primary/20 flex items-center justify-between relative overflow-hidden">
              {/* Efeito Glow Náutico */}
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
              
              <div className="flex items-center gap-3 z-10">
                <div className="h-10 w-10 bg-primary/10 border border-primary/40 rounded-xl flex items-center justify-center shadow-inner">
                  <Bot className="h-5 w-5 text-primary animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-white tracking-wide">Copiloto NavalDocs Pro</h3>
                    <Badge className="bg-primary text-navy font-black text-[8px] uppercase tracking-widest border-none px-1.5 py-0.5">
                      Gemini 3.7 Ultra
                    </Badge>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block animate-ping"></span>
                    Marinha do Brasil &bull; NORMAMs 01, 02, 03, 11 e 211
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 z-10">
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors hidden sm:inline-flex"
                  title={isExpanded ? 'Reduzir largura' : 'Expandir tela cheia'}
                >
                  {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </button>
                <button
                  onClick={handleClearHistory}
                  className="text-slate-400 hover:text-amber-400 p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                  title="Limpar histórico da conversa"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                  title="Fechar (Esc)"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Live Context Dashboard Bar (Mostra status ao vivo do usuário) */}
            {liveContext && (
              <div className="bg-slate-900/80 px-4 py-2 border-b border-white/5 flex items-center justify-between text-[10px] font-semibold text-slate-300">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Ship className="h-3 w-3 text-primary" />
                    <strong>{liveContext.vesselsCount}</strong> Barcos
                  </span>
                  <span className="flex items-center gap-1">
                    <FileText className="h-3 w-3 text-blue-400" />
                    <strong>{liveContext.processesCount}</strong> Processos
                  </span>
                </div>
                {liveContext.deadlinesSummary && (
                  <div className="flex items-center gap-2">
                    {liveContext.deadlinesSummary.criticalCount > 0 ? (
                      <span className="text-amber-400 flex items-center gap-1 font-bold">
                        <Clock className="h-3 w-3 animate-spin" />
                        {liveContext.deadlinesSummary.criticalCount} Vencendo
                      </span>
                    ) : (
                      <span className="text-emerald-400 flex items-center gap-1 font-bold">
                        <CheckCircle2 className="h-3 w-3" />
                        Conformidade 100%
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Quick Prompts Bar Inteligente com Filtros Rápidos */}
            <div className="p-2.5 bg-slate-900/50 border-b border-white/5 flex items-center gap-2 overflow-x-auto custom-scrollbar">
              <button
                onClick={() => handleSendPrompt('Quais são as taxas de GRU da DPC para cada serviço?')}
                className="text-[10px] font-bold text-slate-200 bg-slate-800/80 hover:bg-primary/20 hover:text-primary hover:border-primary/40 px-2.5 py-1.5 rounded-lg border border-slate-700/50 shrink-0 transition-all flex items-center gap-1.5"
              >
                <DollarSign className="h-3 w-3 text-emerald-400" /> Taxas GRU DPC
              </button>
              <button
                onClick={() => handleSendPrompt('Quais os equipamentos de salvatagem obrigatórios pela NORMAM-01?')}
                className="text-[10px] font-bold text-slate-200 bg-slate-800/80 hover:bg-primary/20 hover:text-primary hover:border-primary/40 px-2.5 py-1.5 rounded-lg border border-slate-700/50 shrink-0 transition-all flex items-center gap-1.5"
              >
                <ShieldCheck className="h-3 w-3 text-blue-400" /> NORMAM-01 Salvatagem
              </button>
              <button
                onClick={() => handleSendPrompt('Qual o checklist e prazo para transferência de embarcação?')}
                className="text-[10px] font-bold text-slate-200 bg-slate-800/80 hover:bg-primary/20 hover:text-primary hover:border-primary/40 px-2.5 py-1.5 rounded-lg border border-slate-700/50 shrink-0 transition-all flex items-center gap-1.5"
              >
                <FileCheck2 className="h-3 w-3 text-purple-400" /> Transferência
              </button>
              <button
                onClick={() => handleSendPrompt('Gerar modelo de Procuração Específica para a Capitania dos Portos')}
                className="text-[10px] font-bold text-slate-200 bg-slate-800/80 hover:bg-primary/20 hover:text-primary hover:border-primary/40 px-2.5 py-1.5 rounded-lg border border-slate-700/50 shrink-0 transition-all flex items-center gap-1.5"
              >
                <FileText className="h-3 w-3 text-amber-400" /> Modelo Procuração
              </button>
              <button
                onClick={() => handleSendPrompt('Como estão os prazos e vencimentos da minha frota naval?')}
                className="text-[10px] font-bold text-slate-200 bg-slate-800/80 hover:bg-primary/20 hover:text-primary hover:border-primary/40 px-2.5 py-1.5 rounded-lg border border-slate-700/50 shrink-0 transition-all flex items-center gap-1.5"
              >
                <Clock className="h-3 w-3 text-rose-400" /> Prazos da Frota
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar bg-slate-950/70">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[92%] p-4 rounded-2xl text-xs leading-relaxed transition-all ${
                      msg.sender === 'user'
                        ? 'bg-gradient-to-r from-primary to-amber-400 text-slate-950 font-semibold rounded-br-none shadow-lg'
                        : 'bg-slate-900/90 border border-slate-800 text-slate-200 rounded-bl-none shadow-xl space-y-3 backdrop-blur-md'
                    }`}
                  >
                    {/* Chain of Thought Indicator se houver */}
                    {msg.thoughtSteps && msg.thoughtSteps.length > 0 && (
                      <div className="bg-slate-950/60 p-2.5 rounded-xl border border-white/5 space-y-1.5 mb-2">
                        <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-primary tracking-wider">
                          <Sparkles className="h-3 w-3" /> Raciocínio Regulatório Naval
                        </div>
                        <div className="space-y-1">
                          {msg.thoughtSteps.map((step, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-[10px] text-slate-400">
                              <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
                              <span><strong className="text-slate-300">{step.label}:</strong> {step.detail}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Conteúdo Principal da Mensagem */}
                    <div className="whitespace-pre-line text-[12px] font-normal leading-relaxed selection:bg-primary/30">
                      {msg.content}
                    </div>

                    {/* Botões de Ações Interativas (se houver) */}
                    {msg.actions && msg.actions.length > 0 && (
                      <div className="pt-2 border-t border-slate-800 space-y-2">
                        <div className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                          Ações Rápidas Recomendadas:
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {msg.actions.map((act) => (
                            <button
                              key={act.id}
                              onClick={() => handleActionClick(act)}
                              className="text-left p-2.5 rounded-xl bg-slate-800/90 hover:bg-primary/20 hover:border-primary/50 border border-slate-700/60 transition-all group flex flex-col justify-between"
                            >
                              <div className="flex items-center justify-between w-full">
                                <span className="font-bold text-[11px] text-primary group-hover:text-amber-300">
                                  {act.title}
                                </span>
                                <ChevronRight className="h-3 w-3 text-slate-400 group-hover:translate-x-1 transition-transform" />
                              </div>
                              <span className="text-[9px] text-slate-400 mt-1 line-clamp-1">
                                {act.description}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Quick Replies Buttons */}
                    {msg.quickReplies && msg.quickReplies.length > 0 && (
                      <div className="pt-2 flex flex-wrap gap-1.5 border-t border-slate-800">
                        {msg.quickReplies.map((qr, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSendPrompt(qr)}
                            className="text-[9px] font-bold bg-slate-800/60 hover:bg-primary/20 hover:text-primary text-slate-300 px-2 py-1 rounded-md border border-slate-700/40 transition-colors"
                          >
                            💬 {qr}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Tags e Normas Referenciadas */}
                    {(msg.tags || msg.referencedNorms) && (
                      <div className="flex flex-wrap items-center justify-between gap-1 pt-2 border-t border-slate-800/60">
                        <div className="flex flex-wrap gap-1">
                          {msg.tags?.map((tag, i) => (
                            <span key={i} className="text-[8px] font-black uppercase text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
                              #{tag}
                            </span>
                          ))}
                        </div>
                        {msg.sender === 'assistant' && (
                          <button
                            onClick={() => handleCopyMessage(msg.content)}
                            className="text-[9px] text-slate-400 hover:text-white flex items-center gap-1 p-1 rounded hover:bg-slate-800 transition-colors"
                            title="Copiar texto"
                          >
                            <Copy className="h-3 w-3" /> Copiar
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] text-slate-500 font-bold mt-1 px-1">{msg.timestamp}</span>
                </div>
              ))}

              {/* Status de Pensamento / Reasoning da IA */}
              {isTyping && (
                <div className="flex flex-col gap-2 p-3 bg-slate-900/90 border border-primary/30 rounded-2xl w-fit max-w-[85%] animate-in fade-in duration-200">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-[11px] font-bold text-primary">Gemini 3.7 Naval Neural Raciocinando...</span>
                  </div>
                  {activeThought && (
                    <p className="text-[10px] text-slate-400 pl-6 animate-pulse">
                      {activeThought}
                    </p>
                  )}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Form & Voice Control */}
            <div className="p-4 bg-slate-900/90 border-t border-slate-800/80 backdrop-blur-md">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendPrompt(inputQuery);
                }}
                className="flex items-center gap-2"
              >
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={inputQuery}
                    onChange={(e) => setInputQuery(e.target.value)}
                    placeholder={
                      isListening
                        ? 'Ouvindo microfone...'
                        : 'Pergunte sobre NORMAM, taxas GRU, prazos da frota...'
                    }
                    className={`w-full pl-4 pr-10 py-3 rounded-xl bg-slate-950 border ${
                      isListening ? 'border-red-500 ring-2 ring-red-500/20' : 'border-slate-800'
                    } text-xs font-medium text-white placeholder-slate-500 focus:ring-2 focus:ring-primary/40 focus:border-primary outline-none transition-all`}
                  />
                  
                  {/* Botão de Microfone / Voz */}
                  <button
                    type="button"
                    onClick={toggleSpeechRecognition}
                    className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors ${
                      isListening
                        ? 'bg-red-500 text-white animate-pulse'
                        : 'text-slate-400 hover:text-primary hover:bg-white/5'
                    }`}
                    title={isListening ? 'Parar de ouvir' : 'Falar por comando de voz'}
                  >
                    {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </button>
                </div>

                <Button
                  type="submit"
                  disabled={!inputQuery.trim() || isTyping}
                  className="bg-primary hover:bg-amber-400 text-slate-950 font-bold rounded-xl h-11 px-4 shadow-lg transition-all"
                >
                  <Send className="h-4 w-4 text-slate-950" />
                </Button>
              </form>

              <div className="flex items-center justify-between text-[8px] font-black uppercase text-slate-500 mt-2 px-1">
                <span className="flex items-center gap-1">
                  <Anchor className="h-2.5 w-2.5 text-primary" /> NavalDocs Neural Copilot 2026
                </span>
                <span>Marinha do Brasil &bull; DPC &bull; LESTA</span>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
