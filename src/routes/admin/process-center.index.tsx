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
      <div id="ts-visual-edit-probe-7b86dd2687e84160" className="hidden whitespace-pre-wrap">OPERAÇÃO FORTALEZA
FASE 1 — AUTHENTICATION & AUTHORIZATION SECURITY GATE

CONTEXTO

O Enterprise Process Center v1.1 entrou em homologação final.

Agora iniciaremos a Operação Fortaleza: uma auditoria técnica, funcional e de segurança de toda a plataforma NavalDocs Pro.

Esta fase deve analisar exclusivamente:

- autenticação;
- sessões;
- usuários;
- perfis;
- empresas/tenants;
- papéis;
- permissões;
- rotas protegidas;
- ações administrativas;
- recuperação de conta;
- convites;
- troca de empresa;
- tokens;
- logout;
- proteção do backend.

Não criar funcionalidades comerciais, dashboards novos ou mudanças visuais desnecessárias.

Objetivo:

Garantir que nenhum usuário consiga visualizar, alterar ou executar ações fora de seu tenant, papel ou nível de autorização.

==================================================
1. PRINCÍPIO CENTRAL
==================================================

Não confiar em:

- esconder botões;
- guards apenas no React;
- verificações somente na rota;
- valores enviados pelo frontend;
- company_id enviado pelo cliente;
- role armazenada apenas em localStorage;
- query parameters;
- dados do perfil carregados na interface.

Toda autorização precisa ser validada também em:

- banco;
- RLS;
- RPC;
- Edge Functions;
- Storage;
- operações administrativas.

==================================================
2. MAPEAR A ARQUITETURA DE AUTENTICAÇÃO
==================================================

Antes de alterar código, produzir um inventário completo contendo:

- fluxo de cadastro;
- fluxo de login;
- fluxo de logout;
- recuperação de senha;
- alteração de senha;
- renovação de sessão;
- expiração de token;
- convite de usuário;
- aceitação de convite;
- criação de perfil;
- associação com empresa;
- troca de tenant, caso exista;
- remoção de usuário;
- bloqueio/desativação;
- primeiro acesso;
- onboarding;
- acesso ao Admin Master;
- acesso ao Portal do Cliente;
- acesso de colaboradores internos;
- acesso público por token.

Identificar:

- componentes envolvidos;
- hooks;
- contextos;
- providers;
- tabelas;
- triggers;
- RPCs;
- Edge Functions;
- policies;
- claims;
- metadados do usuário.

Entregar um diagrama textual do fluxo atual.

==================================================
3. INVENTÁRIO DE PAPÉIS
==================================================

Mapear todos os papéis existentes na aplicação.

Exemplos possíveis:

- admin_master;
- super_admin;
- company_admin;
- manager;
- operator;
- reviewer;
- employee;
- customer;
- portal_user;
- viewer.

Não inventar novos papéis antes de verificar os atuais.

Para cada papel, documentar:

- origem;
- onde é armazenado;
- quem pode atribuir;
- quem pode remover;
- páginas permitidas;
- ações permitidas;
- tabelas acessíveis;
- RPCs acessíveis;
- Edge Functions acessíveis;
- Storage acessível;
- ações explicitamente proibidas.

Criar uma matriz:

Papel | Recurso | Ler | Criar | Alterar | Excluir | Aprovar | Finalizar | Administrar

==================================================
4. FONTE ÚNICA DE AUTORIZAÇÃO
==================================================

Auditar onde as funções e papéis são armazenados.

Verificar possíveis fontes conflitantes:

- auth.users metadata;
- profiles.role;
- company_members;
- user_roles;
- company_users;
- JWT claims;
- localStorage;
- estado React;
- parâmetros de rota.

Definir a fonte canônica.

Evitar que duas tabelas ou campos possam discordar sobre o papel de um usuário.

Quando houver duplicidade:

- definir autoridade;
- sincronizar com segurança;
- remover dependências inseguras;
- impedir escalada de privilégio.

==================================================
5. SEGURANÇA NO CADASTRO
==================================================

Auditar o cadastro completo.

Testar:

- criação de usuário sem perfil;
- criação de perfil duplicado;
- criação de empresa duplicada;
- usuário escolher manualmente papel elevado;
- manipulação de company_id;
- metadata adulterada;
- requests repetidos;
- cadastro concorrente;
- usuário parcialmente criado;
- falha entre criação do auth.user e profile;
- reexecução do onboarding;
- e-mail já existente;
- convite já utilizado;
- convite expirado.

Requisitos:

- cadastro idempotente;
- papel inicial seguro;
- nenhum usuário comum pode se tornar admin_master;
- company_id nunca deve ser aceito sem validação;
- falhas parciais devem ser recuperáveis;
- operações relacionadas devem ser transacionais quando possível.

==================================================
6. LOGIN
==================================================

Auditar:

- login por e-mail e senha;
- mensagens de erro;
- redirecionamento;
- sessão existente;
- usuário sem perfil;
- usuário desativado;
- empresa suspensa;
- empresa inexistente;
- usuário sem associação;
- múltiplas empresas;
- token expirado;
- sessão revogada;
- refresh token inválido.

Não revelar desnecessariamente:

- se um e-mail existe;
- se uma conta é administrativa;
- se uma empresa específica existe;
- detalhes internos do banco.

Evitar enumeração de usuários.

==================================================
7. LOGOUT E REVOGAÇÃO
==================================================

Validar:

- logout remove sessão local;
- logout invalida acesso às páginas protegidas;
- cache sensível é limpo;
- React Query é limpo;
- dados do tenant anterior não permanecem visíveis;
- voltar pelo navegador não exibe dados protegidos;
- múltiplas abas são tratadas corretamente;
- sessão expirada causa saída segura;
- token revogado não continua funcionando.

Após logout, nenhum dado sensível pode permanecer acessível pela UI.

==================================================
8. SESSÕES E TOKENS
==================================================

Auditar:

- access token;
- refresh token;
- renovação;
- expiração;
- armazenamento;
- uso em Edge Functions;
- uso em RPCs;
- uso em chamadas diretas;
- troca de usuário;
- troca de empresa;
- múltiplas abas;
- múltiplos dispositivos;
- sessão antiga após alteração de papel.

Testar:

- token expirado;
- token malformado;
- token de outro projeto;
- token de outro usuário;
- token sem claim esperada;
- token de usuário removido;
- token anterior após mudança de papel;
- refresh concorrente;
- repetição de request.

Não registrar tokens completos em logs.

==================================================
9. ROTAS PROTEGIDAS
==================================================

Inventariar todas as rotas.

Classificar:

- públicas;
- autenticadas;
- administrativas;
- Admin Master;
- tenant;
- Portal do Cliente;
- acesso por token;
- callbacks;
- páginas de erro.

Validar:

- acesso direto por URL;
- refresh na rota;
- usuário anônimo;
- papel insuficiente;
- tenant incorreto;
- query string manipulada;
- parâmetros modificados;
- carregamento antes do guard;
- flash de conteúdo protegido;
- loop de redirect;
- redirect para login preservando destino seguro.

Nenhuma rota deve depender apenas do menu estar oculto.

==================================================
10. ADMIN MASTER
==================================================

Auditar rigorosamente o Admin Master.

Testar se usuário comum consegue:

- abrir rota;
- consultar RPC;
- chamar Edge Function;
- listar empresas;
- listar usuários;
- visualizar métricas globais;
- alterar planos;
- suspender empresa;
- promover usuário;
- acessar logs;
- acessar billing;
- alterar configurações globais.

Admin Master deve possuir proteção em todas as camadas.

Não usar apenas:

profiles.role === "admin_master"

sem validação segura no banco/backend.

==================================================
11. ESCALADA DE PRIVILÉGIO
==================================================

Executar testes específicos tentando:

- alterar o próprio role;
- alterar role de outro usuário;
- inserir registro em tabela de papéis;
- editar company_id;
- associar-se a outra empresa;
- criar membership;
- modificar metadata;
- chamar RPC administrativa;
- chamar Edge Function administrativa;
- reutilizar convite privilegiado;
- alterar payload de cadastro;
- trocar user_id em request;
- trocar profile_id;
- trocar owner_id;
- alterar created_by;
- executar ação pelo Data API.

Classificar qualquer possibilidade de escalada como P0 ou P1.

==================================================
12. ISOLAMENTO MULTI-TENANT
==================================================

Usar no mínimo:

- usuário QA A, tenant A;
- usuário QA B, tenant B;
- administrador do tenant A;
- operador do tenant A;
- usuário sem papel;
- anônimo.

Testar leitura e escrita cross-tenant em:

- profiles;
- companies;
- company_members;
- customers;
- vessels;
- processes;
- documents;
- generated_documents;
- checklists;
- OCR;
- signatures;
- dossiers;
- certificates;
- comments;
- notifications;
- logs;
- templates;
- configurações;
- relatórios.

QA A nunca pode:

- ler dados da QA B;
- inferir existência;
- alterar;
- excluir;
- executar RPC;
- executar Edge Function;
- baixar arquivo;
- gerar URL assinada;
- criar relacionamento com entidade da QA B.

==================================================
13. CONVITES
==================================================

Auditar o sistema de convites.

Verificar:

- token forte;
- expiração;
- uso único;
- revogação;
- associação correta ao e-mail;
- associação correta ao tenant;
- papel máximo permitido;
- reutilização;
- brute force;
- token vazado;
- convite após remoção do usuário;
- convite para e-mail já existente;
- mudança do e-mail no aceite;
- convite de administrador;
- convite criado por usuário sem permissão.

Nunca permitir que o convidado escolha o próprio tenant ou papel.

==================================================
14. RECUPERAÇÃO DE SENHA
==================================================

Validar:

- solicitação;
- mensagens neutras;
- token;
- expiração;
- uso único;
- troca da senha;
- invalidação das sessões anteriores;
- redirecionamento;
- URL segura;
- usuário inexistente;
- repetição;
- abuso;
- rate limiting.

Não revelar se o e-mail existe.

Após a recuperação, avaliar se sessões antigas permanecem válidas.

==================================================
15. ALTERAÇÃO DE E-MAIL E SENHA
==================================================

Testar:

- alteração sem sessão;
- sessão antiga;
- confirmação;
- reautenticação;
- usuário desativado;
- e-mail já utilizado;
- alteração concorrente;
- mudança de senha em múltiplos dispositivos;
- eventos de auditoria.

Ações sensíveis devem exigir confirmação adequada.

==================================================
16. USUÁRIOS DESATIVADOS OU REMOVIDOS
==================================================

Definir e validar o comportamento para:

- usuário removido da empresa;
- usuário bloqueado;
- usuário desativado;
- empresa suspensa;
- empresa excluída;
- papel removido;
- convite revogado.

O acesso deve cessar imediatamente ou no menor prazo tecnicamente possível.

Não permitir que sessão antiga continue acessando o tenant.

==================================================
17. TROCA DE TENANT
==================================================

Caso um usuário possa acessar múltiplas empresas:

- validar membership real;
- nunca aceitar company_id arbitrário;
- limpar cache ao trocar;
- reconstruir query keys;
- impedir mistura de dados;
- atualizar claims ou contexto corretamente;
- impedir acesso ao tenant anterior após remoção;
- registrar auditoria.

Caso a aplicação não suporte múltiplos tenants por usuário, declarar isso claramente e bloquear tentativas.

==================================================
18. PORTAL DO CLIENTE
==================================================

Auditar separadamente o Portal do Cliente.

Validar que cliente só acessa:

- seus processos;
- seus documentos permitidos;
- suas mensagens;
- seus uploads;
- suas assinaturas;
- seus certificados;
- seus dados autorizados.

Testar:

- trocar processId;
- trocar customerId;
- trocar documentId;
- download de outro cliente;
- comentário em processo alheio;
- upload para processo alheio;
- acesso a documentos internos;
- acesso a notas internas;
- listagem de outros clientes.

==================================================
19. ACESSOS PÚBLICOS POR TOKEN
==================================================

Inventariar links públicos:

- assinatura;
- certificado;
- verificação;
- compartilhamento;
- upload;
- portal;
- documentos.

Para cada token validar:

- entropia;
- escopo;
- expiração;
- revogação;
- uso único quando aplicável;
- proteção contra enumeração;
- resposta neutra;
- rate limiting;
- dados mínimos necessários.

Nunca permitir que um token público amplie acesso para outros registros.

==================================================
20. EDGE FUNCTIONS
==================================================

Auditar todas as Edge Functions relacionadas a usuários e autorização.

Para cada função verificar:

- autenticação obrigatória;
- validação de JWT;
- papel;
- tenant;
- ownership;
- schema do payload;
- rate limiting;
- idempotência;
- logs;
- tratamento de erro;
- CORS;
- uso da service role;
- prevenção de mass assignment.

Service role nunca deve transformar um request não autorizado em acesso global.

==================================================
21. RPCs
==================================================

Inventariar RPCs relacionadas a:

- usuários;
- empresas;
- memberships;
- roles;
- Admin Master;
- convites;
- permissões;
- Portal do Cliente.

Verificar:

- SECURITY DEFINER;
- search_path fixo;
- validação de auth.uid();
- validação do tenant;
- validação do papel;
- privilégios EXECUTE;
- acesso anon;
- acesso authenticated;
- possibilidade de parâmetros adulterados;
- retorno excessivo.

Revogar permissões desnecessárias.

==================================================
22. RLS
==================================================

Auditar RLS das tabelas relacionadas a autenticação e autorização.

Para cada tabela registrar:

- RLS habilitada;
- políticas SELECT;
- INSERT;
- UPDATE;
- DELETE;
- roles permitidas;
- validação de tenant;
- validação de user_id;
- validação de papel;
- WITH CHECK;
- policies permissivas;
- USING(true);
- acesso anon;
- acesso service role.

Eliminar:

- USING(true) indevido;
- WITH CHECK(true);
- policies duplicadas;
- policies conflitantes;
- dependência de campos enviados pelo cliente;
- acesso global sem justificativa.

==================================================
23. MASS ASSIGNMENT
==================================================

Verificar se payloads permitem alterar campos sensíveis, como:

- role;
- company_id;
- user_id;
- owner_id;
- created_by;
- status administrativo;
- subscription_status;
- plan;
- permissions;
- is_admin;
- is_active;
- approved_by;
- finalized_by.

Usar allowlist explícita de campos editáveis.

==================================================
24. AUDITORIA
==================================================

Garantir logs para eventos sensíveis:

- login;
- logout;
- falha de login relevante;
- convite criado;
- convite aceito;
- papel alterado;
- usuário removido;
- empresa suspensa;
- senha alterada;
- ação Admin Master;
- tentativa bloqueada;
- acesso cross-tenant negado;
- token público revogado.

Não registrar:

- senhas;
- tokens completos;
- secrets;
- dados sensíveis desnecessários.

==================================================
25. RATE LIMITING E ABUSO
==================================================

Auditar proteção contra abuso em:

- login;
- cadastro;
- recuperação de senha;
- convite;
- aceite de convite;
- verificação pública;
- assinatura pública;
- endpoints administrativos.

Testar:

- repetição rápida;
- brute force;
- enumeração;
- replay;
- bursts concorrentes.

Declarar limitações caso o ambiente não permita teste de carga completo.

==================================================
26. FRONTEND
==================================================

Auditar:

- AuthProvider;
- onAuthStateChange;
- múltiplos listeners;
- loops;
- race conditions;
- flash de conteúdo;
- redirects;
- cache;
- localStorage;
- dados de usuário anterior;
- múltiplos QueryClient;
- chamadas duplicadas;
- loading infinito;
- sessão nula temporária;
- perfil carregando depois da rota.

Deve existir uma máquina de estados clara, por exemplo:

- initializing;
- unauthenticated;
- authenticated_loading_profile;
- authenticated_authorized;
- authenticated_unauthorized;
- suspended;
- error.

Não redirecionar enquanto o estado ainda estiver indeterminado.

==================================================
27. TESTES UNITÁRIOS
==================================================

Criar testes para:

- resolução de papel;
- matriz de permissão;
- guards;
- estado de autenticação;
- redirect seguro;
- seleção de tenant;
- convites;
- payload allowlist;
- limpeza de cache;
- sessão expirada;
- usuário desativado;
- empresa suspensa;
- autorização administrativa.

==================================================
28. TESTES DE INTEGRAÇÃO
==================================================

Executar:

- cadastro → perfil → empresa;
- login → perfil → tenant;
- logout → limpeza;
- recuperação de senha;
- convite;
- alteração de papel;
- remoção do usuário;
- suspensão da empresa;
- sessão expirada;
- acesso negado;
- Admin Master;
- Portal do Cliente;
- token público.

==================================================
29. PLAYWRIGHT
==================================================

Executar fluxos reais:

1. Cadastro válido.
2. Cadastro adulterando papel.
3. Login válido.
4. Login inválido.
5. Logout.
6. Recuperação de senha.
7. Usuário sem perfil.
8. Usuário desativado.
9. Empresa suspensa.
10. Operador acessando rota administrativa.
11. Administrador do tenant.
12. Admin Master.
13. Convite válido.
14. Convite expirado.
15. Convite reutilizado.
16. Troca de tenant, quando aplicável.
17. Portal do Cliente.
18. Manipulação direta de URL.
19. Sessão expirada.
20. Retorno pelo botão voltar após logout.

Executar em desktop e mobile.

==================================================
30. RED TEAM ÉTICO
==================================================

Executar somente no ambiente QA autorizado.

Tentar:

- escalada de privilégio;
- IDOR;
- troca de tenant;
- enumeração de usuário;
- adulteração de JWT;
- replay;
- mass assignment;
- acesso a RPC;
- acesso a Edge Function;
- acesso direto à Data API;
- bypass de rota;
- convite adulterado;
- recuperação abusiva;
- token público enumerável;
- sessão antiga;
- acesso após remoção;
- acesso anon.

Classificar:

- P0 crítico;
- P1 alto;
- P2 médio;
- P3 baixo;
- informativo.

Corrigir P0 e P1 antes do PASS.

==================================================
31. EVIDÊNCIAS
==================================================

Salvar em:

tests/evidence/fortress-phase-1-auth/

Estrutura:

/architecture
/roles
/unit
/integration
/playwright
/cross-tenant
/red-team
/rls
/rpcs
/edge-functions
/public-tokens
/performance
/build

Não salvar credenciais ou tokens completos.

==================================================
32. PERFORMANCE
==================================================

Medir:

- tempo de inicialização do AuthProvider;
- número de chamadas no login;
- listeners de autenticação;
- queries de perfil;
- queries de empresa;
- redirects;
- renders;
- tempo até rota autorizada;
- cache limpo no logout;
- chamadas duplicadas.

Eliminar:

- múltiplos onAuthStateChange;
- query duplicada;
- polling de sessão desnecessário;
- redirect loop;
- carregamento serial evitável.

==================================================
33. BUILD E TYPECHECK
==================================================

Executar:

- Typecheck;
- testes unitários;
- integração;
- Playwright;
- Build de produção.

Registrar:

- comando;
- resultado;
- duração;
- warnings;
- limitações.

==================================================
34. RELATÓRIO FINAL
==================================================

Entregar:

1. Arquitetura atual de autenticação.
2. Inventário de papéis.
3. Matriz de permissões.
4. Rotas protegidas.
5. Fonte canônica de autorização.
6. Tabelas e RLS auditadas.
7. RPCs auditadas.
8. Edge Functions auditadas.
9. Tokens públicos auditados.
10. Testes unitários.
11. Integração.
12. Playwright.
13. Cross-tenant.
14. Red Team.
15. Performance.
16. Vulnerabilidades encontradas.
17. Correções aplicadas.
18. Limitações.
19. Evidências.
20. Veredito.

==================================================
35. VEREDITO
==================================================

PASS somente quando:

- nenhum P0/P1 estiver aberto;
- nenhum usuário puder elevar o próprio papel;
- cross-tenant estiver bloqueado;
- Admin Master estiver protegido em todas as camadas;
- Portal do Cliente estiver isolado;
- tokens públicos tiverem escopo mínimo;
- logout limpar dados;
- sessão expirada bloquear acesso;
- Build, Typecheck e testes passarem.

PASS PARCIAL quando alguma validação obrigatória não for executada.

FAIL quando houver:

- escalada de privilégio;
- vazamento entre tenants;
- bypass administrativo;
- acesso após remoção;
- token público expondo dados indevidos;
- service role usada sem validação;
- alteração de role ou company_id pelo cliente.

Não iniciar a Fase 2 antes do encerramento desta fase.</div>
    </div>
  );
}

