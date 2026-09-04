/**
 * Utilitários de sanitização e proteção contra injeção de dados.
 * Protege chamadas de banco de dados (especialmente ILIKE e text search)
 * e sanitiza entradas de texto de usuários.
 */

/**
 * Escapa caracteres especiais do PostgreSQL LIKE/ILIKE ('%', '_', '\')
 * e remove caracteres nulos ou potencialmente maliciosos.
 *
 * Exemplo:
 * input: "100% naval_doc" -> "100\% naval\_doc"
 */
export function sanitizeSearchQuery(query: string | null | undefined, maxLength = 100): string {
  if (!query || typeof query !== "string") {
    return "";
  }

  // 1. Remove caracteres nulos e caracteres de controle perigosos
  let sanitized = query.replace(/\0/g, "").trim();

  // 2. Limita comprimento para evitar ataques de negação de serviço (ReDoS/Wildcard DoS)
  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength);
  }

  // 3. Escapa barras invertidas primeiro
  sanitized = sanitized.replace(/\\/g, "\\\\");

  // 4. Escapa curingas do LIKE/ILIKE (%) e (_)
  sanitized = sanitized.replace(/%/g, "\\%").replace(/_/g, "\\_");

  return sanitized;
}

/**
 * Sanitiza texto simples removendo tags HTML ou scripts injetados.
 */
export function sanitizePlainText(text: string | null | undefined): string {
  if (!text || typeof text !== "string") {
    return "";
  }

  return text
    .replace(/\0/g, "")
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .trim();
}

/**
 * Normaliza e sanitiza identificadores ou códigos alfanuméricos (ex: CNPJ, CPF, Placa, Registro).
 */
export function sanitizeAlphaNumeric(input: string | null | undefined): string {
  if (!input || typeof input !== "string") {
    return "";
  }
  const stripped = sanitizePlainText(input);
  return stripped.replace(/[^a-zA-Z0-9.\-_/]/g, "").trim();
}
