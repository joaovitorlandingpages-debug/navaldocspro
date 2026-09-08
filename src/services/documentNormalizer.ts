/**
 * Normalizador profissional de dados documentais (Bloco 1 — Qualidade dos Dados).
 *
 * Garante que valores extraídos do OCR, digitados manualmente ou herdados de
 * registros antigos cheguem aos templates SEMPRE no mesmo formato canônico
 * (sem unidade duplicada, sem "undefined", sem "19.30m" misturado com "19,30 m").
 */

const STATE_MAP: Record<string, string> = {
  "ACRE": "AC", "ALAGOAS": "AL", "AMAPA": "AP", "AMAPÁ": "AP",
  "AMAZONAS": "AM", "BAHIA": "BA", "CEARA": "CE", "CEARÁ": "CE",
  "DISTRITO FEDERAL": "DF", "ESPIRITO SANTO": "ES", "ESPÍRITO SANTO": "ES",
  "GOIAS": "GO", "GOIÁS": "GO", "MARANHAO": "MA", "MARANHÃO": "MA",
  "MATO GROSSO": "MT", "MATO GROSSO DO SUL": "MS", "MINAS GERAIS": "MG",
  "PARA": "PA", "PARÁ": "PA", "PARAIBA": "PB", "PARAÍBA": "PB",
  "PARANA": "PR", "PARANÁ": "PR", "PERNAMBUCO": "PE", "PIAUI": "PI", "PIAUÍ": "PI",
  "RIO DE JANEIRO": "RJ", "RIO GRANDE DO NORTE": "RN", "RIO GRANDE DO SUL": "RS",
  "RONDONIA": "RO", "RONDÔNIA": "RO", "RORAIMA": "RR", "SANTA CATARINA": "SC",
  "SAO PAULO": "SP", "SÃO PAULO": "SP", "SERGIPE": "SE", "TOCANTINS": "TO",
};

const UF_SET = new Set([
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB",
  "PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"
]);

const isBlank = (v: unknown): boolean =>
  v === undefined || v === null ||
  (typeof v === "number" && Number.isNaN(v)) ||
  (typeof v === "string" && (v.trim() === "" || /^(undefined|null|nan)$/i.test(v.trim())));

const onlyDigits = (s: string): string => s.replace(/\D+/g, "");

export const normalizeState = (raw: unknown): string => {
  if (isBlank(raw)) return "";
  const s = String(raw).trim().toUpperCase();
  if (UF_SET.has(s)) return s;
  return STATE_MAP[s] ?? s.slice(0, 2);
};

export const normalizeCpfCnpj = (raw: unknown): string => {
  if (isBlank(raw)) return "";
  const d = onlyDigits(String(raw));
  if (d.length === 11) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`;
  if (d.length === 14) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`;
  return String(raw).trim();
};

export const normalizePhone = (raw: unknown): string => {
  if (isBlank(raw)) return "";
  const d = onlyDigits(String(raw));
  if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return String(raw).trim();
};

export const normalizeCep = (raw: unknown): string => {
  if (isBlank(raw)) return "";
  const d = onlyDigits(String(raw));
  if (d.length === 8) return `${d.slice(0,5)}-${d.slice(5)}`;
  return String(raw).trim();
};

export const normalizeDate = (raw: unknown): string => {
  if (isBlank(raw)) return "";
  const s = String(raw).trim();
  // dd/mm/yyyy
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return s;
  // yyyy-mm-dd
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toLocaleDateString("pt-BR");
  return s;
};

/**
 * Formata medidas numéricas com unidade canônica, sem nunca duplicar a unidade.
 * "19.30" / 19.3 / "19,30 m" / "19.30m"  →  "19,30 m"
 */
export const formatMeasurement = (raw: unknown, unit: string, decimals = 2): string => {
  if (isBlank(raw)) return "";
  let s = String(raw).trim();
  // remove unidade ao final (m, m², kg, hp, etc.), case-insensitive
  const unitRegex = new RegExp(`\\s*${unit.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\s*$`, "i");
  s = s.replace(unitRegex, "").trim();
  // Normaliza separadores: se tiver ponto e vírgula, ponto é milhar. Se tiver apenas ponto ou vírgula, é decimal.
  let numStr = s;
  if (numStr.includes(",") && numStr.includes(".")) {
    numStr = numStr.replace(/\./g, "").replace(",", ".");
  } else if (numStr.includes(",")) {
    numStr = numStr.replace(",", ".");
  }
  const n = parseFloat(numStr);
  if (Number.isNaN(n)) return `${s} ${unit}`.trim();
  const formatted = n.toLocaleString("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${formatted} ${unit}`;
};

export const formatPower = (raw: unknown): string => {
  if (isBlank(raw)) return "";
  let s = String(raw).trim().replace(/\s*(hp|cv|kw)\s*$/i, "");
  const n = parseFloat(s.replace(",", "."));
  if (Number.isNaN(n)) return String(raw).trim();
  return `${n.toLocaleString("pt-BR")} HP`;
};

export const cleanString = (raw: unknown, fallback = ""): string => {
  if (isBlank(raw)) return fallback;
  return String(raw).trim();
};

// --------- Critical fields validator ---------

export interface MissingField {
  group: "cliente" | "embarcacao" | "motor" | "empresa" | "engenheiro" | "processo";
  key: string;
  label: string;
}

export interface CriticalValidation {
  ok: boolean;
  missing: MissingField[];
}

export interface CriticalContext {
  needsPersonal: boolean;
  needsVessel: boolean;
  needsEngine?: boolean;
}

/**
 * Bloqueia geração de PDF se faltar campo crítico.
 * Retorna lista detalhada para o painel de validação.
 */
export function validateCriticalFields(data: any, ctx: CriticalContext): CriticalValidation {
  const missing: MissingField[] = [];
  const push = (group: MissingField["group"], key: string, label: string, val: unknown) => {
    if (isBlank(val)) missing.push({ group, key, label });
  };

  if (ctx.needsPersonal) {
    push("cliente", "nome", "Nome / Razão Social", data?.cliente?.nome ?? data?.customer?.name);
    push("cliente", "cpf", "CPF / CNPJ", data?.cliente?.cpf ?? data?.customer?.cpf_cnpj);
  }
  if (ctx.needsVessel) {
    push("embarcacao", "nome", "Nome da Embarcação", data?.embarcacao?.nome ?? data?.vessel?.name);
    push("embarcacao", "inscricao", "Inscrição / TIE", data?.embarcacao?.inscricao ?? data?.vessel?.registration_number);
  }
  if (ctx.needsEngine) {
    push("motor", "potencia", "Potência do Motor", data?.motor?.potencia ?? data?.vessel?.engine_power);
    push("motor", "serie", "Número de Série do Motor", data?.motor?.serie ?? data?.vessel?.engine_serial);
  }
  push("empresa", "nome", "Razão Social da Empresa", data?.empresa?.nome ?? data?.company?.name);
  push("empresa", "cnpj", "CNPJ da Empresa", data?.empresa?.cnpj ?? data?.company?.cnpj);

  return { ok: missing.length === 0, missing };
}
