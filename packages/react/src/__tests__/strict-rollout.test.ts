import { describe, expect, it } from "vitest";
import { asStructuralHash, type BlueprintManifest } from "@ghostframes/core";
import { deriveStrictRolloutPolicyForPath, evaluateStrictRolloutSlo } from "../strict-rollout.js";

const strictCompatibilityProfile = {
    manifestVersion: 1,
    requiredFields: ["entries", "build", "defaults"],
} as const;

function createManifest(manifestVersion = 1): BlueprintManifest {
    return {
        manifestVersion,
        packageVersion: "0.1.0",
        build: { builtAt: Date.now(), appVersion: "demo" },
        defaults: { ttlMs: 86400000 },
        entries: {
            ProductCard: {
                key: "ProductCard",
                blueprint: {
                    version: 1,
                    rootWidth: 300,
                    rootHeight: 200,
                    nodes: [],
                    generatedAt: Date.now(),
                    source: "dynamic",
                },
                structuralHash: asStructuralHash("hash-123"),
                generatedAt: Date.now(),
                ttlMs: 86400000,
                quality: { confidence: 0.95, warnings: [] },
            },
        },
    };
}

describe("strict rollout policy helper", () => {
    it("enables strict-precomputed on compatible canary routes", () => {
        const result = deriveStrictRolloutPolicyForPath({
            pathname: "/reference/features/resolver-policy",
            strictEnabled: true,
            strictCanaryPaths: ["/reference"],
            strictExpandedPaths: ["/advanced"],
            strictBroadPaths: ["/stress"],
            serveEnabled: true,
            servePaths: ["/reference"],
            manifest: createManifest(),
            strictCompatibilityProfile,
        });

        expect(result.strictRolloutTier).toBe("canary");
        expect(result.compatibilityStatus).toBe("compatible");
        expect(result.policy.mode).toBe("strict-precomputed");
        expect(result.policy.strict).toBe(true);
    });

    it("falls back to hybrid when strict compatibility is blocked and hybrid serving is available", () => {
        const result = deriveStrictRolloutPolicyForPath({
            pathname: "/reference/features/resolver-policy",
            strictEnabled: true,
            strictCanaryPaths: ["/reference"],
            serveEnabled: true,
            servePaths: ["/reference"],
            manifest: createManifest(99),
            strictCompatibilityProfile,
        });

        expect(result.strictRolloutTier).toBe("canary");
        expect(result.compatibilityStatus).toBe("incompatible");
        expect(result.policy.mode).toBe("hybrid");
        expect(result.policy.strict).toBe(false);
        expect(result.reason).toBe("strict-compatibility-blocked");
    });

    it("falls back to runtime-only when hybrid serving is unavailable", () => {
        const result = deriveStrictRolloutPolicyForPath({
            pathname: "/reference/features/resolver-policy",
            strictEnabled: true,
            strictBroadPaths: ["/reference"],
            serveEnabled: false,
            servePaths: ["/reference"],
            manifest: createManifest(99),
            strictCompatibilityProfile,
            fallbackMode: "runtime-only",
        });

        expect(result.strictRolloutTier).toBe("broad");
        expect(result.compatibilityStatus).toBe("incompatible");
        expect(result.policy.mode).toBe("runtime-only");
    });

    it("preserves legacy strict path behavior when tiered lists are absent", () => {
        const result = deriveStrictRolloutPolicyForPath({
            pathname: "/reference/features/resolver-policy",
            strictEnabled: true,
            strictPaths: ["/reference"],
            serveEnabled: false,
            servePaths: [],
            manifest: createManifest(),
            strictCompatibilityProfile,
        });

        expect(result.strictRolloutTier).toBe("broad");
        expect(result.policy.mode).toBe("strict-precomputed");
    });

    it("GATE: B6_STRICT_GATE - canary compatibility enables strict-precomputed", () => {
        const result = deriveStrictRolloutPolicyForPath({
            pathname: "/reference/features/resolver-policy",
            strictEnabled: true,
            strictCanaryPaths: ["/reference"],
            strictExpandedPaths: ["/advanced"],
            strictBroadPaths: ["/stress"],
            serveEnabled: true,
            servePaths: ["/reference"],
            manifest: createManifest(),
            strictCompatibilityProfile,
        });

        expect(result.strictRolloutTier).toBe("canary");
        expect(result.compatibilityStatus).toBe("compatible");
        expect(result.policy.mode).toBe("strict-precomputed");
        expect(result.policy.strict).toBe(true);
    });
});

describe("strict rollout SLO evaluator", () => {
    it("passes a strict canary window when anomaly and incidents are within thresholds", () => {
        const firstWindow = evaluateStrictRolloutSlo({
            evidence: {
                fallbackAnomalyRate: 0.009,
                p0Incidents: 0,
                p1Incidents: 0,
            },
        });
        const secondWindow = evaluateStrictRolloutSlo({
            evidence: {
                fallbackAnomalyRate: 0.008,
                p0Incidents: 0,
                p1Incidents: 0,
            },
            previousWindowPass: firstWindow.pass,
        });

        expect(firstWindow.pass).toBe(true);
        expect(secondWindow.pass).toBe(true);
        expect(secondWindow.promotionEligible).toBe(true);
    });

    it("recommends rollback when anomaly breaches rollback ceiling", () => {
        const decision = evaluateStrictRolloutSlo({
            evidence: {
                fallbackAnomalyRate: 0.03,
                p0Incidents: 0,
                p1Incidents: 0,
            },
        });

        expect(decision.pass).toBe(false);
        expect(decision.rollbackRecommended).toBe(true);
        expect(decision.status).toBe("rollback");
    });

    it("GATE: B6_STRICT_GATE - strict rollout requires <=1% anomaly and zero P0/P1 incidents for two windows", () => {
        const firstWindow = evaluateStrictRolloutSlo({
            evidence: {
                fallbackAnomalyRate: 0.01,
                p0Incidents: 0,
                p1Incidents: 0,
            },
        });
        const secondWindow = evaluateStrictRolloutSlo({
            evidence: {
                fallbackAnomalyRate: 0.009,
                p0Incidents: 0,
                p1Incidents: 0,
            },
            previousWindowPass: firstWindow.pass,
        });

        expect(firstWindow.pass).toBe(true);
        expect(secondWindow.pass).toBe(true);
        expect(secondWindow.promotionEligible).toBe(true);
        expect(secondWindow.rollbackRecommended).toBe(false);
    });
});