"use client";

import React, { useState } from "react";
import { AutoSkeleton } from "../../../../lib/ghostframe/react";
import { CodeBlock, FeatureCard, InteractiveToggle } from "../../../../lib/demo-components";

function ResponsiveCard({ width }: { width: number }) {
  const isWide = width >= 340;

  return (
    <div
      className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 transition-all light:border-zinc-200 light:bg-white"
      style={{ width, maxWidth: "100%" }}
    >
      {isWide ? (
        <div className="flex gap-4">
          <div className="h-20 w-20 shrink-0 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600" />
          <div className="flex-1">
            <h3 className="mb-1 text-sm font-semibold text-white light:text-zinc-900">Adaptive Product Card</h3>
            <p className="mb-3 text-xs text-zinc-500 light:text-zinc-600">Desktop breakpoint layout</p>
            <p className="text-sm font-bold text-emerald-400">$129.00</p>
          </div>
        </div>
      ) : (
        <div>
          <div className="mb-3 h-24 w-full rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600" />
          <h3 className="mb-1 text-sm font-semibold text-white light:text-zinc-900">Adaptive Product Card</h3>
          <p className="mb-2 text-xs text-zinc-500 light:text-zinc-600">Mobile breakpoint layout</p>
          <p className="text-sm font-bold text-emerald-400">$129.00</p>
        </div>
      )}
    </div>
  );
}

export default function ResponsivePage() {
  const [loading, setLoading] = useState(true);
  const [remeasureOnResize, setRemeasureOnResize] = useState(true);
  const [width, setWidth] = useState(420);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="mb-2 text-4xl font-bold text-white light:text-zinc-900">Responsive Behavior</h1>
        <p className="text-lg text-zinc-500 light:text-zinc-600">
          Use remeasureOnResize to keep skeleton geometry aligned as the container width changes.
        </p>
      </header>

      <FeatureCard
        title="Interactive Example"
        description="Resize the card width and compare skeleton behavior"
        badge="remeasureOnResize"
      >
        <div className="space-y-4">
          <InteractiveToggle
            label="Loading state"
            checked={loading}
            onChange={setLoading}
            description="Simulate API latency"
          />
          <InteractiveToggle
            label="Enable remeasureOnResize"
            checked={remeasureOnResize}
            onChange={setRemeasureOnResize}
            description="When disabled, skeleton geometry does not reflow on resize"
          />

          <div className="border-t border-zinc-800 pt-4 light:border-zinc-200">
            <label className="mb-2 block text-xs font-mono text-zinc-500 light:text-zinc-600">Width: {width}px</label>
            <input
              type="range"
              min={220}
              max={520}
              value={width}
              onChange={(event) => setWidth(Number(event.target.value))}
              className="mb-4 w-full"
            />

            <div style={{ width, maxWidth: "100%" }}>
              <AutoSkeleton loading={loading} remeasureOnResize={remeasureOnResize}>
                <ResponsiveCard width={width} />
              </AutoSkeleton>
            </div>
          </div>
        </div>
      </FeatureCard>

      <FeatureCard title="Code Example" description="Typical responsive configuration">
        <CodeBlock
          code={`<AutoSkeleton
  loading={loading}
  remeasureOnResize={true}
>
  <ResponsiveCard />
</AutoSkeleton>

// Apply width to the measured wrapper
<div style={{ width }}>
  <AutoSkeleton loading={loading} remeasureOnResize={true}>
    <ResponsiveCard />
  </AutoSkeleton>
</div>`}
        />
      </FeatureCard>
    </div>
  );
}