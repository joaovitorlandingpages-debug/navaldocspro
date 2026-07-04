import { useQuery } from "@tanstack/react-query";
import { limitsEngine, ResourceKey, ResourceStatus } from "@/services/limitsEngine";

/**
 * Onda 3B.1 — Consumo de limites
 *
 * Antes: polling a cada 60s em qualquer tela que montasse o hook
 * (ex.: /consumo, e potencialmente widgets globais). Isso gerava request
 * administrativo em telas comuns (medido em 3A: ~1 req/min por aba aberta).
 *
 * Agora:
 * - polling desligado por padrão (nenhuma tela comum consulta em background);
 * - a rota /consumo, que é a única legítima, ativa refetch manual + intervalo
 *   longo (5 min) via opções para não sobrecarregar o backend.
 */
export function useResourceStatus(options?: { pollMs?: number; enabled?: boolean }) {
  const { pollMs, enabled = true } = options ?? {};
  return useQuery<ResourceStatus[]>({
    queryKey: ["limits-status"],
    queryFn: () => limitsEngine.status(),
    enabled,
    refetchInterval: pollMs ?? false,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useLimitsEngine() {
  return limitsEngine;
}

export type { ResourceKey, ResourceStatus };
