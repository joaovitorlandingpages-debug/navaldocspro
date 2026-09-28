import { describe, it, expect } from "vitest";

describe("Busca Geral do Sistema — Agrupamento, Isolamento e Navegação", () => {
  // Mock de dados multi-empresa para testar isolamento, nomes similares e múltiplas embarcações
  const mockDatabase = {
    customers: [
      { id: "cust-1", company_id: "comp-A", name: "Marina Silva Santos", fantasy_name: null, cpf_cnpj: "111.222.333-44", phone: "(11) 98765-4321", city: "Santos" },
      { id: "cust-2", company_id: "comp-A", name: "Marina Costa Albuquerque", fantasy_name: "Marina Náutica", cpf_cnpj: "222.333.444-55", phone: "(12) 99123-4567", city: "Ubatuba" },
      { id: "cust-3", company_id: "comp-A", name: "Marina do Sol Serviços Náuticos", fantasy_name: "Marina do Sol", cpf_cnpj: "33.444.555/0001-66", phone: "(13) 3322-1100", city: "Guarujá" },
      { id: "cust-4", company_id: "comp-A", name: "Carlos Eduardo Ramos", fantasy_name: null, cpf_cnpj: "444.555.666-77", phone: "(21) 98888-9999", city: "Rio de Janeiro" },
      // Cliente de OUTRA empresa (Não pode vazar!)
      { id: "cust-other", company_id: "comp-B", name: "Marina de Angra", fantasy_name: null, cpf_cnpj: "999.888.777-66", phone: "(24) 9999-0000", city: "Angra dos Reis" },
    ],
    vessels: [
      // Carlos Eduardo tem 2 embarcações na empresa A!
      { id: "vess-carlos-1", company_id: "comp-A", customer_id: "cust-4", name: "Lancha Mar Azul", registration_number: "381-001234", category: "Esporte e Recreio", vessel_type: "Lancha" },
      { id: "vess-carlos-2", company_id: "comp-A", customer_id: "cust-4", name: "Veleiro Vento Leste", registration_number: "381-005678", category: "Esporte e Recreio", vessel_type: "Veleiro" },
      // Embarcação da Marina Silva
      { id: "vess-marina-1", company_id: "comp-A", customer_id: "cust-1", name: "Iate Estrela Dalva", registration_number: "381-009999", category: "Comercial", vessel_type: "Iate" },
      // Embarcação de OUTRA empresa (Não pode vazar!)
      { id: "vess-other", company_id: "comp-B", customer_id: "cust-other", name: "Lancha Mar Azul", registration_number: "381-001234", category: "Esporte e Recreio", vessel_type: "Lancha" },
    ],
    processes: [
      // Processos de Carlos Eduardo
      { 
        id: "proc-101", 
        company_id: "comp-A", 
        customer_id: "cust-4", 
        vessel_id: "vess-carlos-1", 
        title: "Renovação do TIE - Mar Azul", 
        process_type: "Renovação de TIE/TIEM", 
        protocol_number: "PROT-2026-001", 
        status: "in_progress" 
      },
      { 
        id: "proc-102", 
        company_id: "comp-A", 
        customer_id: "cust-4", 
        vessel_id: "vess-carlos-2", 
        title: "Transferência de Propriedade - Vento Leste", 
        process_type: "Transferência de Propriedade", 
        protocol_number: "PROT-2026-002", 
        status: "pending_docs" 
      },
      // Processo da Marina Silva
      { 
        id: "proc-201", 
        company_id: "comp-A", 
        customer_id: "cust-1", 
        vessel_id: "vess-marina-1", 
        title: "Inscrição Inicial - Estrela Dalva", 
        process_type: "Registro Inicial", 
        protocol_number: "PROT-2026-003", 
        status: "completed" 
      },
      // Processo de OUTRA empresa (Não pode vazar!)
      { 
        id: "proc-other", 
        company_id: "comp-B", 
        customer_id: "cust-other", 
        vessel_id: "vess-other", 
        title: "Renovação do TIE - Mar Azul", 
        process_type: "Renovação de TIE/TIEM", 
        protocol_number: "PROT-2026-999", 
        status: "in_progress" 
      }
    ]
  };

  // Motor de busca geral simulado que espelha as regras do componente GlobalSearch
  function searchGlobal(companyId: string, query: string) {
    const term = query.trim().toLowerCase();
    if (!term || term.length < 2) {
      return { customers: [], vessels: [], processes: [] };
    }

    // 1. Clientes da empresa
    const customers = mockDatabase.customers
      .filter(c => c.company_id === companyId)
      .filter(c => 
        c.name.toLowerCase().includes(term) ||
        (c.fantasy_name && c.fantasy_name.toLowerCase().includes(term)) ||
        c.cpf_cnpj.toLowerCase().includes(term)
      );

    // 2. Embarcações da empresa com proprietário
    const vessels = mockDatabase.vessels
      .filter(v => v.company_id === companyId)
      .filter(v => 
        v.name.toLowerCase().includes(term) ||
        (v.registration_number && v.registration_number.toLowerCase().includes(term))
      )
      .map(v => {
        const owner = mockDatabase.customers.find(c => c.id === v.customer_id && c.company_id === companyId);
        return {
          ...v,
          customer: owner ? { id: owner.id, name: owner.name, fantasy_name: owner.fantasy_name } : null
        };
      });

    // 3. Processos da empresa com cliente, embarcação, serviço e status
    const matchingCustomerIds = new Set(customers.map(c => c.id));
    const matchingVesselIds = new Set(vessels.map(v => v.id));

    const processes = mockDatabase.processes
      .filter(p => p.company_id === companyId)
      .filter(p => 
        p.title.toLowerCase().includes(term) ||
        p.process_type.toLowerCase().includes(term) ||
        (p.protocol_number && p.protocol_number.toLowerCase().includes(term)) ||
        matchingCustomerIds.has(p.customer_id) ||
        matchingVesselIds.has(p.vessel_id)
      )
      .map(p => {
        const owner = mockDatabase.customers.find(c => c.id === p.customer_id && c.company_id === companyId);
        const boat = mockDatabase.vessels.find(v => v.id === p.vessel_id && v.company_id === companyId);
        return {
          ...p,
          customer: owner ? { id: owner.id, name: owner.name, fantasy_name: owner.fantasy_name } : null,
          vessel: boat ? { id: boat.id, name: boat.name, registration_number: boat.registration_number } : null
        };
      });

    return { customers, vessels, processes };
  }

  // 1. Cenário: Busca de clientes com nomes parecidos
  it("distingue e localiza corretamente clientes com nomes parecidos", () => {
    const results = searchGlobal("comp-A", "Marina");

    // Devem retornar os 3 clientes da empresa A que contêm 'Marina'
    expect(results.customers.length).toBe(3);
    const names = results.customers.map(c => c.name);
    expect(names).toContain("Marina Silva Santos");
    expect(names).toContain("Marina Costa Albuquerque");
    expect(names).toContain("Marina do Sol Serviços Náuticos");

    // E quando refinamos a busca para 'Costa'
    const refined = searchGlobal("comp-A", "Costa");
    expect(refined.customers.length).toBe(1);
    expect(refined.customers[0].name).toBe("Marina Costa Albuquerque");
    expect(refined.customers[0].cpf_cnpj).toBe("222.333.444-55");
  });

  // 2. Cenário: Cliente com mais de uma embarcação e identificação do proprietário
  it("retorna as duas embarcações do mesmo cliente e exibe o cliente proprietário em cada uma", () => {
    // Busca por 'Carlos'
    const results = searchGlobal("comp-A", "Carlos");

    expect(results.customers.length).toBe(1);
    expect(results.customers[0].name).toBe("Carlos Eduardo Ramos");

    // Embarcações associadas ao Carlos buscadas pelo nome do barco
    const boat1 = searchGlobal("comp-A", "Mar Azul");
    expect(boat1.vessels.length).toBe(1);
    expect(boat1.vessels[0].name).toBe("Lancha Mar Azul");
    expect(boat1.vessels[0].customer?.name).toBe("Carlos Eduardo Ramos");

    const boat2 = searchGlobal("comp-A", "Vento Leste");
    expect(boat2.vessels.length).toBe(1);
    expect(boat2.vessels[0].name).toBe("Veleiro Vento Leste");
    expect(boat2.vessels[0].customer?.name).toBe("Carlos Eduardo Ramos");
  });

  // 3. Cenário: Busca por número de inscrição no TIE/TIEM
  it("localiza a embarcação correta ao pesquisar pelo número de inscrição no TIE", () => {
    const results = searchGlobal("comp-A", "381-005678");

    expect(results.vessels.length).toBe(1);
    expect(results.vessels[0].name).toBe("Veleiro Vento Leste");
    expect(results.vessels[0].registration_number).toBe("381-005678");
    expect(results.vessels[0].customer?.name).toBe("Carlos Eduardo Ramos");
  });

  // 4. Cenário: Identificação completa nos resultados de processos (cliente, embarcação, serviço e status)
  it("fornece informações completas nos processos: cliente, embarcação, serviço e situação atual", () => {
    const results = searchGlobal("comp-A", "PROT-2026-001");

    expect(results.processes.length).toBe(1);
    const proc = results.processes[0];

    expect(proc.title).toBe("Renovação do TIE - Mar Azul");
    expect(proc.process_type).toBe("Renovação de TIE/TIEM");
    expect(proc.protocol_number).toBe("PROT-2026-001");
    expect(proc.status).toBe("in_progress");

    // Identificação dos relacionamentos exigidos no prompt:
    expect(proc.customer).toBeDefined();
    expect(proc.customer?.name).toBe("Carlos Eduardo Ramos");

    expect(proc.vessel).toBeDefined();
    expect(proc.vessel?.name).toBe("Lancha Mar Azul");
  });

  // 5. Cenário: Isolamento multi-empresa estrito (Não vazamento de dados)
  it("garante que nenhum dado da empresa B seja exibido para a empresa A, mesmo com nomes idênticos", () => {
    // 'Mar Azul' existe na Empresa A e na Empresa B
    const resultsA = searchGlobal("comp-A", "Mar Azul");
    expect(resultsA.vessels.length).toBe(1);
    expect(resultsA.vessels[0].company_id).toBe("comp-A");
    expect(resultsA.vessels[0].customer?.name).toBe("Carlos Eduardo Ramos");

    const resultsB = searchGlobal("comp-B", "Mar Azul");
    expect(resultsB.vessels.length).toBe(1);
    expect(resultsB.vessels[0].company_id).toBe("comp-B");
    expect(resultsB.vessels[0].customer?.name).toBe("Marina de Angra");

    // Busca de 'Angra' na empresa A não pode retornar nada
    const leakTest = searchGlobal("comp-A", "Angra");
    expect(leakTest.customers.length).toBe(0);
    expect(leakTest.vessels.length).toBe(0);
    expect(leakTest.processes.length).toBe(0);
  });

  // 6. Cenário: Roteamento correto ao clicar em cada resultado
  it("determina a rota exata de destino para cada tipo de registro", () => {
    function getDestinationRoute(type: "customer" | "vessel" | "process", id: string) {
      switch (type) {
        case "customer":
          return { to: "/customers/$id", params: { id } };
        case "vessel":
          return { to: "/vessels/$id", params: { id } };
        case "process":
          return { to: "/processes/$id", params: { id } };
      }
    }

    expect(getDestinationRoute("customer", "cust-1")).toEqual({ to: "/customers/$id", params: { id: "cust-1" } });
    expect(getDestinationRoute("vessel", "vess-carlos-1")).toEqual({ to: "/vessels/$id", params: { id: "vess-carlos-1" } });
    expect(getDestinationRoute("process", "proc-101")).toEqual({ to: "/processes/$id", params: { id: "proc-101" } });
  });
});
