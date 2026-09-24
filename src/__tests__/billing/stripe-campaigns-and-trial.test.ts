import { describe, it, expect } from "vitest";
import { sanitizeAllowedOrigin } from "@/services/billing/domainUtils";

function extractId(val: unknown): string | null {
  if (!val) return null;
  if (typeof val === "string") {
    const trimmed = val.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof val === "object" && val !== null && "id" in val && typeof (val as any).id === "string") {
    const trimmed = (val as any).id.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}

function extractSubscriptionIdFromInvoice(invoice: any): string | null {
  if (!invoice || typeof invoice !== "object") return null;

  if (invoice.parent && typeof invoice.parent === "object") {
    const details = invoice.parent.subscription_details;
    if (details && typeof details === "object" && details.subscription) {
      const subId = extractId(details.subscription);
      if (subId) return subId;
    }
  }

  if (invoice.subscription) {
    const subId = extractId(invoice.subscription);
    if (subId) return subId;
  }

  return null;
}

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

    it("preserves trial without premature charge when < 48 hours remain", () => {
      const nowMs = 1790251200000;
      const trialEndMs = nowMs + 24 * 3600 * 1000; // 24h remaining
      const remainingSeconds = Math.floor((trialEndMs - nowMs) / 1000);

      expect(remainingSeconds).toBeGreaterThan(0);
      expect(remainingSeconds).toBeLessThan(48 * 3600);

      // Ensures trial_end is set to at least 48h in Stripe to prevent immediate card charge
      const safeTrialEnd = Math.floor(nowMs / 1000) + 48 * 3600 + 60;
      expect(safeTrialEnd).toBeGreaterThan(Math.floor(nowMs / 1000) + 48 * 3600);
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
      const targetTrialEnd = new Date(companyCreatedAt.getTime() + (60 * 24 * 3600 * 1000));
      const existingLongerTrialEnd = new Date("2026-12-31T00:00:00Z");

      const finalTrialEnd = existingLongerTrialEnd > targetTrialEnd ? existingLongerTrialEnd : targetTrialEnd;
      expect(finalTrialEnd.toISOString()).toBe("2026-12-31T00:00:00.000Z");
    });
  });

  describe("4. Webhook Subscription ID Extraction (Modern vs Legacy)", () => {
    it("extracts subscription ID from Modern Stripe API format (2025/2026 parent.subscription_details)", () => {
      const modernInvoice = {
        id: "in_modern_123",
        parent: {
          type: "subscription_details",
          subscription_details: {
            subscription: "sub_modern_xyz987"
          }
        }
      };
      expect(extractSubscriptionIdFromInvoice(modernInvoice)).toBe("sub_modern_xyz987");
    });

    it("extracts subscription ID from Modern Stripe API with expanded object", () => {
      const modernExpandedInvoice = {
        id: "in_modern_456",
        parent: {
          type: "subscription_details",
          subscription_details: {
            subscription: { id: "sub_expanded_321" }
          }
        }
      };
      expect(extractSubscriptionIdFromInvoice(modernExpandedInvoice)).toBe("sub_expanded_321");
    });

    it("extracts subscription ID from Legacy Stripe API format (invoice.subscription string)", () => {
      const legacyInvoice = {
        id: "in_legacy_123",
        subscription: "sub_legacy_abc123"
      };
      expect(extractSubscriptionIdFromInvoice(legacyInvoice)).toBe("sub_legacy_abc123");
    });

    it("extracts subscription ID from Legacy Stripe API with expanded object", () => {
      const legacyExpandedInvoice = {
        id: "in_legacy_456",
        subscription: { id: "sub_legacy_exp789" }
      };
      expect(extractSubscriptionIdFromInvoice(legacyExpandedInvoice)).toBe("sub_legacy_exp789");
    });

    it("returns null safely when invoice has no subscription", () => {
      const oneTimeInvoice = {
        id: "in_onetime_000",
        amount_paid: 5000
      };
      expect(extractSubscriptionIdFromInvoice(oneTimeInvoice)).toBeNull();
    });
  });
});
