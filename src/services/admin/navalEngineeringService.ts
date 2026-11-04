/**
 * Utilitários e Fórmulas Oficiais da NORMAM-211/DPC para Engenharia Naval
 */

export interface HinValidationResult {
  isValid: boolean;
  code: string;
  mic: string; // Fabricante (3 caracteres)
  serial: string; // Número de série (5 caracteres)
  month: string; // Mês de fabricação
  yearBuilt: string; // Ano de fabricação
  modelYear: string; // Ano do modelo
  format: "standard" | "format_old" | "invalid";
  feedbackMessage: string;
}

/**
 * Validador oficial do padrão HIN / MIC (Hull Identification Number)
 * Conforme NORMAM-211/DPC c/c ABNT NBR 14950 e ISO 10087.
 * Padrão moderno: 12 caracteres (ex: "ABC12345D424") ou com prefixo de país (ex: "BR-ABC12345D424")
 */
export function validateHullHinCode(rawHin: string): HinValidationResult {
  const cleaned = rawHin.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");

  if (cleaned.length < 12) {
    return {
      isValid: false,
      code: rawHin,
      mic: "",
      serial: "",
      month: "",
      yearBuilt: "",
      modelYear: "",
      format: "invalid",
      feedbackMessage: "Código HIN incompleto. O padrão oficial possui no mínimo 12 caracteres alfanuméricos.",
    };
  }

  // Se tiver 14 caracteres (ex: BR + 12 dígitos)
  const effectiveHin = cleaned.length >= 14 && cleaned.startsWith("BR") ? cleaned.slice(2) : cleaned.slice(-12);

  const mic = effectiveHin.slice(0, 3);
  const serial = effectiveHin.slice(3, 8);
  const monthChar = effectiveHin.slice(8, 9);
  const yearBuiltChar = effectiveHin.slice(9, 10);
  const modelYear = effectiveHin.slice(10, 12);

  // Mês no padrão moderno: A=Jan, B=Fev, C=Mar, D=Abr, E=Mai, F=Jun, G=Jul, H=Ago, I=Set, J=Out, K=Nov, L=Dez
  const monthsMap: Record<string, string> = {
    A: "Janeiro",
    B: "Fevereiro",
    C: "Março",
    D: "Abril",
    E: "Maio",
    F: "Junho",
    G: "Julho",
    H: "Agosto",
    I: "Setembro",
    J: "Outubro",
    K: "Novembro",
    L: "Dezembro",
  };

  const monthName = monthsMap[monthChar];
  const isValidMonth = !!monthName;
  const isDigitsModel = /^\d{2}$/.test(modelYear);

  if (isValidMonth && isDigitsModel) {
    return {
      isValid: true,
      code: `BR-${mic}-${serial}-${monthChar}${yearBuiltChar}${modelYear}`,
      mic,
      serial,
      month: monthName,
      yearBuilt: `202${yearBuiltChar}`,
      modelYear: `20${modelYear}`,
      format: "standard",
      feedbackMessage: `HIN Válido! Fabricante: ${mic} · Mês de Construção: ${monthName} · Ano Modelo: 20${modelYear}.`,
    };
  }

  return {
    isValid: false,
    code: rawHin,
    mic,
    serial,
    month: monthChar,
    yearBuilt: yearBuiltChar,
    modelYear,
    format: "invalid",
    feedbackMessage: "Formato de mês ou ano modelo inválido para o padrão NORMAM/ISO 10087.",
  };
}

export interface ArqueacaoCalculada {
  comprimento: number;
  boca: number;
  pontal: number;
  coeficienteBloco: number; // Padrão 0.50 para embarcações de recreio
  volumeTotalM3: number;
  arqueacaoBruta: number; // AB
  arqueacaoLiquidaEstimada: number; // AL (~70% da AB)
  classificacaoPorte: "miuda" | "medio_porte" | "grande_porte";
  classificacaoLabel: string;
  documentoObrigatorio: "BSADE (Anexo 2-B)" | "BADE (Anexo 2-A)";
  exigeRegistroTribunalMaritimo: boolean;
  exigeArtEngenheiro: boolean;
}

/**
 * Calculadora Oficial de Arqueação Bruta Simplificada
 * Conforme NORMAM-211/DPC, Capítulo 3 (item 0303 - Método Simplificado de Arqueação):
 * AB = (Comprimento x Boca x Pontal x 0.50) / 2.83
 */
export function calculateArqueacaoSimplificada(
  comprimento: number,
  boca: number,
  pontal: number,
  coeficiente = 0.5
): ArqueacaoCalculada {
  const comp = Math.max(0.1, comprimento);
  const b = Math.max(0.1, boca);
  const p = Math.max(0.1, pontal);

  const volumeTotalM3 = comp * b * p * coeficiente;
  const arqueacaoBruta = Number((volumeTotalM3 / 2.83).toFixed(2));
  const arqueacaoLiquidaEstimada = Number((arqueacaoBruta * 0.7).toFixed(2));

  // Regras da Marinha:
  // Embarcação Miúda: Comprimento < 12 metros E Arqueação Bruta <= 20
  // Médio Porte: Comprimento >= 12 metros E < 24 metros (ou AB > 20)
  // Grande Porte: Comprimento >= 24 metros ou sujeita a registro no Tribunal Marítimo (AB > 100)
  let classificacaoPorte: "miuda" | "medio_porte" | "grande_porte" = "miuda";
  let classificacaoLabel = "Embarcação Miúda (Esporte e Recreio)";
  let documentoObrigatorio: "BSADE (Anexo 2-B)" | "BADE (Anexo 2-A)" = "BSADE (Anexo 2-B)";
  let exigeRegistroTribunalMaritimo = false;
  let exigeArtEngenheiro = false;

  if (comp >= 24 || arqueacaoBruta >= 100) {
    classificacaoPorte = "grande_porte";
    classificacaoLabel = "Embarcação de Grande Porte (Sujeita a Registro no Tribunal Marítimo)";
    documentoObrigatorio = "BADE (Anexo 2-A)";
    exigeRegistroTribunalMaritimo = true;
    exigeArtEngenheiro = true;
  } else if (comp >= 12 || arqueacaoBruta > 20) {
    classificacaoPorte = "medio_porte";
    classificacaoLabel = "Embarcação Não Miúda / Médio Porte (12m a 24m)";
    documentoObrigatorio = "BADE (Anexo 2-A)";
    exigeRegistroTribunalMaritimo = false;
    exigeArtEngenheiro = true;
  }

  return {
    comprimento: comp,
    boca: b,
    pontal: p,
    coeficienteBloco: coeficiente,
    volumeTotalM3: Number(volumeTotalM3.toFixed(2)),
    arqueacaoBruta,
    arqueacaoLiquidaEstimada,
    classificacaoPorte,
    classificacaoLabel,
    documentoObrigatorio,
    exigeRegistroTribunalMaritimo,
    exigeArtEngenheiro,
  };
}

export interface SalvatagemCalculada {
  tripulantes: number;
  passageiros: number;
  totalPessoas: number;
  areaNavegacao: "interior" | "costeira" | "oceanica";
  classeColeteRecomendada: "Classe II" | "Classe III" | "Classe V";
  quantidadeColetesAdulto: number;
  quantidadeColetesInfantil: number;
  boiasCircularesObrigatorias: number;
  fachoLuminosoObrigatorio: boolean;
  extintoresObrigatorios: string;
  pirotecnicosObrigatorios: string[];
}

/**
 * Calculadora de Dotação Regulamentar de Salvatagem conforme NORMAM-211/DPC Capítulo 4
 */
export function calculateSalvatagemRequerida(
  tripulantes: number,
  passageiros: number,
  areaNavegacao: "interior" | "costeira" | "oceanica",
  comprimentoMetros: number
): SalvatagemCalculada {
  const totalPessoas = Math.max(1, tripulantes + passageiros);
  const quantidadeColetesAdulto = totalPessoas;
  const quantidadeColetesInfantil = Math.max(1, Math.ceil(totalPessoas * 0.1)); // Mínimo 10% infantil

  let classeColete: "Classe II" | "Classe III" | "Classe V" = "Classe III";
  let boias = 1;
  let facho = false;
  let pirotecnicos: string[] = [];

  if (areaNavegacao === "oceanica") {
    classeColete = "Classe II";
    boias = comprimentoMetros >= 12 ? 4 : 2;
    facho = true;
    pirotecnicos = [
      "2 foguetes manuais com paraquedas (luz vermelha)",
      "2 fachos manuais luz vermelha",
      "2 sinais fumígenos flutuantes laranja",
    ];
  } else if (areaNavegacao === "costeira") {
    classeColete = "Classe II";
    boias = comprimentoMetros >= 12 ? 2 : 1;
    facho = true;
    pirotecnicos = [
      "2 foguetes manuais com paraquedas",
      "2 fachos manuais luz vermelha",
    ];
  } else {
    // Interior
    classeColete = "Classe III";
    boias = 1;
    facho = false;
    pirotecnicos = ["1 facho manual luz vermelha (opcional recomendado)"];
  }

  const extintores = comprimentoMetros >= 12
    ? "2 extintores portáteis tipo ABC (10-B:C) ou sistema fixo de CO2/FM-200 no compartimento de máquinas"
    : "1 extintor portátil tipo ABC (5-B:C) na praça de manobra";

  return {
    tripulantes,
    passageiros,
    totalPessoas,
    areaNavegacao,
    classeColeteRecomendada: classeColete,
    quantidadeColetesAdulto,
    quantidadeColetesInfantil,
    boiasCircularesObrigatorias: boias,
    fachoLuminosoObrigatorio: facho,
    extintoresObrigatorios: extintores,
    pirotecnicosObrigatorios: pirotecnicos,
  };
}
