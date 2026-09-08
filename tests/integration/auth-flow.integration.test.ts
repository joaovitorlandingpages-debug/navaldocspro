import { describe, it, expect, vi, beforeEach } from "vitest";

// Simulação de autenticação e RBAC
interface UserProfile {
  id: string;
  email: string;
  role: "admin_master" | "admin_master_global" | "superadmin" | "operator" | "client";
  company_id: string;
  subscription_status: "active" | "trialing" | "past_due" | "canceled";
}

function evaluateRouteAccess(profile: UserProfile | null, routePath: string): { allowed: boolean; redirectTo?: string } {
  if (!profile) {
    return { allowed: false, redirectTo: "/auth/login" };
  }

  // Rotas restritas para administradores master
  if (routePath.startsWith("/admin") || routePath.startsWith("/super-admin")) {
    const isMaster = ["admin_master", "admin_master_global", "superadmin"].includes(profile.role);
    if (!isMaster) {
      return { allowed: false, redirectTo: "/dashboard" };
    }
  }

  // Rotas operacionais requerem assinatura ativa ou trialing
  if (routePath.startsWith("/processes") || routePath.startsWith("/vessels") || routePath.startsWith("/customers")) {
    const hasValidSub = ["active", "trialing"].includes(profile.subscription_status);
    if (!hasValidSub) {
      return { allowed: false, redirectTo: "/assinaturas" };
    }
  }

  return { allowed: true };
}

describe("Fluxo de Integração: Autenticação & Controle de Acesso (RBAC)", () => {
  it("deve redirecionar usuário não autenticado para /auth/login", () => {
    const result = evaluateRouteAccess(null, "/admin");
    expect(result.allowed).toBe(false);
    expect(result.redirectTo).toBe("/auth/login");
  });

  it("deve permitir acesso de admin_master à rota /admin", () => {
    const adminProfile: UserProfile = {
      id: "usr-admin-01",
      email: "admin@navaldocspro.com.br",
      role: "admin_master",
      company_id: "comp-01",
      subscription_status: "active"
    };

    const result = evaluateRouteAccess(adminProfile, "/admin/tests");
    expect(result.allowed).toBe(true);
  });

  it("deve bloquear acesso de operador comum à rota /admin e redirecionar para /dashboard", () => {
    const operatorProfile: UserProfile = {
      id: "usr-op-01",
      email: "operador@marina.com",
      role: "operator",
      company_id: "comp-01",
      subscription_status: "active"
    };

    const result = evaluateRouteAccess(operatorProfile, "/admin/security");
    expect(result.allowed).toBe(false);
    expect(result.redirectTo).toBe("/dashboard");
  });

  it("deve redirecionar empresa com assinatura vencida para /assinaturas ao acessar processos", () => {
    const expiredProfile: UserProfile = {
      id: "usr-exp-01",
      email: "cliente@estaleiro.com",
      role: "operator",
      company_id: "comp-02",
      subscription_status: "past_due"
    };

    const result = evaluateRouteAccess(expiredProfile, "/processes");
    expect(result.allowed).toBe(false);
    expect(result.redirectTo).toBe("/assinaturas");
  });

  it("deve liberar acesso a processos para empresa em período de teste (trialing)", () => {
    const trialProfile: UserProfile = {
      id: "usr-trial-01",
      email: "novo@despachante.com",
      role: "operator",
      company_id: "comp-03",
      subscription_status: "trialing"
    };

    const result = evaluateRouteAccess(trialProfile, "/processes");
    expect(result.allowed).toBe(true);
  });
});
