"use client";

import React, { useState } from "react";
import { AutoSkeleton } from "../../../lib/ghostframe/react";
import { InteractiveToggle } from "../../../lib/demo-components";
import type { Blueprint } from "../../../lib/ghostframe/core";

function FastPathCard() {
  return (
    <article className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 light:border-zinc-200 light:bg-white">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-indigo-400 light:text-indigo-700">
            Precomputed runtime
          </p>
          <h3 className="mt-2 text-lg font-bold text-white light:text-zinc-900">No measurement pass required</h3>
        </div>
        <span className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold text-emerald-300 light:border-emerald-200 light:bg-emerald-50 light:text-emerald-700">
          Fast path
        </span>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-zinc-500 light:text-zinc-600">
        The runtime can show the skeleton immediately because the blueprint already exists.
      </p>

      <div className="mt-4 flex items-center gap-2">
        <button className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-700">
          Open details
        </button>
        <span className="text-xs text-zinc-500 light:text-zinc-600">Serialized from the server</span>
      </div>
    </article>
  );
}

export function PrecomputedBlueprintDemo({ blueprint }: { blueprint: Blueprint }) {
  const [loading, setLoading] = useState(true);
  const [measurements, setMeasurements] = useState(0);

  return (
    <div className="space-y-4">
      <InteractiveToggle
        label="Loading state"
        checked={loading}
        onChange={setLoading}
        description="Toggle the fast path skeleton on and off"
      />

      <AutoSkeleton
        loading={loading}
        blueprint={blueprint}
        onMeasured={() => setMeasurements((current) => current + 1)}
      >
        <FastPathCard />
      </AutoSkeleton>

      <div className="grid gap-2 rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-xs light:border-zinc-300 light:bg-zinc-100 sm:grid-cols-3">
        <div>
          <p className="text-zinc-500 light:text-zinc-600">Blueprint source</p>
          <p className="font-mono text-zinc-300 light:text-zinc-700">{blueprint.source}</p>
        </div>
        <div>
          <p className="text-zinc-500 light:text-zinc-600">Measured on client</p>
          <p className="font-mono text-zinc-300 light:text-zinc-700">{measurements}</p>
        </div>
        <div>
          <p className="text-zinc-500 light:text-zinc-600">Render mode</p>
          <p className="font-mono text-zinc-300 light:text-zinc-700">{blueprint.source === "static" ? "flow" : "absolute"}</p>
        </div>
      </div>

      <p className="text-sm text-zinc-500 light:text-zinc-600">
        Because the blueprint is already hydrated, the runtime skips the expensive measurement step and can render the
        loading state immediately.
      </p>
    </div>
  );
}