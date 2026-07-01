/**
 * Motor condicional (JSONLogic-lite) para o Motor Inteligente de Processos.
 *
 * Regras vivem em `document_process_package_items.conditional_rule` e são
 * avaliadas contra o contexto do processo (cliente/embarcação/processo).
 *
 * Operadores suportados:
 *   { "equals": ["path.to.field", value] }
 *   { "not_equals": ["path", value] }
 *   { "truthy": "path" }
 *   { "falsy": "path" }
 *   { "missing": "path" }         // valor null/undefined/'' ou array vazio
 *   { "present": "path" }         // oposto de missing
 *   { "in": ["path", [v1,v2]] }
 *   { "gt": ["path", n] } / { "gte": ... } / { "lt": ... } / { "lte": ... }
 *   { "and": [rule, rule, ...] }
 *   { "or":  [rule, rule, ...] }
 *   { "not": rule }
 *
 * Regra nula/undefined => sempre inclui o item.
 */

export type ConditionalRule = Record<string, unknown> | null | undefined;

export type ProcessRuleContext = {
  process?: Record<string, any> | null;
  customer?: Record<string, any> | null;
  vessel?: Record<string, any> | null;
  [key: string]: any;
};

function getPath(ctx: ProcessRuleContext, path: string): unknown {
  if (!path) return undefined;
  return path.split(".").reduce<any>((acc, key) => {
    if (acc == null) return undefined;
    return acc[key];
  }, ctx);
}

function isMissing(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

export function evaluateRule(rule: ConditionalRule, ctx: ProcessRuleContext): boolean {
  if (!rule || typeof rule !== "object") return true;
  const entries = Object.entries(rule);
  if (entries.length === 0) return true;

  // Se houver múltiplas chaves, tratamos como AND implícito
  return entries.every(([op, arg]) => evalOp(op, arg as any, ctx));
}

function evalOp(op: string, arg: any, ctx: ProcessRuleContext): boolean {
  switch (op) {
    case "and":
      return Array.isArray(arg) && arg.every((r) => evaluateRule(r, ctx));
    case "or":
      return Array.isArray(arg) && arg.some((r) => evaluateRule(r, ctx));
    case "not":
      return !evaluateRule(arg, ctx);

    case "equals": {
      const [path, value] = arg as [string, unknown];
      return getPath(ctx, path) === value;
    }
    case "not_equals": {
      const [path, value] = arg as [string, unknown];
      return getPath(ctx, path) !== value;
    }
    case "truthy":
      return Boolean(getPath(ctx, arg as string));
    case "falsy":
      return !getPath(ctx, arg as string);
    case "missing":
      return isMissing(getPath(ctx, arg as string));
    case "present":
      return !isMissing(getPath(ctx, arg as string));
    case "in": {
      const [path, list] = arg as [string, unknown[]];
      const v = getPath(ctx, path);
      return Array.isArray(list) && list.includes(v as never);
    }
    case "gt":
    case "gte":
    case "lt":
    case "lte": {
      const [path, n] = arg as [string, number];
      const v = Number(getPath(ctx, path));
      if (Number.isNaN(v)) return false;
      if (op === "gt") return v > n;
      if (op === "gte") return v >= n;
      if (op === "lt") return v < n;
      return v <= n;
    }
    default:
      // Operador desconhecido = não filtra (fail-open) para não esconder documentos por engano
      console.warn(`[conditionalEngine] operador desconhecido: ${op}`);
      return true;
  }
}
