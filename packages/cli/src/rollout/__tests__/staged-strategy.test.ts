import { describe, expect, it } from "vitest";
import { evaluateStaged } from "../staged-strategy";
import type { StagedPolicy } from "../types";

describe("staged rollout strategy", () => {
  const basePolicy: StagedPolicy = {
    stages: [
      { percentageOfTraffic: 5, durationMs: 3600000 }, // 5% for 1h
      { percentageOfTraffic: 25, durationMs: 3600000 }, // 25% for 1h
      { percentageOfTraffic: 50, durationMs: 7200000 }, // 50% for 2h
      { percentageOfTraffic: 100, durationMs: 0 }, // Full rollout (no time limit)
    ],
    errorRateThreshold: 0.05,
    p99LatencyThresholdMs: 500,
    rollbackOnAnyStageFailure: true,
  };

  it("returns stage 1 (5%) when starting", () => {
    const result = evaluateStaged(basePolicy, 0);
    expect(result.currentStageIndex).toBe(0);
    expect(result.currentPercentage).toBe(5);
    expect(result.nextStageInMs).toBeLessThanOrEqual(3600000);
  });

  it("advances to stage 2 (25%) after first stage duration", () => {
    const result = evaluateStaged(basePolicy, 3600001);
    expect(result.currentStageIndex).toBe(1);
    expect(result.currentPercentage).toBe(25);
  });

  it("proceeds with rollout when all stages healthy", () => {
    const observations = {
      errorRate: 0.02,
      p99LatencyMs: 300,
    };
    const evaluation = evaluateStaged(basePolicy, 1800000, observations);
    expect(evaluation.canAdvance).toBe(true);
    expect(evaluation.decision).toBe("proceed");
  });

  it("rolls back if any stage exceeds error threshold", () => {
    const observations = {
      errorRate: 0.08,
      p99LatencyMs: 300,
    };
    const evaluation = evaluateStaged(basePolicy, 1800000, observations);
    expect(evaluation.canAdvance).toBe(false);
    expect(evaluation.decision).toBe("rollback");
    expect(evaluation.proof.reason).toBe("error-rate-exceeded");
  });

  it("handles final stage with no duration limit", () => {
    const result = evaluateStaged(basePolicy, 14400001); // After all stages finish
    expect(result.currentStageIndex).toBe(3);
    expect(result.currentPercentage).toBe(100);
    expect(result.nextStageInMs).toBe(0); // No next stage
  });
});
