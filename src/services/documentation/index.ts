/**
 * Sprint 4D.5 — Fatia 3
 * Barrel do Motor de Cobertura Documental.
 */
export * from "./types";
export { analyzeTemplates } from "./templateAnalyzer";
export { analyzeMappings } from "./mappingAnalyzer";
export { analyzePlaceholders } from "./placeholderAnalyzer";
export { computeHealthScore } from "./healthEngine";
export { computeCoverage, DocumentationCoverageEngine } from "./coverageEngine";
