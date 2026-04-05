import { describe, expect, it } from "vitest";
import { evaluateCanary } from "../canary-strategy";
import type { CanaryPolicy } from "../types";

describe("canary strategy", () => {
  const basePolicy: CanaryPolicy = {
    sampledRequests: 100,
    errorRateThreshold: 0.05,
    p99LatencyThresholdMs: 500,
    canaryDurationMs: 60000,
    minimumSampleSize: 50,
  };

  it("proceeds when observed error rate is below threshold", () => {
    const evaluation = evaluateCanary(basePolicy, {
      sampledRequests: 100,
      errorRate: 0.02,
      p99LatencyMs: 250,
      observationWindowMs: 60000,
    });
    expect(evaluation.passed).toBe(true);
    expect(evaluation.decision).toBe("proceed");
    expect(evaluation.proof.reason).toBe("all-thresholds-met");
  });

  it("rolls back when observed error rate exceeds threshold", () => {
    const evaluation = evaluateCanary(basePolicy, {
      sampledRequests: 100,
      errorRate: 0.08,
      p99LatencyMs: 250,
      observationWindowMs: 60000,
    });
    expect(evaluation.passed).toBe(false);
    expect(evaluation.decision).toBe("rollback");
    expect(evaluation.proof.reason).toBe("error-rate-exceeded");
  });

  it("holds when sample size is below minimum", () => {
    const evaluation = evaluateCanary(basePolicy, {
      sampledRequests: 30,
      errorRate: 0.02,
      p99LatencyMs: 250,
      observationWindowMs: 30000,
    });
    expect(evaluation.passed).toBe(false);
    expect(evaluation.decision).toBe("hold");
    expect(evaluation.proof.reason).toBe("insufficient-sample-size");
  });

  it("rolls back when p99 latency exceeds threshold", () => {
    const evaluation = evaluateCanary(basePolicy, {
      sampledRequests: 100,
      errorRate: 0.01,
      p99LatencyMs: 800,
      observationWindowMs: 60000,
    });
    expect(evaluation.passed).toBe(false);
    expect(evaluation.decision).toBe("rollback");
    expect(evaluation.proof.reason).toBe("p99-latency-exceeded");
  });

  it("proof includes observed vs threshold values", () => {
    const evaluation = evaluateCanary(basePolicy, {
      sampledRequests: 100,
      errorRate: 0.02,
      p99LatencyMs: 350,
      observationWindowMs: 60000,
    });
    expect(evaluation.proof.thresholdErrorRate).toBe(0.05);
    expect(evaluation.proof.observedErrorRate).toBe(0.02);
    expect(evaluation.proof.thresholdLatencyMs).toBe(500);
    expect(evaluation.proof.observedP99LatencyMs).toBe(350);
  });
});
