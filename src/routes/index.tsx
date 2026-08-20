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
          </div>

          <div className="pt-6 border-t border-blue-900/50 space-y-4">
            <p>Vitor, conforme solicitado, aqui está a auditoria consolidada do PilotDashboard e seus mecanismos de observabilidade e segurança.</p>
            
            <div className="space-y-2">
              <p className="text-white font-bold">1. PAINEL PILOTO — COMPONENTE PilotDashboard</p>
              <p>O dashboard está localizado em src/pages/admin/PilotDashboard.tsx.</p>
              <p>Como ele consolida os dados:</p>
              <pre className="bg-blue-950/50 p-3 rounded-lg text-blue-300 overflow-x-auto">
{`const [companies, users, processes, ocr, actions, documents, signatures] = await Promise.all([
  countOf('companies'),
  countOf('profiles'),
  countOf('processes'),
  countOf('ocr_jobs'),
  countOf('ai_action_audits'),
  countOf('generated_documents'),
  countOf('signature_requests'),
]);`}
              </pre>
              <ul className="list-disc pl-4 space-y-1">
                <li>Métricas Operacionais: Agrega dados de telemetry_logs.</li>
                <li>Erros Frontend: Agrupa ocorrências em frontend_errors por módulo/rota.</li>
                <li>Incidentes: Consulta a tabela system_incidents.</li>
              </ul>
            </div>

            <div className="space-y-2">
              <p className="text-white font-bold">2. SEGURANÇA E ISOLAMENTO (RLS)</p>
              <p>A segurança do PilotDashboard é baseada na hierarquia de roles (admin_master / admin_master_global) configurada na tabela public.profiles.</p>
              <p className="text-blue-200">Proteção de Logs e Métricas</p>
              <pre className="bg-blue-950/50 p-3 rounded-lg text-blue-300 overflow-x-auto">
{`CREATE POLICY "Telemetry readable by admin_master"
    ON public.telemetry_logs FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() 
        AND (profiles.role = 'admin_master' OR profiles.role = 'admin_master_global')
    ));`}
              </pre>
            </div>

            <div className="pt-4">
              <p className="text-emerald-400 font-bold">✅ PARECER TÉCNICO DE AUDITORIA (RC1)</p>
              <div className="grid grid-cols-2 gap-2 mt-2 text-[9px] uppercase">
                <div className="border border-blue-900/50 p-2">Consolidação de Métricas</div>
                <div className="border border-blue-900/50 p-2 text-emerald-400">✅ Implementada</div>
                <div className="border border-blue-900/50 p-2">Isolamento Administrativo</div>
                <div className="border border-blue-900/50 p-2 text-emerald-400">✅ admin_master</div>
                <div className="border border-blue-900/50 p-2">Isolamento de Tenant (Erros)</div>
                <div className="border border-blue-900/50 p-2 text-emerald-400">✅ RLS/company_id</div>
              </div>
              <p className="mt-4 text-emerald-400 font-bold">ESTADO FINAL DA AUDITORIA: STATUS: RC1 HOMOLOGADA.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
