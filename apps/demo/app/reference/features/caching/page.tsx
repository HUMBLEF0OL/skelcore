"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import { AutoSkeleton } from "../../../../lib/ghostframe/react";
import { CodeBlock, FeatureCard } from "../../../../lib/demo-components";
import type { Blueprint, BlueprintNode } from "../../../../lib/ghostframe/core";

function signatureForNode(node: BlueprintNode): string {
  const childSignatures = node.children.map(signatureForNode).join(",");
  return `${node.tagName}:${node.role}:${node.children.length}[${childSignatures}]`;
}

function signatureForBlueprint(blueprint: Blueprint): string {
  return `${Math.round(blueprint.rootWidth)}x${Math.round(blueprint.rootHeight)}|${blueprint.nodes
    .map(signatureForNode)
    .join("|")}`;
}

function ProfileCard() {
  return (
    <article className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 light:border-zinc-200 light:bg-white">
      <div className="mb-4 flex items-center gap-4">
        <div className="h-16 w-16 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500" />
        <div>
          <h3 className="text-lg font-bold text-white light:text-zinc-900">Jane Doe</h3>
          <p className="text-sm text-zinc-500 light:text-zinc-600">Staff Engineer</p>
        </div>
      </div>
      <div className="space-y-1 text-sm text-zinc-400 light:text-zinc-600">
        <p>Member since 2022</p>
        <p>142 contributions</p>
        <p>3 active projects</p>
      </div>
    </article>
  );
}

export default function CachingPage() {
  const [loading, setLoading] = useState(false);
  const [lastMeasureMs, setLastMeasureMs] = useState<number | null>(null);
  const [cacheHit, setCacheHit] = useState<boolean | null>(null);
  const knownSignatures = useRef<Set<string>>(new Set());
  const pendingStart = useRef<number | null>(null);

  const badge = useMemo(() => {
    if (cacheHit === null) {
      return "No sample yet";
    }
    return cacheHit ? "Cache HIT" : "Cache MISS";
  }, [cacheHit]);

  async function triggerRefresh() {
    setLastMeasureMs(null);
    setCacheHit(null);
    pendingStart.current = performance.now();
    setLoading(true);
    await new Promise((resolve) => window.setTimeout(resolve, 900));
    setLoading(false);
  }

  const handleMeasured = useCallback((blueprint: Blueprint) => {
    const signature = signatureForBlueprint(blueprint);
    const seen = knownSignatures.current.has(signature);
    knownSignatures.current.add(signature);
    setCacheHit(seen);

    if (pendingStart.current !== null) {
      setLastMeasureMs(performance.now() - pendingStart.current);
    }
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="mb-2 text-4xl font-bold text-white light:text-zinc-900">Blueprint Caching</h1>
        <p className="text-lg text-zinc-500 light:text-zinc-600">
          Repeated layouts benefit from structural cache reuse, reducing expensive re-generation work.
        </p>
      </header>

      <FeatureCard title="Interactive Example" description="Reload the same structure to observe cache reuse" badge={badge}>
        <div className="space-y-4">
          <AutoSkeleton
            loading={loading}
            onMeasured={handleMeasured}
          >
            <ProfileCard />
          </AutoSkeleton>

          <button
            onClick={triggerRefresh}
            disabled={loading}
            className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-zinc-700"
          >
            {loading ? "Refreshing..." : "Trigger Refresh"}
          </button>

          <div className="grid grid-cols-1 gap-2 rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-xs light:border-zinc-300 light:bg-zinc-100 sm:grid-cols-2">
            <div>
              <p className="text-zinc-500 light:text-zinc-600">Last cycle duration</p>
              <p className="font-mono text-zinc-300 light:text-zinc-700">
                {lastMeasureMs === null ? "--" : `${lastMeasureMs.toFixed(2)}ms`}
              </p>
            </div>
            <div>
              <p className="text-zinc-500 light:text-zinc-600">Cache status</p>
              <p className="font-mono text-zinc-300 light:text-zinc-700">
                {cacheHit === null ? "Pending" : cacheHit ? "HIT" : "MISS"}
              </p>
            </div>
          </div>
        </div>
      </FeatureCard>

      <FeatureCard title="Code Example" description="Structural signatures for repeat layouts">
        <CodeBlock
          code={`<AutoSkeleton
  loading={loading}
  onMeasured={(blueprint) => {
    const signature = signatureForBlueprint(blueprint);
    const hit = cacheSet.has(signature);
    cacheSet.add(signature);
  }}
>
  <UserProfile />
</AutoSkeleton>`}
        />
      </FeatureCard>
    </div>
  );
}