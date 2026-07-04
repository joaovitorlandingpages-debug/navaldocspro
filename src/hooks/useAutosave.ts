import { useEffect, useRef, useState, useCallback } from "react";

/**
 * Onda 2B.2 — Autosave Seguro
 *
 * Features:
 *  - debounced auto-persist of a "data" object
 *  - status: idle | saving | saved | error | conflict
 *  - resilient localStorage draft (survives refresh / crash / offline)
 *  - integrates with optimistic locking: caller decides how to persist;
 *    hook only surfaces `conflict` state so UI can prompt reload.
 */

export type AutosaveStatus = "idle" | "saving" | "saved" | "error" | "conflict";

export interface AutosaveResult {
  ok: boolean;
  conflict?: boolean;
  error?: string;
}

export interface UseAutosaveOptions<T> {
  /** Stable identifier — namespaces the localStorage draft. */
  draftKey: string;
  /** Current data snapshot. */
  data: T;
  /** Persist callback. Return {ok:true} on success, {ok:false,conflict:true} on version conflict. */
  onSave: (data: T) => Promise<AutosaveResult>;
  /** Debounce in ms. Default 1200. */
  debounceMs?: number;
  /** Disable autosave (e.g. while a modal is open). */
  enabled?: boolean;
  /** Skip autosave until `data` differs from this initial reference. */
  initial?: T;
}

function equal<T>(a: T, b: T) {
  try { return JSON.stringify(a) === JSON.stringify(b); } catch { return false; }
}

export function useAutosave<T>({
  draftKey,
  data,
  onSave,
  debounceMs = 1200,
  enabled = true,
  initial,
}: UseAutosaveOptions<T>) {
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(false);
  const pendingRef = useRef<T | null>(null);
  const lastSavedRef = useRef<T | undefined>(initial);
  const storageKey = `autosave:${draftKey}`;

  // Recover local draft on mount
  const [recoveredDraft, setRecoveredDraft] = useState<T | null>(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(storageKey) : null;
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed?.data ?? null;
    } catch { return null; }
  });

  const clearDraft = useCallback(() => {
    try { window.localStorage.removeItem(storageKey); } catch { /* noop */ }
    setRecoveredDraft(null);
  }, [storageKey]);

  const runSave = useCallback(async (snapshot: T) => {
    if (inFlightRef.current) { pendingRef.current = snapshot; return; }
    inFlightRef.current = true;
    setStatus("saving");
    try {
      const res = await onSave(snapshot);
      if (res.ok) {
        lastSavedRef.current = snapshot;
        setLastSavedAt(new Date());
        setStatus("saved");
        clearDraft();
      } else if (res.conflict) {
        setStatus("conflict");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    } finally {
      inFlightRef.current = false;
      const next = pendingRef.current;
      pendingRef.current = null;
      if (next && !equal(next, lastSavedRef.current)) runSave(next);
    }
  }, [onSave, clearDraft]);

  // Persist to localStorage + schedule save whenever data changes
  useEffect(() => {
    if (!enabled) return;
    if (equal(data, lastSavedRef.current)) return;
    // Persist local draft immediately (survives refresh / crash)
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ data, ts: Date.now() }));
    } catch { /* quota — ignore */ }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => runSave(data), debounceMs);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [data, enabled, debounceMs, runSave, storageKey]);

  // Flush on unmount / tab close
  useEffect(() => {
    function flush() {
      if (!enabled) return;
      if (equal(data, lastSavedRef.current)) return;
      try { window.localStorage.setItem(storageKey, JSON.stringify({ data, ts: Date.now() })); } catch { /* noop */ }
    }
    window.addEventListener("beforeunload", flush);
    return () => { flush(); window.removeEventListener("beforeunload", flush); };
  }, [data, enabled, storageKey]);

  const saveNow = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    await runSave(data);
  }, [data, runSave]);

  return { status, lastSavedAt, recoveredDraft, clearDraft, saveNow };
}
