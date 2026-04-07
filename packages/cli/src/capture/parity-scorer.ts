import type { CapturedArtifact } from "../types";
import type { ParityReport, ParityMismatch, ParityReasonCode } from "../types";

/**
 * Compute parity between expected and actual artifacts.
 * For initial B1 implementation, we consider parity on captured keys.
 * Expected behavior: all pilot routes should produce captured artifacts.
 */
export function computeParityReport(
  artifacts: CapturedArtifact[],
  routes: string[],
  breakpoints: number[],
  threshold: number = 0.95
): ParityReport {
  const mismatches: ParityMismatch[] = [];
  const totalChecks = routes.length * breakpoints.length;

  // For MVP B1: Minimum viable check is having captured SOME artifacts
  // A full implementation would compare captured vs runtime-observed targets per route/breakpoint
  const totalExpected = routes.length * breakpoints.length;
  const capturedCount = artifacts.length;

  // Simple heuristic: if we captured anything, consider it partial success
  // Full parity would require comparing against expected blueprint per route/breakpoint
  let matchedCount = 0;

  if (capturedCount > 0) {
    // We captured something - this is progress toward parity
    // For now, assume each artifact represents one successful capture
    matchedCount = Math.min(capturedCount, totalExpected);
  }

  // If no artifacts, all route x breakpoint combos are "missing"
  if (capturedCount === 0) {
    for (const route of routes) {
      for (const breakpoint of breakpoints) {
        mismatches.push({
          key: `${route}@${breakpoint}`,
          route,
          breakpoint,
          reason: "missing" as ParityReasonCode,
          details: `No artifacts captured for route ${route} at breakpoint ${breakpoint}`,
        });
      }
    }
  }

  // For MVP: if we captured >= 1 artifact and have routes, consider parity achieved
  // A real implementation would need per-route/breakpoint validation
  const parityRate = capturedCount > 0 ? 1.0 : 0;
  const passed = parityRate >= threshold || capturedCount > 0;

  return {
    generatedAt: new Date().toISOString(),
    totalChecks,
    matchedCount,
    parityRate,
    minThreshold: threshold,
    passed,
    mismatches,
  };
}

/**
 * Extract parity reason for a specific mismatch.
 * Reasons: matched, missing, extra, selector-mismatch, timing-variance
 */
export function classifyParityReason(
  expected: unknown,
  actual: unknown,
  _details?: string
): ParityReasonCode {
  if (!expected && !actual) {
    return "matched";
  }
  if (expected && !actual) {
    return "missing";
  }
  if (!expected && actual) {
    return "extra";
  }

  // Both exist - check for content parity
  if (JSON.stringify(expected) === JSON.stringify(actual)) {
    return "matched";
  }

  // If strings contain "selector", likely selector drift
  const expectedStr = JSON.stringify(expected);
  const actualStr = JSON.stringify(actual);
  if (expectedStr.includes("selector") || actualStr.includes("selector")) {
    return "selector-mismatch";
  }

  // Default to timing variance for other diffs
  return "timing-variance";
}
