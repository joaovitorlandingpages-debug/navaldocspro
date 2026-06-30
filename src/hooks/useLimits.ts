import { useQuery } from "@tanstack/react-query";
import { limitsEngine, ResourceKey, ResourceStatus } from "@/services/limitsEngine";

export function useResourceStatus() {
  return useQuery<ResourceStatus[]>({
    queryKey: ["limits-status"],
    queryFn: () => limitsEngine.status(),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export function useLimitsEngine() {
  return limitsEngine;
}

export type { ResourceKey, ResourceStatus };
