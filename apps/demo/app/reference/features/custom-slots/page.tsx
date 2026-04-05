"use client";

import React, { useState } from "react";
import { AutoSkeleton } from "../../../../lib/ghostframe/react";
import { CodeBlock, FeatureCard, InteractiveToggle } from "../../../../lib/demo-components";

function ProductCardWithSlot() {
  return (
    <div className="flex gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4 light:border-zinc-200 light:bg-white">
      <div
        data-skeleton-slot="product-thumbnail"
        className="h-20 w-20 shrink-0 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600"
      />
      <div className="flex-1">
        <h3 className="mb-1 text-sm font-semibold text-white light:text-zinc-900">Premium Headphones</h3>
        <p className="mb-2 text-xs text-zinc-500 light:text-zinc-600">High-quality audio experience</p>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-emerald-400">$199</span>
          <span className="text-xs text-zinc-600 line-through">$249</span>
        </div>
      </div>
    </div>
  );
}

const customSlots = {
  "product-thumbnail": () => (
    <div className="h-20 w-20 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 animate-pulse" />
  ),
};

export default function CustomSlotsPage() {
  const [loading, setLoading] = useState(true);
  const [showSlots, setShowSlots] = useState(true);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="mb-2 text-4xl font-bold text-white light:text-zinc-900">Custom Slots</h1>
        <p className="text-lg text-zinc-500 light:text-zinc-600">
          Apply data-skeleton-slot for custom skeleton rendering on specific elements. Toggle ON passes
          slots and uses the custom renderer for product-thumbnail; toggle OFF passes undefined and falls
          back to auto-generated skeletons for the same content.
        </p>
      </header>

      <FeatureCard
        title="Interactive Example"
        description="Toggle loading and custom slot rendering"
        badge="Slot: product-thumbnail"
      >
        <div className="space-y-4">
          <InteractiveToggle
            label="Loading state"
            checked={loading}
            onChange={setLoading}
            description="Simulate a pending API state"
          />
          <InteractiveToggle
            label="Use custom slots"
            checked={showSlots}
            onChange={setShowSlots}
            description="ON: use custom product-thumbnail slot renderer. OFF: slots is undefined and AutoSkeleton falls back to auto-detected skeleton nodes."
          />

          <div className="border-t border-zinc-800 pt-4 light:border-zinc-200">
            <AutoSkeleton loading={loading} slots={showSlots ? customSlots : undefined}>
              <ProductCardWithSlot />
            </AutoSkeleton>
            <p className="mt-3 text-xs text-zinc-500 light:text-zinc-600">
              The underlying ProductCardWithSlot markup does not change. This toggle only changes skeleton
              rendering strategy.
            </p>
          </div>
        </div>
      </FeatureCard>

      <FeatureCard title="Code Example" description="Define slot key and pass slots to AutoSkeleton">
        <CodeBlock
          code={`<div data-skeleton-slot="product-thumbnail" className="h-20 w-20" />

const customSlots = {
  "product-thumbnail": () => <div className="h-20 w-20 rounded-lg animate-pulse" />,
};

<AutoSkeleton loading={loading} slots={customSlots}>
  <ProductCard />
</AutoSkeleton>`}
        />
      </FeatureCard>
    </div>
  );
}
