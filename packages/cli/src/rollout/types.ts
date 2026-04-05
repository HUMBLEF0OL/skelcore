import type { RolloutDecision, DecisionProof } from "@ghostframe/core";

export interface CanaryPolicy {
  sampledRequests: number;
  errorRateThreshold: number; // e.g., 0.05 = 5%
  p99LatencyThresholdMs: number; // e.g., 500ms
  canaryDurationMs: number; // how long to run canary before decision
  minimumSampleSize: number; // minimum observations before deciding
}

export interface StagedPolicy {
  stages: Array<{
    percentageOfTraffic: number; // 5, 25, 50, 100
    durationMs: number;
  }>;
  errorRateThreshold: number;
  p99LatencyThresholdMs: number;
  rollbackOnAnyStageFailure: boolean;
}

export interface FeatureFlagPolicy {
  flagName: string;
  enabledByDefault: boolean;
  rolloutPercentage: number; // 0-100, segments traffic deterministically
  overrides: Record<string, boolean>; // route or environment overrides
}

export interface RolloutEvaluation {
  passed: boolean;
  decision: RolloutDecision;
  proof: DecisionProof;
}
