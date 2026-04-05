"use client";

import React, { useState } from "react";
import { AutoSkeleton } from "../../../../lib/ghostframe/react";
import { CodeBlock, FeatureCard } from "../../../../lib/demo-components";

function FallbackContent() {
    return (
        <article className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 light:border-zinc-200 light:bg-white">
            <h3 className="mb-2 text-lg font-bold text-white light:text-zinc-900">Fallback Demo Card</h3>
            <p className="text-sm text-zinc-500 light:text-zinc-600">
                Primary content that gets measured for skeleton rendering.
            </p>
        </article>
    );
}

export default function FallbackFeaturePage() {
    const [loading, setLoading] = useState(false);
    const [showFallbackPreview, setShowFallbackPreview] = useState(false);

    function handleToggleLoading() {
        setLoading((current) => {
            const next = !current;

            if (next) {
                setShowFallbackPreview(true);
                window.setTimeout(() => {
                    setShowFallbackPreview(false);
                }, 800);
            } else {
                setShowFallbackPreview(false);
            }

            return next;
        });
    }

    return (
        <div className="space-y-6">
            <header>
                <h1 className="mb-2 text-4xl font-bold text-white light:text-zinc-900">Fallback Prop</h1>
                <p className="text-lg text-zinc-500 light:text-zinc-600">
                    Use a custom placeholder while AutoSkeleton is in the measuring phase.
                </p>
            </header>

            <FeatureCard
                title="Interactive Example"
                description="Fallback appears before blueprint resolves"
                badge="fallback"
            >
                <div className="space-y-4">
                    {showFallbackPreview && loading && (
                        <div
                            data-testid="fallback-preview"
                            className="rounded-lg bg-indigo-500/20 p-3 text-sm text-indigo-200 light:text-indigo-700"
                        >
                            Custom fallback preview
                        </div>
                    )}

                    <AutoSkeleton
                        loading={loading}
                        fallback={
                            <div className="rounded-lg bg-indigo-500/20 p-3 text-sm text-indigo-200 light:text-indigo-700">
                                Custom fallback preview
                            </div>
                        }
                    >
                        <FallbackContent />
                    </AutoSkeleton>

                    <button
                        onClick={handleToggleLoading}
                        className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
                    >
                        {loading ? "Stop Loading" : "Start Loading"}
                    </button>
                </div>
            </FeatureCard>

            <FeatureCard title="Code Example" description="Pass fallback node to AutoSkeleton">
                <CodeBlock
                    code={`<AutoSkeleton loading={loading} fallback={<Spinner />}>
  <Card />
</AutoSkeleton>`}
                />
            </FeatureCard>
        </div>
    );
}