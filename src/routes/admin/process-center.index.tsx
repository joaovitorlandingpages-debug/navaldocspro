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
      <div id="ts-visual-edit-probe-33dfadec4fa34a21" className="hidden whitespace-pre-wrap">INICIAR EXECUÇÃO — OPERAÇÃO FORTALEZA
FASE 1 — DIAGNÓSTICO DE AUTENTICAÇÃO E AUTORIZAÇÃO

O texto do Security Gate já foi consolidado.

Agora inicie a execução real da Fase 1.

Nesta primeira rodada, não faça uma refatoração ampla e não declare PASS.

Execute somente o diagnóstico inicial, produza o inventário técnico e identifique vulnerabilidades reais.

==================================================
1. MAPEAR A IMPLEMENTAÇÃO ATUAL
==================================================

Localizar e documentar:

- AuthProvider;
- hooks de autenticação;
- listeners onAuthStateChange;
- guards de rota;
- fluxo de login;
- fluxo de cadastro;
- logout;
- recuperação de senha;
- criação de perfil;
- criação de empresa;
- associação usuário-empresa;
- resolução de role;
- Admin Master;
- Portal do Cliente;
- convites;
- links públicos;
- troca de tenant, caso exista.

Para cada item, informar:

- arquivo;
- função ou componente;
- fonte dos dados;
- dependências;
- proteção existente;
- risco identificado.

==================================================
2. IDENTIFICAR A FONTE CANÔNICA
==================================================

Descobrir onde atualmente estão armazenados:

- role;
- company_id;
- user_id;
- memberships;
- permissões;
- status ativo;
- status da empresa.

Verificar conflitos entre:

- auth metadata;
- profiles;
- companies;
- company_members;
- user_roles;
- JWT;
- localStorage;
- contexto React.

Não assumir que existe uma fonte única.

Entregar uma conclusão objetiva:

- fonte canônica atual;
- fontes secundárias;
- conflitos;
- risco de dessincronização;
- risco de escalada de privilégio.

==================================================
3. INVENTÁRIO DE PAPÉIS REAIS
==================================================

Listar somente os papéis existentes no código e no banco.

Para cada papel, informar:

- onde está definido;
- quem pode atribuir;
- quem pode remover;
- rotas acessíveis;
- ações permitidas;
- ações proibidas;
- proteção frontend;
- proteção backend;
- proteção RLS.

Não criar novos papéis nesta etapa.

==================================================
4. INVENTÁRIO DE ROTAS
==================================================

Classificar todas as rotas como:

- pública;
- autenticada;
- tenant;
- administrativa;
- Admin Master;
- Portal do Cliente;
- acesso por token.

Informar para cada rota:

- guard utilizado;
- condição de autorização;
- risco de bypass por URL;
- risco de flash de conteúdo;
- risco de redirect loop;
- comportamento em refresh;
- comportamento sem sessão;
- comportamento com papel insuficiente.

==================================================
5. INVENTÁRIO DE TABELAS E POLICIES
==================================================

Auditar inicialmente as tabelas relacionadas diretamente a autenticação e autorização:

- profiles;
- companies;
- company_members;
- user_roles;
- invitations;
- portal users;
- audit logs;
- configuração de papéis;
- qualquer tabela equivalente existente.

Para cada uma, informar:

- RLS habilitada;
- SELECT policies;
- INSERT policies;
- UPDATE policies;
- DELETE policies;
- WITH CHECK;
- USING;
- acesso anon;
- acesso authenticated;
- dependência de company_id enviado pelo cliente;
- policies permissivas;
- USING(true);
- WITH CHECK(true).

==================================================
6. INVENTÁRIO DE RPCs
==================================================

Listar RPCs relacionadas a:

- usuários;
- empresas;
- papéis;
- convites;
- Admin Master;
- memberships;
- permissões;
- Portal do Cliente.

Para cada RPC, informar:

- SECURITY DEFINER;
- search_path;
- auth.uid() validado;
- tenant validado;
- papel validado;
- EXECUTE permitido para anon;
- EXECUTE permitido para authenticated;
- campos retornados;
- risco de parâmetro adulterado.

==================================================
7. INVENTÁRIO DE EDGE FUNCTIONS
==================================================

Listar funções relacionadas a:

- cadastro;
- convite;
- alteração de papel;
- Admin Master;
- recuperação;
- Portal do Cliente;
- criação de usuário;
- suspensão;
- troca de tenant.

Para cada função, informar:

- JWT obrigatório;
- validação do usuário;
- validação do tenant;
- validação do papel;
- uso de service role;
- allowlist de payload;
- rate limiting;
- idempotência;
- CORS;
- logs;
- risco de mass assignment.

==================================================
8. TESTES RÁPIDOS DE RED TEAM
==================================================

Executar testes seguros no ambiente QA:

- usuário alterar o próprio role;
- usuário alterar o próprio company_id;
- usuário acessar rota Admin Master;
- usuário chamar RPC administrativa;
- usuário chamar Edge Function administrativa;
- QA A consultar profile da QA B;
- QA A consultar empresa da QA B;
- acesso anônimo a tabelas sensíveis;
- manipulação de user_id;
- manipulação de company_id;
- token expirado;
- logout seguido de botão voltar.

Não realizar teste destrutivo.

==================================================
9. CLASSIFICAR ACHADOS
==================================================

Classificar cada achado:

- P0 — crítico;
- P1 — alto;
- P2 — médio;
- P3 — baixo;
- informativo.

Para cada achado, incluir:

- título;
- componente;
- evidência;
- forma de exploração;
- impacto;
- recomendação;
- arquivo ou policy afetada;
- status atual.

==================================================
10. NÃO CORRIGIR TUDO AUTOMATICAMENTE
==================================================

Nesta rodada:

- corrigir somente P0 or P1 óbvios e seguros;
- não fazer refatoração ampla;
- não alterar modelo de papéis sem diagnóstico;
- não apagar policies sem compreender dependências;
- não modificar fluxos de produção sem teste.

Qualquer correção aplicada deve possuir:

- motivo;
- diff resumido;
- teste;
- evidência;
- risco de regressão.

==================================================
11. EVIDÊNCIAS
==================================================

Salvar em:

tests/evidence/fortress-phase-1-auth/diagnostic/

Incluir:

- architecture-map.md;
- roles-inventory.md;
- routes-inventory.md;
- rls-inventory.md;
- rpc-inventory.md;
- edge-functions-inventory.md;
- red-team-results.md;
- findings.md;
- logs;
- screenshots, quando aplicável.

Não salvar tokens completos, senhas ou secrets.

==================================================
12. RELATÓRIO DESTA RODADA
==================================================

Entregar:

1. Resumo executivo.
2. Arquitetura atual de autenticação.
3. Fonte canônica de autorização.
4. Papéis reais.
5. Rotas protegidas.
6. Tabelas e RLS.
7. RPCs.
8. Edge Functions.
9. Resultado do Red Team inicial.
10. Vulnerabilidades P0/P1/P2/P3.
11. Correções emergenciais aplicadas.
12. Limitações do ambiente.
13. Próxima ação recomendada.

==================================================
13. VEREDITO
==================================================

Nesta rodada, o único veredito permitido é:

- DIAGNÓSTICO CONCLUÍDO;
- DIAGNÓSTICO PARCIAL;
- BLOQUEADO PELO AMBIENTE.

Não declarar PASS da Fase 1 ainda.

Após o relatório diagnóstico, serão definidas as correções da Onda 1.</div>
    </div>
  );
}
