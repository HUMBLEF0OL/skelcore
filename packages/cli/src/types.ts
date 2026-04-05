import type { ManifestEntry } from "@ghostframe/core";

export interface CliIo {
  log: (message: string) => void;
  error: (message: string) => void;
}

export interface CaptureConfig {
  baseUrl: string;
  routes: string[];
  breakpoints: number[];
  viewportHeight: number;
  outputDir: string;
  manifestFileName: string;
  loaderFileName: string;
  selector: string;
  waitForMs: number;
  retries: number;
  prettyPrintManifest?: boolean;
}

export interface CapturedArtifact {
  key: string;
  entry: ManifestEntry;
}

export interface CaptureRunResult {
  ok: boolean;
  artifacts: CapturedArtifact[];
  fatalError?: string;
}

export interface CaptureReport {
  routesVisited: number;
  breakpoints: number[];
  targetsDiscovered: number;
  artifactsEmitted: number;
  manifestBytes?: number;
}

export type GateMode = "strict" | "warn";

export interface ManifestQualityThresholds {
  requiredKeys: string[];
  minCoverage: number;
  maxInvalidEntries: number;
  maxArtifactSizeBytes?: number;
}

export interface ManifestQualitySummary {
  entryCount: number;
  totalRequiredKeys: number;
  presentRequiredKeys: number;
  coverageRatio: number;
  invalidEntries: number;
  artifactSizeBytes: number;
}

export interface ManifestQualityGates {
  schemaValid: boolean;
  coverage: boolean;
  requiredKeys: boolean;
  invalidEntries: boolean;
  artifactSize: boolean;
  overall: boolean;
}

export interface ManifestQualityResult {
  summary: ManifestQualitySummary;
  gates: ManifestQualityGates;
  missingRequiredKeys: string[];
  invalidEntryKeys: string[];
  errors: string[];
  parseError?: string;
}

export interface ManifestDiffThresholds {
  maxChangedKeys?: number;
}

export interface ManifestDiffSummary {
  added: number;
  removed: number;
  changed: number;
}

export interface ManifestDiffGates {
  baseValid: boolean;
  candidateValid: boolean;
  changeBudget: boolean;
  overall: boolean;
}

export interface ManifestDiffResult {
  summary: ManifestDiffSummary;
  addedKeys: string[];
  removedKeys: string[];
  changedKeys: string[];
  gates: ManifestDiffGates;
  errors: string[];
}

export interface QualityReport {
  generatedAt: string;
  overallPass: boolean;
  validate: ManifestQualityResult;
  diff?: ManifestDiffResult;
}
