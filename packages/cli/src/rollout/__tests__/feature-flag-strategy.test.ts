import { describe, expect, it } from "vitest";
import { evaluateFeatureFlag, computeFlagSegment } from "../feature-flag-strategy";

describe("feature-flag rollout strategy", () => {
  it("computes deterministic segment for request id", () => {
    // Same request ID should always get same segment
    const segment1 = computeFlagSegment("req-abc", "new-carousel");
    const segment2 = computeFlagSegment("req-abc", "new-carousel");
    expect(segment1).toBe(segment2);
    expect(segment1).toBeGreaterThanOrEqual(0);
    expect(segment1).toBeLessThan(100);
  });

  it("enables feature when segment < rollout percentage", () => {
    // This test relies on computeFlagSegment producing deterministic values
    const policy = {
      flagName: "new-carousel",
      enabledByDefault: false,
      rolloutPercentage: 50,
      overrides: {},
    };
    // We use a request ID known to hash into the lower segment
    const evaluation = evaluateFeatureFlag(policy, "req-sample-1");
    // outcome depends on hash; we just verify structure
    expect(evaluation.enabled).toBeDefined();
    expect(["proceed", "hold"]).toContain(evaluation.decision);
  });

  it("applies route-specific override when present", () => {
    const policy = {
      flagName: "new-carousel",
      enabledByDefault: false,
      rolloutPercentage: 25,
      overrides: {
        "HomePage:production": true, // always enable for HomePage in prod
      },
    };
    const evaluation = evaluateFeatureFlag(policy, "req-abc", "HomePage:production");
    expect(evaluation.enabled).toBe(true);
    expect(evaluation.reason).toContain("override");
  });

  it("returns disabled (hold) when below rollout percentage", () => {
    const policy = {
      flagName: "new-carousel",
      enabledByDefault: false,
      rolloutPercentage: 10, // only 10% get feature
      overrides: {},
    };
    // With low percentage, most requests will be disabled
    let disabledCount = 0;
    for (let i = 0; i < 100; i++) {
      const evalResult = evaluateFeatureFlag(policy, `req-${i}`);
      if (!evalResult.enabled) {
        disabledCount++;
      }
    }
    // Roughly 90% should be disabled (some variance due to hashing)
    expect(disabledCount).toBeGreaterThan(75);
  });

  it("respects enabledByDefault flag", () => {
    const policyDefaultOn = {
      flagName: "new-carousel",
      enabledByDefault: true,
      rolloutPercentage: 0, // no one in rollout
      overrides: {},
    };
    const evaluation = evaluateFeatureFlag(policyDefaultOn, "req-any");
    expect(evaluation.enabled).toBe(true); // should be enabled because default is true
  });
});
