import { beforeEach, describe, expect, it } from "vitest";
import { globalRolloutCollector } from "@ghostframe/core";
import { evaluateRolloutControlPlane } from "../control-plane.js";

describe("evaluateRolloutControlPlane", () => {
  beforeEach(() => {
    globalRolloutCollector.clear();
  });

  it("returns rollback when canary fails error threshold and emits rollout-decision event", () => {
    const result = evaluateRolloutControlPlane({
      strategy: "canary",
      environment: "staging",
      routeKey: "ProductCard",
      requestId: "req-1",
      policyVersion: 1,
      policy: {
        sampledRequests: 100,
        errorRateThreshold: 0.05,
        p99LatencyThresholdMs: 500,
        canaryDurationMs: 60_000,
        minimumSampleSize: 50,
      },
      observations: {
        sampledRequests: 100,
        errorRate: 0.1,
        p99LatencyMs: 200,
        observationWindowMs: 60_000,
      },
      safetyGate: {
        maxRollbacksInWindow: 2,
        windowDurationMs: 300_000,
        errorRateThreshold: 0.2,
        p99LatencyThresholdMs: 1000,
      },
    });

    expect(result.decision).toBe("rollback");
    expect(result.reason).toContain("error-rate");

    const decisions = globalRolloutCollector
      .getAllEvents()
      .filter((event) => event.type === "rollout-decision");
    expect(decisions).toHaveLength(1);
    expect(decisions[0]?.decision).toBe("rollback");
  });

  it("returns hold when feature flag segment is disabled and emits strategy-selected", () => {
    const result = evaluateRolloutControlPlane({
      strategy: "feature-flag",
      environment: "dev",
      routeKey: "HeroBanner",
      requestId: "req-2",
      policyVersion: 2,
      policy: {
        flagName: "new-hero",
        enabledByDefault: false,
        rolloutPercentage: 0,
        overrides: {},
      },
      safetyGate: {
        maxRollbacksInWindow: 2,
        windowDurationMs: 300_000,
        errorRateThreshold: 0.2,
        p99LatencyThresholdMs: 1000,
      },
    });

    expect(result.decision).toBe("hold");

    const selected = globalRolloutCollector
      .getAllEvents()
      .filter((event) => event.type === "strategy-selected");
    expect(selected).toHaveLength(1);
    expect(selected[0]?.routeKey).toBe("HeroBanner");
  });
});
