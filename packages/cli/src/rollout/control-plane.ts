import { globalRolloutCollector } from "@ghostframe/core";
import type { RolloutDecision, RolloutEnvironment } from "@ghostframe/core";
import { evaluateCanary, type CanaryObservations } from "./canary-strategy.js";
import { RolloutDecisionGate, type SafetyGateConfig } from "./decision-gate.js";
import { evaluateFeatureFlag } from "./feature-flag-strategy.js";
import { resolveRolloutPolicy, type RolloutStrategy } from "./policy-resolver.js";
import { evaluateStaged } from "./staged-strategy.js";
import type { CanaryPolicy, FeatureFlagPolicy, StagedPolicy } from "./types.js";

interface RolloutControlPlaneBaseInput {
  strategy: RolloutStrategy;
  environment: RolloutEnvironment;
  routeKey: string;
  requestId: string;
  policyVersion: number;
  safetyGate: SafetyGateConfig;
}

interface CanaryControlPlaneInput extends RolloutControlPlaneBaseInput {
  strategy: "canary";
  policy: CanaryPolicy;
  observations: CanaryObservations;
}

interface FeatureFlagControlPlaneInput extends RolloutControlPlaneBaseInput {
  strategy: "feature-flag";
  policy: FeatureFlagPolicy;
}

interface StagedControlPlaneInput extends RolloutControlPlaneBaseInput {
  strategy: "staged";
  policy: StagedPolicy;
  elapsedMs?: number;
  observations?: {
    errorRate: number;
    p99LatencyMs: number;
  };
}

export type RolloutControlPlaneInput =
  | CanaryControlPlaneInput
  | FeatureFlagControlPlaneInput
  | StagedControlPlaneInput;

export interface RolloutControlPlaneResult {
  decision: RolloutDecision;
  reason: string;
}

interface StrategyEvaluationResult {
  decision: RolloutDecision;
  reason: string;
  passed: boolean;
}

export function evaluateRolloutControlPlane(
  input: RolloutControlPlaneInput
): RolloutControlPlaneResult {
  globalRolloutCollector.emit({
    type: "strategy-selected",
    timestamp: Date.now(),
    environment: input.environment,
    routeKey: input.routeKey,
    requestId: input.requestId,
    policyVersion: input.policyVersion,
    payload: {
      strategy: input.strategy,
    },
  });

  const strategyResult = evaluateStrategy(input);
  const gate = new RolloutDecisionGate(input.safetyGate);
  const gateDecision = gate.checkSafetyGates({
    environment: input.environment,
    routeKey: input.routeKey,
    errorRate:
      input.strategy === "canary"
        ? input.observations.errorRate
        : input.strategy === "staged"
          ? (input.observations?.errorRate ?? 0)
          : 0,
    p99LatencyMs:
      input.strategy === "canary"
        ? input.observations.p99LatencyMs
        : input.strategy === "staged"
          ? (input.observations?.p99LatencyMs ?? 0)
          : 0,
  });

  const finalDecision: RolloutDecision = gateDecision.allowed
    ? strategyResult.decision
    : "rollback";
  const reason = gateDecision.allowed ? strategyResult.reason : gateDecision.reason;

  globalRolloutCollector.emit({
    type: "rollout-decision",
    timestamp: Date.now(),
    environment: input.environment,
    routeKey: input.routeKey,
    requestId: input.requestId,
    policyVersion: input.policyVersion,
    decision: finalDecision,
    decisionProof: {
      reason,
      passed: gateDecision.allowed && strategyResult.passed,
    },
  });

  if (finalDecision === "rollback") {
    globalRolloutCollector.emit({
      type: "rollback-triggered",
      timestamp: Date.now(),
      environment: input.environment,
      routeKey: input.routeKey,
      requestId: input.requestId,
      policyVersion: input.policyVersion,
      decision: "rollback",
      decisionProof: {
        reason,
        passed: false,
      },
    });
  }

  return {
    decision: finalDecision,
    reason,
  };
}

function evaluateStrategy(input: RolloutControlPlaneInput): StrategyEvaluationResult {
  if (input.strategy === "canary") {
    const policy = resolveRolloutPolicy("canary", input.policy);
    const result = evaluateCanary(policy, input.observations);
    return {
      decision: result.decision,
      reason: result.proof.reason,
      passed: result.proof.passed,
    };
  }

  if (input.strategy === "feature-flag") {
    const policy = resolveRolloutPolicy("feature-flag", input.policy);
    const result = evaluateFeatureFlag(policy, input.requestId, input.routeKey);
    return {
      decision: result.decision,
      reason: result.reason,
      passed: result.decision !== "hold",
    };
  }

  const policy = resolveRolloutPolicy("staged", input.policy);
  const result = evaluateStaged(policy, input.elapsedMs ?? 0, input.observations);
  return {
    decision: result.decision,
    reason: result.proof.reason,
    passed: result.proof.passed,
  };
}
