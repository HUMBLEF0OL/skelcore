"use client";

import Link from "next/link";
import React, { useState, useEffect } from "react";
import { AutoSkeleton } from "../lib/skelcore/react";
import type { AnimationMode, SkeletonConfig } from "../lib/skelcore/core";

const animationShowcaseConfigs: Record<AnimationMode, Partial<SkeletonConfig>> = {
  shimmer: { animation: "shimmer" },
  pulse: { animation: "pulse" },
  none: { animation: "none" },
};

const darkThemeConfig: Partial<SkeletonConfig> = {
  baseColor: "#2525a8ff",
  highlightColor: "#090c46ff",
  borderRadius: 12,
  speed: 0.6,
};

const lightThemeConfig: Partial<SkeletonConfig> = {
  baseColor: "#e5e7eb",
  highlightColor: "#f9fafb",
  borderRadius: 0,
  speed: 2,
};

// ─── Reusable Demo Section ─────────────────────────────────────────────────

function Section({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <section className="mb-16">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white tracking-tight light:text-zinc-900">{title}</h2>
        <p className="mt-1 text-sm text-zinc-500 light:text-zinc-600">{sub}</p>
      </div>
      {children}
    </section>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[11px] font-mono font-medium text-zinc-400 light:border-zinc-300 light:bg-zinc-100 light:text-zinc-600">
      {children}
    </span>
  );
}

// ─── Use-Case 1: Profile Card ──────────────────────────────────────────────

function ProfileCard() {
  return (
    <div className="flex items-center gap-5 rounded-2xl border border-zinc-800 bg-zinc-900 p-6 light:border-zinc-200 light:bg-white">
      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 shrink-0" />
      <div className="flex-1 min-w-0">
        <h3 className="truncate text-lg font-semibold text-white light:text-zinc-900">Alexandra Novak</h3>
        <p className="text-sm text-zinc-400 light:text-zinc-600">Senior Design Engineer · San Francisco</p>
        <div className="flex gap-2 mt-3">
          <Tag>React</Tag>
          <Tag>TypeScript</Tag>
          <Tag>Systems</Tag>
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-xl font-bold text-white light:text-zinc-900">4.9</div>
        <div className="text-xs text-zinc-500 light:text-zinc-600">Rating</div>
      </div>
    </div>
  );
}

// ─── Use-Case 2: Feed / Article List ──────────────────────────────────────

function ArticleCard({ title, excerpt, tag, time }: { title: string; excerpt: string; tag: string; time: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 light:border-zinc-200 light:bg-white">
      <div className="flex items-start justify-between gap-4 mb-3">
        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">{tag}</span>
        <span className="shrink-0 text-xs text-zinc-600 light:text-zinc-500">{time}</span>
      </div>
      <h4 className="mb-2 text-base font-semibold leading-snug text-white light:text-zinc-900">{title}</h4>
      <p className="text-sm leading-relaxed text-zinc-500 light:text-zinc-600">{excerpt}</p>
    </div>
  );
}

// ─── Use-Case 3: Data Table ────────────────────────────────────────────────

const tableData = [
  { name: "SkelCore", status: "Active", throughput: "12.4M/s", latency: "0.12ms", health: 99 },
  { name: "BlueprintAI", status: "Idle", throughput: "8.1M/s", latency: "0.31ms", health: 87 },
  { name: "ReFlow", status: "Active", throughput: "19.2M/s", latency: "0.08ms", health: 100 },
  { name: "NodeSync", status: "Warning", throughput: "3.2M/s", latency: "1.20ms", health: 62 },
];

function DataTable() {
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 light:border-zinc-200 light:bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 light:border-zinc-200">
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 light:text-zinc-600">Service</th>
            <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 light:text-zinc-600">Status</th>
            <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500 light:text-zinc-600">Throughput</th>
            <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500 light:text-zinc-600">Latency</th>
            <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500 light:text-zinc-600">Health</th>
          </tr>
        </thead>
        <tbody>
          {tableData.map((row) => (
            <tr key={row.name} className="border-b border-zinc-800/60 transition-colors last:border-0 hover:bg-zinc-800/30 light:border-zinc-200 light:hover:bg-zinc-100">
              <td className="px-5 py-4 font-medium text-white light:text-zinc-900">{row.name}</td>
              <td className="px-5 py-4">
                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${row.status === "Active" ? "text-emerald-400" : row.status === "Warning" ? "text-amber-400" : "text-zinc-500"}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${row.status === "Active" ? "bg-emerald-400" : row.status === "Warning" ? "bg-amber-400" : "bg-zinc-500"}`} />
                  {row.status}
                </span>
              </td>
              <td className="px-5 py-4 text-right font-mono text-zinc-300 light:text-zinc-700">{row.throughput}</td>
              <td className="px-5 py-4 text-right font-mono text-zinc-300 light:text-zinc-700">{row.latency}</td>
              <td className="px-5 py-4 text-right">
                <span className={`font-bold ${row.health >= 90 ? "text-emerald-400" : row.health >= 70 ? "text-amber-400" : "text-red-400"}`}>{row.health}%</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Use-Case 4: Media / Image Grid ───────────────────────────────────────

const images = [
  { bg: "from-rose-500 to-pink-600", label: "Aurora" },
  { bg: "from-sky-500 to-cyan-600", label: "Ocean" },
  { bg: "from-amber-500 to-orange-600", label: "Desert" },
  { bg: "from-violet-500 to-purple-600", label: "Cosmos" },
  { bg: "from-emerald-500 to-teal-600", label: "Forest" },
  { bg: "from-indigo-500 to-blue-600", label: "Glacier" },
];

function ImageGrid() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {images.map((img) => (
        <div key={img.label} className="rounded-xl overflow-hidden aspect-video relative group cursor-pointer">
          <div className={`w-full h-full bg-gradient-to-br ${img.bg}`} />
          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="text-white font-semibold text-sm">{img.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Use-Case 5: Notification List with data-no-skeleton ──────────────────

const notifications = [
  { icon: "🚀", title: "Deploy succeeded", body: "skelcore@0.2.0 is live on npm.", time: "just now", unread: true },
  { icon: "⚡", title: "Performance alert", body: "Latency spike detected on node-7.", time: "3m ago", unread: true },
  { icon: "✅", title: "Test suite passed", body: "All 142 tests green in CI.", time: "12m ago", unread: false },
  { icon: "💬", title: "New comment", body: "Alex replied on the RFC thread.", time: "1h ago", unread: false },
];

function NotificationList() {
  return (
    <div className="divide-y divide-zinc-800/60 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 light:divide-zinc-200 light:border-zinc-200 light:bg-white">
      {/* Header stays interactive during loading via data-no-skeleton */}
      <div data-no-skeleton className="px-5 py-4 flex items-center justify-between">
        <span className="text-sm font-semibold text-white light:text-zinc-900">Notifications</span>
        <button className="text-indigo-400 hover:text-indigo-300 text-xs font-medium transition-colors">Mark all read</button>
      </div>
      {notifications.map((n) => (
        <div key={n.title} className={`flex items-start gap-3 px-5 py-4 transition-colors hover:bg-zinc-800/30 light:hover:bg-zinc-100 ${n.unread ? "bg-indigo-500/5" : ""}`}>
          <span className="text-xl shrink-0 mt-0.5">{n.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-white light:text-zinc-900">{n.title}</p>
              <span className="shrink-0 text-xs text-zinc-600 light:text-zinc-500">{n.time}</span>
            </div>
            <p className="mt-0.5 text-sm text-zinc-500 light:text-zinc-600">{n.body}</p>
          </div>
          {n.unread && <span className="w-2 h-2 rounded-full bg-indigo-400 shrink-0 mt-1.5" />}
        </div>
      ))}
    </div>
  );
}

// ─── Use-Case 6: Stats / Metrics ──────────────────────────────────────────

const stats = [
  { label: "Total Renders", value: "2.4B", delta: "+12%", up: true },
  { label: "Avg Measure Time", value: "0.9ms", delta: "-34%", up: false },
  { label: "Cache Hit Rate", value: "97.3%", delta: "+5%", up: true },
  { label: "Bundle Size", value: "5.8KB", delta: "-8%", up: false },
];

function StatsGrid() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((s) => (
        <div key={s.label} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 light:border-zinc-200 light:bg-white">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500 light:text-zinc-600">{s.label}</p>
          <p className="text-2xl font-bold tracking-tight text-white light:text-zinc-900">{s.value}</p>
          <p className={`text-xs font-semibold mt-1 ${s.up ? "text-emerald-400" : "text-sky-400"}`}>{s.delta} vs last month</p>
        </div>
      ))}
    </div>
  );
}

// ─── Use-Case 7: Config Showcase (animation modes) ────────────────────────

function AnimationShowcase({ mode, loading }: { mode: AnimationMode; loading: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="mb-1 text-xs font-mono uppercase tracking-widest text-zinc-500 light:text-zinc-600">{mode}</p>
      <AutoSkeleton loading={loading} config={animationShowcaseConfigs[mode]}>
        <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-4 light:border-zinc-200 light:bg-white">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-white light:text-zinc-900">API Endpoint</p>
            <p className="text-xs text-zinc-500 light:text-zinc-600">GET /v2/blueprints</p>
          </div>
        </div>
      </AutoSkeleton>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [timingMs, setTimingMs] = useState<number | null>(null);

  useEffect(() => {
    if (!loading) return;

    const start = performance.now();
    const timer = window.setTimeout(() => {
      setLoading(false);
      setTimingMs(Math.round(performance.now() - start));
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [loading]);

  function handleToggle() {
    setLoading((prev) => {
      if (!prev) {
        setTimingMs(null);
        return true;
      }

      return false;
    });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="max-w-5xl mx-auto px-6 py-12">

        {/* ── Hero ── */}
        <div className="mb-16 text-center">
          <h1 className="mb-4 bg-gradient-to-r from-white via-zinc-300 to-zinc-600 bg-clip-text text-4xl font-bold tracking-tight text-transparent light:from-zinc-900 light:via-zinc-700 light:to-zinc-500 sm:text-5xl">
            Pixel-perfect skeletons.<br />Zero layout thrash.
          </h1>
          <p className="mx-auto max-w-xl text-lg text-zinc-500 light:text-zinc-600">
            SkelCore dynamically measures your real UI and generates an exact skeleton overlay. Toggle loading to see every use-case below.
          </p>
        </div>

        <div className="mb-10 flex flex-wrap items-center justify-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3 light:border-zinc-200 light:bg-white">
          {timingMs !== null && !loading && <span className="text-xs font-mono text-emerald-400">Blueprint in ~{timingMs}ms</span>}
          <button
            id="toggle-loading"
            onClick={handleToggle}
            className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-all ${
              loading
                ? "border border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-500 light:border-zinc-300 light:bg-zinc-100 light:text-zinc-700 light:hover:border-zinc-400"
                : "bg-white text-black hover:bg-zinc-100 light:border light:border-zinc-300"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${loading ? "bg-amber-400 animate-pulse" : "bg-emerald-500"}`} />
            {loading ? "Loading…" : "Reset"}
          </button>
          <Link
            href="/reference"
            className="rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-300 transition-colors hover:border-zinc-500 light:border-zinc-300 light:bg-white light:text-zinc-700 light:hover:border-zinc-400"
          >
            Explore Reference
          </Link>
        </div>

        {/* ── 1. Profile Card ── */}
        <Section title="01 — Profile Card" sub="Avatar + heading + tags + trailing metric. AutoSkeleton wraps a single complex card.">
          <AutoSkeleton loading={loading} remeasureOnResize>
            <ProfileCard />
          </AutoSkeleton>
        </Section>

        {/* ── 2. Article Feed ── */}
        <Section title="02 — Article Feed" sub="Repeating card pattern. Each card is independently wrapped so skeletons load in parallel.">
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { title: "Sub-millisecond blueprint generation", excerpt: "How SkelCore achieves its performance targets without sacrificing accuracy.", tag: "Performance", time: "5 min read" },
              { title: "Pixel-perfect overlays at runtime", excerpt: "A deep dive into the three-pass dynamic analyzer and how it avoids layout thrash.", tag: "Architecture", time: "8 min read" },
              { title: "Skeleton-first design patterns", excerpt: "Design strategies that make your loading states feel like features, not bugs.", tag: "Design", time: "4 min read" },
            ].map((a) => (
              <AutoSkeleton key={a.title} loading={loading}>
                <ArticleCard {...a} />
              </AutoSkeleton>
            ))}
          </div>
        </Section>

        {/* ── 3. Data Table ── */}
        <Section title="03 — Data Table" sub="Complex table with multiple column types. SkelCore preserves row and column structure.">
          <AutoSkeleton loading={loading}>
            <DataTable />
          </AutoSkeleton>
        </Section>

        {/* ── 4. Image Grid ── */}
        <Section title="04 — Image / Media Grid" sub="Aspect-ratio image tiles. Each placeholder maintains the correct aspect ratio.">
          <AutoSkeleton loading={loading}>
            <ImageGrid />
          </AutoSkeleton>
        </Section>

        {/* ── 5. Notifications with data-no-skeleton ── */}
        <Section title="05 — data-no-skeleton" sub="The header stays interactive during loading. Use data-no-skeleton to opt elements out of the scanner.">
          <AutoSkeleton loading={loading}>
            <NotificationList />
          </AutoSkeleton>
          <p className="text-zinc-600 text-xs mt-3 font-mono">
            &lt;div <span className="text-indigo-400">data-no-skeleton</span>&gt; keeps the header clickable while content loads.
          </p>
        </Section>

        {/* ── 6. Stats Grid ── */}
        <div className="mb-6 border-l-2 border-emerald-500/50 pl-4">
          <p className="text-xs font-mono uppercase tracking-wider text-emerald-400">Performance Metrics</p>
          <p className="text-sm text-zinc-500 light:text-zinc-600">Operational telemetry and runtime efficiency indicators.</p>
        </div>
        <Section title="06 — Stats Grid" sub="Dense metric cards with varied typography weights. All roles inferred automatically.">
          <AutoSkeleton loading={loading}>
            <StatsGrid />
          </AutoSkeleton>
        </Section>

        {/* ── 7. Animation Modes ── */}
        <Section title="07 — Animation Modes" sub="Compare shimmer, pulse, and none side by side. All use identical markup with a different config prop.">
          <div className="grid sm:grid-cols-3 gap-6">
            {(["shimmer", "pulse", "none"] as AnimationMode[]).map((mode) => (
              <AnimationShowcase key={mode} mode={mode} loading={loading} />
            ))}
          </div>
        </Section>

        {/* ── 8. Custom Config ── */}
        <Section title="08 — Custom Config" sub="Override baseColor, highlightColor, borderRadius, and speed via the config prop.">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-zinc-500 text-xs font-mono mb-2">Dark theme override</p>
              <AutoSkeleton
                loading={loading}
                config={darkThemeConfig}
              >
                <div className="bg-[#1e1e2e] border border-[#313244] rounded-xl p-5">
                  <p className="text-[#cdd6f4] font-semibold mb-1">Catppuccin Mocha</p>
                  <p className="text-[#a6adc8] text-sm">A dark theme with slow, relaxed shimmer.</p>
                </div>
              </AutoSkeleton>
            </div>
            <div>
              <p className="text-zinc-500 text-xs font-mono mb-2">Light theme override</p>
              <AutoSkeleton
                loading={loading}
                config={lightThemeConfig}
              >
                <div className="bg-white border border-gray-200 rounded-none p-5">
                  <p className="text-gray-900 font-semibold mb-1">Light Mode Card</p>
                  <p className="text-gray-500 text-sm">Sharp corners, fast shimmer, light palette.</p>
                </div>
              </AutoSkeleton>
            </div>
          </div>
        </Section>

      </main>

      <footer className="border-t border-zinc-800/60 py-10 text-center light:border-zinc-200">
        <p className="text-sm text-zinc-600 light:text-zinc-500">SkelCore · Sub-millisecond visual architecture · Built with Next.js</p>
        <div className="mt-3 flex justify-center gap-6">
          <a href="/test" className="text-indigo-400 hover:text-indigo-300 text-sm transition-colors">E2E Test Bench</a>
          <span className="text-zinc-800 light:text-zinc-300">·</span>
          <span className="text-sm text-zinc-600 light:text-zinc-500">&lt; 8ms measurement target</span>
        </div>
      </footer>
    </div>
  );
}
