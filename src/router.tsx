import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

/**
 * Onda 3B.1 — Defaults globais do TanStack Query
 *
 * Justificativa (NavalDocs Pro):
 * - staleTime: 60_000 → dados de listagem (processos, clientes, embarcações,
 *   documentos, notificações) não mudam a cada segundo. 1 minuto elimina
 *   refetches em navegação entre rotas do mesmo fluxo sem tornar dados
 *   perceptivelmente obsoletos. Hooks críticos (autosave, OCR, status de
 *   assinatura) continuam sobrescrevendo com valores menores localmente.
 * - gcTime: 5 * 60_000 → mantém cache aquecido por 5 min ao voltar de uma
 *   página, sem inflar memória em sessões longas de admin_master.
 * - refetchOnWindowFocus: false → usuários alternam constantemente entre
 *   PDF viewer, portal do cliente, e-mail. Refetch a cada foco causava
 *   flicker e requests desnecessários (medido em 3A: ~35% do tráfego).
 * - refetchOnReconnect: "always" → em uso mobile / conexões instáveis é
 *   essencial revalidar quando volta a rede.
 * - retry: 1 → um retry cobre falhas transientes de Edge/rede; mais que
 *   isso mascara erros de aplicação e infla latência percebida.
 * - networkMode: "online" → evita fetch e escrita em cache quando offline;
 *   o app não é offline-first.
 */
export const getRouter = () => {
  const queryClient = new QueryClient({
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

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Query controla freshness — router não deve manter preload cache paralelo.
    defaultPreloadStaleTime: 0,
  });

  return router;
};
