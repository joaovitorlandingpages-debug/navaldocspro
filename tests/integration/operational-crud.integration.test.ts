import { describe, it, expect } from "vitest";
import { customerFormSchema, vesselFormSchema, processFormSchema } from "@/lib/validations/operationalSchemas";

describe("Fluxo de Integração: CRUD Operacional & Validação de Schemas", () => {
  const validCustomerId = "c8e1e75a-3507-4e3e-8c38-23f2f8fa4b7b";
  const validVesselId = "f47ac10b-58cc-4372-a567-0e02b2c3d479";

  describe("1. CRUD de Clientes (Proprietários / Armadores)", () => {
    it("deve validar e formatar dados válidos de cliente com CPF", () => {
      const rawInput = {
        name: "  Comandante João Carlos  ",
        cpf_cnpj: "123.456.789-00",
        email: "joao.carlos@naval.com",
        phone: "(11) 98765-4321",
        address: "Av. Beira Mar, 100",
        notes: "Cliente prioritário Marina Sul"
      };

      const parsed = customerFormSchema.safeParse(rawInput);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.name).toBe("Comandante João Carlos");
        expect(parsed.data.email).toBe("joao.carlos@naval.com");
        expect(parsed.data.cpf_cnpj).toBe("123.456.789-00");
      }
    });

    it("deve rejeitar cliente com nome menor que 2 caracteres ou e-mail malformado", () => {
      const invalidInput = {
        name: "J",
        email: "email-invalido-sem-arroba"
      };

      const parsed = customerFormSchema.safeParse(invalidInput);
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        const errors = parsed.error.format();
        expect(errors.name?._errors.length).toBeGreaterThan(0);
        expect(errors.email?._errors.length).toBeGreaterThan(0);
      }
    });
  });

  describe("2. CRUD de Embarcações & Veículos", () => {
    it("deve validar dados de embarcação a motor associada a um cliente", () => {
      const rawVessel = {
        name: "Veleiro Horizonte Azul",
        registration_number: "PR-3829-19",
        vessel_type: "Lancha / Veleiro",
        engine: "Mercury 250 HP",
        category: "Esporte e Recreio",
        customer_id: validCustomerId,
      };

      const parsed = vesselFormSchema.safeParse(rawVessel);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.name).toBe("Veleiro Horizonte Azul");
        expect(parsed.data.registration_number).toBe("PR-3829-19");
        expect(parsed.data.customer_id).toBe(validCustomerId);
      }
    });

    it("deve rejeitar embarcação sem nome obrigatório ou com customer_id inválido", () => {
      const invalidVessel = {
        name: "",
        registration_number: "PR-0000",
        customer_id: "id-invalido-nao-uuid"
      };

      const parsed = vesselFormSchema.safeParse(invalidVessel);
      expect(parsed.success).toBe(false);
    });
  });

  describe("3. Abertura e Gestão de Processos Navais", () => {
    it("deve validar abertura de processo com tipo de serviço, cliente e embarcação", () => {
      const rawProcess = {
        process_type: "Inscrição de Embarcação Nova - Marinha",
        customer_id: validCustomerId,
        vessel_id: validVesselId,
        priority: "high" as const,
        status: "pending" as const,
        due_date: "2026-12-31",
        notes: "Urgência solicitada para Capitania dos Portos"
      };

      const parsed = processFormSchema.safeParse(rawProcess);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.process_type).toContain("Inscrição");
        expect(parsed.data.customer_id).toBe(validCustomerId);
        expect(parsed.data.priority).toBe("high");
      }
    });
  });
});
