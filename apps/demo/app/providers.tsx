"use client";

import React, { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
    GhostframesProvider,
    deriveStrictRolloutPolicyForPath,
    diffResolverTelemetryCounters,
    evaluateHybridConfidenceGate,
    evaluateHybridOperationalGate,
    getResolverTelemetryCounters,
    type CompatibilityProfile,
} from "@ghostframes/runtime";
import { ThemeProvider } from "../lib/theme-context";
import generatedManifest from "../lib/ghostframes/generated/manifest-loader";

const EMPTY_COUNTERS: ReturnType<typeof getResolverTelemetryCounters> = {
    explicitHits: 0,
    manifestHits: 0,
    manifestMisses: 0,
    sessionHits: 0,
    dynamicFallbacks: 0,
    placeholderFallbacks: 0,
    invalidations: 0,
    shadowHits: 0,
    shadowMisses: 0,
    shadowInvalids: 0,
};

const STRICT_ROLLOUT_COMPATIBILITY_PROFILE: CompatibilityProfile = {
    manifestVersion: 1,
    requiredFields: ["entries", "build", "defaults"],
};

function parsePrefixes(value: string | undefined): string[] {
    return (value ?? "")
        .split(",")
        .map((segment) => segment.trim())
        .filter(Boolean);
}

type TelemetrySnapshot = {
    route: string;
    timestamp: number;
    counters: {
        cumulative: ReturnType<typeof getResolverTelemetryCounters>;
        window: ReturnType<typeof getResolverTelemetryCounters>;
    };
    ratios: {
        manifestHitRatio: number;
        invalidationRate: number;
        fallbackRatio: number;
        cumulativeManifestHitRatio: number;
        cumulativeInvalidationRate: number;
    };
    gate: {
        status: "pass" | "hold" | "rollback";
        pass: boolean;
        promotionEligible: boolean;
        rollbackRecommended: boolean;
        reasons: string[];
        manifestAttempts: number;
        operationalStatus: "pass" | "hold" | "rollback";
        operationalPass: boolean;
        operationalPromotionEligible: boolean;
        operationalRollbackRecommended: boolean;
        operationalReasons: string[];
        rollbackDrillDurationMs: number;
        userVisibleRegressionDelta: number;
    };
};

type TelemetrySink = {
    latest: TelemetrySnapshot | null;
    snapshots: TelemetrySnapshot[];
    getLatest: () => TelemetrySnapshot | null;
    clear: () => void;
};

declare global {
    interface Window {
        __SKEL_TELEMETRY__?: TelemetrySink;
    }
}

export function ClientProviders({
    children,
}: {
    children: React.ReactNode;
}): React.ReactElement {
    const pathname = usePathname();
    const telemetrySinkEnabled = process.env.NEXT_PUBLIC_SKEL_TELEMETRY_SINK === "true";

    const strictEnabled = process.env.NEXT_PUBLIC_SKEL_STRICT_MODE === "true";
    const strictCanaryPrefixes = parsePrefixes(process.env.NEXT_PUBLIC_SKEL_STRICT_CANARY_PATHS);
    const strictExpandedPrefixes = parsePrefixes(process.env.NEXT_PUBLIC_SKEL_STRICT_EXPANDED_PATHS);
    const strictBroadPrefixes = parsePrefixes(process.env.NEXT_PUBLIC_SKEL_STRICT_BROAD_PATHS);
    const legacyStrictPrefixes = parsePrefixes(process.env.NEXT_PUBLIC_SKEL_STRICT_PATHS);
    const strictFallbackMode =
        process.env.NEXT_PUBLIC_SKEL_STRICT_ROLLBACK_MODE === "runtime-only"
            ? "runtime-only"
            : "hybrid";

    const serveEnabled = process.env.NEXT_PUBLIC_SKEL_SERVE_HYBRID === "true";
    const servePrefixes = parsePrefixes(process.env.NEXT_PUBLIC_SKEL_SERVE_PATHS);
    const serveBlockPrefixes = parsePrefixes(process.env.NEXT_PUBLIC_SKEL_SERVE_BLOCK_PATHS);

    const shadowEnabled = process.env.NEXT_PUBLIC_SKEL_SHADOW_TELEMETRY === "true";
    const allowedPrefixes = parsePrefixes(process.env.NEXT_PUBLIC_SKEL_SHADOW_PATHS);

    const rolloutSelection = deriveStrictRolloutPolicyForPath({
        pathname,
        strictEnabled,
        strictPaths: legacyStrictPrefixes,
        strictCanaryPaths: strictCanaryPrefixes,
        strictExpandedPaths: strictExpandedPrefixes,
        strictBroadPaths: strictBroadPrefixes.length > 0 ? strictBroadPrefixes : legacyStrictPrefixes,
        serveEnabled,
        servePaths: servePrefixes,
        serveBlockPaths: serveBlockPrefixes,
        shadowEnabled,
        shadowPaths: allowedPrefixes,
        manifest: generatedManifest,
        strictCompatibilityProfile: STRICT_ROLLOUT_COMPATIBILITY_PROFILE,
        fallbackMode: strictFallbackMode,
    });
    const policy = rolloutSelection.policy;

    useEffect(() => {
        if (!telemetrySinkEnabled) {
            return;
        }

        const cumulativeCounters = getResolverTelemetryCounters();
        const sink: TelemetrySink = window.__SKEL_TELEMETRY__ ?? {
            latest: null,
            snapshots: [],
            getLatest() {
                return this.latest;
            },
            clear() {
                this.latest = null;
                this.snapshots = [];
            },
        };

        const latestForRoute = [...sink.snapshots]
            .reverse()
            .find((snapshot) => snapshot.route === pathname);
        const baselineCounters = latestForRoute?.counters.cumulative ?? EMPTY_COUNTERS;
        const windowCounters = diffResolverTelemetryCounters(cumulativeCounters, baselineCounters);
        const currentGate = evaluateHybridConfidenceGate({
            counters: windowCounters,
            previousWindowPass: latestForRoute?.gate.pass,
        });
        const userVisibleRegressionDelta = Number.parseFloat(
            process.env.NEXT_PUBLIC_SKEL_USER_VISIBLE_REGRESSION_DELTA ?? "0"
        );
        const rollbackDrillDurationMs = Number.parseInt(
            process.env.NEXT_PUBLIC_SKEL_ROLLBACK_DRILL_DURATION_MS ?? "0",
            10
        );
        const operationalGate = evaluateHybridOperationalGate({
            evidence: {
                userVisibleRegressionDelta: Number.isFinite(userVisibleRegressionDelta)
                    ? userVisibleRegressionDelta
                    : 0,
                rollbackDrillDurationMs: Number.isFinite(rollbackDrillDurationMs)
                    ? rollbackDrillDurationMs
                    : 0,
            },
            previousWindowPass: latestForRoute?.gate.operationalPass,
        });

        const windowManifestAttempts = currentGate.metrics.manifestAttempts;
        const cumulativeManifestAttempts =
            cumulativeCounters.manifestHits +
            cumulativeCounters.manifestMisses +
            cumulativeCounters.invalidations;

        const snapshot: TelemetrySnapshot = {
            route: pathname,
            timestamp: Date.now(),
            counters: {
                cumulative: cumulativeCounters,
                window: windowCounters,
            },
            ratios: {
                manifestHitRatio:
                    windowManifestAttempts > 0
                        ? windowCounters.manifestHits / windowManifestAttempts
                        : 0,
                invalidationRate:
                    windowManifestAttempts > 0
                        ? windowCounters.invalidations / windowManifestAttempts
                        : 0,
                fallbackRatio:
                    currentGate.metrics.servedCount > 0
                        ? (windowCounters.sessionHits +
                            windowCounters.dynamicFallbacks +
                            windowCounters.placeholderFallbacks) /
                        currentGate.metrics.servedCount
                        : 0,
                cumulativeManifestHitRatio:
                    cumulativeManifestAttempts > 0
                        ? cumulativeCounters.manifestHits / cumulativeManifestAttempts
                        : 0,
                cumulativeInvalidationRate:
                    cumulativeManifestAttempts > 0
                        ? cumulativeCounters.invalidations / cumulativeManifestAttempts
                        : 0,
            },
            gate: {
                status: currentGate.status,
                pass: currentGate.pass,
                promotionEligible: currentGate.promotionEligible,
                rollbackRecommended: currentGate.rollbackRecommended,
                reasons: currentGate.reasons,
                manifestAttempts: windowManifestAttempts,
                operationalStatus: operationalGate.status,
                operationalPass: operationalGate.pass,
                operationalPromotionEligible: operationalGate.promotionEligible,
                operationalRollbackRecommended: operationalGate.rollbackRecommended,
                operationalReasons: operationalGate.reasons,
                rollbackDrillDurationMs: operationalGate.evidence.rollbackDrillDurationMs,
                userVisibleRegressionDelta: operationalGate.evidence.userVisibleRegressionDelta,
            },
        };

        sink.latest = snapshot;
        sink.snapshots.push(snapshot);
        window.__SKEL_TELEMETRY__ = sink;

        console.info("[ghostframes][telemetry] resolver snapshot", snapshot);
    }, [pathname, telemetrySinkEnabled]);

    return (
        <ThemeProvider>
            <GhostframesProvider manifest={generatedManifest} policy={policy}>
                {children}
            </GhostframesProvider>
        </ThemeProvider>
    );
}
