export interface CapitaniaOM {
  id: string;
  sigla: string; // Ex: "CPSP", "CPRJ", "DelSaoSebastiao", "AgParaty"
  nome: string; // Ex: "Capitania dos Portos de São Paulo"
  cidade: string;
  uf: string;
  endereco: string;
  cep: string;
  telefones: string;
  emailProtocolo: string;
  emailSetorEmbarcacoes: string;
  titularAtual: string; // Ex: "Capitão de Mar e Guerra Marcus Vinicius"
  jurisdicaoDescricao: string;
  peculiaridadesBalcao: string; // Exigências locais específicas
  chavePixGru: string;
  isAtiva: boolean;
}

export const DEFAULT_CAPITANIAS: CapitaniaOM[] = [
  {
    id: "om_cpsp",
    sigla: "CPSP",
    nome: "Capitania dos Portos de São Paulo",
    cidade: "Santos",
    uf: "SP",
    endereco: "Avenida Conselheiro Nébias, nº 488 - Encruzilhada",
    cep: "11045-000",
    telefones: "(13) 3221-3455 / (13) 3221-3456",
    emailProtocolo: "cpsp.protocolo@marinha.mil.br",
    emailSetorEmbarcacoes: "cpsp.semb@marinha.mil.br",
    titularAtual: "Capitão de Mar e Guerra",
    jurisdicaoDescricao: "Litoral do Estado de São Paulo (Baixada Santista, Litoral Sul e Vale do Ribeira).",
    peculiaridadesBalcao: "Exige 2 fotografias coloridas 15x21cm da embarcação (costado e popa com nome/porto). Aceita validação Gov.br Prata/Ouro para procurações e transferências.",
    chavePixGru: "00.394.502/0001-38 (Tesouro Nacional / CPSP)",
    isAtiva: true,
  },
  {
    id: "om_cprj",
    sigla: "CPRJ",
    nome: "Capitania dos Portos do Rio de Janeiro",
    cidade: "Rio de Janeiro",
    uf: "RJ",
    endereco: "Rua Primeiro de Março, nº 118 - Centro",
    cep: "20010-000",
    telefones: "(21) 2104-5300 / (21) 2104-5400",
    emailProtocolo: "cprj.gap@marinha.mil.br",
    emailSetorEmbarcacoes: "cprj.embarcacoes@marinha.mil.br",
    titularAtual: "Capitão de Mar e Guerra",
    jurisdicaoDescricao: "Baía de Guanabara, Região Oceânica do Rio de Janeiro e Leste Fluminense.",
    peculiaridadesBalcao: "Atendimento no GAP exige agendamento eletrônico prévio no portal da CPRJ. Obrigatória a apresentação de via física de comprovante de residência em nome do titular.",
    chavePixGru: "00.394.502/0001-38 (Tesouro Nacional / CPRJ)",
    isAtiva: true,
  },
  {
    id: "om_del_saosebastiao",
    sigla: "DelSãoSebastião",
    nome: "Delegacia da Capitania dos Portos em São Sebastião",
    cidade: "São Sebastião",
    uf: "SP",
    endereco: "Avenida Dr. Altino Arantes, nº 231 - Centro Histórico",
    cep: "11600-000",
    telefones: "(12) 3892-1550",
    emailProtocolo: "delsseba.secom@marinha.mil.br",
    emailSetorEmbarcacoes: "delsseba.semb@marinha.mil.br",
    titularAtual: "Capitão de Fragata",
    jurisdicaoDescricao: "Litoral Norte Paulista (São Sebastião, Ilhabela, Caraguatatuba e Ubatuba).",
    peculiaridadesBalcao: "Vistorias de arquipélago (Ilhabela) com cronograma semanal. Vistorias em marinas da balsa devem ser agendadas com 48h de antecedência.",
    chavePixGru: "00.394.502/0001-38 (Tesouro Nacional / DelSãoSebastião)",
    isAtiva: true,
  },
  {
    id: "om_del_angra",
    sigla: "DelAngraReis",
    nome: "Delegacia da Capitania dos Portos em Angra dos Reis",
    cidade: "Angra dos Reis",
    uf: "RJ",
    endereco: "Rua Manoel do Pasto, s/nº - Praia do Anil",
    cep: "23904-010",
    telefones: "(24) 3365-0365 / (24) 3365-0366",
    emailProtocolo: "delangra.gap@marinha.mil.br",
    emailSetorEmbarcacoes: "delangra.embarcacoes@marinha.mil.br",
    titularAtual: "Capitão de Fragata",
    jurisdicaoDescricao: "Baía da Ilha Grande (Angra dos Reis, Ilha Grande e Mangaratiba).",
    peculiaridadesBalcao: "Fiscalização rigorosa de lotação em embarcações de aluguel e turismo náutico. Exige ART original com firma reconhecida para alterações estruturais.",
    chavePixGru: "00.394.502/0001-38 (Tesouro Nacional / DelAngraReis)",
    isAtiva: true,
  },
  {
    id: "om_ag_paraty",
    sigla: "AgParaty",
    nome: "Agência da Capitania dos Portos em Paraty",
    cidade: "Paraty",
    uf: "RJ",
    endereco: "Rua Dr. Samuel Costa, nº 28 - Centro Histórico",
    cep: "23970-000",
    telefones: "(24) 3371-1250",
    emailProtocolo: "agparaty.protocolo@marinha.mil.br",
    emailSetorEmbarcacoes: "agparaty.semb@marinha.mil.br",
    titularAtual: "Capitão-Tenente",
    jurisdicaoDescricao: "Município de Paraty e águas interiores adjacentes.",
    peculiaridadesBalcao: "Atendimento prioritário matutino para pescadores e traineiras. Exige comprovante de fundeio ou berço em marina/poita cadastrada.",
    chavePixGru: "00.394.502/0001-38 (Tesouro Nacional / AgParaty)",
    isAtiva: true,
  },
  {
    id: "om_del_itajai",
    sigla: "DelItajaí",
    nome: "Delegacia da Capitania dos Portos em Itajaí",
    cidade: "Itajaí",
    uf: "SC",
    endereco: "Rua Prefeito Paulo Bauer, nº 1055 - Centro",
    cep: "88301-500",
    telefones: "(47) 3348-0129 / (47) 3348-0130",
    emailProtocolo: "delitajai.protocolo@marinha.mil.br",
    emailSetorEmbarcacoes: "delitajai.semb@marinha.mil.br",
    titularAtual: "Capitão de Fragata",
    jurisdicaoDescricao: "Polo náutico e pesqueiro de Itajaí, Balneário Camboriú, Navegantes e Penha.",
    peculiaridadesBalcao: "Polo de grandes estaleiros. Exige memorial de cálculo de estabilidade assinado por engenheiro naval para barcos acima de 12 metros.",
    chavePixGru: "00.394.502/0001-38 (Tesouro Nacional / DelItajaí)",
    isAtiva: true,
  },
  {
    id: "om_cppr",
    sigla: "CPPR",
    nome: "Capitania dos Portos do Paraná",
    cidade: "Paranaguá",
    uf: "PR",
    endereco: "Rua Benjamim Constant, nº 707 - Centro Histórico",
    cep: "83203-190",
    telefones: "(41) 3721-1500",
    emailProtocolo: "cppr.protocolo@marinha.mil.br",
    emailSetorEmbarcacoes: "cppr.semb@marinha.mil.br",
    titularAtual: "Capitão de Mar e Guerra",
    jurisdicaoDescricao: "Litoral Paranaense (Paranaguá, Guaratuba, Antonina, Pontal do Paraná e Matinhos).",
    peculiaridadesBalcao: "Baía de Guaratuba e Paranaguá com conferência de arqueação em balcão. Requer atenção especial à navegação em canais com assoreamento.",
    chavePixGru: "00.394.502/0001-38 (Tesouro Nacional / CPPR)",
    isAtiva: true,
  },
  {
    id: "om_cpba",
    sigla: "CPBA",
    nome: "Capitania dos Portos da Bahia",
    cidade: "Salvador",
    uf: "BA",
    endereco: "Avenida das Naus, s/nº - Comércio",
    cep: "40015-270",
    telefones: "(71) 3507-3777",
    emailProtocolo: "cpba.protocolo@marinha.mil.br",
    emailSetorEmbarcacoes: "cpba.semb@marinha.mil.br",
    titularAtual: "Capitão de Mar e Guerra",
    jurisdicaoDescricao: "Baía de Todos os Santos e Litoral da Bahia.",
    peculiaridadesBalcao: "Exige vistoria técnica especial para embarcações que operam transporte de passageiros entre Salvador, Itaparica e Morro de São Paulo.",
    chavePixGru: "00.394.502/0001-38 (Tesouro Nacional / CPBA)",
    isAtiva: true,
  },
];

const CAPITANIAS_STORAGE_KEY = "navaldocs_admin_capitanias_v1";

export function getCapitanias(): CapitaniaOM[] {
  if (typeof localStorage === "undefined") {
    return DEFAULT_CAPITANIAS;
  }
  try {
    const raw = localStorage.getItem(CAPITANIAS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn("Erro ao ler capitanias do storage:", e);
  }
  return DEFAULT_CAPITANIAS;
}

export function saveCapitanias(list: CapitaniaOM[]): void {
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(CAPITANIAS_STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent("navaldocs_capitanias_updated", { detail: { count: list.length } }));
  }
}

export function addCapitania(nova: Omit<CapitaniaOM, "id">): CapitaniaOM {
  const list = getCapitanias();
  const created: CapitaniaOM = {
    ...nova,
    id: `om_custom_${Date.now()}`,
  };
  const updated = [...list, created];
  saveCapitanias(updated);
  return created;
}

export function updateCapitania(id: string, updates: Partial<CapitaniaOM>): void {
  const list = getCapitanias();
  const updated = list.map((c) => (c.id === id ? { ...c, ...updates } : c));
  saveCapitanias(updated);
}

export function deleteCapitania(id: string): void {
  const list = getCapitanias();
  const updated = list.filter((c) => c.id !== id);
  saveCapitanias(updated);
}

export function resetCapitaniasToDefaults(): CapitaniaOM[] {
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(CAPITANIAS_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent("navaldocs_capitanias_updated", { detail: { count: DEFAULT_CAPITANIAS.length } }));
  }
  return DEFAULT_CAPITANIAS;
}
