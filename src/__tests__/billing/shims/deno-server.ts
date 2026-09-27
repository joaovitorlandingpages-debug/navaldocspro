// Shim para execução de Edge Functions do Supabase/Deno no ambiente Vitest/Node
export const serve = (handler: any) => {
  // No Deno ambiente de produção serve registra o HTTP listener.
  // No Vitest/Node, permite testes unitários chamarem o handler diretamente.
};
