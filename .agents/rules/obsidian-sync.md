---
description: Regra para entrega de resumo formatado para o Obsidian ao término de tarefas importantes
globs: *
---

# Regra: Sincronização e Memória de Longo Prazo (Obsidian)

Sempre que você concluir uma tarefa importante, refatoração de código, implementação de funcionalidade ou correção crítica na IDE:

1. **Entregar Bloco Copiável:** No final da resposta, entregue um bloco em Markdown formatado especificamente para ser copiado e colado na nota do projeto correspondente dentro do cofre do Obsidian (`Obsidian/Projetos/NavalDocsPro.md`).
2. **Formato Obrigatório do Bloco:**
   ```markdown
   ### 📝 Registro de Entrega · [DATA_HORA]
   - **Objetivo:** [Resumo conciso da tarefa]
   - **Status:** [Resultados dos testes e TypeScript, ex: 367 testes ok, 0 tsc errors]
   - **Arquivos Alterados:** [Lista dos arquivos e papéis]
   - **Decisões Técnicas:** [Decisões arquiteturais tomadas]
   - **Próximos Passos:** [Recomendações para a próxima iteração]
   ```
3. **Sem enrolação:** O bloco deve ser direto, limpo e de alta densidade técnica para fácil leitura no grafo de conhecimento.
