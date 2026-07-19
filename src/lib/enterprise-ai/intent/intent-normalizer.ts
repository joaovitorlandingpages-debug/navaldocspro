export class IntentNormalizer {
  static normalize(text: string): string {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove acentos
      .trim()
      .replace(/\s+/g, " ") // Remove espaços duplos
      .replace(/p\/|para o|para a/g, "para"); // Normaliza conectores simples
  }
}
