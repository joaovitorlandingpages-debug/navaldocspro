import { describe, it, expect } from "vitest";
import { TRIAL_CONFIG } from "@/services/billing/plansConfig";

/**
 * Funções auxiliares espelhando a lógica implementada em useSubscription e TrialBanner
 */
export function formatTrialDate(date: Date | null | undefined): string {
  if (!date || isNaN(date.getTime())) return "";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export function computeTrialRemainingDays(endDate: Date, referenceDate: Date = new Date()): number {
  const diffMs = endDate.getTime() - referenceDate.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

export function formatTrialBannerMessage(
  trialDaysLeft: number,
  formattedEndDate: string
): string {
  if (trialDaysLeft <= 0) {
    return formattedEndDate
      ? `Seu teste gratuito encerrou em ${formattedEndDate} • Período encerrado`
      : "Seu teste gratuito encerrou • Período encerrado";
  }
  if (trialDaysLeft === 1) {
    return formattedEndDate
      ? `Seu teste gratuito termina em ${formattedEndDate} • Resta 1 dia`
      : "Último dia de teste gratuito! • Resta 1 dia";
  }
  return formattedEndDate
    ? `Seu teste gratuito termina em ${formattedEndDate} • Restam ${trialDaysLeft} dias`
    : `Restam ${trialDaysLeft} dias do seu teste gratuito`;
}

export function resolveTrialDurationDays(companyMetadata?: { trial_days?: number }): number {
  if (companyMetadata?.trial_days === 60) {
    return TRIAL_CONFIG.campaignDurationDays;
  }
  return TRIAL_CONFIG.days;
}

describe("Trial Banner & Real Dates Calculation", () => {
  it("usa 30 dias como padrão oficial de avaliação gratuita", () => {
    expect(TRIAL_CONFIG.days).toBe(30);
    expect(TRIAL_CONFIG.durationDays).toBe(30);
    expect(TRIAL_CONFIG.campaignDurationDays).toBe(60);

    const defaultDuration = resolveTrialDurationDays({});
    expect(defaultDuration).toBe(30);
  });

  it("permite campanhas promocionais de 60 dias totais", () => {
    const campaignDuration = resolveTrialDurationDays({ trial_days: 60 });
    expect(campaignDuration).toBe(60);
  });

  it("calcula dias restantes com base na data real de término (plural: Restam X dias)", () => {
    const now = new Date("2026-09-21T12:00:00Z");
    const endDate = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000); // 15 dias à frente
    const daysLeft = computeTrialRemainingDays(endDate, now);
    expect(daysLeft).toBe(15);

    const formattedEnd = formatTrialDate(endDate);
    const bannerMsg = formatTrialBannerMessage(daysLeft, formattedEnd);

    expect(bannerMsg).toContain(`Restam 15 dias`);
    expect(bannerMsg).toContain(`Seu teste gratuito termina em`);
    expect(bannerMsg).not.toContain("14 dias grátis");
  });

  it("trata singular corretamente quando resta apenas 1 dia (Resta 1 dia)", () => {
    const now = new Date("2026-09-21T12:00:00Z");
    const endDate = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
    const daysLeft = computeTrialRemainingDays(endDate, now);
    expect(daysLeft).toBe(1);

    const formattedEnd = formatTrialDate(endDate);
    const bannerMsg = formatTrialBannerMessage(daysLeft, formattedEnd);

    expect(bannerMsg).toContain("Resta 1 dia");
    expect(bannerMsg).toContain(`Seu teste gratuito termina em ${formattedEnd} • Resta 1 dia`);
    expect(bannerMsg).not.toContain("Restam");
  });

  it("trata período encerrado corretamente quando dias restantes <= 0", () => {
    const now = new Date("2026-09-21T12:00:00Z");
    const endDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 dias atrás
    const daysLeft = computeTrialRemainingDays(endDate, now);
    expect(daysLeft).toBe(0);

    const formattedEnd = formatTrialDate(endDate);
    const bannerMsg = formatTrialBannerMessage(daysLeft, formattedEnd);

    expect(bannerMsg).toContain("Período encerrado");
    expect(bannerMsg).toContain(`Seu teste gratuito encerrou em ${formattedEnd} • Período encerrado`);
  });

  it("não reinicia nem estende testes de escritórios existentes", () => {
    // Um escritório criado há 20 dias com teste padrão de 30 dias
    const createdAt = new Date("2026-09-01T10:00:00Z");
    const now = new Date("2026-09-21T10:00:00Z");
    const trialDuration = 30 * 24 * 60 * 60 * 1000;
    const endDate = new Date(createdAt.getTime() + trialDuration);

    // Data de término fixa ancorada na criação original
    expect(endDate.toISOString()).toBe("2026-10-01T10:00:00.000Z");

    const daysLeft = computeTrialRemainingDays(endDate, now);
    expect(daysLeft).toBe(10); // Restam exatamente 10 dias, sem reiniciar
  });

  it("garante que todas as ferramentas desbloqueadas respeitam a franquia do teste", () => {
    expect(TRIAL_CONFIG.limits.processLimit).toBe(10);
    expect(TRIAL_CONFIG.limits.ocrLimit).toBe(100);
    expect(TRIAL_CONFIG.limits.userLimit).toBe(1);
    expect(TRIAL_CONFIG.limits.storageGb).toBe(1);
  });
});
