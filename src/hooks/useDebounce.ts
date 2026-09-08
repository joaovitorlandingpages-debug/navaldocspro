import { useState, useEffect } from "react";

/**
 * Hook customizado para atrasar a atualização de um valor (ex.: busca em tempo real),
 * reduzindo chamadas a APIs, re-renderizações e execuções desnecessárias.
 *
 * @param value Valor a ser observado
 * @param delayMs Tempo de espera em milissegundos (padrão: 300ms)
 * @returns Valor com atraso aplicado
 */
export function useDebounce<T>(value: T, delayMs = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delayMs]);

  return debouncedValue;
}
