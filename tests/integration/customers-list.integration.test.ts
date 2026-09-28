import { describe, it, expect } from "vitest";
import { supabase } from "@/integrations/supabase/client";

describe("Customers List Query & Disambiguation Suite", () => {
  it("executa a consulta de clientes com disambiguação explícita de foreign key sem erro PGRST201", async () => {
    // Consulta original que falhava com PGRST201 devido a duas chaves estrangeiras em 'processes':
    // customers -> processes (customer_id e secondary_customer_id)
    const { data, count, error } = await supabase
      .from("customers")
      .select("*, vessels(count), processes:processes!processes_customer_id_fkey(count)", { count: "exact" })
      .order("name", { ascending: true })
      .limit(10);

    // O erro PGRST201 NÃO deve ocorrer
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    expect(typeof count === "number" || count === null).toBe(true);
  });

  it("permite ordenação alfabética ascendente e descendente por nome", async () => {
    const { error: ascError } = await supabase
      .from("customers")
      .select("id, name, processes:processes!processes_customer_id_fkey(count)")
      .order("name", { ascending: true })
      .limit(5);

    expect(ascError).toBeNull();

    const { error: descError } = await supabase
      .from("customers")
      .select("id, name, processes:processes!processes_customer_id_fkey(count)")
      .order("name", { ascending: false })
      .limit(5);

    expect(descError).toBeNull();
  });

  it("permite busca por filtro textual (nome, email, cpf/cnpj)", async () => {
    const searchTerm = "Silva";
    const { data, error } = await supabase
      .from("customers")
      .select("id, name, email, cpf_cnpj, vessels(count), processes:processes!processes_customer_id_fkey(count)")
      .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,cpf_cnpj.ilike.%${searchTerm}%`)
      .order("name", { ascending: true })
      .limit(5);

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
  });

  it("garante que a rota de detalhes de cliente pode carregar sem erro de relacionamento", async () => {
    // Testa consulta individual por cliente
    const { data: sampleCustomer } = await supabase
      .from("customers")
      .select("id, name")
      .limit(1)
      .maybeSingle();

    if (sampleCustomer?.id) {
      const { data: customerDetails, error: detailsError } = await supabase
        .from("customers")
        .select("*")
        .eq("id", sampleCustomer.id)
        .maybeSingle();

      expect(detailsError).toBeNull();
      expect(customerDetails).toBeDefined();
      expect(customerDetails?.id).toBe(sampleCustomer.id);
    }
  });
});
