import type { RolloutEvaluation, CanaryPolicy } from "./types.js";

export interface CanaryObservations {
  sampledRequests: number;
  errorRate: number;
  p99LatencyMs: number;
  observationWindowMs: number;
}

export function evaluateCanary(
  policy: CanaryPolicy,
  observations: CanaryObservations
): RolloutEvaluation {
  // Check minimum sample size
  if (observations.sampledRequests < policy.minimumSampleSize) {
    return {
      passed: false,
      decision: "hold",
      proof: {
        reason: "insufficient-sample-size",
        passed: false,
      },
    };
  }

  // Check error rate
  if (observations.errorRate > policy.errorRateThreshold) {
    return {
      passed: false,
      decision: "rollback",
      proof: {
        reason: "error-rate-exceeded",
        passed: false,
        thresholdErrorRate: policy.errorRateThreshold,
        observedErrorRate: observations.errorRate,
      },
    };
  }

  // Check p99 latency
  if (observations.p99LatencyMs > policy.p99LatencyThresholdMs) {
    return {
      passed: false,
      decision: "rollback",
      proof: {
        reason: "p99-latency-exceeded",
        passed: false,
        thresholdLatencyMs: policy.p99LatencyThresholdMs,
        observedP99LatencyMs: observations.p99LatencyMs,
      },
    };
  }

  // All thresholds met
  return {
    passed: true,
    decision: "proceed",
    proof: {
      reason: "all-thresholds-met",
      passed: true,
      thresholdErrorRate: policy.errorRateThreshold,
      observedErrorRate: observations.errorRate,
      thresholdLatencyMs: policy.p99LatencyThresholdMs,
      observedP99LatencyMs: observations.p99LatencyMs,
    },
  };
}
