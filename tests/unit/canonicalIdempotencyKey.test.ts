import { describe, it, expect } from "vitest";
import { buildIdempotencyKey } from "@/services/documents/canonicalDocumentGeneration";

const base = {
  companyId: "c1",
  processId: "p1",
  templateId: "t1",
  templateVersion: 1,
  category: "ART_ELETRICA",
  checklistItemId: null as string | null,
  actionIntent: "manual_generate",
  regenerationRevision: 0,
};

describe("buildIdempotencyKey", () => {
  it("é estável para a mesma entrada (retry reutiliza)", () => {
    expect(buildIdempotencyKey(base)).toBe(buildIdempotencyKey(base));
  });

  it("muda quando a versão publicada muda", () => {
    expect(buildIdempotencyKey({ ...base, templateVersion: 2 })).not.toBe(buildIdempotencyKey(base));
  });

  it("muda com regeneração explícita (revision)", () => {
    expect(buildIdempotencyKey({ ...base, regenerationRevision: 1 })).not.toBe(buildIdempotencyKey(base));
  });

  it("muda com checklistItemId distinto", () => {
    expect(buildIdempotencyKey({ ...base, checklistItemId: "ck1" })).not.toBe(
      buildIdempotencyKey({ ...base, checklistItemId: "ck2" }),
    );
  });

  it("muda com actionIntent distinto", () => {
    expect(buildIdempotencyKey({ ...base, actionIntent: "batch_generate" })).not.toBe(
      buildIdempotencyKey({ ...base, actionIntent: "manual_generate" }),
    );
  });

  it("nunca contém UUID aleatório", () => {
    const k = buildIdempotencyKey(base);
    expect(k.startsWith("canon:v1:")).toBe(true);
    expect(k).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
  });
});
