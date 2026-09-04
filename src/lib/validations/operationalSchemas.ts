import { z } from "zod";
import { sanitizeSearchQuery, sanitizePlainText } from "@/lib/sanitization";

/**
 * Schema Zod para validação de Clientes (Pessoa Física ou Jurídica).
 */
export const customerFormSchema = z.object({
  name: z
    .string()
    .min(2, "O nome deve conter pelo menos 2 caracteres")
    .max(150, "O nome não pode exceder 150 caracteres")
    .transform((val) => sanitizePlainText(val)),
  cpf_cnpj: z
    .string()
    .optional()
    .nullable()
    .transform((val) => (val ? sanitizePlainText(val).replace(/[^0-9.\-/]/g, "") : null)),
  email: z
    .string()
    .email("E-mail com formato inválido")
    .optional()
    .nullable()
    .or(z.literal(""))
    .transform((val) => (val ? val.trim().toLowerCase() : null)),
  phone: z
    .string()
    .max(25, "Telefone inválido")
    .optional()
    .nullable()
    .transform((val) => (val ? sanitizePlainText(val) : null)),
  address: z
    .string()
    .max(250, "Endereço muito longo")
    .optional()
    .nullable()
    .transform((val) => (val ? sanitizePlainText(val) : null)),
  notes: z
    .string()
    .max(1000, "Observações não podem exceder 1000 caracteres")
    .optional()
    .nullable()
    .transform((val) => (val ? sanitizePlainText(val) : null)),
});

export type CustomerFormData = z.infer<typeof customerFormSchema>;

/**
 * Schema Zod para validação de Embarcações / Veículos.
 */
export const vesselFormSchema = z.object({
  name: z
    .string()
    .min(2, "O nome da embarcação/veículo deve ter pelo menos 2 caracteres")
    .max(100, "Nome não pode exceder 100 caracteres")
    .transform((val) => sanitizePlainText(val)),
  registration_number: z
    .string()
    .max(50, "Número de registro inválido")
    .optional()
    .nullable()
    .transform((val) => (val ? sanitizePlainText(val) : null)),
  vessel_type: z
    .string()
    .max(50)
    .optional()
    .nullable()
    .transform((val) => (val ? sanitizePlainText(val) : null)),
  engine: z
    .string()
    .max(100)
    .optional()
    .nullable()
    .transform((val) => (val ? sanitizePlainText(val) : null)),
  category: z
    .string()
    .max(50)
    .optional()
    .nullable()
    .transform((val) => (val ? sanitizePlainText(val) : null)),
  notes: z
    .string()
    .max(1000)
    .optional()
    .nullable()
    .transform((val) => (val ? sanitizePlainText(val) : null)),
  customer_id: z.string().uuid("Cliente selecionado inválido"),
});

export type VesselFormData = z.infer<typeof vesselFormSchema>;

/**
 * Schema Zod para validação de Ordens de Serviço / Processos.
 */
export const processFormSchema = z.object({
  customer_id: z.string().uuid("Cliente selecionado inválido"),
  vessel_id: z.string().uuid("Embarcação/veículo selecionado inválido").optional().nullable(),
  process_type: z
    .string()
    .min(2, "Tipo de serviço/processo é obrigatório")
    .max(100)
    .transform((val) => sanitizePlainText(val)),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  status: z
    .enum(["draft", "pending", "in_progress", "completed", "cancelled", "archived"])
    .default("pending"),
  due_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data de vencimento deve estar no formato AAAA-MM-DD")
    .optional()
    .nullable()
    .or(z.literal("")),
  notes: z
    .string()
    .max(2000, "Observações muito longas")
    .optional()
    .nullable()
    .transform((val) => (val ? sanitizePlainText(val) : null)),
});

export type ProcessFormData = z.infer<typeof processFormSchema>;

/**
 * Schema Zod para Sanitização de Termos de Busca em Tabelas.
 */
export const searchFilterSchema = z.object({
  term: z
    .string()
    .default("")
    .transform((val) => sanitizeSearchQuery(val)),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(5).max(100).default(20),
});

export type SearchFilterData = z.infer<typeof searchFilterSchema>;
