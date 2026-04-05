import React from "react";
import { generateStaticBlueprint } from "@ghostframe/ghostframe/runtime";
import { CodeBlock, FeatureCard } from "../../../lib/demo-components";
import { PrecomputedBlueprintDemo } from "./PrecomputedBlueprintDemo";

function createStaticBlueprintTree() {
  return (
    <article className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 light:border-zinc-200 light:bg-white">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-indigo-400 light:text-indigo-700">
            Static product card
          </p>
          <h3 className="mt-2 text-lg font-bold text-white light:text-zinc-900">Build once, reuse everywhere</h3>
        </div>
        <span className="shrink-0 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2 py-1 text-[11px] font-semibold text-indigo-300 light:border-indigo-200 light:bg-indigo-50 light:text-indigo-700">
          SSR-ready
        </span>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-zinc-500 light:text-zinc-600">
        The same tree can be serialized on the server, cached at the edge, and handed to the client without waiting for
        a measurement pass.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white">Preview</button>
        <span className="text-xs text-zinc-500 light:text-zinc-600">Generated from static markup</span>
      </div>
    </article>
  );
}

const staticBlueprint = generateStaticBlueprint(createStaticBlueprintTree());

const staticUsageCode = `import { generateStaticBlueprint } from "@ghostframe/ghostframe/runtime";
import { AutoSkeleton } from "@ghostframe/ghostframe";

const blueprint = generateStaticBlueprint(
  <article>
    <h3>Build once, reuse everywhere</h3>
    <p>Serialize the loading structure on the server.</p>
  </article>
);

export function ProductPreview({ loading }: { loading: boolean }) {
  return (
    <AutoSkeleton loading={loading} blueprint={blueprint}>
      <ProductCard />
    </AutoSkeleton>
  );
}`;

const recommendedPipelineCode = `// server.tsx (RSC)
import { generateStaticBlueprint } from "@skelcore/core";

const blueprint = generateStaticBlueprint(
  <article>
    <h3>Build once, reuse everywhere</h3>
    <p>Serialize loading structure on the server.</p>
  </article>
);

// client.tsx
import { AutoSkeleton } from "@skelcore/react";

<AutoSkeleton
  loading={loading}
  hydrateBlueprint={blueprint}
  blueprintSource="server"
  blueprintCachePolicy={{ version: 1, ttlMs: 5 * 60_000 }}
  measurementPolicy={{ mode: "idle", budgetMs: 12 }}
  onBlueprintInvalidated={(reason) => console.warn(reason)}
>
  <ProductCard />
</AutoSkeleton>;`;

export default function SsrReferencePage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="mb-2 text-4xl font-bold text-white light:text-zinc-900">SSR & Static Blueprints</h1>
        <p className="text-lg text-zinc-500 light:text-zinc-600">
          Generate a blueprint before hydration, then hand the runtime a precomputed structure for the first paint.
        </p>
      </header>

      <FeatureCard
        title="Server-generated blueprint"
        description="Serialize the loading structure on the server or at build time and reuse it across requests"
        badge={`Nodes: ${staticBlueprint.nodes.length}`}
      >
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 light:border-zinc-200 light:bg-zinc-50">
            {createStaticBlueprintTree()}
          </div>

          <div className="space-y-3">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 light:border-zinc-200 light:bg-zinc-50">
              <p className="text-xs font-mono uppercase tracking-wider text-zinc-500 light:text-zinc-600">Blueprint summary</p>
              <div className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
                <div>
                  <p className="text-zinc-500 light:text-zinc-600">Source</p>
                  <p className="font-mono text-zinc-300 light:text-zinc-700">{staticBlueprint.source}</p>
                </div>
                <div>
                  <p className="text-zinc-500 light:text-zinc-600">Nodes</p>
                  <p className="font-mono text-zinc-300 light:text-zinc-700">{staticBlueprint.nodes.length}</p>
                </div>
                <div>
                  <p className="text-zinc-500 light:text-zinc-600">Mode</p>
                  <p className="font-mono text-zinc-300 light:text-zinc-700">flow</p>
                </div>
              </div>
            </div>

            <ul className="space-y-2 text-sm text-zinc-500 light:text-zinc-600">
              <li>Useful for SSR and SSG when the loading structure is stable.</li>
              <li>Pairs well with cache headers and edge reuse.</li>
              <li>Removes the first client measurement pass from the critical path.</li>
            </ul>
          </div>
        </div>
      </FeatureCard>

      <FeatureCard
        title="Precomputed blueprint handoff"
        description="The runtime receives the blueprint directly and uses the fast path immediately"
        badge="Fast path"
      >
        <PrecomputedBlueprintDemo blueprint={staticBlueprint} />
      </FeatureCard>

      <FeatureCard title="Integration example" description="Minimal server-side usage pattern for real apps">
        <CodeBlock code={staticUsageCode} />
      </FeatureCard>

      <FeatureCard
        title="Recommended Next.js pipeline"
        description="Validate server blueprints, apply cache guards, and defer costly remeasurements"
      >
        <div className="space-y-3">
          <ul className="space-y-2 text-sm text-zinc-500 light:text-zinc-600">
            <li>Send `hydrateBlueprint` from server output and set `blueprintSource=&quot;server&quot;`.</li>
            <li>Use `blueprintCachePolicy` to enforce schema versions and expiry.</li>
            <li>Choose `measurementPolicy` per section priority (`eager`, `idle`, `viewport`, `manual`).</li>
            <li>Handle `onBlueprintInvalidated` to track drift and fallback behavior.</li>
          </ul>

          <CodeBlock code={recommendedPipelineCode} />
        </div>
      </FeatureCard>
    </div>
  );
}