import type { Blueprint, ManifestEntryValidationResult } from "@ghostframes/core";
import {
  DEFAULT_RESOLUTION_POLICY,
  type HybridConfidenceGateDecision,
  type HybridOperationalGateDecision,
  type HybridOperationalThresholds,
  type HybridConfidenceThresholds,
  type ResolutionPolicy,
  type ResolverConfidenceMetrics,
  type ResolverTelemetryCounters,
  type ResolverContext,
  type ResolutionResult,
  type ValidationResult,
} from "./resolution-types";
import { resolveManifestEntry } from "./manifest-resolver";

const DEFAULT_SESSION_CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_SESSION_CACHE_ENTRIES = 500;

type SessionCacheEntry = {
  blueprint: Blueprint;
  expiresAt: number;
  storedAt: number;
};

const sessionBlueprintStore = new Map<string, SessionCacheEntry>();

const resolverTelemetryCounters: ResolverTelemetryCounters = {
  explicitHits: 0,
  manifestHits: 0,
  manifestMisses: 0,
  sessionHits: 0,
  dynamicFallbacks: 0,
  placeholderFallbacks: 0,
  invalidations: 0,
  shadowHits: 0,
  shadowMisses: 0,
  shadowInvalids: 0,
};

export const DEFAULT_HYBRID_CONFIDENCE_THRESHOLDS: HybridConfidenceThresholds = {
  minManifestHitRatio: 0.75,
  maxInvalidationRate: 0.05,
  rollbackHitRatioFloor: 0.6,
  rollbackInvalidationCeil: 0.08,
  minManifestAttempts: 1,
};

export const DEFAULT_HYBRID_OPERATIONAL_THRESHOLDS: HybridOperationalThresholds = {
  maxUserVisibleRegressionDelta: 0,
  maxRollbackDrillDurationMs: 10 * 60 * 1000,
};

function incrementCounter(counter: keyof ResolverTelemetryCounters): void {
  resolverTelemetryCounters[counter] += 1;
}

function eventTimestamp(now: number | undefined): number {
  return now ?? Date.now();
}

function eventLatency(startTimeMs: number): number {
  const elapsed = Date.now() - startTimeMs;
  return elapsed > 0 ? elapsed : 0;
}

function classifyManifestReason(reason: string): "miss" | "invalid" {
  const normalized = reason.toLowerCase();
  if (
    normalized.includes("not found") ||
    normalized.includes("no-skeleton-key") ||
    normalized.includes("no-manifest") ||
    normalized === "manifest-index-miss"
  ) {
    return "miss";
  }

  return "invalid";
}

function mapInvalidationReason(
  reason: string | undefined
): ManifestEntryValidationResult["invalidationReason"] | undefined {
  if (!reason) {
    return undefined;
  }

  const normalized = reason.toLowerCase();
  if (normalized.includes("version mismatch")) {
    return "version-mismatch";
  }
  if (normalized.includes("stale") || normalized.includes("ttl")) {
    return "ttl-expired";
  }
  if (normalized.includes("structural hash mismatch")) {
    return "structural-hash-mismatch";
  }
  if (normalized.includes("style drift")) {
    return "style-drift";
  }
  if (
    normalized.includes("manifest") ||
    normalized.includes("validation") ||
    normalized.includes("entry")
  ) {
    return "malformed";
  }

  return undefined;
}

export function derivePolicyForPath(input: {
  pathname: string;
  strictEnabled: boolean;
  strictPaths: string[];
  serveEnabled: boolean;
  servePaths: string[];
  serveBlockPaths?: string[];
  shadowEnabled?: boolean;
  shadowPaths?: string[];
}): ResolutionPolicy {
  const matchesPrefix = (prefixes: string[]): boolean =>
    prefixes.some((prefix) => input.pathname === prefix || input.pathname.startsWith(`${prefix}/`));

  const isStrictRoute = input.strictEnabled && matchesPrefix(input.strictPaths);
  if (isStrictRoute) {
    return { mode: "strict-precomputed", strict: true };
  }

  const isShadowRoute = input.shadowEnabled === true && matchesPrefix(input.shadowPaths ?? []);
  if (isShadowRoute) {
    return { mode: "hybrid", strict: false, shadowTelemetryOnly: true };
  }

  const isServeBlocked = matchesPrefix(input.serveBlockPaths ?? []);
  if (isServeBlocked) {
    return { mode: "runtime-only", strict: false };
  }

  const isServingRoute = input.serveEnabled && matchesPrefix(input.servePaths);
  if (isServingRoute) {
    return { mode: "hybrid", strict: false };
  }

  return { mode: "runtime-only", strict: false };
}

function trimSessionCacheIfNeeded(): void {
  if (sessionBlueprintStore.size <= MAX_SESSION_CACHE_ENTRIES) {
    return;
  }

  // Evict oldest insertion first to cap memory usage.
  const first = sessionBlueprintStore.keys().next();
  if (!first.done) {
    sessionBlueprintStore.delete(first.value);
  }
}

function getSessionBlueprint(skeletonKey: string, nowMs: number): Blueprint | null {
  const cached = sessionBlueprintStore.get(skeletonKey);
  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= nowMs) {
    sessionBlueprintStore.delete(skeletonKey);
    return null;
  }

  return cached.blueprint;
}

export function recordRuntimeBlueprint(
  skeletonKey: string,
  blueprint: Blueprint,
  ttlMs: number = DEFAULT_SESSION_CACHE_TTL_MS,
  now: number = Date.now()
): void {
  if (!skeletonKey) {
    return;
  }

  const safeTtlMs = Math.max(ttlMs, 1);
  sessionBlueprintStore.set(skeletonKey, {
    blueprint,
    storedAt: now,
    expiresAt: now + safeTtlMs,
  });
  trimSessionCacheIfNeeded();
}

export function getResolverTelemetryCounters(): ResolverTelemetryCounters {
  return { ...resolverTelemetryCounters };
}

export function resetResolverTelemetryCounters(): void {
  resolverTelemetryCounters.explicitHits = 0;
  resolverTelemetryCounters.manifestHits = 0;
  resolverTelemetryCounters.manifestMisses = 0;
  resolverTelemetryCounters.sessionHits = 0;
  resolverTelemetryCounters.dynamicFallbacks = 0;
  resolverTelemetryCounters.placeholderFallbacks = 0;
  resolverTelemetryCounters.invalidations = 0;
  resolverTelemetryCounters.shadowHits = 0;
  resolverTelemetryCounters.shadowMisses = 0;
  resolverTelemetryCounters.shadowInvalids = 0;
}

export function resetResolverSessionCache(): void {
  sessionBlueprintStore.clear();
}

function normalizeRatio(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  if (value >= 1) {
    return 1;
  }

  return value;
}

function getManifestAttemptCount(counters: ResolverTelemetryCounters): number {
  return counters.manifestHits + counters.manifestMisses + counters.invalidations;
}

function getServedCount(counters: ResolverTelemetryCounters): number {
  return (
    counters.manifestHits +
    counters.sessionHits +
    counters.dynamicFallbacks +
    counters.placeholderFallbacks
  );
}

export function computeResolverConfidenceMetrics(
  counters: ResolverTelemetryCounters
): ResolverConfidenceMetrics {
  const manifestAttempts = getManifestAttemptCount(counters);
  const servedCount = getServedCount(counters);

  return {
    manifestAttempts,
    servedCount,
    manifestHitRatio:
      manifestAttempts > 0 ? normalizeRatio(counters.manifestHits / manifestAttempts) : 0,
    invalidationRate:
      manifestAttempts > 0 ? normalizeRatio(counters.invalidations / manifestAttempts) : 0,
    fallbackRatio:
      servedCount > 0
        ? normalizeRatio(
          (counters.sessionHits + counters.dynamicFallbacks + counters.placeholderFallbacks) /
          servedCount
        )
        : 0,
  };
}

export function diffResolverTelemetryCounters(
  current: ResolverTelemetryCounters,
  baseline: ResolverTelemetryCounters
): ResolverTelemetryCounters {
  return {
    explicitHits: Math.max(current.explicitHits - baseline.explicitHits, 0),
    manifestHits: Math.max(current.manifestHits - baseline.manifestHits, 0),
    manifestMisses: Math.max(current.manifestMisses - baseline.manifestMisses, 0),
    sessionHits: Math.max(current.sessionHits - baseline.sessionHits, 0),
    dynamicFallbacks: Math.max(current.dynamicFallbacks - baseline.dynamicFallbacks, 0),
    placeholderFallbacks: Math.max(current.placeholderFallbacks - baseline.placeholderFallbacks, 0),
    invalidations: Math.max(current.invalidations - baseline.invalidations, 0),
    shadowHits: Math.max(current.shadowHits - baseline.shadowHits, 0),
    shadowMisses: Math.max(current.shadowMisses - baseline.shadowMisses, 0),
    shadowInvalids: Math.max(current.shadowInvalids - baseline.shadowInvalids, 0),
  };
}

export function evaluateHybridConfidenceGate(input: {
  counters: ResolverTelemetryCounters;
  previousWindowPass?: boolean;
  thresholds?: Partial<HybridConfidenceThresholds>;
}): HybridConfidenceGateDecision {
  const thresholds: HybridConfidenceThresholds = {
    ...DEFAULT_HYBRID_CONFIDENCE_THRESHOLDS,
    ...input.thresholds,
  };
  const metrics = computeResolverConfidenceMetrics(input.counters);
  const reasons: string[] = [];
  const hasEnoughData = metrics.manifestAttempts >= thresholds.minManifestAttempts;

  if (!hasEnoughData) {
    reasons.push(
      `insufficient-manifest-attempts: ${metrics.manifestAttempts}/${thresholds.minManifestAttempts}`
    );
  }

  if (metrics.manifestHitRatio < thresholds.minManifestHitRatio) {
    reasons.push(
      `manifest-hit-ratio-below-threshold: ${metrics.manifestHitRatio.toFixed(3)} < ${thresholds.minManifestHitRatio.toFixed(3)}`
    );
  }

  if (metrics.invalidationRate > thresholds.maxInvalidationRate) {
    reasons.push(
      `invalidation-rate-above-threshold: ${metrics.invalidationRate.toFixed(3)} > ${thresholds.maxInvalidationRate.toFixed(3)}`
    );
  }

  const rollbackRecommended =
    metrics.manifestHitRatio < thresholds.rollbackHitRatioFloor ||
    metrics.invalidationRate > thresholds.rollbackInvalidationCeil;
  const pass = hasEnoughData && reasons.length === 0;
  const promotionEligible = pass && input.previousWindowPass === true;

  return {
    status: rollbackRecommended ? "rollback" : pass ? "pass" : "hold",
    pass,
    promotionEligible,
    rollbackRecommended,
    reasons,
    metrics,
    thresholds,
  };
}

export function evaluateHybridOperationalGate(input: {
  evidence: {
    userVisibleRegressionDelta: number;
    rollbackDrillDurationMs: number;
  };
  previousWindowPass?: boolean;
  thresholds?: Partial<HybridOperationalThresholds>;
}): HybridOperationalGateDecision {
  const thresholds: HybridOperationalThresholds = {
    ...DEFAULT_HYBRID_OPERATIONAL_THRESHOLDS,
    ...input.thresholds,
  };

  const reasons: string[] = [];
  const userVisibleRegressionDelta = Number.isFinite(input.evidence.userVisibleRegressionDelta)
    ? input.evidence.userVisibleRegressionDelta
    : Number.POSITIVE_INFINITY;
  const rollbackDrillDurationMs = Number.isFinite(input.evidence.rollbackDrillDurationMs)
    ? input.evidence.rollbackDrillDurationMs
    : Number.POSITIVE_INFINITY;

  if (userVisibleRegressionDelta > thresholds.maxUserVisibleRegressionDelta) {
    reasons.push(
      `user-visible-regression-detected: ${userVisibleRegressionDelta.toFixed(3)} > ${thresholds.maxUserVisibleRegressionDelta.toFixed(3)}`
    );
  }

  if (rollbackDrillDurationMs > thresholds.maxRollbackDrillDurationMs) {
    reasons.push(
      `rollback-drill-too-slow: ${rollbackDrillDurationMs}ms > ${thresholds.maxRollbackDrillDurationMs}ms`
    );
  }

  const rollbackRecommended =
    userVisibleRegressionDelta > 0 ||
    rollbackDrillDurationMs > thresholds.maxRollbackDrillDurationMs;
  const pass = reasons.length === 0;
  const promotionEligible = pass && input.previousWindowPass === true;

  return {
    status: rollbackRecommended ? "rollback" : pass ? "pass" : "hold",
    pass,
    promotionEligible,
    rollbackRecommended,
    reasons,
    thresholds,
    evidence: {
      userVisibleRegressionDelta,
      rollbackDrillDurationMs,
    },
  };
}

export function validatePrecomputed(
  candidate: Blueprint | null,
  _context: ResolverContext
): ValidationResult {
  if (!candidate) return { valid: false, reason: "missing-candidate" };
  return { valid: true };
}

export function resolveBlueprint(context: ResolverContext): ResolutionResult {
  const startTimeMs = Date.now();
  const nowMs = eventTimestamp(context.now);
  const policyMode = context.policyOverride?.mode ?? DEFAULT_RESOLUTION_POLICY.mode;
  const strict = context.policyOverride?.strict ?? DEFAULT_RESOLUTION_POLICY.strict;
  const shadowTelemetryOnly =
    policyMode === "hybrid" && context.policyOverride?.shadowTelemetryOnly === true;
  const manifestAgeMs = context.manifest
    ? Math.max(nowMs - context.manifest.build.builtAt, 0)
    : undefined;
  const manifestVersion = context.manifest?.manifestVersion;

  // 1. EXPLICIT: provided blueprint always wins
  if (context.externalBlueprint) {
    incrementCounter("explicitHits");
    return {
      blueprint: context.externalBlueprint,
      event: {
        source: "explicit",
        policyMode,
        usedFallback: false,
        reason: "external-blueprint",
        timestamp: nowMs,
        latencyMs: eventLatency(startTimeMs),
        componentKey: context.skeletonKey,
        manifestAgeMs,
        manifestVersion,
      },
    };
  }

  // 2. MANIFEST: check precomputed if policy allows and manifest is provided
  if (
    context.manifest &&
    context.skeletonKey &&
    (policyMode === "hybrid" ||
      policyMode === "precomputed-only" ||
      policyMode === "strict-precomputed")
  ) {
    const manifestResult = resolveManifestEntry(context.manifest, context.skeletonKey, {
      structuralHash: context.structuralHash,
      now: nowMs,
      strictStyleDrift: strict,
    });

    if (shadowTelemetryOnly) {
      if (manifestResult.accepted) {
        incrementCounter("shadowHits");
        incrementCounter("dynamicFallbacks");
        return {
          blueprint: null,
          event: {
            source: "dynamic",
            policyMode,
            usedFallback: false,
            reason: "shadow-hit",
            timestamp: nowMs,
            latencyMs: eventLatency(startTimeMs),
            componentKey: context.skeletonKey,
            manifestAgeMs,
            manifestVersion,
            candidateSource: "manifest",
            manifestValidation: {
              valid: true,
              entry: manifestResult.entry,
            },
          },
        };
      }

      const rejectionReason = manifestResult.reason ?? "unknown-rejection";
      const rejectionCategory = classifyManifestReason(rejectionReason);
      const isMiss = rejectionCategory === "miss";
      const invalidationReason = isMiss ? undefined : mapInvalidationReason(rejectionReason);

      if (isMiss) {
        incrementCounter("shadowMisses");
        incrementCounter("manifestMisses");
      } else {
        incrementCounter("shadowInvalids");
        incrementCounter("invalidations");
      }
      incrementCounter("dynamicFallbacks");

      return {
        blueprint: null,
        event: {
          source: "dynamic",
          policyMode,
          usedFallback: false,
          reason: isMiss ? "shadow-miss" : `shadow-invalid: ${rejectionReason}`,
          timestamp: nowMs,
          latencyMs: eventLatency(startTimeMs),
          componentKey: context.skeletonKey,
          manifestAgeMs,
          manifestVersion,
          candidateSource: isMiss ? "none" : "manifest",
          rejectionCategory,
          rejectionReason,
          invalidationReason,
          manifestValidation: isMiss
            ? undefined
            : {
              valid: false,
              reason: rejectionReason,
              invalidationReason,
            },
        },
      };
    }

    if (manifestResult.accepted && manifestResult.entry) {
      incrementCounter("manifestHits");
      const ttlMs = manifestResult.entry.ttlMs ?? context.manifest.defaults?.ttlMs;
      if (context.skeletonKey) {
        recordRuntimeBlueprint(context.skeletonKey, manifestResult.entry.blueprint, ttlMs, nowMs);
      }
      return {
        blueprint: manifestResult.entry.blueprint,
        event: {
          source: "manifest",
          policyMode,
          usedFallback: false,
          reason: "manifest-entry-valid",
          timestamp: nowMs,
          latencyMs: eventLatency(startTimeMs),
          componentKey: context.skeletonKey,
          manifestAgeMs,
          manifestVersion,
          manifestValidation: {
            valid: true,
            entry: manifestResult.entry,
          },
        },
      };
    }

    if (manifestResult.reason) {
      const isMiss = classifyManifestReason(manifestResult.reason) === "miss";
      if (isMiss) {
        incrementCounter("manifestMisses");
      } else {
        incrementCounter("invalidations");
      }
    }

    // In hybrid mode, prefer a recent session blueprint before dynamic measurement.
    if (policyMode === "hybrid" && context.skeletonKey) {
      const sessionBlueprint = getSessionBlueprint(context.skeletonKey, nowMs);
      if (sessionBlueprint) {
        incrementCounter("sessionHits");
        return {
          blueprint: sessionBlueprint,
          event: {
            source: "session",
            policyMode,
            usedFallback: true,
            reason: "session-cache-hit",
            timestamp: nowMs,
            latencyMs: eventLatency(startTimeMs),
            componentKey: context.skeletonKey,
            manifestAgeMs,
            manifestVersion,
            candidateSource: "manifest",
            rejectionCategory: "invalid",
            rejectionReason: manifestResult.reason,
            invalidationReason:
              manifestResult.reason && classifyManifestReason(manifestResult.reason) === "invalid"
                ? mapInvalidationReason(manifestResult.reason)
                : undefined,
          },
        };
      }
    }

    // In strict-precomputed and precomputed-only modes, don't fall back to dynamic
    if (policyMode === "strict-precomputed" || policyMode === "precomputed-only") {
      incrementCounter("placeholderFallbacks");
      return {
        blueprint: null,
        event: {
          source: "placeholder",
          policyMode,
          usedFallback: true,
          reason: `manifest-validation-failed: ${manifestResult.reason}`,
          timestamp: nowMs,
          latencyMs: eventLatency(startTimeMs),
          componentKey: context.skeletonKey,
          manifestAgeMs,
          manifestVersion,
          invalidationReason:
            manifestResult.reason && classifyManifestReason(manifestResult.reason) === "invalid"
              ? mapInvalidationReason(manifestResult.reason)
              : undefined,
        },
      };
    }
  }

  // 3. DYNAMIC: fall back to runtime measurement
  incrementCounter("dynamicFallbacks");
  return {
    blueprint: null,
    event: {
      source: "dynamic",
      policyMode,
      usedFallback: false,
      reason: "dynamic-default",
      timestamp: nowMs,
      latencyMs: eventLatency(startTimeMs),
      componentKey: context.skeletonKey,
      manifestAgeMs,
      manifestVersion,
    },
  };
}
