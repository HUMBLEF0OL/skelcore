import type { Blueprint, BlueprintManifest, ManifestEntryValidationResult } from "@ghostframe/core";

export type ResolutionPolicyMode =
  | "runtime-only"
  | "hybrid"
  | "precomputed-only"
  | "strict-precomputed";

export type ResolutionSource =
  | "explicit"
  | "manifest"
  | "compatible-manifest"
  | "memory"
  | "session"
  | "dynamic"
  | "placeholder";

export type ManifestResolutionSource = Extract<
  ResolutionSource,
  "manifest" | "compatible-manifest" | "memory" | "session"
>;

export interface ResolutionPolicy {
  mode: ResolutionPolicyMode;
  strict: boolean;
  /** Evaluate manifest and emit telemetry, but always serve dynamic output */
  shadowTelemetryOnly?: boolean;
}

export interface ResolverContext {
  skeletonKey?: string;
  externalBlueprint?: Blueprint;
  policyOverride?: Partial<ResolutionPolicy>;
  /** Precomputed manifest for manifest-based resolution */
  manifest?: BlueprintManifest;
  /** Current structural hash of the DOM for validation */
  structuralHash?: string;
  /** Current timestamp for TTL validation (defaults to Date.now()) */
  now?: number;
}

export interface ResolutionEvent {
  source: ResolutionSource;
  policyMode: ResolutionPolicyMode;
  usedFallback: boolean;
  reason: string;
  timestamp: number;
  latencyMs: number;
  componentKey?: string;
  measurementDurationMs?: number;
  manifestAgeMs?: number;
  manifestVersion?: number;
  candidateSource?: "manifest" | "none";
  rejectionCategory?: "miss" | "invalid";
  rejectionReason?: string;
  invalidationReason?: ManifestEntryValidationResult["invalidationReason"];
  /** Manifest-specific validation details if source is manifest-related */
  manifestValidation?: ManifestEntryValidationResult;
}

export interface ResolverTelemetryCounters {
  explicitHits: number;
  manifestHits: number;
  manifestMisses: number;
  sessionHits: number;
  dynamicFallbacks: number;
  placeholderFallbacks: number;
  invalidations: number;
  shadowHits: number;
  shadowMisses: number;
  shadowInvalids: number;
}

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

export interface ResolutionResult {
  blueprint: Blueprint | null;
  event: ResolutionEvent;
}

export const DEFAULT_RESOLUTION_POLICY: ResolutionPolicy = {
  mode: "runtime-only",
  strict: false,
};
