import { useEffect, useRef, useState, useCallback } from "react";

/**
 * useLocalDraft — localStorage-backed draft for multi-step wizards.
 * No server calls; complements CAS locking for wizards that only
 * commit at the final step. Survives refresh / crash / tab close.
 */
export function useLocalDraft<T>(key: string, current: T, enabled: boolean) {
  const storageKey = `draft:${key}`;
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback((): T | null => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(storageKey) : null;
      if (!raw) return null;
      const p = JSON.parse(raw);
      return (p?.data ?? null) as T | null;
    } catch { return null; }
  }, [storageKey]);

  const clear = useCallback(() => {
    try { window.localStorage.removeItem(storageKey); } catch { /* noop */ }
    setSavedAt(null);
  }, [storageKey]);

  useEffect(() => {
    if (!enabled) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify({ data: current, ts: Date.now() }));
        setSavedAt(new Date());
      } catch { /* quota */ }
    }, 600);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [current, enabled, storageKey]);

  useEffect(() => {
    function flush() {
      if (!enabled) return;
      try { window.localStorage.setItem(storageKey, JSON.stringify({ data: current, ts: Date.now() })); } catch { /* noop */ }
    }
    window.addEventListener("beforeunload", flush);
    return () => window.removeEventListener("beforeunload", flush);
  }, [current, enabled, storageKey]);

  return { load, clear, savedAt };
}
