/**
 * Sprint 4D.5 — Fatia 4 / Hardening
 * Testes puros da regra de precedência empresa × global e da chave de escopo.
 */
import { describe, it, expect } from "vitest";
import { applyPrecedence, scopeKey } from "@/services/documentation/documentationCoverageLoader";

type Row = Parameters<typeof applyPrecedence>[0][number];
const COMPANY = "company-1";
const OTHER = "company-2";

function row(over: Partial<Row>): Row {
  return {
    id: over.id ?? crypto.randomUUID(),
    is_global: false,
    is_active: true,
    lifecycle_status: "published",
    company_id: COMPANY,
    code: "TPL-A",
    process_type: null,
    category: null,
    region_tag: null,
    ...over,
  } as Row;
}

describe("scopeKey", () => {
  it("retorna null quando code é vazio/nulo/espaços", () => {
    expect(scopeKey({ code: null })).toBeNull();
    expect(scopeKey({ code: "" })).toBeNull();
    expect(scopeKey({ code: "   " })).toBeNull();
  });
  it("normaliza case/whitespace do code", () => {
    expect(scopeKey({ code: " Tpl-A " })).toBe(scopeKey({ code: "tpl-a" }));
  });
  it("diferencia por process_type/category/region_tag", () => {
    expect(scopeKey({ code: "x", process_type: "A" })).not.toBe(scopeKey({ code: "x", process_type: "B" }));
    expect(scopeKey({ code: "x", category: "a" })).not.toBe(scopeKey({ code: "x", category: "b" }));
    expect(scopeKey({ code: "x", region_tag: "SP" })).not.toBe(scopeKey({ code: "x", region_tag: "RJ" }));
  });
});

describe("applyPrecedence", () => {
  it("global sem equivalente da empresa é mantido", () => {
    const g = row({ id: "g", is_global: true, company_id: null });
    expect(applyPrecedence([g], COMPANY)).toEqual([g]);
  });

  it("privado publicado + ativo sobrescreve global de mesmo escopo", () => {
    const g = row({ id: "g", is_global: true, company_id: null });
    const p = row({ id: "p" });
    const out = applyPrecedence([g, p], COMPANY);
    expect(out.map((r) => r.id).sort()).toEqual(["p"]);
  });

  it("privado em draft NÃO esconde global publicado", () => {
    const g = row({ id: "g", is_global: true, company_id: null });
    const p = row({ id: "p", lifecycle_status: "draft" });
    const ids = applyPrecedence([g, p], COMPANY).map((r) => r.id).sort();
    expect(ids).toEqual(["g", "p"]);
  });

  it("privado arquivado NÃO esconde global publicado", () => {
    const g = row({ id: "g", is_global: true, company_id: null });
    const p = row({ id: "p", lifecycle_status: "archived", is_active: false });
    const ids = applyPrecedence([g, p], COMPANY).map((r) => r.id).sort();
    expect(ids).toEqual(["g", "p"]);
  });

  it("privado inativo NÃO esconde global publicado", () => {
    const g = row({ id: "g", is_global: true, company_id: null });
    const p = row({ id: "p", is_active: false });
    const ids = applyPrecedence([g, p], COMPANY).map((r) => r.id).sort();
    expect(ids).toEqual(["g", "p"]);
  });

  it("code vazio nunca gera sobreposição", () => {
    const g = row({ id: "g", is_global: true, company_id: null, code: "" });
    const p = row({ id: "p", code: "" });
    const ids = applyPrecedence([g, p], COMPANY).map((r) => r.id).sort();
    expect(ids).toEqual(["g", "p"]);
  });

  it("mesmo code mas process_type diferente NÃO sobrescreve", () => {
    const g = row({ id: "g", is_global: true, company_id: null, process_type: "A" });
    const p = row({ id: "p", process_type: "B" });
    const ids = applyPrecedence([g, p], COMPANY).map((r) => r.id).sort();
    expect(ids).toEqual(["g", "p"]);
  });

  it("mesmo code em categorias/regiões diferentes NÃO sobrescreve", () => {
    const g = row({ id: "g", is_global: true, company_id: null, category: "a", region_tag: "SP" });
    const p = row({ id: "p", category: "b", region_tag: "SP" });
    const p2 = row({ id: "p2", category: "a", region_tag: "RJ" });
    const ids = applyPrecedence([g, p, p2], COMPANY).map((r) => r.id).sort();
    expect(ids).toEqual(["g", "p", "p2"]);
  });

  it("privado de OUTRA empresa não sobrescreve global (RLS deve já ter filtrado, mas defesa em profundidade)", () => {
    const g = row({ id: "g", is_global: true, company_id: null });
    const p = row({ id: "p", company_id: OTHER });
    const ids = applyPrecedence([g, p], COMPANY).map((r) => r.id).sort();
    expect(ids).toEqual(["g", "p"]);
  });

  it("case-insensitive: 'tpl-a' cobre 'TPL-A'", () => {
    const g = row({ id: "g", is_global: true, company_id: null, code: "TPL-A" });
    const p = row({ id: "p", code: "tpl-a" });
    expect(applyPrecedence([g, p], COMPANY).map((r) => r.id)).toEqual(["p"]);
  });
});
