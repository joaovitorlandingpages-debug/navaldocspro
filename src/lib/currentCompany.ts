import { supabase } from '@/integrations/supabase/client';

// Onda 3C.2: process-wide cache of `profiles.company_id` for the current user.
// Eliminates the recurring `select company_id from profiles where id = auth.uid()`
// pattern in services/utils/hooks that previously ran on nearly every render.
//
// Populated by AuthContext on bootstrap; readers fall back to a single DB fetch
// (deduped via inFlight promise) if the cache is cold.

let cachedUserId: string | null = null;
let cachedCompanyId: string | null = null;
let inFlight: Promise<string | null> | null = null;

export function setCachedCompanyId(userId: string, companyId: string | null) {
  cachedUserId = userId;
  cachedCompanyId = companyId;
}

export function clearCachedCompanyId() {
  cachedUserId = null;
  cachedCompanyId = null;
  inFlight = null;
}

export function peekCachedCompanyId(): string | null {
  return cachedCompanyId;
}

export async function getCurrentCompanyId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  if (cachedUserId === user.id && cachedCompanyId !== null) return cachedCompanyId;
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const { data } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .maybeSingle();
    cachedUserId = user.id;
    cachedCompanyId = data?.company_id ?? null;
    inFlight = null;
    return cachedCompanyId;
  })();
  return inFlight;
}
