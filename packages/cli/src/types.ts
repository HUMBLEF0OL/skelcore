import type { ManifestEntry } from "@ghostframes/core";

export interface CliIo {
  log: (message: string) => void;
  error: (message: string) => void;
}

// Parity (B1) - Capture accuracy validation
export type ParityReasonCode =
  | "matched"
  | "missing_selector"
  | "extra_selector"
  | "breakpoint_mismatch"
  | "route_missing_artifact";

export interface ParityObservation {
  route: string;
  breakpoint: number;
  discoveredKeys: string[];
  extractedKeys: string[];
  extractionFailures: number;
}

export interface ParityMismatch {
  key: string;
  route: string;
  breakpoint: number;
  reason: ParityReasonCode;
  missingKeys?: string[];
  extraKeys?: string[];
  extractionFailures?: number;
  details?: string;
}

export interface ParityReport {
  generatedAt: string;
  totalChecks: number;
  matchedCount: number;
  parityRate: number; // 0-1
  minThreshold: number; // 0.95
  passed: boolean;
  mismatches: ParityMismatch[];
  reasonCounts: Record<Exclude<ParityReasonCode, "matched">, number>;
}

// Determinism (B2) - Output consistency validation
export interface DiffEntry {
  key: string;
  field: string;
  old: unknown;
  new: unknown;
  classification: "expected" | "unexpected";
  reason?: string;
}

export interface DeterminismReport {
  generatedAt: string;
  runCount: number;
  totalDiffs: number;
  unexpectedDiffCount: number;
  unexpectedDiffRate: number; // 0-1
  maxThreshold: number; // 0.01
  passed: boolean;
  diffs: DiffEntry[];
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
  // Parity & determinism options
  enableParityCheck?: boolean;
  parityThreshold?: number; // default 0.95
  maxSelectorMismatchCount?: number; // default 0
  enableDeterminismCheck?: boolean;
  maxUnexpectedDiffRate?: number; // default 0.01
  pilotRoutes?: string[]; // routes for parity checking
}

export interface CapturedArtifact {
  key: string;
  entry: ManifestEntry;
  quality?: {
    score: number;
    accepted: boolean;
  };
}

export interface CaptureRunResult {
  ok: boolean;
  artifacts: CapturedArtifact[];
  parityObservations?: ParityObservation[];
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
