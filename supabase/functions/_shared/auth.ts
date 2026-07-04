// Shared helpers for edge functions: JWT validation, company resolution,
// rate limiting, and centralized limits enforcement via service_role.
//
// Usage:
//   const ctx = await authContext(req);            // throws 401 on invalid token
//   await ctx.requireCompany(resourceCompanyId);   // throws 403 on mismatch
//   await rateLimit(ctx.admin, `user:${ctx.userId}`, "generate-document", 30, 60);
//   await consume(ctx.admin, ctx.companyId!, "pdf_generation", 1, requestId);
//
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-signature, x-request-id",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

export interface AuthContext {
  userId: string;
  companyId: string | null;
  isAdminMaster: boolean;
  admin: SupabaseClient;
  user: SupabaseClient;
  /** Throws 403 if resourceCompanyId !== companyId (admin_master_global bypasses). */
  requireCompany: (resourceCompanyId: string | null | undefined) => void;
}

export function jsonResponse(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extra },
  });
}

export class HttpError extends Error {
  status: number;
  body: Record<string, unknown>;
  constructor(status: number, body: Record<string, unknown>) {
    super(typeof body.error === "string" ? body.error : `HTTP ${status}`);
    this.status = status;
    this.body = body;
  }
}

export function clientIp(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

export function makeAdmin(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );
}

/**
 * Validates the bearer token and returns auth context.
 * Throws HttpError(401) when no/invalid token is present.
 */
export async function authContext(req: Request): Promise<AuthContext> {
  const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
  if (!authHeader?.toLowerCase().startsWith("bearer ")) {
    throw new HttpError(401, { error: "missing_authorization" });
  }
  const token = authHeader.slice(7).trim();

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const { data: { user }, error } = await userClient.auth.getUser(token);
  if (error || !user) throw new HttpError(401, { error: "invalid_token" });

  const admin = makeAdmin();
  const { data: profile } = await admin
    .from("profiles")
    .select("company_id, role")
    .eq("id", user.id)
    .maybeSingle();

  const isAdminMaster = profile?.role === "admin_master_global" || profile?.role === "admin_master";
  const companyId = profile?.company_id ?? null;

  return {
    userId: user.id,
    companyId,
    isAdminMaster,
    admin,
    user: userClient,
    requireCompany(resourceCompanyId) {
      if (isAdminMaster) return;
      if (!companyId) throw new HttpError(403, { error: "no_company_bound" });
      if (!resourceCompanyId) throw new HttpError(403, { error: "resource_company_missing" });
      if (resourceCompanyId !== companyId) {
        throw new HttpError(403, { error: "company_mismatch" });
      }
    },
  };
}

/**
 * Atomic sliding-window rate limit via DB RPC. Throws HttpError(429) when exceeded.
 */
export async function rateLimit(
  admin: SupabaseClient,
  subject: string,
  bucket: string,
  max: number,
  windowSeconds: number
): Promise<void> {
  const { data, error } = await admin.rpc("rl_hit", {
    p_subject: subject,
    p_bucket: bucket,
    p_max: max,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.warn("[RATE_LIMIT_FAIL_OPEN]", bucket, subject, error.message);
    return; // fail-open to avoid bricking the function on infra issues
  }
  if (data && (data as any).allowed === false) {
    throw new HttpError(429, {
      error: "rate_limit_exceeded",
      retry_after: (data as any).retry_after ?? 60,
      bucket,
    });
  }
}

/**
 * Enforces and records consumption via limits_consume. Throws HttpError(402/429) on block.
 */
export async function consume(
  admin: SupabaseClient,
  companyId: string,
  resource: string,
  amount: number,
  requestId: string,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  const { error } = await admin.rpc("limits_consume", {
    p_company: companyId,
    p_resource: resource,
    p_amount: amount,
    p_metadata: metadata,
    p_request_id: requestId,
  });
  if (error) {
    // limit_blocked:{ "allowed":false, "reason":..., ... }
    const msg = error.message || "";
    if (msg.startsWith("limit_blocked:")) {
      let detail: any = {};
      try { detail = JSON.parse(msg.slice("limit_blocked:".length)); } catch { /* noop */ }
      throw new HttpError(402, { error: "limit_blocked", detail });
    }
    throw new HttpError(500, { error: "consume_failed", detail: msg });
  }
}

/**
 * Throws HttpError(409 process_finalized) when the process is finalized/completed/archived.
 * Admin master callers bypass (mirrors DB trigger behavior).
 */
export async function assertProcessNotFinalized(
  admin: SupabaseClient,
  processId: string | null | undefined,
  isAdminMaster = false,
): Promise<void> {
  if (!processId || isAdminMaster) return;
  const { data } = await admin
    .from("processes")
    .select("id, status, finalized_at")
    .eq("id", processId)
    .maybeSingle();
  if (!data) return;
  const finalized =
    !!data.finalized_at ||
    ["completed", "finalized", "archived"].includes(String(data.status));
  if (finalized) {
    throw new HttpError(409, { error: "process_finalized", processId });
  }
}

/**
 * Atomic claim helper for idempotent processing.
 * Returns { claimed: true } if this call transitioned the row to `toStatus`,
 * or { claimed: false, currentStatus } if it was already advanced.
 * Prevents concurrent workers from double-processing the same job.
 */
export async function claimStatus(
  admin: SupabaseClient,
  table: string,
  id: string,
  statusColumn: string,
  fromStatuses: string[],
  toStatus: string,
): Promise<{ claimed: boolean; currentStatus?: string | null }> {
  const { data: updated } = await admin
    .from(table)
    .update({ [statusColumn]: toStatus, updated_at: new Date().toISOString() })
    .eq("id", id)
    .in(statusColumn, fromStatuses)
    .select("id")
    .maybeSingle();
  if (updated) return { claimed: true };
  const { data: current } = await admin
    .from(table)
    .select(statusColumn)
    .eq("id", id)
    .maybeSingle();
  return { claimed: false, currentStatus: (current as any)?.[statusColumn] ?? null };
}

/** Wraps a handler so HttpError is rendered with CORS + JSON. */
export function withErrors(
  handler: (req: Request) => Promise<Response>
): (req: Request) => Promise<Response> {
  return async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
    try {
      return await handler(req);
    } catch (e) {
      if (e instanceof HttpError) return jsonResponse(e.body, e.status);
      console.error("[EDGE_UNCAUGHT]", e);
      return jsonResponse({ error: String((e as Error)?.message || e) }, 500);
    }
  };
}
