import type { ManifestEntry } from "@ghostframes/core";

/**
 * Result of quality scoring for a blueprint entry.
 */
export interface QualityScoreResult {
    score: number;
    dimension: {
        completeness: number;
        confidence: number;
        sizeAppropriateness: number;
        warningPenalty: number;
    };
}

/**
 * Score a blueprint entry on completeness, confidence, and structural quality.
 * Score range: 0–1, where 1.0 is perfect quality.
 *
 * Scoring factors:
 * - Completeness (35%): nodes.length relative to expected size
 * - Confidence (40%): quality.confidence value
 * - Size Appropriateness (15%): viewport dimensions (penalize too-small)
 * - Warning Penalty (10%): count of warnings
 */
export function scoreBlueprint(entry: ManifestEntry): number {
    // 1. Completeness: nodes.length is a proxy for structural quality
    // Empty nodes array gets low score; more nodes generally better (up to a point)
    const nodeCount = (entry.blueprint.nodes ?? []).length;
    const expectedNodeCount = 3; // baseline expectation
    const completeness =
        nodeCount === 0
            ? 0.2 // harsh penalty for empty
            : Math.min(1.0, Math.max(0.5, nodeCount / expectedNodeCount) * 0.9 + 0.1);

    // 2. Confidence: use directly from quality metric (highest weight)
    const confidence = entry.quality.confidence;

    // 3. Size Appropriateness: penalize dimensions that are too small
    // Reasonable minimum is 40x40; typical is 200+x200+
    const { rootWidth, rootHeight } = entry.blueprint;
    const minDim = 40;
    const typicalDim = 200;
    const sizeScore =
        rootWidth < minDim || rootHeight < minDim
            ? 0.4 // harsh penalty for too-small
            : rootWidth < typicalDim || rootHeight < typicalDim
                ? 0.8
                : 1.0;

    // 4. Warning Penalty: each warning reduces score
    const warningCount = (entry.quality.warnings ?? []).length;
    const warningPenalty = Math.max(0, 1.0 - warningCount * 0.1);

    // Weighted combination: confidence has highest weight
    const score =
        completeness * 0.35 + confidence * 0.4 + sizeScore * 0.15 + warningPenalty * 0.1;

    return Math.max(0, Math.min(1.0, score));
}

/**
 * Determine if a blueprint entry meets quality acceptance threshold.
 * Default threshold is 0.88 (warn band); strict threshold is 0.90 (block band).
 *
 * @param entry ManifestEntry to evaluate
 * @param options.threshold Quality score threshold (0–1). Default: 0.88
 * @returns true if score >= threshold, false otherwise
 */
export function isQualityAcceptable(
    entry: ManifestEntry,
    options: { threshold?: number } = {}
): boolean {
    const threshold = options.threshold ?? 0.88;
    const score = scoreBlueprint(entry);
    return score >= threshold;
}

/**
 * Provide detailed quality diagnostic for a blueprint.
 * Useful for debugging rejections and understanding quality gaps.
 */
export interface QualityDiagnostic {
    entry: ManifestEntry;
    score: number;
    accepted: boolean;
    threshold: number;
    gap: number; // negative means below threshold
    factors: {
        nodeCompleteness: string;
        confidence: string;
        sizeAppropriateness: string;
        warnings: string[];
    };
}

export function diagnoseBlueprintQuality(
    entry: ManifestEntry,
    options: { threshold?: number } = {}
): QualityDiagnostic {
    const threshold = options.threshold ?? 0.88;
    const score = scoreBlueprint(entry);
    const accepted = score >= threshold;
    const nodeCount = (entry.blueprint.nodes ?? []).length;
    const { rootWidth, rootHeight } = entry.blueprint;

    return {
        entry,
        score,
        accepted,
        threshold,
        gap: score - threshold,
        factors: {
            nodeCompleteness:
                nodeCount === 0
                    ? "empty (no nodes)"
                    : nodeCount < 3
                        ? "minimal (1-2 nodes)"
                        : nodeCount < 10
                            ? "moderate"
                            : "comprehensive",
            confidence:
                entry.quality.confidence < 0.5
                    ? "low"
                    : entry.quality.confidence < 0.8
                        ? "medium"
                        : "high",
            sizeAppropriateness:
                rootWidth < 40 || rootHeight < 40
                    ? "too-small (< 40px)"
                    : rootWidth < 200 || rootHeight < 200
                        ? "below-typical"
                        : "appropriate",
            warnings: entry.quality.warnings ?? [],
        },
    };
}
