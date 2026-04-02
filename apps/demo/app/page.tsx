"use client";

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
        <h2 className="text-xl font-bold text-white tracking-tight">{title}</h2>
        <p className="text-zinc-500 text-sm mt-1">{sub}</p>
      </div>
      {children}
    </section>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-zinc-800 text-zinc-400 border border-zinc-700">
      {children}
    </span>
  );
}

// ─── Use-Case 1: Profile Card ──────────────────────────────────────────────

function ProfileCard() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex items-center gap-5">
      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 shrink-0" />
      <div className="flex-1 min-w-0">
        <h3 className="text-white font-semibold text-lg truncate">Alexandra Novak</h3>
        <p className="text-zinc-400 text-sm">Senior Design Engineer · San Francisco</p>
        <div className="flex gap-2 mt-3">
          <Tag>React</Tag>
          <Tag>TypeScript</Tag>
          <Tag>Systems</Tag>
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-white font-bold text-xl">4.9</div>
        <div className="text-zinc-500 text-xs">Rating</div>
      </div>
    </div>
  );
}

// ─── Use-Case 2: Feed / Article List ──────────────────────────────────────

function ArticleCard({ title, excerpt, tag, time }: { title: string; excerpt: string; tag: string; time: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
      <div className="flex items-start justify-between gap-4 mb-3">
        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">{tag}</span>
        <span className="text-zinc-600 text-xs shrink-0">{time}</span>
      </div>
      <h4 className="text-white font-semibold text-base leading-snug mb-2">{title}</h4>
      <p className="text-zinc-500 text-sm leading-relaxed">{excerpt}</p>
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
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800">
            <th className="px-5 py-3 text-left text-zinc-500 font-semibold text-xs uppercase tracking-wider">Service</th>
            <th className="px-5 py-3 text-left text-zinc-500 font-semibold text-xs uppercase tracking-wider">Status</th>
            <th className="px-5 py-3 text-right text-zinc-500 font-semibold text-xs uppercase tracking-wider">Throughput</th>
            <th className="px-5 py-3 text-right text-zinc-500 font-semibold text-xs uppercase tracking-wider">Latency</th>
            <th className="px-5 py-3 text-right text-zinc-500 font-semibold text-xs uppercase tracking-wider">Health</th>
          </tr>
        </thead>
        <tbody>
          {tableData.map((row) => (
            <tr key={row.name} className="border-b border-zinc-800/60 last:border-0 hover:bg-zinc-800/30 transition-colors">
              <td className="px-5 py-4 text-white font-medium">{row.name}</td>
              <td className="px-5 py-4">
                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${row.status === "Active" ? "text-emerald-400" : row.status === "Warning" ? "text-amber-400" : "text-zinc-500"}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${row.status === "Active" ? "bg-emerald-400" : row.status === "Warning" ? "bg-amber-400" : "bg-zinc-500"}`} />
                  {row.status}
                </span>
              </td>
              <td className="px-5 py-4 text-right text-zinc-300 font-mono">{row.throughput}</td>
              <td className="px-5 py-4 text-right text-zinc-300 font-mono">{row.latency}</td>
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
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden divide-y divide-zinc-800/60">
      {/* Header stays interactive during loading via data-no-skeleton */}
      <div data-no-skeleton className="px-5 py-4 flex items-center justify-between">
        <span className="text-white font-semibold text-sm">Notifications</span>
        <button className="text-indigo-400 hover:text-indigo-300 text-xs font-medium transition-colors">Mark all read</button>
      </div>
      {notifications.map((n) => (
        <div key={n.title} className={`px-5 py-4 flex items-start gap-3 hover:bg-zinc-800/30 transition-colors ${n.unread ? "bg-indigo-500/5" : ""}`}>
          <span className="text-xl shrink-0 mt-0.5">{n.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-white text-sm font-medium">{n.title}</p>
              <span className="text-zinc-600 text-xs shrink-0">{n.time}</span>
            </div>
            <p className="text-zinc-500 text-sm mt-0.5">{n.body}</p>
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
        <div key={s.label} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-2">{s.label}</p>
          <p className="text-white text-2xl font-bold tracking-tight">{s.value}</p>
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
      <p className="text-zinc-500 text-xs font-mono uppercase tracking-widest mb-1">{mode}</p>
      <AutoSkeleton loading={loading} config={animationShowcaseConfigs[mode]}>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 shrink-0" />
          <div>
            <p className="text-white text-sm font-semibold">API Endpoint</p>
            <p className="text-zinc-500 text-xs">GET /v2/blueprints</p>
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

    setTimingMs(null);
    const start = performance.now();
    const timer = window.setTimeout(() => {
      setLoading(false);
      setTimingMs(Math.round(performance.now() - start));
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [loading]);

  function handleToggle() {
    setLoading((prev) => !prev);
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 bg-[#09090b]/80 backdrop-blur-xl border-b border-zinc-800/60 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
            <span className="text-white text-xs font-bold">S</span>
          </div>
          <span className="text-white font-bold text-lg tracking-tight">SkelCore</span>
          <span className="text-zinc-600 text-sm hidden sm:inline">Use-Case Showcase</span>
        </div>
        <div className="flex items-center gap-3">
          {timingMs !== null && !loading && (
            <span className="text-emerald-400 text-xs font-mono hidden sm:inline">
              Blueprint in ~{timingMs}ms
            </span>
          )}
          <button
            id="toggle-loading"
            onClick={handleToggle}
            className={`px-5 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-2 ${loading
              ? "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-500"
              : "bg-white text-black hover:bg-zinc-100"
              }`}
          >
            <span className={`w-2 h-2 rounded-full ${loading ? "bg-amber-400 animate-pulse" : "bg-emerald-500"}`} />
            {loading ? "Loading…" : "Reset"}
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12">

        {/* ── Hero ── */}
        <div className="mb-16 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight bg-gradient-to-r from-white via-zinc-300 to-zinc-600 bg-clip-text text-transparent mb-4">
            Pixel-perfect skeletons.<br />Zero layout thrash.
          </h1>
          <p className="text-zinc-500 text-lg max-w-xl mx-auto">
            SkelCore dynamically measures your real UI and generates an exact skeleton overlay. Toggle loading to see every use-case below.
          </p>
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

      <footer className="border-t border-zinc-800/60 py-10 text-center">
        <p className="text-zinc-600 text-sm">SkelCore · Sub-millisecond visual architecture · Built with Next.js</p>
        <div className="mt-3 flex justify-center gap-6">
          <a href="/test" className="text-indigo-400 hover:text-indigo-300 text-sm transition-colors">E2E Test Bench</a>
          <span className="text-zinc-800">·</span>
          <span className="text-zinc-600 text-sm">&lt; 8ms measurement target</span>
        </div>
      </footer>
    </div>
  );
}
