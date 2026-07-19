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
      <div id="ts-visual-edit-probe-71670d0bd4194615" className="hidden whitespace-pre-wrap">HOMOLOGAÇÃO FINAL — ENTERPRISE PROCESS CENTER v1.1

A arquitetura dos motores foi aprovada.

Não faça outra reconstrução do Process Risk Engine, Process Health Engine ou Operational Suggestion Engine, exceto se os testes encontrarem defeitos reais.

O status atual é:

- PASS técnico da arquitetura;
- PASS PARCIAL do Gate Final;
- homologação funcional, segurança, responsividade e performance ainda pendentes.

O objetivo desta etapa é apenas provar, com execução real e evidências permanentes, que o Enterprise Process Center está pronto para produção.

==================================================
1. NÃO DECLARAR PASS POR EXISTÊNCIA DE ARQUIVOS
==================================================

Não considerar concluído apenas porque existem:

- engines;
- hooks;
- testes;
- componentes;
- pasta de evidências.

Executar os fluxos reais.

O relatório final deve diferenciar claramente:

- criado;
- integrado;
- executado;
- aprovado;
- não executado;
- bloqueado pelo ambiente.

==================================================
2. BUILD
==================================================

Executar o build completo de produção.

Registrar:

- comando utilizado;
- resultado;
- duração;
- warnings;
- erros;
- tamanho do bundle da rota do Process Center, quando a ferramenta permitir.

Verificar:

- imports quebrados;
- rotas inválidas;
- chunks excessivos;
- dependências circulares;
- warnings relevantes.

Build não executado impede PASS definitivo.

==================================================
3. TESTES UNITÁRIOS
==================================================

Listar os 15 testes existentes individualmente.

Para cada teste, informar:

- arquivo;
- nome;
- cenário;
- resultado.

Confirmar cobertura real de:

ProcessRiskEngine:
- not_evaluated;
- low;
- medium;
- high;
- critical;
- documento obrigatório futuro;
- documento aplicável à etapa atual;
- documento dispensado;
- ausência de double counting;
- sinais positivos;
- fatores explicáveis.

ProcessHealthEngine:
- pesos somando 100;
- sete dimensões;
- dimensão sem dados;
- score 0;
- score 100;
- processo saudável;
- processo crítico;
- processo finalizado.

OperationalSuggestionEngine:
- criação de sugestão;
- desaparecimento após resolução;
- ausência de duplicatas;
- ordenação;
- blocker;
- resolutionPath;
- cliente incompleto;
- embarcação incompleta;
- documento rejeitado;
- documento vencido;
- template desatualizado.

Caso os 15 testes atuais não cubram esses cenários, ampliar a suíte.

Não aumentar quantidade artificialmente com testes irrelevantes.

==================================================
4. TESTES DE INTEGRAÇÃO
==================================================

Executar testes reais provando:

1. Alterar documento atualiza métricas.
2. Alterar documento atualiza Health Score.
3. Alterar documento atualiza Risk Report.
4. Criar pendência gera sugestão.
5. Resolver pendência remove sugestão.
6. Criar assinatura atualiza painel.
7. Finalizar revisão atualiza timeline.
8. Mutation invalida somente as query keys necessárias.
9. Falha de mutation não deixa interface em estado falso.
10. Refresh mantém a tab da URL.

Registrar quais queries foram invalidadas em cada ação.

==================================================
5. PLAYWRIGHT OBRIGATÓRIO
==================================================

Executar Playwright sem skip silencioso.

Criar seeds controlados para:

A. processo vazio;
B. processo inicial;
C. processo parcial;
D. processo saudável;
E. processo crítico;
F. processo com documento futuro ainda não aplicável;
G. processo com documento dispensado;
H. processo com OCR baixo;
I. processo com assinatura expirada;
J. processo com checklist bloqueante;
K. processo pronto para finalizar;
L. processo finalizado.

Validar:

- abertura do Process Center;
- métricas;
- Health Score;
- risco;
- causas;
- sinais positivos;
- sugestões;
- resolutionPath;
- cards;
- sidebar;
- tabs;
- refresh;
- histórico do navegador;
- estados vazios;
- erros;
- loading;
- retry;
- ações principais.

Capturar screenshot de cada cenário relevante.

==================================================
6. AÇÕES REAIS
==================================================

Validar, pela interface:

- Editar processo;
- adicionar documento;
- abrir documento;
- solicitar assinatura;
- enviar para revisão;
- resolver sugestão;
- abrir checklist;
- acessar OCR;
- abrir timeline;
- pesquisar dentro do processo.

Para cada ação:

- confirmar que o botão possui comportamento real;
- confirmar loading;
- confirmar disabled;
- confirmar erro;
- confirmar sucesso;
- confirmar auditoria;
- confirmar invalidação.

Nenhum botão decorativo é permitido.

==================================================
7. RESPONSIVIDADE
==================================================

Executar Playwright em:

Desktop:
- 1440×900;
- 1920×1080.

Tablet:
- 768×1024.

Mobile:
- 390×844;
- 360×800.

Validar:

- sidebar;
- header;
- cards;
- ações rápidas;
- textos;
- overflow;
- modais;
- tabelas;
- timeline;
- área de sugestões.

Não considerar responsivo apenas porque usa classes md/lg.

Verificar funcionamento real em cada viewport.

==================================================
8. CROSS-TENANT
==================================================

Executar com JWTs reais de QA A e QA B.

Cenários:

- QA A acessa processo próprio;
- QA B acessa processo próprio;
- QA A tenta acessar processId da QA B pela URL;
- QA A tenta consultar métricas da QA B;
- QA A tenta consultar Health da QA B;
- QA A tenta consultar Risk da QA B;
- QA A tenta consultar sugestões da QA B;
- QA A tenta consultar timeline da QA B;
- QA A tenta consultar documentos da QA B;
- QA A tenta executar mutation na QA B;
- QA B tenta o equivalente na QA A.

Resultado obrigatório:

- zero vazamento;
- zero alteração;
- erro ou resposta segura;
- nenhuma informação sensível em mensagem de erro.

==================================================
9. RED TEAM
==================================================

Executar Red Team ético no ambiente QA.

Testar:

- manipulação direta de processId;
- manipulação de company_id;
- alteração do parâmetro tab;
- chamadas Data API fora da interface;
- mutation sem papel;
- acesso anônimo;
- acesso com token expirado;
- processo finalizado;
- tentativa de editar documento finalizado;
- tentativa de criar assinatura em tenant alheio;
- tentativa de consultar timeline alheia;
- tentativa de inferir existência do processo por diferenças de resposta.

Classificar achados:

- P0;
- P1;
- P2;
- P3.

Corrigir qualquer P0/P1 antes de prosseguir.

==================================================
10. PROCESSO FINALIZADO
==================================================

Validar que processo finalizado continua imutável.

Testar:

- editar processo;
- anexar documento;
- alterar checklist;
- executar OCR;
- criar assinatura;
- adicionar participante;
- modificar documento gerado;
- alterar status;
- usar ação rápida do Process Center;
- chamar a API diretamente.

O frontend deve bloquear, mas a proteção definitiva deve existir no backend/banco.

==================================================
11. ANÔNIMO E PERMISSÕES
==================================================

Sem JWT:

- zero processo;
- zero métricas;
- zero Health;
- zero Risk;
- zero sugestões;
- zero timeline;
- zero documentos.

Usuário autenticado sem papel suficiente:

- pode visualizar somente o que sua função permite;
- não pode revisar;
- não pode finalizar;
- não pode alterar configurações;
- não pode executar ações administrativas.

Registrar respostas reais.

==================================================
12. PERFORMANCE
==================================================

Medir de forma concreta:

- número de requests ao abrir a rota;
- número de queries únicas;
- queries duplicadas;
- tempo até os dados principais;
- tempo até a tela interativa;
- quantidade de renders dos componentes principais;
- bundle da rota;
- chamadas causadas ao trocar de tab;
- chamadas após mutation;
- polling ativo;
- waterfalls;
- N+1.

Entregar uma tabela:

Métrica | Resultado | Meta | Status

Exemplos de metas:

- zero N+1;
- zero query duplicada equivalente;
- zero refetch global após mutation;
- lazy loading nas áreas pesadas;
- sem polling quando não necessário;
- cards principais carregados sem depender de abas pesadas.

Se EXPLAIN não estiver disponível, declarar a limitação.

Não substituir métricas por expressões como “otimizado” ou “alta performance”.

==================================================
13. EVIDÊNCIAS PERMANENTES
==================================================

Salvar em:

tests/evidence/process-center-final/

Estrutura mínima:

/unit
/integration
/playwright
/responsive
/cross-tenant
/red-team
/performance
/build

Incluir:

- logs;
- screenshots;
- resultados;
- comandos;
- data da execução;
- ambiente;
- limitações.

Não salvar tokens, senhas ou credenciais.

==================================================
14. RELATÓRIO FINAL
==================================================

Entregar:

1. Build.
2. Typecheck.
3. Lista individual dos testes unitários.
4. Testes de integração.
5. Playwright.
6. Responsividade.
7. Cross-tenant.
8. Red Team.
9. Processo finalizado.
10. Anônimo e permissões.
11. Performance.
12. Vulnerabilidades encontradas.
13. Correções aplicadas.
14. Evidências.
15. Limitações.
16. Veredito.

==================================================
15. VEREDITO
==================================================

PASS DEFINITIVO somente quando:

- Build passar;
- Typecheck passar;
- Unit passar;
- Integração passar;
- Playwright passar;
- responsividade for validada;
- cross-tenant passar;
- Red Team não possuir P0/P1 aberto;
- processo finalizado permanecer imutável;
- métricas de performance forem entregues;
- não houver dados mockados;
- não houver botões decorativos.

PASS PARCIAL quando qualquer etapa obrigatória não for executada.

FAIL quando houver:

- vazamento entre tenants;
- mutation indevida;
- regressão;
- dado falso;
- quebra de imutabilidade;
- P0/P1 aberto.

Não iniciar outro módulo antes desta homologação.</div>
    </div>
  );
}

