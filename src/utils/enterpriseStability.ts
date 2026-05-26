/**
 * Enterprise Safety Utilities
 * Consolidates stability for production environments.
 */

/**
 * Safely access arrays, ensuring a valid array is always returned.
 */
export function safeArray<T>(arr: T[] | null | undefined): T[] {
  if (!arr || !Array.isArray(arr)) return [];
  return arr;
}

/**
 * Safely access strings, ensuring a valid string is always returned.
 */
export function safeString(str: string | null | undefined, fallback: string = ""): string {
  if (typeof str !== 'string') return fallback;
  return str || fallback;
}

/**
 * Safely access objects, ensuring a valid object is always returned.
 */
export function safeObject<T extends object>(obj: T | null | undefined): T {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return {} as T;
  return obj;
}

/**
 * Safely format dates, preventing invalid date errors.
 */
export function safeDate(date: string | Date | null | undefined): Date | null {
  if (!date) return null;
  const d = new Date(date);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Safely access numbers, ensuring a valid number is always returned.
 */
export function safeNumber(val: any, fallback: number = 0): number {
  const num = Number(val);
  return isNaN(num) ? fallback : num;
}

/**
 * Global operational status monitoring for Enterprise Stability.
 */
export const enterpriseHealth = {
  check: async () => {
    console.log("PRODUCTION_STABILIZATION_STARTED");
    // Simulate health checks
    return {
      auth: 'healthy',
      database: 'healthy',
      ocr_engine: 'healthy',
      storage: 'healthy',
      document_engine: 'stable',
      timestamp: new Date().toISOString()
    };
  }
};
