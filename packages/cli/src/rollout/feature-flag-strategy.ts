import type { FeatureFlagPolicy } from "./types.js";

export interface FeatureFlagEvaluation {
  enabled: boolean;
  decision: "proceed" | "hold";
  reason: string;
}

/**
 * Compute deterministic segment (0-99) for a request.
 * Uses simple hash to ensure same request always gets same segment.
 */
export function computeFlagSegment(requestId: string, flagName: string): number {
  // Simple FNV-1a hash for determinism
  let hash = 2166136261;
  const bytes = `${requestId}:${flagName}`;
  for (let i = 0; i < bytes.length; i++) {
    hash ^= bytes.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    hash = hash >>> 0; // keep as unsigned 32-bit
  }
  return hash % 100;
}

export function evaluateFeatureFlag(
  policy: FeatureFlagPolicy,
  requestId: string,
  routeContext?: string
): FeatureFlagEvaluation {
  // Check for override first
  if (routeContext && policy.overrides[routeContext] !== undefined) {
    const overrideValue = policy.overrides[routeContext];
    return {
      enabled: overrideValue,
      decision: overrideValue ? "proceed" : "hold",
      reason: `override-${routeContext}`,
    };
  }

  // Compute segment for this request
  const segment = computeFlagSegment(requestId, policy.flagName);
  const enabledBySegment = segment < policy.rolloutPercentage;
  const finalEnabled = policy.enabledByDefault
    ? true // if default-on, always enabled
    : enabledBySegment; // if default-off, require segment match

  return {
    enabled: finalEnabled,
    decision: finalEnabled ? "proceed" : "hold",
    reason: `segment-${segment}/${policy.rolloutPercentage}`,
  };
}
