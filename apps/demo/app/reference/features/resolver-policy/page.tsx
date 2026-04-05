"use client";

import React, { useState } from "react";
import {
    AutoSkeleton,
    asStructuralHash,
    type BlueprintManifest,
    type ResolutionEvent,
} from "@ghostframe/ghostframe";
import { FeatureCard } from "../../../../lib/demo-components";

const mockManifest: BlueprintManifest = {
    manifestVersion: 1,
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
                nodes: [
                    {
                        id: "mock-node-1",
                        role: "container",
                        width: 300,
                        height: 200,
                        top: 0,
                        left: 0,
                        layout: {},
                        borderRadius: "12px",
                        tagName: "DIV",
                        children: [],
                    },
                ],
                generatedAt: Date.now(),
                source: "dynamic",
            },
            structuralHash: asStructuralHash("demo_hash_123"),
            generatedAt: Date.now(),
            ttlMs: 86400000,
            quality: { confidence: 0.95, warnings: [] },
        },
    },
};

function ProductCard() {
    return (
        <article className="h-52 rounded-xl border border-zinc-800 bg-zinc-900 p-4 light:border-zinc-200 light:bg-white">
            <div className="mb-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-blue-500" />
                <div className="space-y-1">
                    <p className="text-sm font-semibold text-white light:text-zinc-900">Atlas Productivity Suite</p>
                    <p className="text-xs text-zinc-500 light:text-zinc-600">Enterprise workflow package</p>
                </div>
            </div>

            <div className="space-y-2">
                <div className="h-2.5 w-full rounded bg-zinc-800 light:bg-zinc-200" />
                <div className="h-2.5 w-4/5 rounded bg-zinc-800 light:bg-zinc-200" />
                <div className="h-2.5 w-3/5 rounded bg-zinc-800 light:bg-zinc-200" />
            </div>

            <div className="mt-4 inline-flex rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold text-emerald-300 light:border-emerald-600/30 light:bg-emerald-50 light:text-emerald-700">
                Ready for rollout
            </div>
        </article>
    );
}

export default function ResolverPolicyFeaturePage() {
    const [loading, setLoading] = useState(true);
    const [mode, setMode] = useState<"runtime-only" | "hybrid" | "precomputed-only">("hybrid");
    const [events, setEvents] = useState<ResolutionEvent[]>([]);

    function onResolution(event: ResolutionEvent) {
        setEvents((prev) => [event, ...prev].slice(0, 10));
    }

    return (
        <div className="space-y-6">
            <header>
                <h1 className="mb-2 text-4xl font-bold text-white light:text-zinc-900">Resolver Policy</h1>
                <p className="text-lg text-zinc-500 light:text-zinc-600">
                    Compare runtime-only, hybrid, and precomputed-only resolution behavior.
                </p>
            </header>

            <FeatureCard title="Policy Mode" description="Compare resolver behavior by mode" badge="onResolution">
                <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                        {(["runtime-only", "hybrid", "precomputed-only"] as const).map((policyMode) => (
                            <button
                                key={policyMode}
                                onClick={() => setMode(policyMode)}
                                className="rounded border border-zinc-600 px-3 py-1 text-xs text-zinc-300 light:text-zinc-700"
                            >
                                {policyMode}
                            </button>
                        ))}
                    </div>

                    <AutoSkeleton
                        loading={loading}
                        skeletonKey="ProductCard"
                        manifest={mockManifest}
                        policyOverride={{ mode }}
                        onResolution={onResolution}
                    >
                        <ProductCard />
                    </AutoSkeleton>

                    <button
                        onClick={() => setLoading((current) => !current)}
                        className="rounded bg-indigo-600 px-3 py-2 text-sm text-white"
                    >
                        Toggle Loading
                    </button>

                    <p
                        data-testid="resolver-loading-state"
                        className="inline-flex items-center rounded-full border border-zinc-700 bg-zinc-800/60 px-2 py-1 text-xs text-zinc-300 light:border-zinc-300 light:bg-zinc-100 light:text-zinc-700"
                    >
                        {loading ? "Preview state: skeleton loading" : "Preview state: real content"}
                    </p>

                    <p data-testid="resolver-event-count" className="text-xs text-zinc-500 light:text-zinc-600">
                        {events.length} events captured
                    </p>

                    <p data-testid="resolver-last-mode" className="text-xs text-zinc-500 light:text-zinc-600">
                        {events[0]?.policyMode ?? mode}
                    </p>

                    <p data-testid="resolver-last-source" className="text-xs text-zinc-500 light:text-zinc-600">
                        {events[0]?.source ?? "dynamic"}
                    </p>

                    <p className="text-xs text-zinc-500 light:text-zinc-600">
                        Last reason: {events[0]?.reason ?? "none"}
                    </p>
                </div>
            </FeatureCard>
        </div>
    );
}