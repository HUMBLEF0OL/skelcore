import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveBlueprint } from "../../packages/react/dist/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Benchmark resolver lookup performance for hardening sprint.
 * Measures manifest hit/miss latency percentiles.
 */

function createManifest() {
  const now = Date.now();
  return {
    manifestVersion: 1,
    packageVersion: "0.1.0",
    build: { builtAt: now, appVersion: "benchmark" },
    defaults: { ttlMs: 86_400_000 },
    index: { byKey: { ProductCard: ["default"], HeroBanner: ["default"] } },
    entries: {
      ProductCard: {
        key: "ProductCard",
        blueprint: {
          version: 1,
          rootWidth: 300,
          rootHeight: 200,
          nodes: [],
          generatedAt: now,
          source: "dynamic",
        },
        structuralHash: "hash-product-card",
        generatedAt: now,
        ttlMs: 86_400_000,
        quality: { confidence: 0.95, warnings: [] },
      },
      HeroBanner: {
        key: "HeroBanner",
        blueprint: {
          version: 1,
          rootWidth: 1200,
          rootHeight: 320,
          nodes: [],
          generatedAt: now,
          source: "dynamic",
        },
        structuralHash: "hash-hero-banner",
        generatedAt: now,
        ttlMs: 86_400_000,
        quality: { confidence: 0.9, warnings: [] },
      },
    },
  };
}

function sampleLookup(manifest, skeletonKey, iterations) {
  const samples = [];

  for (let i = 0; i < iterations; i += 1) {
    const started = performance.now();
    resolveBlueprint({
      manifest,
      skeletonKey,
      policyOverride: { mode: "hybrid", strict: false },
      structuralHash: skeletonKey === "ProductCard" ? "hash-product-card" : undefined,
    });
    samples.push(performance.now() - started);
  }

  samples.sort((a, b) => a - b);
  const median = samples[Math.floor(samples.length / 2)] ?? 0;
  const p95 = samples[Math.floor(samples.length * 0.95)] ?? median;
  return { median, p95 };
}

async function main() {
  const manifest = createManifest();
  const iterations = 10_000;

  // Warmup to reduce first-run JIT noise.
  sampleLookup(manifest, "ProductCard", 200);

  const hit = sampleLookup(manifest, "ProductCard", iterations);
  const miss = sampleLookup(manifest, "MissingKey", iterations);

  const output = [
    "# Phase 9 Performance Benchmark",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Iterations per scenario: ${iterations}`,
    "",
    "## Resolver Lookup",
    `- Manifest hit median: ${hit.median.toFixed(4)} ms`,
    `- Manifest hit p95: ${hit.p95.toFixed(4)} ms`,
    `- Manifest miss median: ${miss.median.toFixed(4)} ms`,
    `- Manifest miss p95: ${miss.p95.toFixed(4)} ms`,
    "",
    "Notes:",
    "- Measurements use in-process timing and are intended for relative comparisons.",
    "- Run after @ghostframe/react build so dist imports are current.",
    "",
  ].join("\n");

  const reportPath = path.resolve(__dirname, "../../docs/reports/resolver-performance-benchmark.md");
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, output, "utf8");
  console.log(`Wrote resolver performance benchmark: ${reportPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
