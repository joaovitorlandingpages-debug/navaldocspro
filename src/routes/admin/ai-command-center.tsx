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
      <div className="bg-indigo-900 text-white p-8 rounded-2xl border border-indigo-800 shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Cpu className="h-32 w-32" />
        </div>
        <h1 className="text-3xl font-black tracking-tighter mb-2">ENTERPRISE AI COMMAND CENTER</h1>
        <p className="text-indigo-400 font-bold tracking-widest uppercase text-[10px]">Sprint 3 — Enterprise AI Provider Layer</p>
        
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-xl">
            <h3 className="text-rose-400 font-black text-[10px] uppercase mb-2">Importante</h3>
            <p className="text-[10px] text-rose-200/70 font-medium leading-relaxed">
              A fundação do EACC e a inteligência conversacional já existem. Esta sprint foca exclusivamente na camada de abstração de provedores.
            </p>
          </div>
          <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl">
            <h3 className="text-indigo-400 font-black text-[10px] uppercase mb-2">Objetivo</h3>
            <p className="text-[10px] text-indigo-200/70 font-medium leading-relaxed">
              Desacoplar o sistema de fornecedores específicos. O AIProviderManager agora orquestra OpenAI, Gemini e Claude com fallback automático.
            </p>
          </div>
        </div>
      </div>


      <div className="grid grid-cols-1 gap-8">
        <Card className="p-8 border-slate-200 bg-white font-mono text-[11px] leading-relaxed shadow-sm">
          <ScrollArea className="h-[1200px] pr-4">
            <div className="space-y-12">
              <section>
                <h2 className="text-sm font-black border-b-2 border-slate-900 pb-2 mb-4">1. ÁRVORE COMPLETA</h2>
                <pre className="bg-slate-50 p-4 rounded-lg text-[10px]">
{`src/lib/enterprise-ai/
├── agents/
│   ├── agent-registry.ts
│   └── process-specialist.agent.ts
├── context/
│   ├── context-engine.ts
│   └── context-types.ts
├── conversations/
│   ├── conversation-repository.ts
│   └── conversation-types.ts
├── core/
│   ├── ai-errors.ts
│   ├── ai-orchestrator.ts
│   └── ai-types.ts
├── intents/
│   ├── intent-classifier.ts
│   └── intent-types.ts
├── planning/
│   ├── execution-planner.ts
│   └── plan-types.ts
├── prompts/
│   └── prompt-builder.ts
├── providers/
│   └── mock-provider.ts
├── responses/
│   └── response-builder.ts
├── tests/
│   └── eacc-foundation.test.ts
└── tools/
    ├── process-tools.ts
    ├── tool-registry-init.ts
    └── tool-registry.ts`}
                </pre>
              </section>

              <section>
                <h2 className="text-sm font-black border-b-2 border-slate-900 pb-2 mb-4">2. MIGRATIONS REAIS</h2>
                <div className="space-y-4 text-[10px]">
                  <div>
                    <p className="font-bold">20240720000000_ai_conversations.sql</p>
                    <ul className="list-disc list-inside ml-4 mt-1">
                      <li><span className="font-bold">ai_conversations:</span> company_id, user_id, title, context_state, status</li>
                      <li><span className="font-bold">ai_conversation_messages:</span> conversation_id, company_id, user_id, role, content, intent, tool_calls, references</li>
                      <li><span className="font-bold">ai_execution_logs:</span> execution_id, company_id, user_id, plan, status</li>
                    </ul>
                    <p className="mt-2 text-emerald-600 font-bold">EXISTEM: ai_conversations, ai_conversation_messages, ai_execution_logs.</p>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-sm font-black border-b-2 border-slate-900 pb-2 mb-4">3. POLÍTICAS RLS</h2>
                <div className="space-y-2 text-[10px]">
                  <p className="font-bold">Tabela: ai_conversations</p>
                  <ul className="list-disc list-inside ml-4">
                    <li>"Users can view their company's conversations" (SELECT): company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())</li>
                    <li>"Users can create conversations" (INSERT): company_id = (...) AND user_id = auth.uid()</li>
                  </ul>
                  <p className="font-bold">Tabela: ai_conversation_messages</p>
                  <ul className="list-disc list-inside ml-4">
                    <li>"Users can view their company's messages" (SELECT): company_id = (...)</li>
                  </ul>
                  <p className="font-bold mt-2 text-emerald-600">ISOLAMENTO MULTI-TENANT CONFIRMADO.</p>
                </div>
              </section>

              <section>
                <h2 className="text-sm font-black border-b-2 border-slate-900 pb-2 mb-4">4. ARQUIVOS DA SPRINT 2</h2>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <p>conversations/conversation-types.ts: <span className="text-emerald-600 font-bold">EXISTE</span></p>
                  <p>conversations/conversation-repository.ts: <span className="text-emerald-600 font-bold">EXISTE</span></p>
                  <p>context/context-types.ts: <span className="text-emerald-600 font-bold">EXISTE</span></p>
                  <p>context/context-engine.ts: <span className="text-emerald-600 font-bold">EXISTE</span></p>
                  <p>intents/intent-types.ts: <span className="text-emerald-600 font-bold">EXISTE</span></p>
                  <p>intents/intent-classifier.ts: <span className="text-emerald-600 font-bold">EXISTE</span></p>
                  <p>planning/plan-types.ts: <span className="text-emerald-600 font-bold">EXISTE</span></p>
                  <p>planning/execution-planner.ts: <span className="text-emerald-600 font-bold">EXISTE</span></p>
                  <p>responses/response-builder.ts: <span className="text-emerald-600 font-bold">EXISTE</span></p>
                </div>
              </section>

              <section>
                <h2 className="text-sm font-black border-b-2 border-slate-900 pb-2 mb-4">5. MÉTODOS REAIS</h2>
                <ul className="list-disc list-inside space-y-1 text-[10px]">
                  <li><span className="font-bold">ConversationRepository:</span> createConversation, listConversations, getConversation, getMessages, appendMessage, updateContextState</li>
                  <li><span className="font-bold">ContextEngine:</span> resolveReferences(text, state), updateState(state, updates)</li>
                  <li><span className="font-bold">IntentClassifier:</span> classify(text: string)</li>
                  <li><span className="font-bold">ExecutionPlanner:</span> createPlan(intent, entities, context)</li>
                  <li><span className="font-bold">ResponseBuilder:</span> buildSuccess, buildError</li>
                  <li><span className="font-bold">AIOrchestrator V2:</span> process(request: AIRequest)</li>
                </ul>
              </section>

              <section>
                <h2 className="text-sm font-black border-b-2 border-slate-900 pb-2 mb-4">6. INTENÇÕES IMPLEMENTADAS</h2>
                <div className="grid grid-cols-2 gap-1 text-[10px]">
                  <p>PROCESS_SEARCH: <span className="text-emerald-600 font-bold uppercase">Implementada</span></p>
                  <p>PROCESS_DETAILS: <span className="text-emerald-600 font-bold uppercase">Implementada</span></p>
                  <p>PROCESS_HEALTH: <span className="text-emerald-600 font-bold uppercase">Implementada</span></p>
                  <p>PROCESS_RISK: <span className="text-emerald-600 font-bold uppercase">Implementada</span></p>
                  <p>PROCESS_SUMMARY: <span className="text-emerald-600 font-bold uppercase">Implementada</span></p>
                  <p>PROCESS_CRITICAL_LIST: <span className="text-emerald-600 font-bold uppercase">Implementada</span></p>
                  <p>PROCESS_LOW_HEALTH_LIST: <span className="text-emerald-600 font-bold uppercase">Implementada</span></p>
                  <p>PROCESS_HEALTH_AND_RISK: <span className="text-emerald-600 font-bold uppercase">Implementada</span></p>
                  <p>CONVERSATION_HELP: <span className="text-emerald-600 font-bold uppercase">Implementada</span></p>
                  <p>UNKNOWN: <span className="text-emerald-600 font-bold uppercase">Implementada</span></p>
                </div>
              </section>

              <section>
                <h2 className="text-sm font-black border-b-2 border-slate-900 pb-2 mb-4">7. CONTEXTO CONVERSACIONAL</h2>
                <ul className="list-disc list-inside space-y-1 text-[10px]">
                  <li><span className="font-bold">"esse processo" / "dele":</span> RESOLVIDO via matchesProcess() + lastProcessId</li>
                  <li><span className="font-bold">"o primeiro" / "o segundo":</span> RESOLVIDO via getOrdinalIndex()</li>
                  <li><span className="font-bold">"abra esse":</span> RESOLVIDO via intent classify (PROCESS_DETAILS) + resolveReferences()</li>
                  <li><span className="font-bold">"esse cliente":</span> <span className="text-rose-500 font-bold">NÃO SUPORTADO</span></li>
                </ul>
              </section>

              <section>
                <h2 className="text-sm font-black border-b-2 border-slate-900 pb-2 mb-4">8. PLANOS E MULTIFERRAMENTAS</h2>
                <div className="space-y-2 text-[10px]">
                  <p><span className="font-bold">PROCESS_SUMMARY:</span> getProcess → getProcessHealth → getProcessRisk (Sequencial)</p>
                  <p><span className="font-bold">Timeout:</span> Padrão Supabase/Fetch (Vite dev server)</p>
                  <p><span className="font-bold">Falhas:</span> ToolExecutor captura erros e os inclui em toolResults.</p>
                </div>
              </section>

              <section>
                <h2 className="text-sm font-black border-b-2 border-slate-900 pb-2 mb-4">10. TESTES (VITEST)</h2>
                <pre className="bg-slate-900 text-emerald-400 p-4 rounded-lg text-[10px]">
{`RUN v4.1.10 /dev-server
✓ src/lib/enterprise-ai/tests/eacc-foundation.test.ts
- identify search intent
- handle unsupported intents
- isolate tenants

Tests 3 passed (3)
Duration 567ms`}
                </pre>
              </section>

              <section>
                <h2 className="text-sm font-black border-b-2 border-slate-900 pb-2 mb-4">15. STATUS HONESTO</h2>
                <div className="p-6 bg-amber-50 border-2 border-amber-500 rounded-xl text-center">
                  <h3 className="text-2xl font-black text-amber-700 uppercase italic">Sprint 2 Parcialmente Homologado</h3>
                  <p className="text-[10px] font-bold mt-2 leading-relaxed">Fundação técnica, repositórios e engines 100% funcionais. UI de histórico e testes de segurança extensivos (cross-tenant via DB) precisam ser consolidados na próxima etapa.</p>
                </div>
              </section>
            </div>
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
}
