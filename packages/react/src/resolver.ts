import type { Blueprint } from "@skelcore/core";
import {
  DEFAULT_RESOLUTION_POLICY,
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
            candidateSource: "manifest",
            manifestValidation: {
              valid: true,
              entry: manifestResult.entry,
            },
          },
        };
      }

      const rejectionReason = manifestResult.reason ?? "unknown-rejection";
      const isMiss = /not found|no-skeleton-key|no-manifest/i.test(rejectionReason);

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
          candidateSource: isMiss ? "none" : "manifest",
          rejectionCategory: isMiss ? "miss" : "invalid",
          rejectionReason,
        },
      };
    }

    if (manifestResult.accepted && manifestResult.entry) {
      incrementCounter("manifestHits");
      const ttlMs = manifestResult.entry.ttlMs ?? context.manifest.defaults?.ttlMs;
      if (context.skeletonKey) {
        recordRuntimeBlueprint(
          context.skeletonKey,
          manifestResult.entry.blueprint,
          ttlMs,
          nowMs
        );
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
          manifestValidation: {
            valid: true,
            entry: manifestResult.entry,
          },
        },
      };
    }

    if (manifestResult.reason) {
      const isMiss = /not found|no-skeleton-key|no-manifest/i.test(manifestResult.reason);
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
            candidateSource: "manifest",
            rejectionCategory: "invalid",
            rejectionReason: manifestResult.reason,
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
    },
  };
}
