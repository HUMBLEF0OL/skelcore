"use client";

import React, { useMemo, useRef, useState } from "react";
import { FeatureCard } from "../../lib/demo-components";
import { AutoSkeleton } from "../../lib/skelcore/react";

function StressGrid() {
    const items = useMemo(() => Array.from({ length: 300 }, (_, index) => index + 1), []);

    return (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-10">
            {items.map((item) => (
                <div
                    key={item}
                    className="rounded-md border border-zinc-800 bg-zinc-900 p-2 text-xs text-zinc-300 light:border-zinc-200 light:bg-white light:text-zinc-700"
                >
                    Tile {item}
                </div>
            ))}
        </div>
    );
}

export default function StressPage() {
    const [loading, setLoading] = useState(false);
    const [measurementMs, setMeasurementMs] = useState<number | null>(null);
    const [capturedNodes, setCapturedNodes] = useState<number | null>(null);
    const measureStartRef = useRef<number | null>(null);

    const handleStart = () => {
        measureStartRef.current = performance.now();
        setMeasurementMs(null);
        setLoading(true);
    };

    return (
        <main className="mx-auto w-full max-w-6xl space-y-6 px-6 py-10">
            <header>
                <h1 className="mb-2 text-4xl font-bold text-white light:text-zinc-900">Stress Test (300 Elements)</h1>
                <p className="text-zinc-500 light:text-zinc-600">
                    Runs dynamic measurement on a dense layout and reports elapsed timing in milliseconds.
                </p>
            </header>

            <FeatureCard title="Controls" description="Run a fresh stress-cycle measurement" badge="Performance">
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={handleStart}
                        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
                    >
                        {loading ? "Rerun Measurement" : "Start Loading"}
                    </button>

                    <button
                        onClick={() => setLoading(false)}
                        className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 transition-colors hover:border-zinc-500 light:border-zinc-300 light:text-zinc-700"
                    >
                        Stop Loading
                    </button>
                </div>
            </FeatureCard>

            <FeatureCard title="Performance Panel" description="Actual measurement telemetry" badge="ms">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm light:border-zinc-300 light:bg-zinc-100">
                        <p className="text-zinc-500 light:text-zinc-600">Measurement Duration</p>
                        <p data-testid="stress-measurement-ms" className="font-mono text-lg text-emerald-400">
                            {measurementMs === null ? "waiting" : `${measurementMs} ms`}
                        </p>
                    </div>
                    <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm light:border-zinc-300 light:bg-zinc-100">
                        <p className="text-zinc-500 light:text-zinc-600">Top-level nodes captured</p>
                        <p className="font-mono text-lg text-zinc-300 light:text-zinc-700">
                            {capturedNodes === null ? "waiting" : capturedNodes}
                        </p>
                    </div>
                </div>
            </FeatureCard>

            <FeatureCard title="300-element target" description="High-density layout to stress measurement">
                <AutoSkeleton
                    loading={loading}
                    onMeasured={(blueprint) => {
                        if (measureStartRef.current !== null) {
                            const elapsed = performance.now() - measureStartRef.current;
                            setMeasurementMs(Math.max(1, Math.round(elapsed)));
                        }
                        setCapturedNodes(blueprint.nodes.length);
                        setLoading(false);
                    }}
                >
                    <StressGrid />
                </AutoSkeleton>
            </FeatureCard>
        </main>
    );
}
