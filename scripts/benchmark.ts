import { chromium } from "@playwright/test";

async function runBenchmark() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  console.log("🚀 Starting Ghostframe Performance Benchmark...");

  await page.goto("http://localhost:3005/test");
  await page.waitForSelector("#test-card", { timeout: 15000 });
  await page.waitForSelector(".skel-overlay", { timeout: 15000 });
  const firstSkeletonPaintMs = Date.now() - navStart;

  // Benchmark a synthetic analyzer-like pass over the measured card subtree.
  const results = await page.evaluate(async () => {
    const root = document.querySelector("#test-card") as HTMLElement;
    if (!root) {
      throw new Error("Benchmark root #test-card was not found");
    }

    const iterations = 100;
    const sample: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();

      root.getBoundingClientRect();
      window.getComputedStyle(root);

      Array.from(root.children).forEach((c) => {
        c.getBoundingClientRect();
        window.getComputedStyle(c);
      });

      sample.push(performance.now() - start);
    }

    const total = sample.reduce((acc, ms) => acc + ms, 0);
    const average = total / sample.length;
    const sorted = [...sample].sort((a, b) => a - b);
    const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? average;

    return {
      average,
      p95,
    };
  });

  console.log(`\n📊 Results:`);
  console.log(`- First skeleton paint: ${firstSkeletonPaintMs.toFixed(2)}ms`);
  console.log(`- Analyzer loop avg (card): ${results.average.toFixed(2)}ms`);
  console.log(`- Analyzer loop p95 (card): ${results.p95.toFixed(2)}ms`);

  if (results.average < 8) {
    console.log("✅ PASS: Avg analyzer loop within 8ms target.");
  } else {
    console.warn("⚠️ FAIL: Avg analyzer loop exceeded 8ms target.");
  }

  await browser.close();
}

runBenchmark().catch(console.error);
