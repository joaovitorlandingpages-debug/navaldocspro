import { describe, it, expect, vi, beforeEach } from "vitest";
import { CATALOG_TEMPLATES, getCatalogTemplateBySlug } from "@/services/documents/templateCatalogResolver";

// Mock do supabase client
vi.mock("@/integrations/supabase/client", () => {
  return {
    supabase: {
      from: vi.fn(),
    },
  };
});

import { supabase } from "@/integrations/supabase/client";
import { resolveTemplate } from "@/lib/templates/templateResolver";

describe("NavalDocs Pro - Correções do Fluxo Principal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Catálogo e Modelos Oficiais", () => {
    it("deve conter a declaração de perda/extravio como condicional e com explicação clara", () => {
      const declPerda = getCatalogTemplateBySlug("decl-perda-extravio");
      expect(declPerda).toBeDefined();
      expect(declPerda?.isConditional).toBe(true);
      expect(declPerda?.isMandatory).toBe(false);
      expect(declPerda?.conditionText).toContain("perda, extravio, furto ou roubo");
      // Não deve ter texto de "Aguardando homologação"
      expect(declPerda?.reviewReason).not.toContain("Aguardando homologação");
      expect(declPerda?.reviewReason).toContain("Modelo em conferência pela equipe NavalDocs");
    });

    it("deve diferenciar modelos oficiais de documentos elaborados pela plataforma", () => {
      const reqCpes = getCatalogTemplateBySlug("req-padrao-cpes");
      expect(reqCpes?.nature).toBe("official_form");

      const reqJet = getCatalogTemplateBySlug("req-moto-aquatica");
      expect(reqJet?.nature).toBe("official_form");

      const reqProf = getCatalogTemplateBySlug("req-comercial-prof");
      expect(reqProf?.nature).toBe("official_form");

      const procNaval = getCatalogTemplateBySlug("proc-representacao-naval");
      expect(procNaval?.nature).toBe("platform_generated");

      const declRes = getCatalogTemplateBySlug("decl-residencia-naval");
      expect(declRes?.nature).toBe("platform_generated");
    });
  });

  describe("2. Resolução de Templates sem Erro de UUID", () => {
    it("deve detectar slugs textuais e não tentar converter texto direto para uuid", async () => {
      const mockEq = vi.fn().mockReturnThis();
      const mockOr = vi.fn().mockReturnThis();
      const mockLimit = vi.fn().mockReturnThis();
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: {
          id: "11111111-2222-3333-4444-555555555555",
          code: "proc-representacao-naval",
          company_id: "company-123",
          status: "published",
          version: 1,
        },
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: mockEq,
          or: mockOr,
          limit: mockLimit,
          maybeSingle: mockMaybeSingle,
        })),
      } as any);

      const result = await resolveTemplate({
        manualTemplateId: "proc-representacao-naval",
        companyId: "company-123",
      });

      expect(result.source).toBe("manual");
      if (result.source === "manual") {
        // Deve retornar o UUID real do banco
        expect(result.templateId).toBe("11111111-2222-3333-4444-555555555555");
        expect(result.version).toBe(1);
      }
      // O select deve ter buscado por code (or), e NÃO por .eq("id", "proc-representacao-naval")
      expect(mockOr).toHaveBeenCalledWith(
        'code.eq."proc-representacao-naval",code.ilike."proc-representacao-naval"',
      );
    });

    it("ao receber um UUID real, deve buscar diretamente pelo id", async () => {
      const validUuid = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
      const mockEq = vi.fn().mockReturnThis();
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: {
          id: validUuid,
          company_id: "company-123",
          status: "published",
          version: 2,
        },
        error: null,
      });

      vi.mocked(supabase.from).mockReturnValue({
        select: vi.fn(() => ({
          eq: mockEq,
          maybeSingle: mockMaybeSingle,
        })),
      } as any);

      const result = await resolveTemplate({
        manualTemplateId: validUuid,
        companyId: "company-123",
      });

      expect(result.source).toBe("manual");
      if (result.source === "manual") {
        expect(result.templateId).toBe(validUuid);
        expect(result.version).toBe(2);
      }
      expect(mockEq).toHaveBeenCalledWith("id", validUuid);
    });
  });

  describe("3. Contagem e Persistência de Múltiplos Serviços", () => {
    it("deve somar corretamente os serviços selecionados quando draft_data.services for um array", () => {
      const mockProcesses = [
        {
          id: "proc-1",
          customer_id: "cust-1",
          vessel_id: "vess-1",
          draft_data: {
            services: ["inscricao_inicial", "renovacao_tie", "transferencia_propriedade", "segunda_via_tie"],
          },
        },
        {
          id: "proc-2",
          customer_id: "cust-1",
          vessel_id: "vess-1",
          draft_data: {
            services: ["despacho_maritimo"],
          },
        },
      ];

      const clientProcesses = mockProcesses.filter((p) => p.customer_id === "cust-1");
      const servicesCount = clientProcesses.reduce((acc, p) => {
        const dServices = (p.draft_data as any)?.services;
        const count = Array.isArray(dServices) && dServices.length > 0 ? dServices.length : 1;
        return acc + count;
      }, 0);

      // 4 do primeiro processo + 1 do segundo = 5 serviços no total
      expect(servicesCount).toBe(5);
    });
  });
});
