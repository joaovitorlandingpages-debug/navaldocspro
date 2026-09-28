import { describe, it, expect } from "vitest";
import { supabase } from "@/integrations/supabase/client";
import { OFFICIAL_NAVAL_PLANS } from "@/services/billing/plansConfig";

describe("TELA 40 — Consumo e Franquias do Plano Integration Suite", () => {
  const essencialPlan = OFFICIAL_NAVAL_PLANS[0]; // 20 processos, 200 OCR, 5 GB
  const profissionalPlan = OFFICIAL_NAVAL_PLANS[1]; // 60 processos, 600 OCR, 15 GB

  // Helper para simular cálculos da tela
  function calculateConsumptionState({
    plan,
    processesCount,
    ocrCount,
    storageBytes,
    addons = [],
  }: {
    plan: any;
    processesCount: number;
    ocrCount: number;
    storageBytes: number;
    addons?: any[];
  }) {
    const extraProcesses = addons
      .filter((a) => a.resource_key === "processes" || a.resource_key === "process")
      .reduce((sum, a) => sum + (Number(a.extra_monthly) || Number(a.extra_daily) || 0), 0);

    const extraOcr = addons
      .filter((a) => a.resource_key === "ocr")
      .reduce((sum, a) => sum + (Number(a.extra_monthly) || Number(a.extra_daily) || 0), 0);

    const limitProcesses = (plan.processLimit || 20) + extraProcesses;
    const availableProcesses = Math.max(0, limitProcesses - processesCount);
    const percentProcesses = Math.min(100, Math.round((processesCount / limitProcesses) * 100));

    const limitOcr = (plan.ocrLimit || 200) + extraOcr;
    const availableOcr = Math.max(0, limitOcr - ocrCount);
    const percentOcr = Math.min(100, Math.round((ocrCount / limitOcr) * 100));

    const limitStorageGb = plan.storageGb || 5;
    const usedStorageGb = storageBytes / (1024 * 1024 * 1024);
    const percentStorage = Math.min(100, Math.round((usedStorageGb / limitStorageGb) * 100));
    const availableStorageGb = Math.max(0, limitStorageGb - usedStorageGb);

    return {
      processes: {
        used: processesCount,
        limit: limitProcesses,
        available: availableProcesses,
        percent: percentProcesses,
        isExhausted: processesCount >= limitProcesses,
      },
      ocr: {
        used: ocrCount,
        limit: limitOcr,
        available: availableOcr,
        percent: percentOcr,
        isExhausted: ocrCount >= limitOcr,
      },
      storage: {
        usedGb: usedStorageGb,
        limitGb: limitStorageGb,
        availableGb: availableStorageGb,
        percent: percentStorage,
        isExhausted: usedStorageGb >= limitStorageGb,
      },
    };
  }

  it("Cenário 1: Empresa sem consumo (apresenta valores zerados, cota integral e sem erros)", () => {
    const state = calculateConsumptionState({
      plan: essencialPlan,
      processesCount: 0,
      ocrCount: 0,
      storageBytes: 0,
    });

    expect(state.processes.used).toBe(0);
    expect(state.processes.available).toBe(20);
    expect(state.processes.percent).toBe(0);
    expect(state.processes.isExhausted).toBe(false);

    expect(state.ocr.used).toBe(0);
    expect(state.ocr.available).toBe(200);
    expect(state.ocr.percent).toBe(0);
    expect(state.ocr.isExhausted).toBe(false);

    expect(state.storage.usedGb).toBe(0);
    expect(state.storage.availableGb).toBe(5);
    expect(state.storage.percent).toBe(0);
    expect(state.storage.isExhausted).toBe(false);
  });

  it("Cenário 2: Empresa com consumo parcial (calcula proporções, saldos e adicionais corretamente)", () => {
    const state = calculateConsumptionState({
      plan: profissionalPlan, // 60 processos, 600 OCR, 15 GB
      processesCount: 18,
      ocrCount: 150,
      storageBytes: 3.5 * 1024 * 1024 * 1024, // 3.5 GB
      addons: [
        { resource_key: "processes", extra_monthly: 10 },
        { resource_key: "ocr", extra_monthly: 100 },
      ],
    });

    // Limite de processos: 60 + 10 = 70
    expect(state.processes.limit).toBe(70);
    expect(state.processes.used).toBe(18);
    expect(state.processes.available).toBe(52);
    expect(state.processes.percent).toBe(26);
    expect(state.processes.isExhausted).toBe(false);

    // Limite de OCR: 600 + 100 = 700
    expect(state.ocr.limit).toBe(700);
    expect(state.ocr.used).toBe(150);
    expect(state.ocr.available).toBe(550);
    expect(state.ocr.percent).toBe(21);
    expect(state.ocr.isExhausted).toBe(false);

    // Armazenamento: 3.5 GB de 15 GB
    expect(state.storage.limitGb).toBe(15);
    expect(state.storage.usedGb).toBeCloseTo(3.5, 1);
    expect(state.storage.availableGb).toBeCloseTo(11.5, 1);
    expect(state.storage.percent).toBe(23);
  });

  it("Cenário 3: Empresa com franquia esgotada (sinaliza esgotamento sem valores negativos)", () => {
    const state = calculateConsumptionState({
      plan: essencialPlan, // 20 processos, 200 OCR, 5 GB
      processesCount: 22, // Excedeu 20
      ocrCount: 200, // Atingiu limite exato
      storageBytes: 5.2 * 1024 * 1024 * 1024,
    });

    expect(state.processes.used).toBe(22);
    expect(state.processes.available).toBe(0); // Não deve ser negativo
    expect(state.processes.percent).toBe(100);
    expect(state.processes.isExhausted).toBe(true);

    expect(state.ocr.used).toBe(200);
    expect(state.ocr.available).toBe(0);
    expect(state.ocr.percent).toBe(100);
    expect(state.ocr.isExhausted).toBe(true);

    expect(state.storage.availableGb).toBe(0);
    expect(state.storage.percent).toBe(100);
    expect(state.storage.isExhausted).toBe(true);
  });

  it("garante integridade das consultas de persistência real (processes, resource_consumption, uploaded_files)", async () => {
    // 1. Processos reais
    const { data: proc, error: procErr } = await supabase
      .from("processes")
      .select("id, title, created_at, customer:customers!processes_customer_id_fkey(name)")
      .limit(3);
    expect(procErr).toBeNull();
    expect(Array.isArray(proc)).toBe(true);

    // 2. Ledger de consumo
    const { data: rc, error: rcErr } = await supabase
      .from("resource_consumption")
      .select("id, resource_key, amount, created_at")
      .limit(3);
    expect(rcErr).toBeNull();
    expect(Array.isArray(rc)).toBe(true);

    // 3. Arquivos armazenados
    const { data: files, error: filesErr } = await supabase
      .from("uploaded_files")
      .select("id, file_size, file_name, created_at")
      .limit(3);
    expect(filesErr).toBeNull();
    expect(Array.isArray(files)).toBe(true);

    // 4. Addons
    const { data: addons, error: addErr } = await supabase
      .from("company_resource_addons")
      .select("*")
      .limit(3);
    expect(addErr).toBeNull();
    expect(Array.isArray(addons)).toBe(true);
  });
});
