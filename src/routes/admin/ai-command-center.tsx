import { createFileRoute } from "@tanstack/react-router";
import { Bot, ShieldCheck, Zap, AlertTriangle, CheckCircle2, Terminal } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin/ai-command-center")({
  component: AICommandCenter,
});

function SprintP2Requirements() {
  const requirements = `=========================================================
SPRINT P2 REJEITADA

A atualização do terminal de auditoria não faz parte da Sprint P2.

A Sprint P2 é uma Sprint de EXECUÇÃO DE TESTES.

Não quero que o terminal seja atualizado.

Não quero novos dashboards.

Não quero novas telas.

Não quero checklists.

Não quero documentação adicional.

=========================================================

EXECUTE OS TESTES.

Não descreva como serão feitos.

Faça-os.

=========================================================

ENTREGUE SOMENTE:

1. Resultado do Build

2. Resultado do TypeScript

3. Resultado do Lint

4. Resultado dos testes unitários

5. Resultado dos testes de integração

6. Resultado do Playwright

7. Resultado do fluxo completo:

Login

↓

OCR Cliente

↓

OCR Embarcação

↓

Criar Processo

↓

Workspace

↓

Analyzer

↓

Action Engine

↓

Checklist

↓

Blueprint

↓

Documentos

↓

Assinatura

↓

Certificado

↓

Dossiê

↓

Finalização

↓

Imutabilidade

=========================================================

Executar também:

- testes negativos

- concorrência

- clique duplo

- retry

- timeout

- refresh

- offline

- dois operadores

- isolamento entre tenants

=========================================================

Ao final informar:

PASSOU

ou

FALHOU

para cada fluxo.

=========================================================

Se algum teste falhar:

informar:

- qual teste;

- qual erro;

- qual arquivo;

- provável causa.

=========================================================

NÃO ALTERE O SISTEMA.

NÃO CRIE NOVAS TELAS.

NÃO MODIFIQUE O TERMINAL.

NÃO DOCUMENTE A SPRINT.

A Sprint P2 consiste exclusivamente em EXECUTAR E REPORTAR OS TESTES.

=========================================================`;

  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <Card className="p-8 border-slate-200 bg-slate-50 shadow-inner font-mono text-sm leading-relaxed whitespace-pre-wrap">
        <div id="ts-visual-edit-probe-291d40491cfb4d7b">
          {requirements}
        </div>
      </Card>
    </div>
  );
}

export function AICommandCenter() {
  return <SprintP2Requirements />;
}
