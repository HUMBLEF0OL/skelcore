import {
    validateManifestCompatibility,
    type BlueprintManifest,
    type CompatibilityProfile,
    type CompatibilityValidationResult,
} from "@ghostframes/core";
import type { ResolutionPolicy } from "./resolution-types";

export type StrictRolloutTier = "disabled" | "canary" | "expanded" | "broad";
export type StrictRolloutFallbackMode = "hybrid" | "runtime-only";
export type StrictCompatibilityStatus = "compatible" | "incompatible" | "unchecked";

type StrictCompatibilityProfile = Omit<CompatibilityProfile, "requiredFields" | "allowedPolicies"> & {
    requiredFields?: readonly string[];
    allowedPolicies?: readonly string[];
};

export interface StrictRolloutPolicyInput {
    pathname: string;
    strictEnabled: boolean;
    strictPaths?: string[];
    strictCanaryPaths?: string[];
    strictExpandedPaths?: string[];
    strictBroadPaths?: string[];
    serveEnabled: boolean;
    servePaths: string[];
    serveBlockPaths?: string[];
    shadowEnabled?: boolean;
    shadowPaths?: string[];
    manifest?: BlueprintManifest;
    strictCompatibilityProfile?: StrictCompatibilityProfile;
    fallbackMode?: StrictRolloutFallbackMode;
}

export interface StrictRolloutPolicySelection {
    policy: ResolutionPolicy;
    strictRolloutTier: StrictRolloutTier;
    compatibilityStatus: StrictCompatibilityStatus;
    compatibilityResult?: CompatibilityValidationResult;
    fallbackMode: StrictRolloutFallbackMode;
    reason: string;
}

export interface StrictRolloutSloThresholds {
    maxFallbackAnomalyRate: number;
    rollbackFallbackAnomalyRate: number;
}

export interface StrictRolloutWindowEvidence {
    fallbackAnomalyRate: number;
    p0Incidents: number;
    p1Incidents: number;
}

export interface StrictRolloutSloDecision {
    status: "pass" | "hold" | "rollback";
    pass: boolean;
    promotionEligible: boolean;
    rollbackRecommended: boolean;
    reasons: string[];
    thresholds: StrictRolloutSloThresholds;
    evidence: StrictRolloutWindowEvidence;
}

export const DEFAULT_STRICT_ROLLOUT_SLO_THRESHOLDS: StrictRolloutSloThresholds = {
    maxFallbackAnomalyRate: 0.01,
    rollbackFallbackAnomalyRate: 0.02,
};

function matchesPrefix(pathname: string, prefixes: string[]): boolean {
    return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function normalizePrefixes(prefixes?: string[]): string[] {
    return (prefixes ?? []).map((prefix) => prefix.trim()).filter(Boolean);
}

function normalizeCompatibilityProfile(
    profile?: StrictCompatibilityProfile
): CompatibilityProfile | undefined {
    if (!profile) {
        return undefined;
    }

    return {
        ...profile,
        requiredFields: profile.requiredFields ? [...profile.requiredFields] : undefined,
        allowedPolicies: profile.allowedPolicies ? [...profile.allowedPolicies] : undefined,
    };
}

function resolveFallbackPolicy(input: {
    pathname: string;
    serveEnabled: boolean;
    servePaths: string[];
    serveBlockPaths?: string[];
    preferHybrid: boolean;
}): ResolutionPolicy {
    const canServeHybrid =
        input.serveEnabled &&
        matchesPrefix(input.pathname, input.servePaths) &&
        !matchesPrefix(input.pathname, input.serveBlockPaths ?? []);

    if (input.preferHybrid && canServeHybrid) {
        return { mode: "hybrid", strict: false };
    }

    return { mode: "runtime-only", strict: false };
}

function resolveBasePolicy(input: {
    pathname: string;
    serveEnabled: boolean;
    servePaths: string[];
    serveBlockPaths?: string[];
    shadowEnabled?: boolean;
    shadowPaths?: string[];
}): ResolutionPolicy {
    const isShadowRoute = input.shadowEnabled === true && matchesPrefix(input.pathname, input.shadowPaths ?? []);
    if (isShadowRoute) {
        return { mode: "hybrid", strict: false, shadowTelemetryOnly: true };
    }

    const isServeBlocked = matchesPrefix(input.pathname, input.serveBlockPaths ?? []);
    if (isServeBlocked) {
        return { mode: "runtime-only", strict: false };
    }

    const isServingRoute = input.serveEnabled && matchesPrefix(input.pathname, input.servePaths);
    if (isServingRoute) {
        return { mode: "hybrid", strict: false };
    }

    return { mode: "runtime-only", strict: false };
}

function resolveStrictTier(input: {
    pathname: string;
    strictEnabled: boolean;
    strictPaths?: string[];
    strictCanaryPaths?: string[];
    strictExpandedPaths?: string[];
    strictBroadPaths?: string[];
}): StrictRolloutTier {
    if (!input.strictEnabled) {
        return "disabled";
    }

    const canaryPaths = normalizePrefixes(input.strictCanaryPaths);
    if (matchesPrefix(input.pathname, canaryPaths)) {
        return "canary";
    }

    const expandedPaths = normalizePrefixes(input.strictExpandedPaths);
    if (matchesPrefix(input.pathname, expandedPaths)) {
        return "expanded";
    }

    const broadPaths = normalizePrefixes(input.strictBroadPaths);
    if (matchesPrefix(input.pathname, broadPaths)) {
        return "broad";
    }

    const legacyStrictPaths = normalizePrefixes(input.strictPaths);
    if (matchesPrefix(input.pathname, legacyStrictPaths)) {
        return "broad";
    }

    return "disabled";
}

export function deriveStrictRolloutPolicyForPath(
    input: StrictRolloutPolicyInput
): StrictRolloutPolicySelection {
    const strictRolloutTier = resolveStrictTier(input);
    const fallbackMode = input.fallbackMode ?? "hybrid";

    if (strictRolloutTier === "disabled") {
        return {
            policy: resolveBasePolicy(input),
            strictRolloutTier,
            compatibilityStatus: "unchecked",
            fallbackMode,
            reason: "strict-rollout-disabled",
        };
    }

    const compatibilityResult =
        input.manifest && input.strictCompatibilityProfile
            ? validateManifestCompatibility(
                input.manifest,
                normalizeCompatibilityProfile(input.strictCompatibilityProfile)
            )
            : undefined;
    const compatibilityStatus: StrictCompatibilityStatus = compatibilityResult
        ? compatibilityResult.compatible
            ? "compatible"
            : "incompatible"
        : "unchecked";

    if (compatibilityStatus === "compatible") {
        return {
            policy: { mode: "strict-precomputed", strict: true },
            strictRolloutTier,
            compatibilityStatus,
            compatibilityResult,
            fallbackMode,
            reason: "strict-rollout-compatible",
        };
    }

    return {
        policy: resolveFallbackPolicy({
            pathname: input.pathname,
            serveEnabled: input.serveEnabled,
            servePaths: normalizePrefixes(input.servePaths),
            serveBlockPaths: normalizePrefixes(input.serveBlockPaths),
            preferHybrid: fallbackMode === "hybrid",
        }),
        strictRolloutTier,
        compatibilityStatus,
        compatibilityResult,
        fallbackMode,
        reason:
            compatibilityStatus === "unchecked"
                ? "strict-compatibility-unchecked"
                : "strict-compatibility-blocked",
    };
}

export function evaluateStrictRolloutSlo(input: {
    evidence: StrictRolloutWindowEvidence;
    previousWindowPass?: boolean;
    thresholds?: Partial<StrictRolloutSloThresholds>;
}): StrictRolloutSloDecision {
    const thresholds: StrictRolloutSloThresholds = {
        ...DEFAULT_STRICT_ROLLOUT_SLO_THRESHOLDS,
        ...input.thresholds,
    };

    const reasons: string[] = [];
    const fallbackAnomalyRate = Number.isFinite(input.evidence.fallbackAnomalyRate)
        ? input.evidence.fallbackAnomalyRate
        : Number.POSITIVE_INFINITY;
    const p0Incidents = Math.max(Math.trunc(input.evidence.p0Incidents), 0);
    const p1Incidents = Math.max(Math.trunc(input.evidence.p1Incidents), 0);

    if (fallbackAnomalyRate > thresholds.maxFallbackAnomalyRate) {
        reasons.push(
            `fallback-anomaly-above-threshold: ${fallbackAnomalyRate.toFixed(3)} > ${thresholds.maxFallbackAnomalyRate.toFixed(3)}`
        );
    }
    if (p0Incidents > 0) {
        reasons.push(`p0-incidents-detected: ${p0Incidents}`);
    }
    if (p1Incidents > 0) {
        reasons.push(`p1-incidents-detected: ${p1Incidents}`);
    }

    const rollbackRecommended =
        fallbackAnomalyRate > thresholds.rollbackFallbackAnomalyRate || p0Incidents > 0 || p1Incidents > 0;
    const pass = reasons.length === 0;
    const promotionEligible = pass && input.previousWindowPass === true;

    return {
        status: rollbackRecommended ? "rollback" : pass ? "pass" : "hold",
        pass,
        promotionEligible,
        rollbackRecommended,
        reasons,
        thresholds,
        evidence: {
            fallbackAnomalyRate,
            p0Incidents,
            p1Incidents,
        },
    };
}