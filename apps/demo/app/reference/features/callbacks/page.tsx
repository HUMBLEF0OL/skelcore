"use client";

import React, { useMemo, useState } from "react";
import { AutoSkeleton } from "../../../../lib/ghostframe/react";
import { CodeBlock, FeatureCard } from "../../../../lib/demo-components";
import type { Blueprint } from "../../../../lib/ghostframe/core";

function CallbackSample() {
  return (
    <article className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 light:border-zinc-200 light:bg-white">
      <h3 className="mb-2 text-lg font-bold text-white light:text-zinc-900">Measurement Candidate</h3>
      <p className="mb-4 text-sm text-zinc-500 light:text-zinc-600">
        This content becomes the measurement target for AutoSkeleton.
      </p>
      <div className="space-y-2 text-sm text-zinc-400 light:text-zinc-600">
        <p>Title block and metadata</p>
        <p>Summary paragraph with body copy</p>
        <p>Call-to-action row</p>
      </div>
    </article>
  );
}

export default function CallbacksPage() {
  const [loading, setLoading] = useState(true);
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);

  const summary = useMemo(() => {
    if (!blueprint) {
      return null;
    }

    const countNodes = (nodes: Blueprint["nodes"]): number => {
      return nodes.reduce((total, node) => total + 1 + countNodes(node.children), 0);
    };

    return {
      topLevelNodes: blueprint.nodes.length,
      totalNodes: countNodes(blueprint.nodes),
      size: `${Math.round(blueprint.rootWidth)}x${Math.round(blueprint.rootHeight)}`,
      source: blueprint.source,
      capturedAt: new Date(blueprint.generatedAt).toLocaleTimeString(),
    };
  }, [blueprint]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="mb-2 text-4xl font-bold text-white light:text-zinc-900">Callbacks & Hooks</h1>
        <p className="text-lg text-zinc-500 light:text-zinc-600">
          Use onMeasured to inspect generated blueprints and wire analytics around skeleton generation.
        </p>
      </header>

      <FeatureCard
        title="Interactive Example"
        description="Trigger loading and inspect the latest measured blueprint"
        badge="onMeasured"
      >
        <div className="space-y-4">
          <AutoSkeleton loading={loading} onMeasured={setBlueprint} remeasureOnResize>
            <CallbackSample />
          </AutoSkeleton>

          <button
            onClick={() => setLoading((current) => !current)}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
          >
            {loading ? "Stop Loading" : "Start Loading"}
          </button>

          {summary ? (
            <div className="grid grid-cols-1 gap-2 rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-xs light:border-zinc-300 light:bg-zinc-100 sm:grid-cols-5">
              <div>
                <p className="text-zinc-500 light:text-zinc-600">Top-level nodes</p>
                <p className="font-mono text-zinc-300 light:text-zinc-700">{summary.topLevelNodes}</p>
              </div>
              <div>
                <p className="text-zinc-500 light:text-zinc-600">Total nodes</p>
                <p className="font-mono text-zinc-300 light:text-zinc-700">{summary.totalNodes}</p>
              </div>
              <div>
                <p className="text-zinc-500 light:text-zinc-600">Root size</p>
                <p className="font-mono text-zinc-300 light:text-zinc-700">{summary.size}</p>
              </div>
              <div>
                <p className="text-zinc-500 light:text-zinc-600">Blueprint source</p>
                <p className="font-mono text-zinc-300 light:text-zinc-700">{summary.source}</p>
              </div>
              <div>
                <p className="text-zinc-500 light:text-zinc-600">Captured</p>
                <p className="font-mono text-zinc-300 light:text-zinc-700">{summary.capturedAt}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-zinc-500 light:text-zinc-600">No blueprint captured yet. Toggle loading to trigger measurement.</p>
          )}
        </div>
      </FeatureCard>

      <FeatureCard title="Blueprint Inspector" description="Raw JSON payload from onMeasured">
        {blueprint ? (
          <pre className="max-h-80 overflow-auto rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-xs text-zinc-300 light:border-zinc-300 light:bg-zinc-100 light:text-zinc-700">
            {JSON.stringify(blueprint, null, 2)}
          </pre>
        ) : (
          <p className="text-sm text-zinc-500 light:text-zinc-600">Waiting for initial measurement.</p>
        )}
      </FeatureCard>

      <FeatureCard title="Code Example" description="Hook into generated blueprints">
        <CodeBlock
          code={`const [blueprint, setBlueprint] = useState<Blueprint | null>(null);

<AutoSkeleton
  loading={loading}
  onMeasured={(nextBlueprint) => {
    setBlueprint(nextBlueprint);
    console.log("Measured", nextBlueprint.nodes.length, "nodes");
  }}
>
  <YourComponent />
</AutoSkeleton>`}
        />
      </FeatureCard>
    </div>
  );
}