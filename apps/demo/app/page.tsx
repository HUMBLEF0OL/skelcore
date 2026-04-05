"use client";

import Link from "next/link";
import { useMemo } from "react";
import { AutoSkeleton } from "../lib/ghostframe/react";
import type { SkeletonConfig } from "../lib/ghostframe/core";

type GuideLink = {
  title: string;
  description: string;
  href: string;
};

const coreRoutes: GuideLink[] = [
  {
    title: "Reference Overview",
    description: "Start with architecture, feature documentation, and implementation guidance.",
    href: "/reference",
  },
  {
    title: "Configuration Playground",
    description: "Tune runtime configuration values and verify behavior against realistic content.",
    href: "/config-playground",
  },
  {
    title: "SSR and Precomputed Blueprints",
    description: "Review server-rendered and precomputed blueprint integration patterns.",
    href: "/reference/ssr",
  },
  {
    title: "CLI Workflow",
    description: "Capture, validate, diff, report, and rollout with production quality gates.",
    href: "/reference/cli-workflow",
  },
];

const featureRoutes: GuideLink[] = [
  {
    title: "Custom Slots",
    description: "Override specific UI regions with tailored skeleton components.",
    href: "/reference/features/custom-slots",
  },
  {
    title: "Element Exclusion",
    description: "Keep selected controls interactive by excluding them from skeleton rendering.",
    href: "/reference/features/ignore-elements",
  },
  {
    title: "Responsive Behavior",
    description: "Regenerate measurements when layout size changes with resize-aware options.",
    href: "/reference/features/responsive",
  },
  {
    title: "Callbacks and Hooks",
    description: "Inspect measured blueprint output for diagnostics and instrumentation.",
    href: "/reference/features/callbacks",
  },
  {
    title: "Blueprint Caching",
    description: "Reuse compatible blueprints to reduce repeated measurement cost.",
    href: "/reference/features/caching",
  },
  {
    title: "Fallback Prop",
    description: "Render custom placeholder UI while the runtime performs measurement work.",
    href: "/reference/features/fallback",
  },
  {
    title: "Resolver Policy",
    description: "Compare runtime-only, hybrid, and precomputed-only resolution paths.",
    href: "/reference/features/resolver-policy",
  },
  {
    title: "Rollout Telemetry",
    description: "Track route-level resolver outcomes and rollout behavior over time.",
    href: "/reference/features/rollout-telemetry",
  },
  {
    title: "Manifest Parse and Validation",
    description: "Validate manifest parsing rules, diagnostics, and rejection cases.",
    href: "/reference/features/manifest-parse-validation",
  },
  {
    title: "No Skeleton vs Ignore",
    description: "Understand the difference between full-region opt-out and selective exclusion.",
    href: "/reference/features/no-skeleton-vs-ignore",
  },
];

function GuideCard({ item }: { item: GuideLink }) {
  return (
    <Link
      href={item.href}
      className="group rounded-xl border border-zinc-800 bg-zinc-900 p-5 transition-colors hover:border-indigo-500/50 light:border-zinc-200 light:bg-white light:hover:border-indigo-300"
    >
      <h3 className="text-base font-semibold text-white transition-colors group-hover:text-indigo-300 light:text-zinc-900 light:group-hover:text-indigo-700">
        {item.title}
      </h3>
      <p className="mt-2 text-sm text-zinc-500 light:text-zinc-600">{item.description}</p>
    </Link>
  );
}

function PreviewCard() {
  return (
    <article className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 light:border-zinc-200 light:bg-white">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 light:text-zinc-600">Guide Preview</p>
          <h3 className="mt-1 text-lg font-semibold text-white light:text-zinc-900">Runtime Measurement Card</h3>
        </div>
        <button
          type="button"
          data-no-skeleton
          className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs font-medium text-zinc-300 light:border-zinc-300 light:bg-zinc-50 light:text-zinc-700"
        >
          Interactive Control
        </button>
      </div>
      <p className="mt-4 text-sm text-zinc-500 light:text-zinc-600">
        This sample keeps one control interactive during loading and demonstrates guide-ready production patterns.
      </p>
    </article>
  );
}

export default function Home() {
  const runtimeConfig: Partial<SkeletonConfig> = useMemo(
    () => ({
      animation: "shimmer",
      speed: 1,
      borderRadius: 10,
    }),
    [],
  );

  return (
    <div className="app-surface guide-page">
      <main className="app-content guide-flow">
        <header className="guide-header rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-900 to-indigo-950 p-7 light:border-zinc-200 light:from-white light:via-zinc-50 light:to-indigo-50">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300 light:text-indigo-700">Developer Guide</p>
          <h1 className="guide-title font-bold text-white light:text-zinc-900">Ghostframe Official Guide</h1>
          <p className="max-w-3xl text-sm text-zinc-400 light:text-zinc-600 sm:text-base">
            This guide provides implementation, validation, and operational workflows for adopting Ghostframe in production React systems.
          </p>
        </header>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 light:border-zinc-200 light:bg-white">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/reference/features"
              className="rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-300 transition-colors hover:border-zinc-500 light:border-zinc-300 light:bg-white light:text-zinc-700 light:hover:border-zinc-400"
            >
              Open Feature Index
            </Link>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white light:text-zinc-900">Core Guide Sections</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {coreRoutes.map((item) => (
              <GuideCard key={item.href} item={item} />
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white light:text-zinc-900">Feature Coverage</h2>
          <p className="text-sm text-zinc-500 light:text-zinc-600">
            Every feature offered by the package is documented with dedicated examples and route-level references.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {featureRoutes.map((item) => (
              <GuideCard key={item.href} item={item} />
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-white light:text-zinc-900">Live Runtime Preview</h2>
          <AutoSkeleton loading={false} config={runtimeConfig}>
            <PreviewCard />
          </AutoSkeleton>
        </section>
      </main>
    </div>
  );
}
