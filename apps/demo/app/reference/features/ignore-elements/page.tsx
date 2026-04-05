"use client";

import React, { useState } from "react";
import { AutoSkeleton } from "../../../../lib/ghostframe/react";
import { CodeBlock, FeatureCard, InteractiveToggle } from "../../../../lib/demo-components";

function ChatHistory() {
  return (
    <div className="flex h-64 flex-col overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 light:border-zinc-200 light:bg-white">
      <div className="flex-1 space-y-3 overflow-y-auto border-b border-zinc-800 p-4 light:border-zinc-200">
        <div className="flex gap-3">
          <div className="h-8 w-8 shrink-0 rounded-full bg-indigo-500" />
          <div className="flex-1">
            <p className="mb-1 text-sm font-semibold text-white light:text-zinc-900">Alex</p>
            <p className="text-sm text-zinc-400 light:text-zinc-600">How is the skeleton demo looking?</p>
          </div>
          <span className="text-xs text-zinc-600">2m ago</span>
        </div>
      </div>

      <div data-skeleton-ignore className="flex gap-2 border-t border-zinc-800 p-4 light:border-zinc-200">
        <input
          type="text"
          placeholder="Type a message..."
          className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-indigo-500 light:border-zinc-300 light:bg-zinc-50 light:text-zinc-900"
        />
        <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700">
          Send
        </button>
      </div>
    </div>
  );
}

export default function IgnoreElementsPage() {
  const [loading, setLoading] = useState(true);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="mb-2 text-4xl font-bold text-white light:text-zinc-900">Element Exclusion</h1>
        <p className="text-lg text-zinc-500 light:text-zinc-600">
          Use data-skeleton-ignore to keep interactive controls available during loading.
        </p>
      </header>

      <FeatureCard
        title="Interactive Example"
        description="The message input remains interactive while content is skeletonized"
        badge="Excluded: input area"
      >
        <div className="space-y-4">
          <InteractiveToggle
            label="Loading state"
            checked={loading}
            onChange={setLoading}
            description="Simulate pending chat history"
          />

          <div className="border-t border-zinc-800 pt-4 light:border-zinc-200">
            <AutoSkeleton loading={loading}>
              <ChatHistory />
            </AutoSkeleton>
          </div>
        </div>
      </FeatureCard>

      <FeatureCard title="Code Example" description="Exclude the input area from analyzer traversal">
        <CodeBlock
          code={`<AutoSkeleton loading={loading}>
  <div className="chat-container">
    <div className="messages">...</div>

    <div data-skeleton-ignore className="input-area">
      <input type="text" />
      <button>Send</button>
    </div>
  </div>
</AutoSkeleton>`}
        />
      </FeatureCard>
    </div>
  );
}
