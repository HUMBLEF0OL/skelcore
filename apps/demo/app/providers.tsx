"use client";

import React, { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
    GhostframeProvider,
    derivePolicyForPath,
    getResolverTelemetryCounters,
} from "@ghostframe/ghostframe";
import { ThemeProvider } from "../lib/theme-context";
import generatedManifest from "../lib/ghostframe/generated/manifest-loader";

type TelemetrySnapshot = {
    route: string;
    timestamp: number;
    counters: ReturnType<typeof getResolverTelemetryCounters>;
    ratios: {
        manifestHitRatio: number;
        invalidationRate: number;
        fallbackRatio: number;
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
    const strictPrefixes = (process.env.NEXT_PUBLIC_SKEL_STRICT_PATHS ?? "")
        .split(",")
        .map((segment) => segment.trim())
        .filter(Boolean);

    const serveEnabled = process.env.NEXT_PUBLIC_SKEL_SERVE_HYBRID === "true";
    const servePrefixes = (process.env.NEXT_PUBLIC_SKEL_SERVE_PATHS ?? "")
        .split(",")
        .map((segment) => segment.trim())
        .filter(Boolean);

    const shadowEnabled = process.env.NEXT_PUBLIC_SKEL_SHADOW_TELEMETRY === "true";
    const allowedPrefixes = (process.env.NEXT_PUBLIC_SKEL_SHADOW_PATHS ?? "")
        .split(",")
        .map((segment) => segment.trim())
        .filter(Boolean);

    const policy = derivePolicyForPath({
        pathname,
        strictEnabled,
        strictPaths: strictPrefixes,
        serveEnabled,
        servePaths: servePrefixes,
        shadowEnabled,
        shadowPaths: allowedPrefixes,
    });

    useEffect(() => {
        if (!telemetrySinkEnabled) {
            return;
        }

        const counters = getResolverTelemetryCounters();
        const manifestAttempts = counters.manifestHits + counters.manifestMisses + counters.invalidations;
        const servedCount =
            counters.manifestHits +
            counters.sessionHits +
            counters.dynamicFallbacks +
            counters.placeholderFallbacks;

        const snapshot: TelemetrySnapshot = {
            route: pathname,
            timestamp: Date.now(),
            counters,
            ratios: {
                manifestHitRatio:
                    manifestAttempts > 0 ? counters.manifestHits / manifestAttempts : 0,
                invalidationRate:
                    manifestAttempts > 0 ? counters.invalidations / manifestAttempts : 0,
                fallbackRatio:
                    servedCount > 0
                        ? (counters.sessionHits +
                            counters.dynamicFallbacks +
                            counters.placeholderFallbacks) /
                        servedCount
                        : 0,
            },
        };

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

        sink.latest = snapshot;
        sink.snapshots.push(snapshot);
        window.__SKEL_TELEMETRY__ = sink;

        console.info("[ghostframe][telemetry] resolver snapshot", snapshot);
    }, [pathname, telemetrySinkEnabled]);

    return (
        <ThemeProvider>
            <GhostframeProvider manifest={generatedManifest} policy={policy}>
                {children}
            </GhostframeProvider>
        </ThemeProvider>
    );
}
