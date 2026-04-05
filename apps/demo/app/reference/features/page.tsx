import Link from "next/link";

const features = [
  {
    slug: "custom-slots",
    title: "Custom Slots",
    description: "Replace specific elements with custom skeleton UI via data-skeleton-slot.",
    marker: "F01",
  },
  {
    slug: "ignore-elements",
    title: "Element Exclusion",
    description: "Keep interactive controls active with data-skeleton-ignore.",
    marker: "F02",
  },
  {
    slug: "responsive",
    title: "Responsive Behavior",
    description: "Re-measure blueprints on resize with remeasureOnResize.",
    marker: "F03",
  },
  {
    slug: "callbacks",
    title: "Callbacks & Hooks",
    description: "Inspect generated blueprints with onMeasured.",
    marker: "F04",
  },
  {
    slug: "caching",
    title: "Blueprint Caching",
    description: "Understand structural blueprint reuse for repeated layouts.",
    marker: "F05",
  },
  {
    slug: "fallback",
    title: "Fallback Prop",
    description: "Render a custom fallback while AutoSkeleton measures the target.",
    marker: "F06",
  },
  {
    slug: "resolver-policy",
    title: "Resolver Policy",
    description: "Compare runtime-only, hybrid, and precomputed-only resolution behavior.",
    marker: "F07",
  },
  {
    slug: "rollout-telemetry",
    title: "Rollout Telemetry Collector",
    description: "Inspect route-level resolver counters and rollout ratios.",
    marker: "F08",
  },
  {
    slug: "manifest-parse-validation",
    title: "Manifest Parse & Validation",
    description: "Exercise parseManifest diagnostics with valid and invalid input.",
    marker: "F09",
  },
  {
    slug: "no-skeleton-vs-ignore",
    title: "No Skeleton vs Ignore",
    description: "Compare full-region opt-out with targeted control exclusion behavior.",
    marker: "F10",
  },
];

export default function FeaturesPage() {
  return (
    <div className="guide-flow">
      <header className="guide-header">
        <h1 className="guide-title font-bold text-white light:text-zinc-900">Features</h1>
        <p className="text-lg text-zinc-500 light:text-zinc-600">
          Interactive examples for every feature available in the runtime.
        </p>
      </header>

      <div className="grid gap-4">
        {features.map((feature) => (
          <Link
            key={feature.slug}
            href={`/reference/features/${feature.slug}`}
            className="group rounded-xl border border-zinc-800 bg-zinc-900 p-6 transition-colors hover:border-indigo-500/50 light:border-zinc-200 light:bg-zinc-100 light:hover:border-indigo-300"
          >
            <div className="flex items-start gap-4">
              <span className="rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 font-mono text-xs font-semibold text-zinc-400 light:border-zinc-300 light:bg-white light:text-zinc-600">
                {feature.marker}
              </span>
              <div className="flex-1">
                <h2 className="mb-1 text-lg font-bold text-white transition-colors group-hover:text-indigo-300 light:text-zinc-900 light:group-hover:text-indigo-600">
                  {feature.title}
                </h2>
                <p className="text-sm text-zinc-500 light:text-zinc-600">{feature.description}</p>
              </div>
              <span className="text-zinc-600 group-hover:text-zinc-400 light:text-zinc-400 light:group-hover:text-zinc-600">→</span>
            </div>
          </Link>
        ))}
      </div>

      <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-950/40 p-5 light:border-zinc-200 light:bg-zinc-50">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 light:text-zinc-400">
          Server Rendering
        </p>
        <Link href="/reference/ssr" className="text-sm font-medium text-indigo-300 transition-colors hover:text-indigo-200 light:text-indigo-700 light:hover:text-indigo-600">
          SSR & Static Blueprints →
        </Link>
      </div>
    </div>
  );
}
