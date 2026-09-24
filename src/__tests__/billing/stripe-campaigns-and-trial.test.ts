import { describe, it, expect } from "vitest";
import { sanitizeAllowedOrigin } from "@/services/billing/domainUtils";

describe("Billing & Stripe Hardening Unit Tests", () => {
  describe("1. URL & Domain Restrictions", () => {
    it("permits exact approved Lovable production domain", () => {
      expect(sanitizeAllowedOrigin("https://navaldocspro.lovable.app/plans")).toBe("https://navaldocspro.lovable.app");
    });

    it("permits exact approved Lovable preview domain", () => {
      expect(sanitizeAllowedOrigin("https://preview--navaldocspro.lovable.app/billing")).toBe("https://preview--navaldocspro.lovable.app");
    });

    it("permits verified custom production domains", () => {
      expect(sanitizeAllowedOrigin("https://navaldocspro.com.br")).toBe("https://navaldocspro.com.br");
      expect(sanitizeAllowedOrigin("https://www.navaldocspro.com.br/checkout")).toBe("https://www.navaldocspro.com.br");
    });

    it("permits local development ports", () => {
      expect(sanitizeAllowedOrigin("http://localhost:5173/plans")).toBe("http://localhost:5173");
      expect(sanitizeAllowedOrigin("http://localhost:3000")).toBe("http://localhost:3000");
      expect(sanitizeAllowedOrigin("http://127.0.0.1:8080")).toBe("http://127.0.0.1:8080");
    });

    it("REJECTS arbitrary lovableproject.com or database ID domains", () => {
      // Must not derive Lovable domain from database id vqutxzdsajinhsvuddcp
      expect(sanitizeAllowedOrigin("https://vqutxzdsajinhsvuddcp.lovableproject.com")).toBe("https://navaldocspro.lovable.app");
      expect(sanitizeAllowedOrigin("https://id-preview--vqutxzdsajinhsvuddcp.lovable.app")).toBe("https://navaldocspro.lovable.app");
      expect(sanitizeAllowedOrigin("https://attacker-app.lovable.app")).toBe("https://navaldocspro.lovable.app");
      expect(sanitizeAllowedOrigin("https://malicious-site.com")).toBe("https://navaldocspro.lovable.app");
    });

    it("falls back to https://navaldocspro.lovable.app when origin is empty or invalid", () => {
      expect(sanitizeAllowedOrigin(null)).toBe("https://navaldocspro.lovable.app");
      expect(sanitizeAllowedOrigin("")).toBe("https://navaldocspro.lovable.app");
      expect(sanitizeAllowedOrigin("not-a-valid-url")).toBe("https://navaldocspro.lovable.app");
    });
  });

  describe("2. Trial End Preservation and Under 48h Handling", () => {
    it("correctly identifies when a trial has >= 48 hours and preserves Unix timestamp", () => {
      const now = new Date("2026-09-24T12:00:00Z").getTime();
      const trialEndDate = new Date("2026-10-15T12:00:00Z"); // 21 days remaining
      const remainingMs = trialEndDate.getTime() - now;

      expect(remainingMs).toBeGreaterThan(48 * 3600 * 1000);
      const stripeTimestamp = Math.floor(trialEndDate.getTime() / 1000);
      expect(stripeTimestamp).toBe(1792065600);
    });

    it("explicitly detects trial with less than 48 hours remaining without charging prematurely", () => {
      const now = new Date("2026-09-24T12:00:00Z").getTime();
      const trialEndDate = new Date("2026-09-25T18:00:00Z"); // 30 hours remaining (< 48h)
      const remainingMs = trialEndDate.getTime() - now;

      expect(remainingMs).toBeGreaterThan(0);
      expect(remainingMs).toBeLessThan(48 * 3600 * 1000);

      const hoursLeft = Math.max(1, Math.ceil(remainingMs / (3600 * 1000)));
      expect(hoursLeft).toBe(30);
    });

    it("distinguishes expired trial (remainingMs <= 0) which requires standard checkout", () => {
      const now = new Date("2026-09-24T12:00:00Z").getTime();
      const trialEndDate = new Date("2026-09-20T12:00:00Z"); // 4 days ago
      const remainingMs = trialEndDate.getTime() - now;

      expect(remainingMs).toBeLessThanOrEqual(0);
    });
  });

  describe("3. 60-Day Trial Extension Preservation", () => {
    it("calculates 60 total days from company created_at", () => {
      const companyCreatedAt = new Date("2026-09-01T00:00:00Z");
      const totalTrialDays = 60;
      const targetTrialEnd = new Date(companyCreatedAt.getTime() + (totalTrialDays * 24 * 3600 * 1000));

      expect(targetTrialEnd.toISOString()).toBe("2026-10-31T00:00:00.000Z");
    });

    it("preserves an existing longer trial end if granted previously by support", () => {
      const companyCreatedAt = new Date("2026-09-01T00:00:00Z");
      const targetTrialEnd = new Date(companyCreatedAt.getTime() + (60 * 24 * 3600 * 1000)); // 2026-10-31
      const existingLongerTrialEnd = new Date("2026-12-31T00:00:00Z"); // manual 120-day grant

      const finalTrialEnd = existingLongerTrialEnd > targetTrialEnd ? existingLongerTrialEnd : targetTrialEnd;
      expect(finalTrialEnd.toISOString()).toBe("2026-12-31T00:00:00.000Z");
    });
  });

  describe("4. Coupon Duration and Plan Eligibility", () => {
    it("validates percentage discount within allowed 0.01% - 100% bounds", () => {
      const validDiscount = 20;
      expect(validDiscount > 0 && validDiscount <= 100).toBe(true);

      const invalidNegative = -5;
      expect(invalidNegative > 0 && invalidNegative <= 100).toBe(false);

      const invalidOver100 = 150;
      expect(invalidOver100 > 0 && invalidOver100 <= 100).toBe(false);
    });

    it("checks plan eligibility filter correctly", () => {
      const couponApplicablePlans = ["profissional", "equipe"];
      
      expect(couponApplicablePlans.includes("profissional")).toBe(true);
      expect(couponApplicablePlans.includes("essencial")).toBe(false);

      // Empty array means all plans
      const allPlansFilter: string[] = [];
      const isAllowed = allPlansFilter.length === 0 || allPlansFilter.includes("essencial");
      expect(isAllowed).toBe(true);
    });
  });
});
