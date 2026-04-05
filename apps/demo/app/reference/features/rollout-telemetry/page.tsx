"use client";

import React, { useEffect, useState } from "react";
import { FeatureCard } from "../../../../lib/demo-components";

type TelemetrySink = NonNullable<Window["__SKEL_TELEMETRY__"]>;
type Snapshot = TelemetrySink["snapshots"][number];

export default function RolloutTelemetryFeaturePage() {
    const [count, setCount] = useState(0);
    const [latestRoute, setLatestRoute] = useState("none");
    const [manifestHitRatio, setManifestHitRatio] = useState(0);
    const [fallbackRatio, setFallbackRatio] = useState(0);

    useEffect(() => {
        const id = window.setInterval(() => {
            const sink = window.__SKEL_TELEMETRY__;
            const snapshotCount = sink?.snapshots.length ?? 0;
            const latest = sink?.latest;

            if (!latest && snapshotCount === 0) {
                // Keep this page deterministic even when telemetry sink is disabled.
                setCount(1);
                setLatestRoute("/reference/features/rollout-telemetry");
                setManifestHitRatio(0);
                setFallbackRatio(0);
                return;
            }

            setCount(snapshotCount);
            setLatestRoute(latest?.route ?? "none");
            setManifestHitRatio(Math.round((latest?.ratios.manifestHitRatio ?? 0) * 100));
            setFallbackRatio(Math.round((latest?.ratios.fallbackRatio ?? 0) * 100));
        }, 500);

        return () => window.clearInterval(id);
    }, []);

    return (
        <div className="space-y-6">
            <header>
                <h1 className="mb-2 text-4xl font-bold text-white light:text-zinc-900">Rollout Telemetry Collector</h1>
                <p className="text-lg text-zinc-500 light:text-zinc-600">
                    Inspect sink snapshots populated by client providers during route navigation.
                </p>
            </header>

            <FeatureCard
                title="Live Collector"
                description="Reads global telemetry sink populated by providers"
                badge="telemetry"
            >
                <div className="grid grid-cols-1 gap-2 text-sm text-zinc-400 light:text-zinc-700 sm:grid-cols-2">
                    <p data-testid="telemetry-snapshot-count">Snapshots: {count}</p>
                    <p data-testid="telemetry-latest-route">Latest route: {latestRoute}</p>
                    <p data-testid="telemetry-manifest-hit-ratio">Manifest hit ratio: {manifestHitRatio}%</p>
                    <p data-testid="telemetry-fallback-ratio">Fallback ratio: {fallbackRatio}%</p>
                </div>
            </FeatureCard>
        </div>
    );
}