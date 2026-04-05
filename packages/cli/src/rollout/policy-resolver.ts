import type { CanaryPolicy, FeatureFlagPolicy, StagedPolicy } from "./types.js";

export type RolloutStrategy = "canary" | "feature-flag" | "staged";

type UnknownPolicy = unknown;

export function resolveRolloutPolicy(strategy: "canary", policy: UnknownPolicy): CanaryPolicy;
export function resolveRolloutPolicy(
  strategy: "feature-flag",
  policy: UnknownPolicy
): FeatureFlagPolicy;
export function resolveRolloutPolicy(strategy: "staged", policy: UnknownPolicy): StagedPolicy;
export function resolveRolloutPolicy(
  strategy: RolloutStrategy,
  policy: UnknownPolicy
): CanaryPolicy | FeatureFlagPolicy | StagedPolicy {
  if (strategy === "canary") {
    assertCanaryPolicy(policy);
    return policy;
  }

  if (strategy === "feature-flag") {
    assertFeatureFlagPolicy(policy);
    return policy;
  }

  assertStagedPolicy(policy);
  return policy;
}

function assertCanaryPolicy(policy: UnknownPolicy): asserts policy is CanaryPolicy {
  if (!isRecord(policy)) {
    throw new TypeError("Invalid canary policy: policy must be an object");
  }
  requireNumber(policy, "sampledRequests");
  requireNumber(policy, "errorRateThreshold");
  requireNumber(policy, "p99LatencyThresholdMs");
  requireNumber(policy, "canaryDurationMs");
  requireNumber(policy, "minimumSampleSize");
}

function assertFeatureFlagPolicy(policy: UnknownPolicy): asserts policy is FeatureFlagPolicy {
  if (!isRecord(policy)) {
    throw new TypeError("Invalid feature-flag policy: policy must be an object");
  }
  requireString(policy, "flagName");
  requireBoolean(policy, "enabledByDefault");
  requireNumber(policy, "rolloutPercentage");

  if (!isRecord(policy.overrides)) {
    throw new TypeError("Invalid feature-flag policy: overrides must be an object");
  }
}

function assertStagedPolicy(policy: UnknownPolicy): asserts policy is StagedPolicy {
  if (!isRecord(policy)) {
    throw new TypeError("Invalid staged policy: policy must be an object");
  }
  if (!Array.isArray(policy.stages) || policy.stages.length === 0) {
    throw new TypeError("Invalid staged policy: stages must be a non-empty array");
  }

  for (const stage of policy.stages) {
    if (!isRecord(stage)) {
      throw new TypeError("Invalid staged policy: each stage must be an object");
    }
    requireNumber(stage, "percentageOfTraffic");
    requireNumber(stage, "durationMs");
  }

  requireNumber(policy, "errorRateThreshold");
  requireNumber(policy, "p99LatencyThresholdMs");
  requireBoolean(policy, "rollbackOnAnyStageFailure");
}

function requireNumber(target: Record<string, unknown>, key: string): void {
  if (typeof target[key] !== "number" || Number.isNaN(target[key])) {
    throw new TypeError(`Invalid policy: ${key} must be a number`);
  }
}

function requireString(target: Record<string, unknown>, key: string): void {
  if (typeof target[key] !== "string") {
    throw new TypeError(`Invalid policy: ${key} must be a string`);
  }
}

function requireBoolean(target: Record<string, unknown>, key: string): void {
  if (typeof target[key] !== "boolean") {
    throw new TypeError(`Invalid policy: ${key} must be a boolean`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
