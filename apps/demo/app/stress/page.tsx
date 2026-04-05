"use client";

import React, { useMemo, useRef, useState } from "react";
import { FeatureCard } from "../../lib/demo-components";
import { AutoSkeleton } from "../../lib/ghostframe/react";
import type { BlueprintNode } from "../../lib/ghostframe/core";

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
    const [leafNodes, setLeafNodes] = useState<number | null>(null);
    const [roleKinds, setRoleKinds] = useState<number | null>(null);
    const measureStartRef = useRef<number | null>(null);

    const collectNodeStats = (nodes: BlueprintNode[]) => {
        let total = 0;
        let leaf = 0;
        const uniqueRoles = new Set<string>();

        const walk = (list: BlueprintNode[]) => {
            for (const node of list) {
                total += 1;
                uniqueRoles.add(node.role);

                if (node.children.length === 0) {
                    leaf += 1;
                } else {
                    walk(node.children);
                }
            }
        };

        walk(nodes);
        return { total, leaf, roleKinds: uniqueRoles.size };
    };

    const handleStart = () => {
        measureStartRef.current = performance.now();
        setMeasurementMs(null);
        setLoading(true);
    };

    return (
        <div className="app-surface guide-page">
            <main className="app-content guide-flow">
                <header className="guide-header">
                    <h1 className="guide-title font-bold text-white light:text-zinc-900">Stress Test (300 Elements)</h1>
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
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm light:border-zinc-300 light:bg-zinc-100">
                            <p className="text-zinc-500 light:text-zinc-600">Measurement Duration</p>
                            <p data-testid="stress-measurement-ms" className="font-mono text-lg text-emerald-400">
                                {measurementMs === null ? "waiting" : `${measurementMs} ms`}
                            </p>
                        </div>
                        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm light:border-zinc-300 light:bg-zinc-100">
                            <p className="text-zinc-500 light:text-zinc-600">Total nodes captured</p>
                            <p data-testid="stress-total-nodes" className="font-mono text-lg text-zinc-300 light:text-zinc-700">
                                {capturedNodes === null ? "waiting" : capturedNodes}
                            </p>
                        </div>
                        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm light:border-zinc-300 light:bg-zinc-100">
                            <p className="text-zinc-500 light:text-zinc-600">Leaf nodes</p>
                            <p data-testid="stress-leaf-nodes" className="font-mono text-lg text-zinc-300 light:text-zinc-700">
                                {leafNodes === null ? "waiting" : leafNodes}
                            </p>
                        </div>
                        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm light:border-zinc-300 light:bg-zinc-100">
                            <p className="text-zinc-500 light:text-zinc-600">Role types detected</p>
                            <p data-testid="stress-role-kinds" className="font-mono text-lg text-zinc-300 light:text-zinc-700">
                                {roleKinds === null ? "waiting" : roleKinds}
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
                            const stats = collectNodeStats(blueprint.nodes);
                            setCapturedNodes(stats.total);
                            setLeafNodes(stats.leaf);
                            setRoleKinds(stats.roleKinds);
                            setLoading(false);
                        }}
                    >
                        <StressGrid />
                    </AutoSkeleton>
                </FeatureCard>
            </main>
        </div>
    );
}
