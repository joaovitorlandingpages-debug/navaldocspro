import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { PageHeader } from "@/components/navigation/PageHeader";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Bot, 
  Cpu, 
  ShieldCheck, 
  Activity, 
  Send, 
  Loader2, 
  AlertCircle,
  Code,
  CheckCircle2,
  History,
  MessageSquare,
  Plus
} from "lucide-react";
import { initializeEACC, AIOrchestrator, AIResponse, AgentRegistry, ToolRegistry } from "@/lib/enterprise-ai";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/ai-command-center")({
  component: AICommandCenterPage,
});

function AICommandCenterPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState<AIResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [agentsCount, setAgentsCount] = useState(0);
  const [toolsCount, setToolsCount] = useState(0);
  const [orchestrator, setOrchestrator] = useState<AIOrchestrator | null>(null);

  const isEnabled = isFeatureEnabled("ENTERPRISE_AI_COMMAND_CENTER_ENABLED");

  useEffect(() => {
    if (isEnabled) {
      const eacc = initializeEACC();
      setOrchestrator(eacc.orchestrator);
      setAgentsCount(AgentRegistry.list().length);
      setToolsCount(ToolRegistry.list().length);
    }
  }, [isEnabled]);

  if (!isEnabled) {
    return <Navigate to="/admin" />;
  }

  const handleTest = async () => {
    if (!message.trim() || !user || !orchestrator) return;
    
    setLoading(true);
    setError(null);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id, role')
        .eq('id', user.id)
        .single();

      if (!profile) throw new Error("Profile not found");

      const request = {
        message,
        userId: user.id,
        companyId: profile.company_id || '',
      };

      const res = await orchestrator.process(request);
      setResponse(res);
      setMessage("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="bg-slate-900 text-white p-8 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Cpu className="h-32 w-32" />
        </div>
        <h1 className="text-3xl font-black tracking-tighter mb-2 uppercase">Enterprise AI Command Center</h1>
        <p className="text-emerald-400 font-bold tracking-widest uppercase text-[10px]">Security Engine & Automation Pipeline</p>
        
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl">
            <h3 className="text-rose-400 font-black text-[10px] uppercase mb-2">Segurança Enterprise</h3>
            <p className="text-[10px] text-rose-200/70 font-medium leading-relaxed">
              Toda ação executada pela IA passa por um pipeline de segurança obrigatório: Validação de Estado, 
              Isolamento de Tenant, Verificação de Permissões e Auditoria de Execução.
            </p>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl">
            <h3 className="text-emerald-400 font-black text-[10px] uppercase mb-2">Capacidade Operacional</h3>
            <p className="text-[10px] text-emerald-200/70 font-medium leading-relaxed">
              O motor de execução permite que a IA realize operações reais como criação de processos, 
              geração de documentos e requisição de assinaturas com supervisão humana.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <Card className="p-8 border-slate-200 bg-white font-mono text-[11px] leading-relaxed shadow-sm">
          <ScrollArea className="h-[1200px] pr-4">
            <div className="space-y-12 whitespace-pre-wrap">
              <section id="ts-visual-edit-probe-32a79a9ec5ca4364">
                =========================================================
NAVALDOCS PRO
FASE 2
SPRINT UX 1

PROCESS CREATION EXPERIENCE 2.0

"O MELHOR FLUXO DE ABERTURA DE PROCESSOS DO MUNDO"
=========================================================

A partir desta Sprint o foco NÃO é criar funcionalidades novas.

O foco é transformar toda a experiência de criação de processos.

Quero que qualquer engenheiro consiga abrir um processo completo em menos de 2 minutos.

O sistema deve transmitir velocidade, organização, inteligência e simplicidade.

=========================================================
NÃO REMOVER NENHUMA FUNCIONALIDADE EXISTENTE
=========================================================

Todo o sistema atual deve continuar funcionando.

Apenas reorganizar a experiência.

Não remover regras.

Não remover validações.

Não remover segurança.

=========================================================
NOVA EXPERIÊNCIA
=========================================================

Toda criação de processo passa a acontecer em um Wizard moderno.

Interface limpa.

Poucos campos por tela.

Responsiva.

Desktop e Mobile.

Salvar automaticamente o progresso.

=========================================================
ETAPA 1
CLIENTE
=========================================================

Pesquisar cliente em tempo real.

Resultados instantâneos.

Mostrar:

• Nome

• CPF/CNPJ

• Telefone

• Cidade

• Último processo

Botão:

➕ Novo Cliente

Sem sair do Wizard.

Ao cadastrar:

selecionar automaticamente.

=========================================================
ETAPA 2
EMBARCAÇÃO
=========================================================

Mostrar apenas embarcações daquele cliente.

Exibir:

• Nome

• Tipo

• Número

• Última inspeção

• Status

Botão:

➕ Nova embarcação

Cadastro rápido.

Sem sair da tela.

=========================================================
ETAPA 3
TIPO DE PROCESSO
=========================================================

Interface em cartões.

Exemplo:

🟦 Renovação

🟩 Inspeção

🟨 Registro

🟪 Transferência

🟥 Cancelamento

Cada cartão mostra:

• descrição

• documentos necessários

• tempo estimado

=========================================================
ETAPA 4
CHECKLIST
=========================================================

Carregar automaticamente.

Mostrar progresso.

Cada item deve indicar:

✔ concluído

📷 precisa foto

📄 precisa PDF

🤖 pode usar OCR

Permitir concluir rapidamente.

=========================================================
ETAPA 5
DOCUMENTOS
=========================================================

Interface extremamente visual.

Cada documento como um card.

Exibir:

Status

Botão Fotografar

Botão Upload

Botão OCR

Preview

=========================================================
ETAPA 6
REVISÃO
=========================================================

Mostrar tudo em uma única tela.

Cliente

Embarcação

Processo

Checklist

Documentos

Assinaturas

PDFs

Botão:

CRIAR PROCESSO

=========================================================
BARRA DE PROGRESSO
=========================================================

Sempre visível.

Exemplo:

Cliente ✓

Embarcação ✓

Tipo ✓

Checklist ✓

Documentos 60%

Revisão

=========================================================
PAINEL DO PROCESSO
=========================================================

Após criar.

Abrir imediatamente.

Layout moderno.

Sem trocar de páginas.

Tudo organizado em Cards.

Cards:

Resumo

Cliente

Embarcação

Checklist

OCR

Documentos

PDFs

Assinaturas

Timeline

Comentários

Histórico

Auditoria

=========================================================
TIMELINE
=========================================================

Mostrar toda movimentação.

Processo criado

Documento enviado

OCR concluído

PDF gerado

Assinatura enviada

Assinatura concluída

Finalização

Tudo cronológico.

=========================================================
INTELIGÊNCIA
=========================================================

Sempre sugerir.

Nunca executar automaticamente.

Exemplos:

"Falta o documento X."

"Este certificado venceu."

"Posso preencher estes dados?"

=========================================================
MOBILE
=========================================================

Toda experiência otimizada.

Botões grandes.

Poucos cliques.

Uso com apenas uma mão.

=========================================================
PERFORMANCE
=========================================================

Transições rápidas.

Pré-carregar dados.

Evitar telas de carregamento.

=========================================================
ACESSIBILIDADE
=========================================================

Contraste adequado.

Fontes legíveis.

Ícones claros.

=========================================================
TESTES
=========================================================

Validar:

Desktop.

Tablet.

Celular.

Fluxo completo.

Novo cliente.

Nova embarcação.

Processo completo.

Autosave.

OCR.

Checklist.

=========================================================
IMPORTANTE
=========================================================

Não criar uma interface comum.

Criar uma experiência premium.

Quero que um engenheiro abra o NavalDocs Pro pela primeira vez e consiga criar um processo intuitivamente, sem treinamento.

Toda decisão de UX deve priorizar:

• menos cliques;
• menos digitação;
• mais velocidade;
• mais clareza;
• aparência premium;
• sensação de software de última geração.
              </section>
            </div>
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
}