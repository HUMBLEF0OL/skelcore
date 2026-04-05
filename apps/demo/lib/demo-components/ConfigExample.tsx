"use client";

import React, { useState } from "react";
import type { SkeletonConfig } from "../ghostframe/core";
import { AutoSkeleton } from "../ghostframe/react";

interface ConfigExampleProps {
  configName: string;
  config: Partial<SkeletonConfig>;
  children: React.ReactNode;
  description?: string;
}

export function ConfigExample({ configName, config, children, description }: ConfigExampleProps) {
  const [loading, setLoading] = useState(true);

  return (
    <div className="space-y-3">
      {description ? <p className="text-sm text-zinc-500 light:text-zinc-600">{description}</p> : null}

      <div className="mb-2 flex items-center gap-2">
        <span className="font-mono text-xs uppercase text-zinc-500 light:text-zinc-400">{configName}</span>
        <button
          onClick={() => setLoading((current) => !current)}
          className="rounded bg-indigo-500/20 px-2 py-1 text-xs text-indigo-300 transition-colors hover:bg-indigo-500/30 light:bg-indigo-50 light:text-indigo-700 light:hover:bg-indigo-100"
        >
          {loading ? "Loading" : "Reset"}
        </button>
      </div>

      <AutoSkeleton loading={loading} config={config}>
        {children}
      </AutoSkeleton>
    </div>
  );
}