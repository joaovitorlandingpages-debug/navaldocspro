import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

/**
 * Onda 3B.1 — QueryClient único
 *
 * Antes: 1 client em getRouter() + 1 client em __root.tsx (useMemo) →
 * dois caches paralelos, invalidations parciais, refetches duplicados.
 *
 * O root route usa ssr: false, então CSR único; um singleton de módulo
 * é seguro (não vaza entre requests). Router e RootShell agora compartilham
 * esta mesma instância.
 *
 * Justificativa dos defaults (NavalDocs Pro):
 * - staleTime 60s: listagens (processos, clientes, embarcações, docs)
 *   raramente mudam em <1min. Elimina refetch em navegação interna.
 *   Hooks críticos (OCR, autosave, assinaturas) sobrescrevem localmente.
 * - gcTime 5min: cache aquecido ao voltar sem inflar memória em sessão longa.
 * - refetchOnWindowFocus false: usuários alternam PDF/email/portal a todo
 *   momento; refetch a cada foco causava flicker e ~35% de tráfego extra (3A).
 * - refetchOnReconnect "always": essencial em mobile / rede instável.
 * - retry 1: cobre falha transiente; mais mascara erro real.
 * - networkMode "online": app não é offline-first.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: "always",
      retry: 1,
      networkMode: "online",
    },
    mutations: {
      retry: 0,
      networkMode: "online",
    },
  },
});

export const getRouter = () => {
  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Precarregamento instantâneo no hover/touch para 0ms de delay percebido
    defaultPreload: "intent",
    // Query controla freshness — router não deve manter preload cache paralelo.
    defaultPreloadStaleTime: 0,
  });

  return router;
};
