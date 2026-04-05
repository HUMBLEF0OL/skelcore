import { describe, expect, it } from "vitest";
import { resolveRolloutPolicy } from "../policy-resolver.js";

describe("resolveRolloutPolicy", () => {
  it("returns canary policy for canary strategy", () => {
    const input = {
      sampledRequests: 100,
      errorRateThreshold: 0.05,
      p99LatencyThresholdMs: 500,
      canaryDurationMs: 60_000,
      minimumSampleSize: 50,
    };

    const resolved = resolveRolloutPolicy("canary", input);

    expect(resolved).toEqual(input);
  });

  it("throws for invalid staged policy", () => {
    expect(() =>
      resolveRolloutPolicy("staged", {
        errorRateThreshold: 0.05,
        p99LatencyThresholdMs: 500,
        rollbackOnAnyStageFailure: true,
      })
    ).toThrow(/stages/i);
  });

  it("returns feature flag policy for feature-flag strategy", () => {
    const input = {
      flagName: "new-hero",
      enabledByDefault: false,
      rolloutPercentage: 15,
      overrides: {
        HeroBanner: true,
      },
    };

    const resolved = resolveRolloutPolicy("feature-flag", input);

    expect(resolved).toEqual(input);
  });
});
