"use client";

import React, { useState } from "react";
import { AutoSkeleton } from "../../../../lib/ghostframe/react";
import { FeatureCard, InteractiveToggle } from "../../../../lib/demo-components";

function NoSkeletonPanel() {
    return (
        <article
            data-testid="compare-no-skeleton"
            className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4 light:border-zinc-200 light:bg-white"
        >
            <header data-no-skeleton className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-white light:text-zinc-900">data-no-skeleton region</h3>
                <button className="rounded bg-indigo-600 px-2 py-1 text-xs font-medium text-white">Action</button>
            </header>
            <p className="text-sm text-zinc-400 light:text-zinc-600">
                Entire header region stays visible while surrounding content is skeletonized.
            </p>
            <p className="text-xs text-zinc-500 light:text-zinc-600">Scope: full region opt-out.</p>
        </article>
    );
}

function SkeletonIgnorePanel() {
    return (
        <article
            data-testid="compare-skeleton-ignore"
            className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4 light:border-zinc-200 light:bg-white"
        >
            <header className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-white light:text-zinc-900">data-skeleton-ignore target</h3>
                <button data-skeleton-ignore className="rounded bg-indigo-600 px-2 py-1 text-xs font-medium text-white">
                    Action
                </button>
            </header>
            <p className="text-sm text-zinc-400 light:text-zinc-600">
                Only marked controls stay interactive while parent content can still be measured.
            </p>
            <p className="text-xs text-zinc-500 light:text-zinc-600">Scope: targeted element opt-out.</p>
        </article>
    );
}

export default function NoSkeletonVsIgnorePage() {
    const [loading, setLoading] = useState(true);

    return (
        <div className="space-y-6">
            <header>
                <h1 className="mb-2 text-4xl font-bold text-white light:text-zinc-900">data-no-skeleton vs data-skeleton-ignore</h1>
                <p className="text-lg text-zinc-500 light:text-zinc-600">
                    Compare exclusion scopes for always-visible regions versus specific interactive controls.
                </p>
            </header>

            <FeatureCard title="Loading Toggle" description="Switch loading to compare behavior" badge="comparison">
                <InteractiveToggle
                    label="Loading state"
                    checked={loading}
                    onChange={setLoading}
                    description="Observe each panel while skeleton overlay is active"
                />
            </FeatureCard>

            <FeatureCard title="Behavior Comparison" description="Side-by-side semantics" badge="attributes">
                <div className="grid gap-4 md:grid-cols-2">
                    <AutoSkeleton loading={loading}>
                        <NoSkeletonPanel />
                    </AutoSkeleton>
                    <AutoSkeleton loading={loading}>
                        <SkeletonIgnorePanel />
                    </AutoSkeleton>
                </div>
            </FeatureCard>
        </div>
    );
}
