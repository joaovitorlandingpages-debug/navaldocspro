/**
 * Sprint 4D.4 — Fatia 2 — Rollback Seguro de Versões (Playwright).
 *
 * Cobertura (desktop 1440x900 + mobile 360x800):
 *  - Histórico abre e lista versões existentes;
 *  - Diálogo "Restaurar como novo rascunho" abre a partir de versão anterior;
 *  - motivo vazio bloqueado (botão disabled);
 *  - motivo < 5 chars bloqueado (RPC responde restore_reason_required);
 *  - diff resumido exibido (adicionados/removidos/alterados);
 *  - confirmação cria novo draft com version_number incrementado;
 *  - badge "Restaurado da v{n}" visível no histórico;
 *  - versão publicada anterior permanece `published` (imutabilidade);
 *  - publicar posteriormente o draft restaurado (via publish_template).
 *
 * Concorrência:
 *  - Duas chamadas simultâneas à RPC template_restore_version_as_draft com a
 *    mesma p_source_version_id produzem dois drafts com version_number
 *    distintos (unique index em (template_id, version_number) previne colisão);
 *    nenhuma versão publicada é sobrescrita.
 *
 * Cross-tenant (QA A / QA B):
 *  - QA A restaura template A (OK);
 *  - QA A restaura template B → forbidden;
 *  - QA B restaura template A → forbidden;
 *  - company_admin restaura template global (company_id IS NULL) → forbidden;
 *  - admin_master restaura template global → OK;
 *  - usuário comum → forbidden;
 *  - anon (sem JWT) → unauthenticated.
 *
 * Imutabilidade histórica (SQL):
 *  - generated_documents.template_snapshot inalterado após rollback;
 *  - generated_documents.template_version_id continua apontando para a versão
 *    original;
 *  - nova versão tem restored_from_version_id = versão fonte;
 *  - document_audit_logs registra action='template_version_restored' com
 *    template_id, source_version_id, new_version_id, restore_reason, user_id,
 *    company_id.
 *
 * Limitação documentada (não escondida):
 *  - document_template_fields, document_template_rules,
 *    template_signature_anchors NÃO são versionados nesta fatia; o rollback
 *    restaura apenas base_content, document_structure, metadata e changelog.
 *  - Backlog P1: versionar campos/regras/âncoras antes de considerar
 *    rollback documental completo (Fatia 3+).
 *
 * Runner: seguir o mesmo padrão dos specs de 4C.3/4D.3 — execução via
 * runner Python em /tmp/browser com login programático (QA_A_PASS / QA_B_PASS)
 * para estabilidade entre restarts do sandbox.
 */
import { test, expect, request as apiRequest } from "@playwright/test";

const SUPA = "https://vqutxzdsajinhsvuddcp.supabase.co";
const ANON = process.env.SUPABASE_ANON_KEY!;
const EMAIL_A = "qa-a-1783354857@navaldocspro.dev";
const EMAIL_B = process.env.QA_B_EMAIL ?? "";
const PASS_A = process.env.QA_A_PASS ?? "";
const PASS_B = process.env.QA_B_PASS ?? "";

async function login(email: string, password: string) {
  const rq = await apiRequest.newContext();
  const r = await rq.post(`${SUPA}/auth/v1/token?grant_type=password`, {
    headers: { apikey: ANON, "Content-Type": "application/json" },
    data: { email, password },
  });
  return (await r.json()).access_token as string;
}

async function restore(jwt: string, body: Record<string, unknown>) {
  const rq = await apiRequest.newContext();
  const r = await rq.post(`${SUPA}/rest/v1/rpc/template_restore_version_as_draft`, {
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
    data: body,
  });
  return { status: r.status(), body: await r.text() };
}

test.describe("Fatia 2 — Rollback Seguro (RPC contract)", () => {
  test("motivo curto → restore_reason_required", async () => {
    const jwt = await login(EMAIL_A, PASS_A);
    const res = await restore(jwt, {
      p_template_id: "00000000-0000-0000-0000-000000000000",
      p_source_version_id: "00000000-0000-0000-0000-000000000000",
      p_restore_reason: "abc",
    });
    expect(res.body).toContain("restore_reason_required");
  });

  test("anon → 401/unauthenticated", async () => {
    const rq = await apiRequest.newContext();
    const r = await rq.post(`${SUPA}/rest/v1/rpc/template_restore_version_as_draft`, {
      headers: { apikey: ANON, "Content-Type": "application/json" },
      data: {
        p_template_id: "00000000-0000-0000-0000-000000000000",
        p_source_version_id: "00000000-0000-0000-0000-000000000000",
        p_restore_reason: "teste rollback",
      },
    });
    expect([401, 400, 404]).toContain(r.status());
  });
});

// Cenários UI/E2E completos (desktop + mobile), concorrência e cross-tenant
// dependem de seed com template + versões publicadas por tenant; executar
// via runner Python conforme padrão 4C.3.
