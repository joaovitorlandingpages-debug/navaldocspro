import React, { useState, useEffect } from 'react';
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
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: string;
  tags?: string[];
}

export function NavalCopilotDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputQuery, setInputQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg-welcome',
      sender: 'assistant',
      content: `⚓ **Olá! Eu sou o Copiloto NavalDocs Pro (Gemini 3.7 + Antigravity Engine).**

Estou pronto para auditar conformidade com a **Marinha do Brasil (NORMAM-01, 02, 03, 11 e 211)**, calcular taxas de GRU da DPC, verificar prazos de TIE/CSN ou orientar sobre qualquer processo naval.

Como posso te ajudar agora?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      tags: ['NORMAM-01', 'Taxas GRU', 'Auditoria TIE'],
    },
  ]);

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

  const handleSendPrompt = (queryText: string) => {
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

    // Simulação do Gemini Reasoning para NORMAM & Marinha
    setTimeout(() => {
      let botResponse = '';
      const q = text.toLowerCase();

      if (q.includes('taxa') || q.includes('gru') || q.includes('valor')) {
        botResponse = `💰 **Tabela de Serviços e Taxas da Diretoria de Portos e Costas (DPC):**

• **Inscrição de Embarcação (TIE) até 12m:** R$ 130,00 (GRU simples).
• **Transferência de Propriedade:** R$ 115,00 + reconhecimento de firma por autenticidade.
• **2ª Via do TIE / TIEM:** R$ 85,00.
• **Renovação de Carteira de Amador (CHA - Arrais/Mestre):** R$ 60,00.
• **Emissão de Certificado CSN:** Varia conforme arqueação bruta (AB) e tonelagem.

*Dica NavalDocs:* O boleto da GRU deve ser emitido exclusivamente pelo site da DPC (código de recolhimento 28830-6).`;
      } else if (q.includes('colete') || q.includes('salvatagem') || q.includes('normam-01') || q.includes('equipamento')) {
        botResponse = `🦺 **Dotação de Salvatagem Obrigatória (NORMAM-01 - Esporte e Recreio):**

1. **Coletes Salva-Vidas:** 1 por pessoa a bordo (Classe II para Mar Aberto ou Classe III para Navegação Interior), homologados pela DPC com apito e fitas refletivas.
2. **Boia Circular:** Obrigatória para embarcações acima de 5 metros, com cabo retinida flutuante de no mínimo 20 metros.
3. **Pirotécnicos:** 2 fachos manuais vermelhos + 2 foguetes com paraquedas (válidos por 3 anos a contar da fabricação).
4. **Extintores de Incêndio:** Tipo B-1 ou ABC no cockpit e próximo ao compartimento do motor com manômetro na faixa verde.`;
      } else if (q.includes('divergência') || q.includes('divergencia') || q.includes('cpf') || q.includes('ocr')) {
        botResponse = `🔍 **Guia Anti-Indeferimento na Capitania dos Portos:**

As causas mais comuns de exigência documental são:
• **CPF do proprietário divergente** entre o TIE e a CNH/RG anexada.
• **Falta de reconhecimento de firma** por autenticidade no Requerimento do Proprietário e Contrato de Compra e Venda.
• **Procuração sem poderes expressos** perante a "Capitania dos Portos / Delegacia / Agência da Marinha".
• **Número de série do motor** ilegível ou divergente da Nota Fiscal da revenda autorizada.

*O validador cruzado do NavalDocs Pro já faz essa verificação automaticamente em cada upload!*`;
      } else {
        botResponse = `⚓ **Análise Regulatória NavalDocs Copilot:**

Com base nas normas da **Diretoria de Portos e Costas (DPC)** e regras de conformidade naval:

• Para o procedimento informado, certifique-se de que a embarcação possui arqueação compatível e registro atualizado na Capitania local.
• Todos os documentos gerados pela plataforma seguem rigorosamente os layouts oficiais com assinatura digital criptográfica e QR Code de autenticação.

Precisa que eu gere o checklist ou simule a auditoria deste processo?`;
      }

      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        content: botResponse,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setIsTyping(false);
    }, 700);
  };

  return (
    <>
      {/* Botão Flutuante Global */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-[90] bg-navy text-primary p-4 rounded-full shadow-2xl hover:scale-105 border-2 border-primary/40 transition-all flex items-center gap-3 group"
          title="Abrir Copiloto NavalDocs (Ctrl+K)"
        >
          <Bot className="h-6 w-6 text-primary animate-pulse" />
          <span className="hidden md:inline text-xs font-black uppercase text-white tracking-widest pr-2">
            Copiloto IA <kbd className="ml-1 bg-white/10 px-1.5 py-0.5 rounded text-[9px] text-primary">Ctrl+K</kbd>
          </span>
        </button>
      )}

      {/* Drawer Lateral do Copiloto */}
      {isOpen && (
        <div className="fixed inset-y-0 right-0 z-[100] w-full sm:w-[480px] bg-white shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-300">
          {/* Header */}
          <div className="bg-navy p-5 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-primary/20 rounded-xl flex items-center justify-center">
                <Bot className="h-6 w-6 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-white">Copiloto NavalDocs</h3>
                  <Badge className="bg-primary text-navy font-black text-[8px] uppercase tracking-wider border-none">
                    Gemini 3.7
                  </Badge>
                </div>
                <p className="text-[10px] text-slate-300 font-medium">
                  Raciocínio Regulatório & Compliance NORMAM
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="text-white/60 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Quick Prompts Bar */}
          <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2 overflow-x-auto custom-scrollbar">
            <button
              onClick={() => handleSendPrompt('Quais são as taxas de GRU da DPC para transferência?')}
              className="text-[10px] font-bold text-navy bg-white hover:bg-primary/10 hover:text-primary px-3 py-1.5 rounded-lg border border-slate-200 shrink-0 transition-colors flex items-center gap-1"
            >
              <DollarSign className="h-3 w-3 text-emerald-500" /> Taxas GRU
            </button>
            <button
              onClick={() => handleSendPrompt('Quais os equipamentos de salvatagem da NORMAM-01?')}
              className="text-[10px] font-bold text-navy bg-white hover:bg-primary/10 hover:text-primary px-3 py-1.5 rounded-lg border border-slate-200 shrink-0 transition-colors flex items-center gap-1"
            >
              <ShieldCheck className="h-3 w-3 text-blue-500" /> NORMAM-01 Salvatagem
            </button>
            <button
              onClick={() => handleSendPrompt('Quais as principais causas de exigência e divergência na Capitania?')}
              className="text-[10px] font-bold text-navy bg-white hover:bg-primary/10 hover:text-primary px-3 py-1.5 rounded-lg border border-slate-200 shrink-0 transition-colors flex items-center gap-1"
            >
              <AlertCircle className="h-3 w-3 text-amber-500" /> Evitar Exigências
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar bg-slate-50/50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[88%] p-4 rounded-2xl text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-primary text-navy font-semibold rounded-br-none shadow-sm'
                      : 'bg-white border border-slate-200 text-slate-700 rounded-bl-none shadow-sm space-y-2'
                  }`}
                >
                  <div className="whitespace-pre-line">{msg.content}</div>
                  {msg.tags && (
                    <div className="flex flex-wrap gap-1 pt-2 border-t border-slate-100">
                      {msg.tags.map((tag, i) => (
                        <span key={i} className="text-[8px] font-black uppercase text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <span className="text-[9px] text-slate-400 font-bold mt-1 px-1">{msg.timestamp}</span>
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-2 text-slate-400 text-xs p-2 bg-white rounded-xl border border-slate-100 w-fit">
                <RefreshCw className="h-3.5 w-3.5 animate-spin text-primary" />
                <span className="text-[10px] font-bold">Consultando NORMAM e inteligência naval...</span>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-slate-200">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendPrompt(inputQuery);
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder="Pergunte sobre NORMAM, taxas, TIE, vistorias..."
                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
              />
              <Button
                type="submit"
                disabled={!inputQuery.trim() || isTyping}
                className="bg-navy hover:bg-navy/90 text-white rounded-xl h-11 px-4"
              >
                <Send className="h-4 w-4 text-primary" />
              </Button>
            </form>
            <div className="flex items-center justify-between text-[8px] font-black uppercase text-slate-400 mt-2 px-1">
              <span>NavalDocs Neural Copilot</span>
              <span>Marinha do Brasil &bull; DPC 2026</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
