import type { StagedPolicy } from "./types.js";

export interface StagedEvaluation {
  currentStageIndex: number;
  currentPercentage: number;
  nextStageInMs: number;
  canAdvance: boolean;
  decision: "proceed" | "rollback" | "hold";
  proof: {
    reason: string;
    passed: boolean;
  };
}

export function evaluateStaged(
  policy: StagedPolicy,
  elapsedMs: number,
  observations?: { errorRate: number; p99LatencyMs: number }
): StagedEvaluation {
  let cumulativeTimeMs = 0;
  let currentStageIndex = 0;

  // Determine current stage based on elapsed time
  for (let i = 0; i < policy.stages.length; i++) {
    const stage = policy.stages[i];
    if (stage.durationMs === 0) {
      // Final stage with no duration limit
      currentStageIndex = i;
      break;
    }
    if (elapsedMs < cumulativeTimeMs + stage.durationMs) {
      currentStageIndex = i;
      break;
    }
    cumulativeTimeMs += stage.durationMs;
  }

  const currentStage = policy.stages[currentStageIndex];
  const nextStageIndex = currentStageIndex + 1;
  let nextStageInMs = 0;

  if (nextStageIndex < policy.stages.length) {
    const timeUntilNextStage = cumulativeTimeMs + currentStage.durationMs - elapsedMs;
    nextStageInMs = Math.max(0, timeUntilNextStage);
  }

  // If no observations, just proceed with stage advancement
  if (!observations) {
    return {
      currentStageIndex,
      currentPercentage: currentStage.percentageOfTraffic,
      nextStageInMs,
      canAdvance: nextStageIndex < policy.stages.length,
      decision: "proceed",
      proof: {
        reason: "stage-active-no-observations",
        passed: true,
      },
    };
  }

  // Check health thresholds
  if (observations.errorRate > policy.errorRateThreshold) {
    return {
      currentStageIndex,
      currentPercentage: currentStage.percentageOfTraffic,
      nextStageInMs,
      canAdvance: false,
      decision: "rollback",
      proof: {
        reason: "error-rate-exceeded",
        passed: false,
      },
    };
  }

  if (observations.p99LatencyMs > policy.p99LatencyThresholdMs) {
    return {
      currentStageIndex,
      currentPercentage: currentStage.percentageOfTraffic,
      nextStageInMs,
      canAdvance: false,
      decision: "rollback",
      proof: {
        reason: "p99-latency-exceeded",
        passed: false,
      },
    };
  }

  return {
    currentStageIndex,
    currentPercentage: currentStage.percentageOfTraffic,
    nextStageInMs,
    canAdvance: nextStageIndex < policy.stages.length,
    decision: "proceed",
    proof: {
      reason: "all-thresholds-met",
      passed: true,
    },
  };
}
