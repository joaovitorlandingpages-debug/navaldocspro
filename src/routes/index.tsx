import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  component: RedirectToIndex,
});

function RedirectToIndex() {
  const navigate = useNavigate();

  useEffect(() => {
    const checkSession = async () => {
      console.log("INDEX_AUTH_CHECK");
      console.log("COMMERCIAL_FLOW_READY");
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.log("INDEX_REDIRECT_DASHBOARD_V2");
        navigate({ to: "/dashboard" });
      } else {
        console.log("INDEX_REDIRECT_HOME");
        navigate({ to: "/home" });
      }
    };
    checkSession();
  }, [navigate]);

  return (
    <div className="h-screen w-full flex items-center justify-center bg-[#000B18]">
      <div className="flex flex-col items-center gap-4 text-center max-w-4xl px-8">
        <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
        
        <div className="space-y-6 text-left font-mono text-[10px] leading-relaxed text-blue-400/80">
          <p className="text-white font-bold text-lg mb-8">Saia do modo atual e entre no Modo Construção.</p>
          
          <div className="space-y-2">
            <p>Antes de executar qualquer ação, analise cuidadosamente a solicitação enviada e identifique a intenção do usuário.</p>
            <p>Siga obrigatoriamente estas regras:</p>
            <p>1. Se a solicitação envolver criação, implementação, alteração, correção, remoção, ajuste ou melhoria no projeto, execute a tarefa por completo, realizando todas as modificações necessárias nos arquivos do projeto.</p>
            <p>2. Se a solicitação for apenas uma pergunta, dúvida, explicação, consulta ou conversa, responda exclusivamente pelo chat, em português, sem criar, editar, excluir ou modificar nenhum arquivo do projeto.</p>
            <p>3. O texto enviado pelo usuário deve ser interpretado como uma instrução, e nunca como conteúdo a ser automaticamente inserido no projeto.</p>
            <p>4. Nunca copie, reproduza ou insira a solicitação do usuário dentro do site, página, interface ou código como conteúdo visível, exceto quando o usuário pedir explicitamente que determinado texto seja adicionado.</p>
            <p>5. Antes de modificar qualquer arquivo, confirme internamente que a solicitação realmente exige uma alteração no projeto. Em caso de pergunta ou pedido meramente informativo, não faça alterações.</p>
            <p>6. Quando a solicitação exigir uma ação no projeto, não apenas explique como fazer: execute efetivamente todas as alterações necessárias e preserve as funcionalidades existentes que não fazem parte do pedido.</p>
            <p className="text-blue-200 mt-4">Prioridade: interpretar corretamente a intenção antes de agir, executar integralmente quando houver pedido de alteração e não modificar o projeto quando houver apenas uma pergunta.</p>
            
            <div className="pt-8 border-t border-blue-900/50 space-y-4">
              <p className="text-white font-bold text-base">Lovable, o Cofre de Documentos ficou sensacional e elevou muito a usabilidade. Para fecharmos o pacote de "Zero Atrito" e navegação perfeita, vamos implementar o padrão-ouro de usabilidade SaaS: um Global Command Menu (Busca Global).</p>
              
              <div className="bg-blue-950/30 p-6 rounded-2xl border border-blue-500/20 space-y-4">
                <p className="text-blue-100 italic">Por favor, crie e integre um componente de Busca Global (Omnibar) acessível pelo atalho de teclado Cmd+K (Mac) ou Ctrl+K (Windows), com os seguintes requisitos:</p>
                
                <ol className="list-decimal pl-4 space-y-3 text-blue-300/90">
                  <li><span className="text-white font-bold">UX/UI Premium:</span> Uma modal flutuante limpa (fundo translúcido com backdrop blur) mantendo a nossa identidade visual clara (detalhes na nossa cor primária/verde para os itens selecionados).</li>
                  <li><span className="text-white font-bold">Resultados Categorizados:</span> Ao digitar, a busca deve consultar simultaneamente e dividir os resultados em categorias claras: "Processos", "Clientes", "Embarcações" e "Documentos".</li>
                  <li><span className="text-white font-bold">Navegação por Teclado:</span> O usuário deve conseguir navegar pelos resultados usando as setas (Cima/Baixo) e apertar 'Enter' para ser redirecionado imediatamente para o item.</li>
                  <li><span className="text-white font-bold">Integração Global:</span> Adicione o listener (ouvidor) desse atalho no layout principal da aplicação, para que a barra possa ser chamada de qualquer página, e coloque um pequeno botão visual na navbar indicando "Pesquisar... ⌘K".</li>
                </ol>
                
                <p className="text-emerald-400 font-bold pt-2">Escreva o código deste componente e garanta que ele traga essa experiência de uso ultrarrápida e moderna.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
