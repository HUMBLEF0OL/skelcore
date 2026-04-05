"use client";

import React, { useState } from "react";
import {
  AutoSkeleton,
  asStructuralHash,
  type BlueprintManifest,
  type ResolutionEvent,
} from "@ghostframe/ghostframe";
import { FeatureCard } from "../../lib/demo-components";

// Mock manifest for demo (would be loaded from server in real app)
const mockManifest: BlueprintManifest = {
  manifestVersion: 1,
  packageVersion: "0.1.0",
  build: {
    builtAt: Date.now(),
    appVersion: "1.0.0",
    commitSha: "demo123abc",
  },
  defaults: { ttlMs: 86400000 },
  entries: {
    ProductCard: {
      key: "ProductCard",
      blueprint: {
        version: 1,
        rootWidth: 300,
        rootHeight: 200,
        nodes: [],
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
    <article className="h-52 max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 p-4 light:border-zinc-200 light:bg-white">
      <div className="mb-4 h-24 rounded-md bg-gradient-to-br from-indigo-500 to-violet-600" />
      <div className="space-y-2">
        <div className="h-3 w-4/5 rounded bg-zinc-700 light:bg-zinc-200" />
        <div className="h-3 w-2/3 rounded bg-zinc-700 light:bg-zinc-200" />
      </div>
    </article>
  );
}

export default function TestPage(): React.ReactElement {
  const [loading, setLoading] = useState(true);
  const [policyMode, setPolicyMode] = useState<"runtime-only" | "hybrid" | "precomputed-only">(
    "hybrid"
  );
  const [resolutionEvents, setResolutionEvents] = useState<ResolutionEvent[]>([]);

  React.useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleResolution = (event: ResolutionEvent) => {
    setResolutionEvents((prev) => [event, ...prev.slice(0, 9)]);
  };

  return (
    <div className="app-surface guide-page">
      <main className="app-content guide-flow">
        <header className="guide-header">
          <h1 className="guide-title font-bold text-white light:text-zinc-900">Phase 2: Manifest and Policy Demo</h1>
          <p className="text-zinc-500 light:text-zinc-600">
            Test precomputed manifest resolution with runtime-only, hybrid, and precomputed-only policies.
          </p>
        </header>

        <FeatureCard title="Policy Mode" description="Switch resolver behavior for the same component" badge="Resolution">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              {(["runtime-only", "hybrid", "precomputed-only"] as const).map((mode) => (
                <label key={mode} className="flex items-center gap-2 rounded border border-zinc-700 px-3 py-2 text-sm text-zinc-300 light:border-zinc-300 light:text-zinc-700">
                  <input
                    type="radio"
                    checked={policyMode === mode}
                    onChange={() => setPolicyMode(mode)}
                    className="cursor-pointer"
                  />
                  <span className="cursor-pointer">{mode}</span>
                </label>
              ))}
            </div>

            <p className="text-xs text-zinc-500 light:text-zinc-600">
              runtime-only: dynamic measurement only. hybrid: manifest first, dynamic fallback. precomputed-only:
              manifest required.
            </p>
          </div>
        </FeatureCard>

        <FeatureCard title="Component with Manifest" description="AutoSkeleton resolves using the selected policy">
          <AutoSkeleton
            loading={loading}
            skeletonKey="ProductCard"
            manifest={mockManifest}
            policyOverride={{ mode: policyMode }}
            onResolution={handleResolution}
          >
            <ProductCard />
          </AutoSkeleton>
        </FeatureCard>

        <FeatureCard title="Resolution Events" description="Latest resolver decisions from onResolution" badge="Log">
          {resolutionEvents.length === 0 ? (
            <p className="text-sm text-zinc-500 light:text-zinc-600">No events yet</p>
          ) : (
            <div className="flex flex-col gap-2">
              {resolutionEvents.map((event, idx) => (
                <div
                  key={idx}
                  className="rounded border border-zinc-700 bg-zinc-950 p-2 font-mono text-xs text-zinc-300 light:border-zinc-300 light:bg-zinc-50 light:text-zinc-700"
                >
                  <span className="font-semibold text-indigo-300 light:text-indigo-700">{event.source}</span> | {event.reason}
                </div>
              ))}
            </div>
          )}
        </FeatureCard>

        <FeatureCard title="About This Demo" description="What this page validates" badge="Notes">
          <ul className="list-disc space-y-1 pl-5 text-sm text-zinc-400 light:text-zinc-700">
            <li>Component starts with a 2-second loading phase to simulate async content.</li>
            <li>Manifest entries are considered before dynamic fallback based on policy mode.</li>
            <li>Resolution events show which source was chosen and why.</li>
            <li>Production artifacts are precomputed at build time and served as static JSON.</li>
          </ul>
        </FeatureCard>

        <div>
          <button
            onClick={() => setLoading(!loading)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
          >
            Toggle Loading ({loading ? "loading" : "loaded"})
          </button>
        </div>
      </main>
    </div>
  );
}
