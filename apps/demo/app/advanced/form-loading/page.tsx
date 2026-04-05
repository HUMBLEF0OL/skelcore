"use client";

import React, { useState } from "react";
import { AutoSkeleton } from "../../../lib/ghostframe/react";
import { CodeBlock, FeatureCard } from "../../../lib/demo-components";

function CheckoutFormFields() {
  return (
    <form className="mx-auto max-w-lg space-y-4 rounded-xl border border-zinc-800 bg-zinc-900 p-6 light:border-zinc-200 light:bg-white">
      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-400 light:text-zinc-600">Full Name</label>
        <input
          data-skeleton-ignore
          type="text"
          placeholder="Enter your name"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-indigo-500 light:border-zinc-300 light:bg-zinc-50 light:text-zinc-900"
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-zinc-400 light:text-zinc-600">Email</label>
        <input
          data-skeleton-ignore
          type="email"
          placeholder="your@email.com"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-indigo-500 light:border-zinc-300 light:bg-zinc-50 light:text-zinc-900"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-400 light:text-zinc-600">City</label>
          <input
            data-skeleton-ignore
            type="text"
            placeholder="City"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-indigo-500 light:border-zinc-300 light:bg-zinc-50 light:text-zinc-900"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-400 light:text-zinc-600">ZIP</label>
          <input
            data-skeleton-ignore
            type="text"
            placeholder="12345"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white outline-none transition-colors focus:border-indigo-500 light:border-zinc-300 light:bg-zinc-50 light:text-zinc-900"
          />
        </div>
      </div>

      <button
        data-skeleton-ignore
        type="button"
        className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
      >
        Submit Order
      </button>
    </form>
  );
}

export default function FormLoadingPage() {
  const [loading, setLoading] = useState(true);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="mb-2 text-3xl font-bold text-white light:text-zinc-900">Forms & Loading</h1>
        <p className="text-zinc-500 light:text-zinc-600">
          Keep inputs interactive with data-skeleton-ignore while surrounding regions remain skeletonized.
        </p>
      </header>

      <FeatureCard title="Interactive Checkout Pattern" description="Toggle loading without blocking user input" badge="form-loading">
        <div className="space-y-4">
          <button
            onClick={() => setLoading((current) => !current)}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
          >
            {loading ? "Complete Loading" : "Restart Loading"}
          </button>

          <AutoSkeleton loading={loading}>
            <CheckoutFormFields />
          </AutoSkeleton>
        </div>
      </FeatureCard>

      <FeatureCard title="Implementation Snippet" description="Ignore specific controls during measurement">
        <CodeBlock
          code={`<AutoSkeleton loading={loading}>
  <form>
    <input data-skeleton-ignore />
    <input data-skeleton-ignore />
    <button data-skeleton-ignore type="submit">Submit</button>
  </form>
</AutoSkeleton>`}
        />
      </FeatureCard>
    </div>
  );
}