
/**
 * Garante que o valor seja uma string e converte para minúsculas de forma segura.
 * @param value Valor a ser convertido
 * @returns String em minúsculas ou string vazia
 */
export const safeLower = (value: any): string => {
  if (value === null || value === undefined) return "";
  return String(value).toLowerCase();
};

/**
 * Garante que o valor seja uma string.
 * @param value Valor a ser convertido
 * @returns String ou string vazia
 */
export const safeString = (value: any): string => {
  if (value === null || value === undefined) return "";
  return String(value);
};
