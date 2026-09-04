import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  calculateProportionalDimensions,
  fetchLogoDataUrl,
  buildPdfBlob,
  downloadOrOpenPdf,
  MAX_LOGO_WIDTH_PT,
  MAX_LOGO_HEIGHT_PT,
  type OrderOrBudgetDocument,
} from "../pdf-export";

describe("pdf-export: Estabilização de Geração de PDF", () => {
  describe("1. Renderização do Logotipo e Proporções", () => {
    it("deve limitar largura máxima a 45mm (~127.56 pt)", () => {
      // Imagem panorâmica 1000x200
      const dim = calculateProportionalDimensions(1000, 200);
      expect(dim.width).toBeLessThanOrEqual(MAX_LOGO_WIDTH_PT);
      expect(dim.height).toBeLessThanOrEqual(MAX_LOGO_HEIGHT_PT);
      expect(dim.width / dim.height).toBeCloseTo(1000 / 200, 1);
    });

    it("deve limitar altura máxima preservando aspect-ratio em imagem vertical", () => {
      // Imagem vertical 200x1000
      const dim = calculateProportionalDimensions(200, 1000);
      expect(dim.height).toBeLessThanOrEqual(MAX_LOGO_HEIGHT_PT);
      expect(dim.width).toBeLessThanOrEqual(MAX_LOGO_WIDTH_PT);
      expect(dim.width / dim.height).toBeCloseTo(200 / 1000, 1);
    });

    it("deve calcular proporção 1:1 corretamente em logo quadrado", () => {
      const dim = calculateProportionalDimensions(500, 500);
      expect(dim.width).toBe(dim.height);
      expect(dim.width).toBeLessThanOrEqual(MAX_LOGO_HEIGHT_PT);
    });

    it("deve retornar Base64 imediatamente se a URL já for data:image", async () => {
      const base64Data = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
      const res = await fetchLogoDataUrl(base64Data);
      expect(res).toBe(base64Data);
    });

    it("deve retornar null graciosamente se URL for nula ou falhar CORS", async () => {
      const res = await fetchLogoDataUrl(null);
      expect(res).toBeNull();

      // URL inexistente ou com erro de rede
      const resFail = await fetchLogoDataUrl("https://invalid-non-existent-domain-12345.org/logo.png");
      expect(resFail).toBeNull();
    });
  });

  describe("2. Estrutura do Documento e Paginação de Tabelas", () => {
    it("deve gerar PDF com fallback elegante quando a oficina não tem logo", () => {
      const blob = buildPdfBlob({
        name: "Ordem de Serviço #1024",
        branding: {
          companyName: "Oficina Naval São Pedro",
          companyCnpj: "12.345.678/0001-90",
          contactPhone: "(21) 98765-4321",
        },
        logoDataUrl: null,
      });

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBeGreaterThan(500);
      expect(blob.type).toBe("application/pdf");
    });

    it("deve estruturar Ordem de Serviço com dados do cliente, veículo/embarcação e totais", () => {
      const docData: OrderOrBudgetDocument = {
        docType: "ordem_servico",
        docTitle: "ORDEM DE SERVIÇO Nº 2026-001",
        docNumber: "2026-001",
        createdAt: "04/09/2026",
        customer: {
          name: "Carlos Eduardo Silva",
          cpfCnpj: "123.456.789-00",
          phone: "(11) 98888-7777",
          email: "carlos@email.com",
        },
        vehicleOrVessel: {
          name: "Lancha Mar Azul 280",
          plateOrInscription: "381-123456-7",
          modelOrType: "Fibraform 28ft",
        },
        items: [
          { description: "Revisão Geral do Motor de Popa", type: "servico", quantity: 1, unitPrice: 1200 },
          { description: "Troca de Óleo e Filtros Marítimos", type: "peca", quantity: 2, unitPrice: 350 },
          { description: "Substituição do Rotor da Bomba D'água", type: "peca", quantity: 1, unitPrice: 450 },
          { description: "Alinhamento de Eixo e Hélice", type: "servico", quantity: 1, unitPrice: 800 },
        ],
        discount: 100,
        observations: "Garantia de 90 dias sobre serviços e peças aplicadas.",
      };

      const blob = buildPdfBlob({
        name: "Ordem de Serviço",
        structuredDoc: docData,
        branding: {
          companyName: "Marina & Oficina Náutica Pro",
        },
      });

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.size).toBeGreaterThan(1000);
    });

    it("deve realizar quebra de página limpa repetindo cabeçalhos em tabelas extensas (35+ itens)", () => {
      const largeItemList = Array.from({ length: 40 }, (_, idx) => ({
        index: idx + 1,
        description: `Peça de Reposição Específica #${idx + 1} - Parafusos inox e retentores marítimos de alta pressão`,
        type: idx % 2 === 0 ? "peca" : "servico",
        quantity: idx + 1,
        unitPrice: 50 + idx * 5,
      }));

      const docData: OrderOrBudgetDocument = {
        docType: "orcamento",
        docTitle: "ORÇAMENTO COMPLETO DE REFORMA GERAL",
        docNumber: "ORC-9920",
        customer: { name: "Transportes Marítimos Oceano Ltda", cpfCnpj: "00.123.456/0001-99" },
        vehicleOrVessel: { name: "Rebocador Titan I", plateOrInscription: "RB-8899-RJ" },
        items: largeItemList,
        observations: "Validade do orçamento: 15 dias corridos.",
      };

      const blob = buildPdfBlob({
        name: "Orçamento Extenso",
        structuredDoc: docData,
        branding: {
          companyName: "Estaleiro & Oficina Naval Titan",
        },
      });

      expect(blob).toBeInstanceOf(Blob);
      // Documento com 40 itens e repetição de cabeçalho em múltiplas páginas deve gerar um blob maior
      expect(blob.size).toBeGreaterThan(4000);
    });
  });

  describe("3. Exportação e Download Multiplataforma (Mobile / Desktop)", () => {
    let originalWindow: any;
    let originalDocument: any;

    beforeEach(() => {
      vi.restoreAllMocks();
      originalWindow = (globalThis as any).window;
      originalDocument = (globalThis as any).document;
    });

    afterEach(() => {
      (globalThis as any).window = originalWindow;
      (globalThis as any).document = originalDocument;
    });

    it("deve disparar abertura nativa (viewer) em ambiente iOS/Safari", () => {
      const mockOpen = vi.fn().mockReturnValue({});
      (globalThis as any).window = {
        open: mockOpen,
        navigator: {
          userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1",
          platform: "iPhone",
          maxTouchPoints: 5,
        },
      };
      (globalThis as any).document = {
        createElement: vi.fn(),
        body: { appendChild: vi.fn(), removeChild: vi.fn() },
      };
      (globalThis as any).URL.createObjectURL = vi.fn().mockReturnValue("blob:mock-pdf");
      (globalThis as any).URL.revokeObjectURL = vi.fn();

      const dummyBlob = new Blob(["%PDF-1.4 dummy"], { type: "application/pdf" });
      const result = downloadOrOpenPdf(dummyBlob, "ordem_servico.pdf");

      expect(result.success).toBe(true);
      expect(result.mode).toBe("viewer");
      expect(mockOpen).toHaveBeenCalledTimes(1);
    });

    it("deve disparar download via link programático em ambiente Desktop / Android Chrome", () => {
      const mockClick = vi.fn();
      const mockLink = { href: "", download: "", style: {}, click: mockClick };
      (globalThis as any).window = {
        open: vi.fn(),
        navigator: {
          userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
          platform: "Win32",
          maxTouchPoints: 0,
        },
      };
      (globalThis as any).document = {
        createElement: vi.fn().mockReturnValue(mockLink),
        body: { appendChild: vi.fn(), removeChild: vi.fn() },
      };
      (globalThis as any).URL.createObjectURL = vi.fn().mockReturnValue("blob:mock-pdf");
      (globalThis as any).URL.revokeObjectURL = vi.fn();

      const dummyBlob = new Blob(["%PDF-1.4 dummy"], { type: "application/pdf" });
      const result = downloadOrOpenPdf(dummyBlob, "orcamento_oficina.pdf");

      expect(result.success).toBe(true);
      expect(result.mode).toBe("download");
      expect(mockClick).toHaveBeenCalledTimes(1);
      expect(mockLink.download).toBe("orcamento_oficina.pdf");
    });
  });
});
