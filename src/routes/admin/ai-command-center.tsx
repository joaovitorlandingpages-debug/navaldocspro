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
              <section id="ts-visual-edit-probe-6b835d1800dd4893">
                <div className="bg-slate-50 border-2 border-slate-900 p-8 rounded-2xl shadow-xl">
                  <h2 className="text-2xl font-black text-slate-900 mb-6 border-b-4 border-slate-900 pb-2 uppercase italic">ENTERPRISE AI COMMAND CENTER</h2>
                  <div className="space-y-6 font-mono text-xs leading-relaxed">
                    <div className="bg-emerald-100 text-emerald-900 p-2 font-bold text-center rounded">GATE DE HOMOLOGAÇÃO — SPRINT 5.2</div>
                    
                    <div className="bg-rose-100 text-rose-900 p-4 border border-rose-200 rounded text-center font-bold">
                      NÃO IMPLEMENTAR NOVAS FUNCIONALIDADES.<br />
                      NÃO ALTERAR O CÓDIGO NESTA ETAPA.<br />
                      Realize somente a auditoria técnica da CreateProcessAction já implementada.
                    </div>

                    <div className="bg-white p-4 border border-slate-200 rounded shadow-sm">
                      <p className="font-bold border-b mb-2 uppercase">1. ARQUIVOS</p>
                      <p>Liste todos os arquivos criados e alterados pela Sprint 5.2.</p>
                      <p className="mt-2">Separar:</p>
                      <ul className="list-disc pl-4">
                        <li>arquivos novos;</li>
                        <li>arquivos alterados;</li>
                        <li>testes;</li>
                        <li>migrations, se houver.</li>
                      </ul>
                      <p className="mt-2 font-bold text-emerald-600 italic">Confirmar explicitamente que o Process Center não foi alterado.</p>
                    </div>

                    <div className="bg-white p-4 border border-slate-200 rounded shadow-sm">
                      <p className="font-bold border-b mb-2 uppercase">2. CONTRATO DA ACTION</p>
                      <p>Apresentar:</p>
                      <ul className="list-disc pl-4">
                        <li>assinatura pública da CreateProcessAction;</li>
                        <li>interface CreateProcessInput;</li>
                        <li>permissões exigidas;</li>
                        <li>política de risco;</li>
                        <li>política de confirmação;</li>
                        <li>formato normalizado do resultado.</li>
                      </ul>
                      <p className="mt-2 font-bold text-emerald-600 italic">Confirmar que userId e companyId vêm exclusivamente do contexto autenticado.</p>
                    </div>

                    <div className="bg-white p-4 border border-slate-200 rounded shadow-sm">
                      <p className="font-bold border-b mb-2 uppercase">3. SERVIÇOS REUTILIZADOS</p>
                      <p>Mostrar como a Action reutiliza:</p>
                      <ul className="list-disc pl-4">
                        <li>materializeProcessBlueprint;</li>
                        <li>confirmProcessVisible.</li>
                      </ul>
                      <p className="mt-2">Informar:</p>
                      <ul className="list-disc pl-4">
                        <li>arquivos de origem;</li>
                        <li>assinaturas utilizadas;</li>
                        <li>ordem de chamada;</li>
                        <li>parâmetros enviados;</li>
                        <li>resultados retornados.</li>
                      </ul>
                      <p className="mt-2 font-bold text-emerald-600 italic">Confirmar explicitamente:</p>
                      <ul className="list-disc pl-4 text-emerald-600">
                        <li>não existe INSERT direto em processes;</li>
                        <li>não existe novo wizard;</li>
                        <li>não existe nova tabela de processos;</li>
                        <li>não existe duplicação da lógica de criação.</li>
                      </ul>
                    </div>

                    <div className="bg-slate-900 text-amber-400 p-4 rounded font-mono text-[10px]">
                      <p className="text-white mb-2 font-bold uppercase border-b border-amber-400/30 pb-1">4. FLUXO REAL</p>
                      <p>Comprovar o fluxo:</p>
                      <p>ActionExecutor</p>
                      <p>→ Audit Start</p>
                      <p>→ ActionValidator</p>
                      <p>→ PermissionGuard</p>
                      <p>→ ConfirmationService</p>
                      <p>→ CreateProcessAction</p>
                      <p>→ materializeProcessBlueprint</p>
                      <p>→ confirmProcessVisible</p>
                      <p>→ Audit Success ou Failure</p>
                      <p>→ ExecutionResult</p>
                      <p className="mt-2 italic">Informar onde cada etapa ocorre.</p>
                    </div>

                    <div className="bg-white p-4 border border-slate-200 rounded shadow-sm">
                      <p className="font-bold border-b mb-2 uppercase">5. VALIDAÇÃO DE TENANT</p>
                      <p>Comprovar:</p>
                      <ul className="list-disc pl-4">
                        <li>cliente pertence ao companyId autenticado;</li>
                        <li>embarcação pertence ao companyId autenticado;</li>
                        <li>embarcação pertence ao cliente informado;</li>
                        <li>processType é permitido;</li>
                        <li>anexos e participantes pertencem ao mesmo tenant, quando aplicável.</li>
                      </ul>
                      <p className="mt-2">Confirmar que o input não pode sobrescrever:</p>
                      <ul className="list-disc pl-4">
                        <li>companyId;</li>
                        <li>userId;</li>
                        <li>createdBy;</li>
                        <li>tenant metadata.</li>
                      </ul>
                    </div>

                    <div className="bg-white p-4 border border-slate-200 rounded shadow-sm">
                      <p className="font-bold border-b mb-2 uppercase">6. CONFIRMAÇÃO HUMANA</p>
                      <p>Comprovar que a CreateProcessAction utiliza o ConfirmationService persistente.</p>
                      <p className="mt-2">Informar:</p>
                      <ul className="list-disc pl-4">
                        <li>quando a confirmação é criada;</li>
                        <li>quais campos entram no payload hash;</li>
                        <li>TTL;</li>
                        <li>consumo único;</li>
                        <li>rejeição de token expirado;</li>
                        <li>rejeição de token já consumido;</li>
                        <li>rejeição de token de outro usuário;</li>
                        <li>rejeição de token de outro tenant;</li>
                        <li>rejeição após alteração de customerId, vesselId ou processType.</li>
                      </ul>
                      <p className="mt-2 font-bold text-rose-600">Não considerar mock como confirmação válida.</p>
                    </div>

                    <div className="bg-white p-4 border border-slate-200 rounded shadow-sm">
                      <p className="font-bold border-b mb-2 uppercase">7. IDEMPOTÊNCIA</p>
                      <p>Explicar como o sistema impede criação duplicada.</p>
                      <p className="mt-2">Informar:</p>
                      <ul className="list-disc pl-4">
                        <li>existe idempotencyKey?</li>
                        <li>como ela é calculada?</li>
                        <li>onde é persistida?</li>
                        <li>quais constraints ou índices impedem duplicidade?</li>
                        <li>o que ocorre em repetição do mesmo comando?</li>
                        <li>o que ocorre em duas execuções concorrentes?</li>
                      </ul>
                      <p className="mt-2 font-bold text-rose-600">IDEMPOTÊNCIA NÃO IMPLEMENTADA.</p>
                    </div>

                    <div className="bg-white p-4 border border-slate-200 rounded shadow-sm">
                      <p className="font-bold border-b mb-2 uppercase">8. AUDITORIA</p>
                      <p>Confirmar que são persistidos registros em: <code className="bg-slate-100 p-1 rounded">ai_action_audits</code></p>
                      <p className="mt-2">Para sucesso e falha, informar os campos:</p>
                      <ul className="grid grid-cols-2 gap-x-4">
                        <li>• executionId</li>
                        <li>• actionId</li>
                        <li>• userId</li>
                        <li>• companyId</li>
                        <li>• processId</li>
                        <li>• customerId</li>
                        <li>• vesselId</li>
                        <li>• processType</li>
                        <li>• status</li>
                        <li>• durationMs</li>
                        <li>• errorCode</li>
                        <li>• confirmationId</li>
                        <li>• metadata segura</li>
                      </ul>
                      <p className="mt-2 font-bold text-emerald-600 italic">Confirmar que não são registrados: token, payload sensível, stack trace, segredos.</p>
                    </div>

                    <div className="bg-white p-4 border border-slate-200 rounded shadow-sm">
                      <p className="font-bold border-b mb-2 uppercase">9. CORREÇÃO NO REGISTRY</p>
                      <p>Explicar exatamente qual problema existia no registro da CompleteChecklistAction.</p>
                      <p className="mt-2">Informar:</p>
                      <ul className="list-disc pl-4">
                        <li>qual arquivo foi alterado;</li>
                        <li>qual era o defeito;</li>
                        <li>como foi corrigido;</li>
                        <li>testes adicionados ou executados;</li>
                        <li>se havia risco de regressão;</li>
                        <li>confirmação de que todos os IDs de Action são únicos.</li>
                      </ul>
                    </div>

                    <div className="bg-white p-4 border border-slate-200 rounded shadow-sm">
                      <p className="font-bold border-b mb-2 uppercase">10. TESTES DA CREATEPROCESSACTION</p>
                      <p>Listar todos os testes existentes em: <code className="bg-slate-100 p-1 rounded">create-process-action.test.ts</code></p>
                      <p className="mt-2 italic">Informar nome, tipo (unitário ou integração) e resultado para cada teste.</p>
                      <p className="mt-2">Cobrir ou declarar ausência de testes para as 25 condições exigidas no Gate.</p>
                    </div>

                    <div className="bg-white p-4 border border-slate-200 rounded shadow-sm">
                      <p className="font-bold border-b mb-2 uppercase">11. SUÍTE COMPLETA</p>
                      <p>Explique o total de 107 testes.</p>
                      <p>Liste todos os arquivos de teste executados e a quantidade por arquivo.</p>
                      <p className="mt-2 font-bold text-emerald-600 italic">Confirmar que nenhum teste legado foi removido, desativado ou ignorado.</p>
                    </div>

                    <div className="bg-white p-4 border border-slate-200 rounded shadow-sm">
                      <p className="font-bold border-b mb-2 uppercase">12. TYPECHECK</p>
                      <p>Executar o comando real de typecheck.</p>
                      <p className="mt-2 font-bold text-emerald-600 italic">Confirmar exit code 0 e zero erros introduzidos pela Sprint 5.2.</p>
                    </div>

                    <div className="bg-white p-4 border border-slate-200 rounded shadow-sm">
                      <p className="font-bold border-b mb-2 uppercase">13. BUILD</p>
                      <p>Executar: <code className="bg-slate-100 p-1 rounded">npm run build</code></p>
                      <p className="mt-2 font-bold text-emerald-600 italic">Confirmar exit code 0 e build de produção concluído.</p>
                    </div>

                    <div className="bg-white p-4 border border-slate-200 rounded shadow-sm">
                      <p className="font-bold border-b mb-2 uppercase">14. NÃO REGRESSÃO</p>
                      <p className="font-bold text-emerald-600 italic">Confirmar ausência de alterações indevidas em todos os motores core do NavalDocs Pro.</p>
                    </div>

                    <div className="bg-white p-4 border border-slate-200 rounded shadow-sm">
                      <p className="font-bold border-b mb-2 uppercase">15. LIMITAÇÕES</p>
                      <p>Listar honestamente débitos técnicos como idempotência, retry ou rollback ausentes.</p>
                    </div>

                    <div className="p-4 bg-emerald-50 border-2 border-emerald-500 rounded-xl text-center">
                      <h3 className="text-xl font-black text-emerald-700 uppercase italic">STATUS FINAL: AGUARDANDO HOMOLOGAÇÃO</h3>
                    </div>
                  </div>
                </div>
              </section>

            </div>
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
}
