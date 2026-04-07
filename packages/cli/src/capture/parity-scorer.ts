import type { CapturedArtifact } from "../types";
import type { ParityObservation, ParityReport, ParityMismatch, ParityReasonCode } from "../types";

/**
 * Compute parity between expected route x breakpoint checks and capture observations.
 */
export function computeParityReport(
    _artifacts: CapturedArtifact[],
    routes: string[],
    breakpoints: number[],
    threshold: number = 0.95,
    observations: ParityObservation[] = []
): ParityReport {
    const mismatches: ParityMismatch[] = [];
    const totalChecks = routes.length * breakpoints.length;
    const reasonCounts: Record<Exclude<ParityReasonCode, "matched">, number> = {
        missing_selector: 0,
        extra_selector: 0,
        breakpoint_mismatch: 0,
        route_missing_artifact: 0,
    };

    const observationMap = new Map<string, ParityObservation>();
    const routeBreakpoints = new Map<string, Set<number>>();
    for (const observation of observations) {
        observationMap.set(`${observation.route}@${observation.breakpoint}`, observation);
        const knownBreakpoints = routeBreakpoints.get(observation.route) ?? new Set<number>();
        knownBreakpoints.add(observation.breakpoint);
        routeBreakpoints.set(observation.route, knownBreakpoints);
    }

    let matchedCount = 0;
    const expectedChecks = routes.flatMap((route) =>
        breakpoints.map((breakpoint) => ({ route, breakpoint, key: `${route}@${breakpoint}` }))
    );

    for (const check of expectedChecks) {
        const observation = observationMap.get(check.key);
        if (!observation) {
            const hasRouteObservations = routeBreakpoints.has(check.route);
            const reason: Exclude<ParityReasonCode, "matched"> = hasRouteObservations
                ? "breakpoint_mismatch"
                : "route_missing_artifact";
            reasonCounts[reason] += 1;
            mismatches.push({
                key: check.key,
                route: check.route,
                breakpoint: check.breakpoint,
                reason,
            });
            continue;
        }

        const missingKeys = observation.discoveredKeys.filter(
            (key) => !observation.extractedKeys.includes(key)
        );
        const extraKeys = observation.extractedKeys.filter(
            (key) => !observation.discoveredKeys.includes(key)
        );

        if (missingKeys.length === 0 && extraKeys.length === 0) {
            matchedCount += 1;
            continue;
        }

        const reason: Exclude<ParityReasonCode, "matched"> =
            missingKeys.length > 0 ? "missing_selector" : "extra_selector";
        reasonCounts[reason] += 1;
        mismatches.push({
            key: check.key,
            route: check.route,
            breakpoint: check.breakpoint,
            reason,
            missingKeys,
            extraKeys,
            extractionFailures: observation.extractionFailures,
            details: `missing=${missingKeys.join(",")};extra=${extraKeys.join(",")};failures=${observation.extractionFailures}`,
        });
    }

    const parityRate = totalChecks === 0 ? 1 : matchedCount / totalChecks;
    const passed = parityRate >= threshold;

    return {
        generatedAt: new Date().toISOString(),
        totalChecks,
        matchedCount,
        parityRate,
        minThreshold: threshold,
        passed,
        mismatches,
        reasonCounts,
    };
}

/**
 * Extract parity reason for a specific mismatch.
 */
export function classifyParityReason(
    expected: unknown,
    actual: unknown,
    details?: string
): ParityReasonCode {
    if (!expected && !actual) {
        return "matched";
    }

    if (expected && !actual) {
        return "route_missing_artifact";
    }

    if (!expected && actual) {
        return "extra_selector";
    }

    const detailText = details ?? "";
    if (detailText.includes("breakpoint")) {
        return "breakpoint_mismatch";
    }

    return "missing_selector";
}
