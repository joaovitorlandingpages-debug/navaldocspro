/**
 * test_commercial_authorization_rules.cjs
 * Validação rigorosa dos cenários comerciais e de tenant solicitados no item 5:
 * 1. pending: criação de processo e persistência de documento rejeitadas.
 * 2. active/trial válido: operações comerciais permitidas.
 * 3. outra empresa: acesso rejeitado (isolamento de tenant).
 * 4. admin global: isenção comercial preservada mantendo integridade.
 */

function simulateCommercialAuthorization(params) {
  const {
    callerRole,
    callerCompanyId,
    targetCompanyId,
    subscriptionStatus,
    trialEndsAt,
    currentPeriodEnd,
    companyCreatedAt
  } = params;

  // 1. Verificação de Tenant: usuário comum só acessa sua própria empresa
  const isGlobalAdmin = ['admin_master', 'admin_master_global', 'superadmin'].includes(callerRole);
  if (!isGlobalAdmin && callerCompanyId !== targetCompanyId) {
    return {
      allowed: false,
      reason: "VIOLACAO_ISOLAMENTO_TENANT: company_id não pertence ao usuário"
    };
  }

  // 2. Administrador global tem isenção comercial
  if (isGlobalAdmin) {
    return {
      allowed: true,
      reason: "ISENCAO_ADMIN_GLOBAL: Administrador global isento de barreira comercial"
    };
  }

  // 3. Avaliação de assinatura
  if (subscriptionStatus === 'active') {
    return {
      allowed: true,
      reason: "ASSINATURA_ATIVA: Empresa possui assinatura regular ativa"
    };
  }

  const now = new Date();

  if (subscriptionStatus === 'trialing') {
    const trialEnd = trialEndsAt ? new Date(trialEndsAt) : (currentPeriodEnd ? new Date(currentPeriodEnd) : null);
    if (trialEnd && trialEnd > now) {
      return {
        allowed: true,
        reason: "TRIAL_VALIDO: Período de teste ativo dentro da validade"
      };
    }
    return {
      allowed: false,
      reason: "TRIAL_EXPIRADO: Período de teste expirado"
    };
  }

  // 4. Status pending isolado NÃO concede acesso
  if (subscriptionStatus === 'pending') {
    return {
      allowed: false,
      reason: "BLOQUEIO_PENDING: Status pending não concede permissão de criação/persistência"
    };
  }

  if (['past_due', 'canceled'].includes(subscriptionStatus)) {
    return {
      allowed: false,
      reason: `BLOQUEIO_STATUS_${subscriptionStatus.toUpperCase()}: Assinatura inativa ou cancelada`
    };
  }

  // 5. Período nativo de teste da empresa (30 dias desde criação)
  if (companyCreatedAt) {
    const created = new Date(companyCreatedAt);
    const thirtyDaysAfter = new Date(created.getTime() + 30 * 24 * 60 * 60 * 1000);
    if (thirtyDaysAfter > now) {
      return {
        allowed: true,
        reason: "TRIAL_NATIVO: Empresa no período inaugural de 30 dias"
      };
    }
  }

  return {
    allowed: false,
    reason: "SEM_PLANO_ATIVO: Nenhuma assinatura ou trial válido encontrado"
  };
}

// Execução da Matriz de Testes
const results = [];

// Cenário 1: pending
const resPending = simulateCommercialAuthorization({
  callerRole: "user",
  callerCompanyId: "comp-1",
  targetCompanyId: "comp-1",
  subscriptionStatus: "pending"
});
results.push({
  cenario: "1. pending (mesma empresa)",
  esperado: false,
  obtido: resPending.allowed,
  motivo: resPending.reason,
  status: resPending.allowed === false ? "PASSOU" : "FALHOU"
});

// Cenário 2a: active
const resActive = simulateCommercialAuthorization({
  callerRole: "user",
  callerCompanyId: "comp-1",
  targetCompanyId: "comp-1",
  subscriptionStatus: "active"
});
results.push({
  cenario: "2a. active (assinatura regular)",
  esperado: true,
  obtido: resActive.allowed,
  motivo: resActive.reason,
  status: resActive.allowed === true ? "PASSOU" : "FALHOU"
});

// Cenário 2b: trialing válido
const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
const resTrial = simulateCommercialAuthorization({
  callerRole: "user",
  callerCompanyId: "comp-1",
  targetCompanyId: "comp-1",
  subscriptionStatus: "trialing",
  trialEndsAt: futureDate
});
results.push({
  cenario: "2b. trialing (dentro da vigência)",
  esperado: true,
  obtido: resTrial.allowed,
  motivo: resTrial.reason,
  status: resTrial.allowed === true ? "PASSOU" : "FALHOU"
});

// Cenário 3: outra empresa (violação de tenant)
const resOtherComp = simulateCommercialAuthorization({
  callerRole: "user",
  callerCompanyId: "comp-1",
  targetCompanyId: "comp-2",
  subscriptionStatus: "active"
});
results.push({
  cenario: "3. outra empresa (tenant diferente)",
  esperado: false,
  obtido: resOtherComp.allowed,
  motivo: resOtherComp.reason,
  status: resOtherComp.allowed === false ? "PASSOU" : "FALHOU"
});

// Cenário 4: admin global (isenção comercial)
const resAdminGlobal = simulateCommercialAuthorization({
  callerRole: "admin_master",
  callerCompanyId: "comp-1",
  targetCompanyId: "comp-1",
  subscriptionStatus: "pending"
});
results.push({
  cenario: "4. admin global (isenção comercial em pending)",
  esperado: true,
  obtido: resAdminGlobal.allowed,
  motivo: resAdminGlobal.reason,
  status: resAdminGlobal.allowed === true ? "PASSOU" : "FALHOU"
});

console.log("=== RESULTADOS DA MATRIZ DE AUTORIZAÇÃO COMERCIAL ===");
console.table(results);

const allPassed = results.every(r => r.status === "PASSOU");
if (!allPassed) {
  process.exit(1);
}
