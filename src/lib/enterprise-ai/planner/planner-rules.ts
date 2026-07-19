import { ActionRiskLevel } from "./planner-types";

export interface PlanningRule {
  id: string;
  name: string;
  description: string;
  evaluate: (steps: any[]) => void;
}

export const ActionRisks: Record<string, ActionRiskLevel> = {
  "create-process": "MEDIUM",
  "generate-pdf": "LOW",
  "complete-checklist": "LOW",
  "request-signature": "HIGH",
};

export function calculateOverallRisk(steps: { actionId: string }[]): ActionRiskLevel {
  const risks = steps.map(s => ActionRisks[s.actionId] || "LOW");
  
  if (risks.includes("CRITICAL")) return "CRITICAL";
  if (risks.includes("HIGH")) {
    // Multiple high risks could upgrade to critical, but for now we stay high
    if (risks.filter(r => r === "HIGH").length > 2) return "CRITICAL";
    return "HIGH";
  }
  if (risks.includes("MEDIUM")) {
    if (risks.filter(r => r === "MEDIUM").length >= 3) return "HIGH";
    return "MEDIUM";
  }
  return "LOW";
}

export const RequiredPermissions: Record<string, string[]> = {
  "create-process": ["PROCESS_CREATE"],
  "generate-pdf": ["DOCUMENT_CREATE"],
  "complete-checklist": ["PROCESS_UPDATE"],
  "request-signature": ["SIGNATURE_REQUEST"],
};
