import { beforeEach, describe, it, expect } from "vitest";
import {
  DEFAULT_RESOLUTION_POLICY,
  type ResolutionEvent,
  type ResolutionSource,
} from "../resolution-types.js";
import {
  computeResolverConfidenceMetrics,
  derivePolicyForPath,
  diffResolverTelemetryCounters,
  evaluateHybridConfidenceGate,
  evaluateHybridOperationalGate,
  getResolverTelemetryCounters,
  recordRuntimeBlueprint,
  resetResolverSessionCache,
  resetResolverTelemetryCounters,
  resolveBlueprint,
  validatePrecomputed,
} from "../resolver.js";
import { asStructuralHash, type BlueprintManifest } from "@ghostframes/core";

beforeEach(() => {
  resetResolverTelemetryCounters();
  resetResolverSessionCache();
});

describe("resolution-types", () => {
  it("exposes runtime-only default policy", () => {
    expect(DEFAULT_RESOLUTION_POLICY.mode).toBe("runtime-only");
  });

  it("allows all declared source tags", () => {
    const source: ResolutionSource = "dynamic";
    const event: ResolutionEvent = {
      source,
      policyMode: "runtime-only",
      usedFallback: false,
      reason: "dynamic-default",
      timestamp: Date.now(),
      latencyMs: 0,
    };
    expect(event.source).toBe("dynamic");
  });
});

describe("resolver", () => {
  it("prefers explicit blueprint over runtime path", () => {
    const blueprint = {
      version: 1,
      rootWidth: 10,
      rootHeight: 10,
      nodes: [],
      generatedAt: Date.now(),
      source: "static" as const,
    };

    const result = resolveBlueprint({ externalBlueprint: blueprint });
    expect(result.blueprint).toBe(blueprint);
    expect(result.event.source).toBe("explicit");
  });

  it("returns dynamic resolver intent by default", () => {
    const result = resolveBlueprint({});
    expect(result.blueprint).toBeNull();
    expect(result.event.source).toBe("dynamic");
    expect(result.event.policyMode).toBe("runtime-only");
    expect(result.event.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("accepts candidate validation as no-op in phase 1", () => {
    expect(validatePrecomputed(null, {}).valid).toBe(false);
  });

  it("uses strict-precomputed only on explicit strict pilot routes", () => {
    const policy = derivePolicyForPath({
      pathname: "/reference/ssr",
      strictEnabled: true,
      strictPaths: ["/reference"],
      serveEnabled: true,
      servePaths: ["/test"],
    });

    expect(policy.mode).toBe("strict-precomputed");
    expect(policy.strict).toBe(true);
  });

  it("falls back to hybrid serving route when strict route does not match", () => {
    const policy = derivePolicyForPath({
      pathname: "/test/path",
      strictEnabled: true,
      strictPaths: ["/reference"],
      serveEnabled: true,
      servePaths: ["/test"],
    });

    expect(policy.mode).toBe("hybrid");
    expect(policy.strict).toBe(false);
  });

  it("allows disabling hybrid mode for route prefixes", () => {
    const policy = derivePolicyForPath({
      pathname: "/test/path",
      strictEnabled: false,
      strictPaths: [],
      serveEnabled: true,
      servePaths: ["/test"],
      serveBlockPaths: ["/test"],
    });

    expect(policy.mode).toBe("runtime-only");
    expect(policy.strict).toBe(false);
  });
});

describe("resolver confidence metrics", () => {
  it("computes manifest and fallback ratios from counters", () => {
    const metrics = computeResolverConfidenceMetrics({
      explicitHits: 0,
      manifestHits: 8,
      manifestMisses: 1,
      sessionHits: 2,
      dynamicFallbacks: 1,
      placeholderFallbacks: 0,
      invalidations: 1,
      shadowHits: 0,
      shadowMisses: 0,
      shadowInvalids: 0,
    });

    expect(metrics.manifestAttempts).toBe(10);
    expect(metrics.servedCount).toBe(11);
    expect(metrics.manifestHitRatio).toBeCloseTo(0.8);
    expect(metrics.invalidationRate).toBeCloseTo(0.1);
    expect(metrics.fallbackRatio).toBeCloseTo(3 / 11);
  });

  it("diffs cumulative counters into route windows", () => {
    const delta = diffResolverTelemetryCounters(
      {
        explicitHits: 2,
        manifestHits: 15,
        manifestMisses: 3,
        sessionHits: 3,
        dynamicFallbacks: 4,
        placeholderFallbacks: 1,
        invalidations: 2,
        shadowHits: 0,
        shadowMisses: 0,
        shadowInvalids: 0,
      },
      {
        explicitHits: 1,
        manifestHits: 10,
        manifestMisses: 1,
        sessionHits: 1,
        dynamicFallbacks: 2,
        placeholderFallbacks: 1,
        invalidations: 1,
        shadowHits: 0,
        shadowMisses: 0,
        shadowInvalids: 0,
      }
    );

    expect(delta.explicitHits).toBe(1);
    expect(delta.manifestHits).toBe(5);
    expect(delta.manifestMisses).toBe(2);
    expect(delta.invalidations).toBe(1);
    expect(delta.dynamicFallbacks).toBe(2);
    expect(delta.placeholderFallbacks).toBe(0);
  });

  it("marks confidence gate pass and promotion eligibility on second passing window", () => {
    const firstWindow = evaluateHybridConfidenceGate({
      counters: {
        explicitHits: 0,
        manifestHits: 9,
        manifestMisses: 1,
        sessionHits: 0,
        dynamicFallbacks: 1,
        placeholderFallbacks: 0,
        invalidations: 0,
        shadowHits: 0,
        shadowMisses: 0,
        shadowInvalids: 0,
      },
    });

    const secondWindow = evaluateHybridConfidenceGate({
      counters: {
        explicitHits: 0,
        manifestHits: 9,
        manifestMisses: 1,
        sessionHits: 0,
        dynamicFallbacks: 1,
        placeholderFallbacks: 0,
        invalidations: 0,
        shadowHits: 0,
        shadowMisses: 0,
        shadowInvalids: 0,
      },
      previousWindowPass: firstWindow.pass,
    });

    expect(firstWindow.pass).toBe(true);
    expect(firstWindow.promotionEligible).toBe(false);
    expect(secondWindow.pass).toBe(true);
    expect(secondWindow.promotionEligible).toBe(true);
    expect(secondWindow.status).toBe("pass");
  });

  it("marks rollback when hit ratio and invalidation thresholds breach rollback floor", () => {
    const decision = evaluateHybridConfidenceGate({
      counters: {
        explicitHits: 0,
        manifestHits: 4,
        manifestMisses: 2,
        sessionHits: 0,
        dynamicFallbacks: 2,
        placeholderFallbacks: 0,
        invalidations: 3,
        shadowHits: 0,
        shadowMisses: 0,
        shadowInvalids: 0,
      },
    });

    expect(decision.pass).toBe(false);
    expect(decision.rollbackRecommended).toBe(true);
    expect(decision.status).toBe("rollback");
    expect(decision.reasons.length).toBeGreaterThan(0);
  });

  it("GATE: B5_CONFIDENCE_GATE - promotion eligible after two passing windows", () => {
    const firstWindow = evaluateHybridConfidenceGate({
      counters: {
        explicitHits: 0,
        manifestHits: 9,
        manifestMisses: 1,
        sessionHits: 0,
        dynamicFallbacks: 1,
        placeholderFallbacks: 0,
        invalidations: 0,
        shadowHits: 0,
        shadowMisses: 0,
        shadowInvalids: 0,
      },
    });

    const secondWindow = evaluateHybridConfidenceGate({
      counters: {
        explicitHits: 0,
        manifestHits: 9,
        manifestMisses: 1,
        sessionHits: 0,
        dynamicFallbacks: 1,
        placeholderFallbacks: 0,
        invalidations: 0,
        shadowHits: 0,
        shadowMisses: 0,
        shadowInvalids: 0,
      },
      previousWindowPass: firstWindow.pass,
    });

    expect(firstWindow.pass).toBe(true);
    expect(secondWindow.pass).toBe(true);
    expect(secondWindow.promotionEligible).toBe(true);
  });
});

describe("resolver operational acceptance", () => {
  it("passes when there is no user-visible regression and rollback drill meets 10-minute SLO", () => {
    const firstWindow = evaluateHybridOperationalGate({
      evidence: {
        userVisibleRegressionDelta: 0,
        rollbackDrillDurationMs: 540000,
      },
    });

    const secondWindow = evaluateHybridOperationalGate({
      evidence: {
        userVisibleRegressionDelta: 0,
        rollbackDrillDurationMs: 480000,
      },
      previousWindowPass: firstWindow.pass,
    });

    expect(firstWindow.pass).toBe(true);
    expect(secondWindow.pass).toBe(true);
    expect(secondWindow.promotionEligible).toBe(true);
  });

  it("recommends rollback when user-visible regression is detected", () => {
    const decision = evaluateHybridOperationalGate({
      evidence: {
        userVisibleRegressionDelta: 0.02,
        rollbackDrillDurationMs: 420000,
      },
    });

    expect(decision.pass).toBe(false);
    expect(decision.rollbackRecommended).toBe(true);
    expect(decision.status).toBe("rollback");
  });

  it("GATE: B5_CONFIDENCE_GATE - operational acceptance requires no regression and rollback drill <= 10m", () => {
    const firstWindow = evaluateHybridOperationalGate({
      evidence: {
        userVisibleRegressionDelta: 0,
        rollbackDrillDurationMs: 590000,
      },
    });

    const secondWindow = evaluateHybridOperationalGate({
      evidence: {
        userVisibleRegressionDelta: 0,
        rollbackDrillDurationMs: 600000,
      },
      previousWindowPass: firstWindow.pass,
    });

    expect(firstWindow.pass).toBe(true);
    expect(secondWindow.pass).toBe(true);
    expect(secondWindow.promotionEligible).toBe(true);
    expect(secondWindow.rollbackRecommended).toBe(false);
  });
});

describe("resolver with manifest support", () => {
  const mockManifest: BlueprintManifest = {
    manifestVersion: 1,
    packageVersion: "0.1.0",
    build: { builtAt: Date.now(), appVersion: "1.0.0" },
    defaults: { ttlMs: 86400000 },
    entries: {
      MyComponent: {
        key: "MyComponent",
        blueprint: {
          version: 1,
          rootWidth: 200,
          rootHeight: 100,
          nodes: [],
          generatedAt: Date.now(),
          source: "dynamic",
        },
        structuralHash: asStructuralHash("current_hash"),
        generatedAt: Date.now(),
        ttlMs: 86400000,
        quality: { confidence: 0.95, warnings: [] },
      },
    },
  };

  const mockDynamicBlueprint = {
    version: 1,
    rootWidth: 200,
    rootHeight: 100,
    nodes: [],
    generatedAt: Date.now(),
    source: "dynamic" as const,
  };

  it("prefers explicit blueprint over manifest", () => {
    const explicit = { ...mockDynamicBlueprint, source: "static" as const };
    const result = resolveBlueprint({
      externalBlueprint: explicit,
      manifest: mockManifest,
      skeletonKey: "MyComponent",
      policyOverride: { mode: "hybrid", strict: false },
    });
    expect(result.event.source).toBe("explicit");
    expect(result.blueprint).toEqual(explicit);
  });

  it("checks manifest when no explicit blueprint provided", () => {
    const result = resolveBlueprint({
      manifest: mockManifest,
      skeletonKey: "MyComponent",
      policyOverride: { mode: "hybrid", strict: false },
      structuralHash: "current_hash",
    });
    expect(result.event.source).toBe("manifest");
    expect(result.blueprint?.rootWidth).toBe(200);
    expect(result.event.componentKey).toBe("MyComponent");
    expect(result.event.manifestVersion).toBe(mockManifest.manifestVersion);
    expect(result.event.manifestAgeMs).toBeGreaterThanOrEqual(0);
  });

  it("falls back to dynamic when manifest lookup fails", () => {
    const result = resolveBlueprint({
      manifest: mockManifest,
      skeletonKey: "UnknownComponent",
      policyOverride: { mode: "hybrid", strict: false },
    });
    expect(result.event.source).toBe("dynamic");
    expect(result.blueprint).toBeNull();
    expect(result.event.componentKey).toBe("UnknownComponent");
    expect(result.event.manifestVersion).toBe(mockManifest.manifestVersion);
  });

  it("skips manifest in runtime-only mode", () => {
    const result = resolveBlueprint({
      manifest: mockManifest,
      skeletonKey: "MyComponent",
      policyOverride: { mode: "runtime-only", strict: false },
    });
    expect(result.event.source).toBe("dynamic");
  });

  it("enforces strict manifest in precomputed-only mode", () => {
    const result = resolveBlueprint({
      manifest: mockManifest,
      skeletonKey: "MyComponent",
      policyOverride: { mode: "precomputed-only", strict: false },
      structuralHash: "current_hash",
    });
    expect(result.event.source).toBe("manifest");
  });

  it("returns placeholder when precomputed-only and manifest fails", () => {
    const result = resolveBlueprint({
      manifest: mockManifest,
      skeletonKey: "UnknownComponent",
      policyOverride: { mode: "precomputed-only", strict: false },
    });
    expect(result.event.source).toBe("placeholder");
    expect(result.blueprint).toBeNull();
  });

  it("reports shadow-hit but serves dynamic output in hybrid shadow mode", () => {
    const result = resolveBlueprint({
      manifest: mockManifest,
      skeletonKey: "MyComponent",
      policyOverride: { mode: "hybrid", strict: false, shadowTelemetryOnly: true },
      structuralHash: "current_hash",
    });

    expect(result.blueprint).toBeNull();
    expect(result.event.source).toBe("dynamic");
    expect(result.event.reason).toBe("shadow-hit");
    expect(result.event.candidateSource).toBe("manifest");
    expect(result.event.rejectionCategory).toBeUndefined();
    expect(result.event.rejectionReason).toBeUndefined();
  });

  it("reports shadow-miss when manifest key is missing", () => {
    const result = resolveBlueprint({
      manifest: mockManifest,
      skeletonKey: "UnknownComponent",
      policyOverride: { mode: "hybrid", strict: false, shadowTelemetryOnly: true },
    });

    expect(result.blueprint).toBeNull();
    expect(result.event.source).toBe("dynamic");
    expect(result.event.reason).toBe("shadow-miss");
    expect(result.event.candidateSource).toBe("none");
    expect(result.event.rejectionCategory).toBe("miss");
    expect(result.event.rejectionReason).toContain("not found in manifest");
    expect(result.event.invalidationReason).toBeUndefined();
  });

  it("classifies miss reasons without regex fallback", () => {
    const manifestWithIndex: BlueprintManifest = {
      ...mockManifest,
      index: { byKey: { MyComponent: ["default"] } },
    };

    const result = resolveBlueprint({
      manifest: manifestWithIndex,
      skeletonKey: "MissingKey",
      policyOverride: { mode: "hybrid", strict: false, shadowTelemetryOnly: true },
    });

    expect(result.event.reason).toBe("shadow-miss");
    expect(result.event.rejectionCategory).toBe("miss");
    expect(result.event.rejectionReason).toBe("manifest-index-miss");
  });

  it("reports shadow-invalid when manifest entry is stale", () => {
    const staleManifest: BlueprintManifest = {
      ...mockManifest,
      entries: {
        ...mockManifest.entries,
        MyComponent: {
          ...mockManifest.entries.MyComponent,
          generatedAt: 1,
          ttlMs: 1,
        },
      },
    };

    const result = resolveBlueprint({
      manifest: staleManifest,
      skeletonKey: "MyComponent",
      policyOverride: { mode: "hybrid", strict: false, shadowTelemetryOnly: true },
      now: Date.now(),
      structuralHash: "current_hash",
    });

    expect(result.blueprint).toBeNull();
    expect(result.event.source).toBe("dynamic");
    expect(result.event.reason.startsWith("shadow-invalid:")).toBe(true);
    expect(result.event.candidateSource).toBe("manifest");
    expect(result.event.rejectionCategory).toBe("invalid");
    expect(result.event.rejectionReason).toContain("stale");
    expect(result.event.invalidationReason).toBe("ttl-expired");
  });

  it("uses session fallback in hybrid mode when manifest entry is invalid", () => {
    const staleManifest: BlueprintManifest = {
      ...mockManifest,
      entries: {
        ...mockManifest.entries,
        MyComponent: {
          ...mockManifest.entries.MyComponent,
          generatedAt: 1,
          ttlMs: 1,
        },
      },
    };

    recordRuntimeBlueprint("MyComponent", mockDynamicBlueprint, 60_000, Date.now());

    const result = resolveBlueprint({
      manifest: staleManifest,
      skeletonKey: "MyComponent",
      policyOverride: { mode: "hybrid", strict: false },
      now: Date.now(),
      structuralHash: "current_hash",
    });

    expect(result.event.source).toBe("session");
    expect(result.event.reason).toBe("session-cache-hit");
    expect(result.event.usedFallback).toBe(true);
    expect(result.blueprint).toEqual(mockDynamicBlueprint);
    expect(result.event.invalidationReason).toBe("ttl-expired");
  });

  it("tracks phase 5 telemetry counters for invalidation and session fallback", () => {
    const staleManifest: BlueprintManifest = {
      ...mockManifest,
      entries: {
        ...mockManifest.entries,
        MyComponent: {
          ...mockManifest.entries.MyComponent,
          generatedAt: 1,
          ttlMs: 1,
        },
      },
    };

    recordRuntimeBlueprint("MyComponent", mockDynamicBlueprint, 60_000, Date.now());

    resolveBlueprint({
      manifest: staleManifest,
      skeletonKey: "MyComponent",
      policyOverride: { mode: "hybrid", strict: false },
      now: Date.now(),
      structuralHash: "current_hash",
    });

    const counters = getResolverTelemetryCounters();
    expect(counters.invalidations).toBe(1);
    expect(counters.sessionHits).toBe(1);
    expect(counters.dynamicFallbacks).toBe(0);
    expect(counters.placeholderFallbacks).toBe(0);
  });
});
