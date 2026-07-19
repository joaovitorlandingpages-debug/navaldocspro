import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Plus, Ship, User, Calendar, ArrowRight,
  MoreVertical, Loader2, Zap, Activity, Search, Filter
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/navigation/PageHeader";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/admin/process-center/")({
  component: ProcessCenterListPage,
});

function ProcessCenterListPage() {
  const { data: processes, isLoading } = useQuery({
    queryKey: ["admin-process-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from('processes')
        .select(`
          *,
          customer:customers!processes_customer_id_fkey(name),
          vessel:vessels!processes_vessel_id_fkey(name)
        `)
        .order('created_at', { ascending: false })
        .limit(20);
      return data ?? [];
    }
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <PageHeader 
        title="Enterprise Process Center v1.0" 
        description="O novo coração operacional do NavalDocs Pro."
        actions={
          <div className="flex gap-3">
             <Button variant="outline" className="gap-2 font-bold uppercase text-[10px] tracking-widest rounded-xl border-slate-200 shadow-sm">
                <Activity className="h-4 w-4 text-primary" />
                Métricas Globais
             </Button>
             <Button className="gap-2 bg-slate-900 font-black uppercase text-[10px] tracking-widest rounded-xl px-6 shadow-xl shadow-slate-200 transition-all hover:scale-105 active:scale-95">
                <Plus className="h-4 w-4" /> Novo Processo
             </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <Card className="p-6 border-slate-200 bg-white shadow-sm border-b-4 border-b-primary">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Processos Ativos</p>
            <h3 className="text-4xl font-black text-slate-900 tracking-tighter">{processes?.length || 0}</h3>
            <div className="mt-4 h-1.5 bg-slate-100 rounded-full overflow-hidden">
               <div className="h-full bg-primary" style={{ width: '65%' }} />
            </div>
         </Card>
         <Card className="p-6 border-slate-200 bg-white shadow-sm border-b-4 border-b-emerald-500">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Health Score Médio</p>
            <h3 className="text-4xl font-black text-emerald-600 tracking-tighter">--</h3>
            <div className="mt-4 h-1.5 bg-slate-100 rounded-full overflow-hidden">
               <div className="h-full bg-emerald-500" style={{ width: '0%' }} />
            </div>
         </Card>
         <Card className="p-6 border-slate-200 bg-white shadow-sm border-b-4 border-b-blue-500">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Automação OCR</p>
            <h3 className="text-4xl font-black text-blue-600 tracking-tighter">--</h3>
            <div className="mt-4 h-1.5 bg-slate-100 rounded-full overflow-hidden">
               <div className="h-full bg-blue-500" style={{ width: '0%' }} />
            </div>
         </Card>
      </div>

      <Card className="p-4 border-slate-200 bg-slate-50 shadow-inner">
        <div className="flex items-center gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
            <Input className="pl-11 h-12 bg-white border-slate-200 rounded-xl font-bold uppercase text-[10px] tracking-widest" placeholder="Pesquisar processos por número, cliente ou embarcação..." />
          </div>
          <Button variant="outline" className="gap-2 h-12 px-6 rounded-xl font-bold uppercase text-[10px] tracking-widest bg-white border-slate-200">
            <Filter className="h-4 w-4" /> Filtros Avançados
          </Button>
        </div>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 pb-20">
          {processes?.map((process: any) => (
            <Card key={process.id} className="p-6 hover:border-primary/20 hover:shadow-2xl transition-all group bg-white border-slate-100 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                <Ship className="h-20 w-20" />
              </div>
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-8">
                  <div className="h-16 w-16 bg-slate-50 rounded-2xl flex items-center justify-center border group-hover:bg-primary/5 group-hover:border-primary/10 transition-all shadow-sm">
                    <Ship className="h-8 w-8 text-slate-300 group-hover:text-primary group-hover:scale-110 transition-all" />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-black text-slate-900 group-hover:text-primary transition-colors tracking-tight uppercase italic">
                        {process.vessel?.name || "Sem embarcação"}
                      </h3>
                      <Badge variant="outline" className="text-[10px] uppercase font-black tracking-widest bg-slate-50 px-3 border-slate-200">
                        {process.process_number || `#${process.id.slice(0,8)}`}
                      </Badge>
                      <Badge className="text-[10px] uppercase font-black bg-emerald-50 text-emerald-600 border-none px-3">
                        {process.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <span className="flex items-center gap-2 hover:text-slate-600 transition-colors">
                        <User className="h-4 w-4 text-primary" /> {process.customer?.name}
                      </span>
                      <div className="h-3 w-px bg-slate-200" />
                      <span className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" /> {format(new Date(process.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                      <div className="h-3 w-px bg-slate-200" />
                      <span className="flex items-center gap-2 text-blue-600">
                        <Zap className="h-4 w-4" /> Documentos não contados
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="hidden lg:flex flex-col items-end px-6 border-r border-slate-100">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                       <Activity className="h-3 w-3" />
                       Health Score
                    </span>
                    <div className="flex items-center gap-3">
                      <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full w-[0%] transition-all duration-1000" />
                      </div>
                      <span className="text-sm font-black text-slate-900">--</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="text-slate-300 hover:text-slate-900 hover:bg-slate-50">
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                    <Button asChild className="gap-3 bg-slate-900 hover:bg-primary px-6 h-12 rounded-xl font-black uppercase text-[10px] tracking-[0.15em] shadow-lg shadow-slate-200 transition-all hover:scale-105 active:scale-95">
                      <Link to="/admin/process-center/$id" params={{ id: process.id }}>
                        Abrir Centro Operacional <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      <div id="ts-visual-edit-probe-2e6aca282bec4b3e" className="hidden whitespace-pre-wrap">EXECUÇÃO REAL OBRIGATÓRIA
ENTERPRISE AI COMMAND CENTER

SPRINTS 1 E 2 — FUNDAÇÃO TÉCNICA E TOOL INTELLIGENCE

ATENÇÃO

As respostas anteriores apenas alteraram textos visuais do arquivo:

src/routes/admin/process-center.index.tsx

Isso NÃO representa implementação do Enterprise AI Command Center.

A partir desta mensagem:

- NÃO atualizar textos do probe;
- NÃO substituir títulos da página;
- NÃO criar apenas componentes demonstrativos;
- NÃO apresentar arquitetura fictícia;
- NÃO declarar funcionalidades sem código executável;
- NÃO avançar para outro sprint antes de concluir esta implementação.

O objetivo agora é implementar código funcional, integrado à aplicação e aos dados reais.

==================================================
ETAPA 0 — AUDITORIA DO QUE EXISTE
==================================================

Antes de criar arquivos, verificar no projeto se já existem:

- módulos de IA;
- providers de LLM;
- Edge Functions de IA;
- ferramentas operacionais;
- tabelas de conversas;
- logs de IA;
- sistema de permissões;
- funções de consulta de processos;
- mecanismos de auditoria;
- feature flags relacionadas à IA.

Reutilizar estruturas válidas e evitar duplicação.

Entregar no relatório:

- arquivos encontrados;
- recursos reutilizados;
- lacunas reais identificadas.

Não parar após esse inventário.

Prosseguir imediatamente para a implementação.

==================================================
ETAPA 1 — ESTRUTURA REAL DO EACC
==================================================

Criar uma estrutura modular semelhante a:

src/lib/enterprise-ai/
  core/
    ai-orchestrator.ts
    ai-types.ts
    ai-errors.ts
    execution-context.ts
  agents/
    agent-registry.ts
    process-specialist.agent.ts
    documentation-specialist.agent.ts
    risk-specialist.agent.ts
    operations-specialist.agent.ts
    management-specialist.agent.ts
  tools/
    tool-registry.ts
    tool-executor.ts
    tool-types.ts
    tool-permission-guard.ts
    tool-cache.ts
    tool-retry.ts
    process/
    documents/
    customers/
    vessels/
    ocr/
    signatures/
    management/
  context/
    conversation-context-engine.ts
    context-summarizer.ts
    entity-reference-resolver.ts
  providers/
    ai-provider.ts
    mock-provider.ts
  prompts/
    prompt-builder.ts
  audit/
    ai-audit-service.ts

A estrutura pode ser ajustada à arquitetura atual, mas precisa manter separação clara de responsabilidades.

==================================================
ETAPA 2 — AI ORCHESTRATOR FUNCIONAL
==================================================

Implementar AIOrchestrator real.

Entrada mínima:

- userId
- companyId
- role
- mensagem
- conversationId opcional
- idioma
- contexto de entidade opcional

Fluxo obrigatório:

1. validar autenticação;
2. resolver tenant;
3. validar permissões;
4. classificar intenção;
5. selecionar agente;
6. determinar ferramentas necessárias;
7. executar ferramentas;
8. montar contexto permitido;
9. chamar AIProvider;
10. validar resposta;
11. registrar auditoria;
12. retornar resultado estruturado.

O resultado deve conter:

- answer
- selectedAgent
- executedTools
- references
- suggestedActions
- warnings
- executionId
- durationMs

Não permitir que o frontend forneça um companyId arbitrário sem validação contra a sessão autenticada.

==================================================
ETAPA 3 — AGENT REGISTRY
==================================================

Implementar registro extensível de agentes.

Cada agente deve possuir:

- id
- name
- description
- supportedIntents
- allowedTools
- requiredPermissions
- systemInstructions
- maxToolExecutions

Criar inicialmente:

- process-specialist
- documentation-specialist
- risk-specialist
- operations-specialist
- management-specialist

Os agentes devem controlar somente seleção, ferramentas permitidas e instruções.

Eles não podem consultar o banco diretamente.

==================================================
ETAPA 4 — TOOL REGISTRY E TOOL EXECUTOR
==================================================

Implementar Tool Registry real.

Contrato obrigatório de ferramenta:

- id
- category
- description
- inputSchema
- outputSchema
- requiredPermissions
- cachePolicy
- timeoutMs
- retryPolicy
- execute()

Usar validação de schema, preferencialmente Zod se já estiver presente no projeto.

Implementar ToolExecutor com:

- validação dos parâmetros;
- permission guard;
- tenant guard;
- timeout;
- retry somente em falhas transitórias;
- cache quando permitido;
- auditoria;
- erros tipados;
- retorno padronizado.

Toda ferramenta deve receber companyId derivado do contexto autorizado.

Nunca confiar em companyId informado pelo modelo ou pelo navegador.

==================================================
ETAPA 5 — FERRAMENTAS REAIS DA PRIMEIRA ENTREGA
==================================================

Nesta rodada, implementar e integrar pelo menos estas ferramentas:

PROCESSOS

1. searchProcesses
2. getProcess
3. getProcessTimeline
4. getProcessHealth
5. getProcessRisk
6. listPendingProcessDocuments
7. listBlockingProcessIssues
8. listProcessesReadyToFinalize
9. listStaleProcesses

DOCUMENTOS

10. searchDocuments
11. getDocument
12. listExpiredDocuments
13. listRejectedDocuments
14. listMissingDocuments

CLIENTES E EMBARCAÇÕES

15. searchCustomers
16. getCustomer
17. searchVessels
18. getVessel
19. listExpiredVesselCertificates

OCR E ASSINATURAS

20. listPendingOCR
21. listFailedOCR
22. listLowConfidenceOCR
23. listPendingSignatures
24. listExpiredSignatureRequests

GESTÃO

25. getCompanyOperationalSummary
26. getProcessKPIs
27. getSLAReport

Não criar respostas mockadas.

Cada ferramenta deve consultar tabelas, RPCs ou serviços reais já existentes no NavalDocs Pro.

Quando determinado recurso ainda não existir no banco, retornar estado explícito:

- unavailable
- not_configured
- insufficient_data

Nunca inventar valores.

==================================================
ETAPA 6 — SEGURANÇA MULTI-TENANT
==================================================

Todas as consultas devem respeitar:

- autenticação;
- company_id;
- RLS;
- role;
- permissões;
- ownership quando aplicável.

Não utilizar Service Role no navegador.

Caso seja necessária uma Edge Function:

- validar JWT;
- resolver usuário no servidor;
- resolver empresa autorizada no servidor;
- validar papel/permissão;
- usar Service Role somente internamente;
- filtrar obrigatoriamente pelo tenant;
- não aceitar autorização baseada apenas em campos enviados pelo cliente.

Criar testes negativos garantindo que:

- usuário da empresa A não leia dados da empresa B;
- operador sem permissão não acesse métricas gerenciais;
- usuário desautenticado seja bloqueado;
- ferramenta fora da allowlist do agente seja bloqueada;
- parâmetros contendo companyId adulterado sejam ignorados ou rejeitados.

==================================================
ETAPA 7 — PROVIDER ABSTRACTION
==================================================

Criar interface AIProvider.

Métodos mínimos:

- generateResponse()
- classifyIntent()
- healthCheck()

Implementar MockProvider funcional para testes.

Não é obrigatório integrar uma API paga nesta rodada.

O sistema deve funcionar em modo de teste sem chave externa.

Preparar adapters para providers futuros sem incluir chaves no código.

Segredos devem existir somente no ambiente seguro do backend.

==================================================
ETAPA 8 — CONTEXTO CONVERSACIONAL
==================================================

Implementar contexto mínimo funcional:

- conversationId;
- histórico limitado;
- resumo de mensagens antigas;
- referências a processo, cliente, embarcação ou documento;
- resolução de expressões como:
  - “o primeiro”
  - “esse processo”
  - “o cliente dele”
  - “abra esse documento”

Não enviar todo o histórico indefinidamente.

Aplicar limite de tamanho e resumo.

==================================================
ETAPA 9 — PERSISTÊNCIA E AUDITORIA
==================================================

Criar migrations somente se estruturas equivalentes ainda não existirem.

Tabelas sugeridas:

ai_conversations

- id
- company_id
- user_id
- title
- status
- created_at
- updated_at

ai_messages

- id
- conversation_id
- company_id
- user_id
- role
- content
- metadata
- created_at

ai_executions

- id
- conversation_id
- company_id
- user_id
- agent_id
- provider
- status
- duration_ms
- input_tokens
- output_tokens
- estimated_cost
- error_code
- created_at

ai_tool_executions

- id
- ai_execution_id
- company_id
- tool_id
- sanitized_parameters
- status
- duration_ms
- cache_hit
- error_code
- created_at

Criar:

- índices necessários;
- foreign keys;
- RLS;
- políticas de SELECT e INSERT;
- isolamento por tenant;
- regras de auditoria;
- retenção compatível com a aplicação.

Não armazenar documentos completos, tokens, segredos ou dados sensíveis desnecessários nos logs.

Sanitizar parâmetros antes da persistência.

==================================================
ETAPA 10 — API/EDGE FUNCTION
==================================================

Criar um ponto de entrada real, por exemplo:

supabase/functions/enterprise-ai-chat/index.ts

ou utilizar estrutura server-side equivalente já existente.

Contrato esperado:

POST /enterprise-ai-chat

Entrada:

{
  "message": "Quais processos críticos estão parados?",
  "conversationId": "opcional",
  "entityContext": {
    "processId": "opcional",
    "customerId": "opcional",
    "vesselId": "opcional"
  }
}

Não aceitar userId, role ou companyId como fonte de autorização.

Esses dados devem ser derivados da sessão autenticada.

Saída:

{
  "answer": "...",
  "agent": "...",
  "tools": [],
  "references": [],
  "suggestedActions": [],
  "executionId": "...",
  "durationMs": 0
}

Implementar tratamento consistente para:

- 400 entrada inválida;
- 401 não autenticado;
- 403 sem permissão;
- 404 entidade inexistente;
- 409 conflito;
- 429 limite atingido;
- 500 falha interna.

Não expor stack trace ao cliente.

==================================================
ETAPA 11 — FEATURE FLAG
==================================================

Criar feature flag:

ENTERPRISE_AI_COMMAND_CENTER_ENABLED

Default:

OFF

Quando desligada:

- o endpoint não executa IA;
- nenhuma nova interface é exibida aos usuários comuns;
- os módulos antigos continuam funcionando;
- nenhum comportamento existente deve ser quebrado.

==================================================
ETAPA 12 — INTERFACE MÍNIMA DE PROVA REAL
==================================================

Somente após o backend estar implementado, criar uma interface mínima de teste no painel administrativo.

A interface deve:

- enviar perguntas ao endpoint real;
- mostrar agente escolhido;
- mostrar ferramentas executadas;
- mostrar referências;
- mostrar duração;
- apresentar erros reais;
- permitir iniciar nova conversa.

Não criar ainda o design final do Chat Enterprise.

Não usar respostas hardcoded.

Não transformar novamente a página em um “probe textual”.

==================================================
ETAPA 13 — TESTES OBRIGATÓRIOS
==================================================

Criar testes unitários para:

- Agent Registry;
- Tool Registry;
- ToolExecutor;
- permission guard;
- tenant guard;
- timeout;
- retry;
- cache;
- PromptBuilder;
- Context Engine;
- MockProvider;
- AIOrchestrator.

Criar testes de integração para:

- pergunta → agente → ferramenta → resposta;
- usuário sem permissão;
- ferramenta inválida;
- entidade inexistente;
- provider indisponível;
- timeout de ferramenta;
- cache hit;
- auditoria;
- isolamento multi-tenant.

Criar teste E2E mínimo com Playwright:

1. autenticar usuário autorizado;
2. abrir interface mínima do EACC;
3. enviar uma pergunta real;
4. verificar resposta;
5. verificar agente;
6. verificar ferramentas;
7. iniciar nova conversa;
8. testar mensagem inválida;
9. testar usuário sem permissão.

Executar:

- testes unitários;
- testes de integração;
- TypeScript typecheck;
- build;
- Playwright.

==================================================
ETAPA 14 — NÃO REGRESSÃO
==================================================

Validar que não foram quebrados:

- Process Center;
- processos;
- documentos;
- OCR;
- assinaturas;
- dossiês;
- clientes;
- embarcações;
- autenticação;
- Admin Master;
- Portal do Cliente.

==================================================
ENTREGA OBRIGATÓRIA
==================================================

Ao final, apresentar um relatório contendo:

1. Diagnóstico inicial do projeto.
2. Arquivos criados.
3. Arquivos alterados.
4. Migrations criadas.
5. Tabelas, índices e RLS.
6. Agentes realmente implementados.
7. Ferramentas realmente implementadas.
8. Ferramentas que ainda não puderam ser implementadas e motivo.
9. Endpoint criado.
10. Fluxo de autorização.
11. Feature flag.
12. Resultados exatos dos testes.
13. Resultado do typecheck.
14. Resultado do build.
15. Resultado do Playwright.
16. Limitações restantes.
17. Próxima etapa recomendada.

Não declarar “Sprint concluído” apenas porque arquivos foram criados.

O status final deve ser exatamente um destes:

- IMPLEMENTAÇÃO CONCLUÍDA E VALIDADA
- IMPLEMENTAÇÃO PARCIAL
- IMPLEMENTAÇÃO BLOQUEADA

Para usar “IMPLEMENTAÇÃO CONCLUÍDA E VALIDADA”, é obrigatório apresentar evidência de código funcional, testes, typecheck e build.

INICIE A IMPLEMENTAÇÃO AGORA.

NÃO MODIFIQUE NOVAMENTE APENAS O TEXTO DO PROBE.</div>
    </div>
  );
}
