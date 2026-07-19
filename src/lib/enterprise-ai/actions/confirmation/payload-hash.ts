import { createHash } from 'crypto';

/**
 * Generates a deterministic SHA-256 hash of a payload.
 * Normalizes property order to ensure consistency.
 */
export function generatePayloadHash(payload: Record<string, any>): string {
  const normalized = normalizePayload(payload);
  const json = JSON.stringify(normalized);
  return createHash('sha256').update(json).digest('hex');
}

/**
 * Recursively sorts keys of an object to ensure deterministic JSON stringification.
 */
function normalizePayload(val: any): any {
  if (val === null || typeof val !== 'object') {
    return val;
  }

  if (Array.isArray(val)) {
    return val.map(normalizePayload);
  }

  const keys = Object.keys(val).sort();
  const result: Record<string, any> = {};
  
  for (const key of keys) {
    result[key] = normalizePayload(val[key]);
  }
  
  return result;
}
